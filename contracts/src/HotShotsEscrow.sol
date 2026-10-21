// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {AccessControlDefaultAdminRules} from
    "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title  Hot Shots match escrow vault
/// @notice Holds native-ETH entry stakes for Hot Shots matches and pays out exactly once:
///         90% of the pot to the champion, 10% to the house treasury.
///
///         Lifecycle (spec §15):
///           CREATED -> FUNDED -> LOCKED -> RESULT_FINAL -> SETTLED
///           CREATED/FUNDED/LOCKED/RESULT_FINAL -> ABORTED -> REFUNDED
///
///         Published rules enforced here:
///         - House share  = floor(pot * 1000 / 10000). Champion share = pot - house share.
///           Rounding dust therefore always goes to the champion; the house never receives more than 10%.
///         - Network gas is never deducted from the pot. Whoever sends a transaction pays its gas.
///         - No address, role or admin can withdraw escrowed stakes except through settlement or refund.
///         - Roster is frozen at lock; payouts go only to the address that deposited.
///         - A guardian veto is final for that result: a per-match nonce in the signed message means
///           vetoed signatures can never be replayed.
///         - Liveness: if a match is not locked by its admission deadline, or no result is
///           settled by its result deadline, ANYONE can abort it and every player is refunded in full.
///           Refund and claim paths remain available while the contract is paused.
contract HotShotsEscrow is AccessControlDefaultAdminRules, Pausable, ReentrancyGuard, EIP712 {
    // ───────────────────────────── Constants ─────────────────────────────

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE"); // backend: create / lock / pre-lock abort
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE"); // incident response: pause, veto, post-lock abort

    uint256 public constant BPS = 10_000;
    uint256 public constant HOUSE_BPS = 1_000; // 10%
    uint8 public constant MIN_PLAYERS = 2;
    uint8 public constant MAX_PLAYERS = 16;
    uint8 public constant MAX_SIGNERS = 16;

    uint64 public constant MAX_ADMISSION_WINDOW = 2 days;
    /// @dev >= 1 hour: Arbitrum Nitro lets the sequencer skew block timestamps by up to ~1 hour,
    ///      so a shorter window could be skipped by a faulty sequencer.
    uint32 public constant MIN_DISPUTE_WINDOW = 1 hours;
    uint32 public constant MAX_DISPUTE_WINDOW = 7 days;
    uint64 public constant MIN_MATCH_DURATION = 30 minutes;
    uint64 public constant MAX_MATCH_DURATION = 3 days;
    uint64 public constant RESUBMIT_GRACE = 1 hours; // extra time granted after a guardian veto
    /// @dev A pause can hold back a final, undisputed settlement for at most this long; after that
    ///      anyone can finalize even while paused, so a stuck pause can never trap a champion's prize.
    uint64 public constant PAUSED_FINALIZE_DELAY = 7 days;

    /// @dev Gas forwarded on push payments. If the recipient cannot accept within this budget,
    ///      the amount is credited to `claimable` and can be pulled with `claim()`.
    uint256 public constant PUSH_GAS_LIMIT = 100_000;
    uint256 private constant PUSH_GAS_RESERVE = 30_000; // bookkeeping after a failed push

    bytes32 public constant MATCH_RESULT_TYPEHASH = keccak256(
        "MatchResult(bytes32 matchId,address winner,bytes32 rosterHash,bytes32 resultHash,uint64 signerSetVersion,uint32 resultNonce)"
    );

    /// @notice The only chain this deployment accepts. Robinhood Chain mainnet = 4663, testnet = 46630.
    uint256 public immutable SUPPORTED_CHAIN_ID;

    // ───────────────────────────── Types ─────────────────────────────

    enum Status {
        NONE,
        CREATED,
        FUNDED,
        LOCKED,
        RESULT_FINAL,
        SETTLED,
        ABORTED,
        REFUNDED
    }

    struct MatchConfig {
        uint128 entryAmount; // exact stake in wei
        uint8 capacity; // 2..16
        uint64 admissionDeadline; // unix seconds; joins and lock must happen before this
        bytes32 configHash; // hash of off-chain rules (rules version, stake tier, region, stage pool)
    }

    struct Match {
        // slot 0
        Status status;
        uint8 capacity;
        uint8 playerCount;
        uint8 refundsRemaining;
        uint32 disputeWindow; // snapshotted at lock
        uint64 admissionDeadline;
        uint64 resultDeadline; // set at lock
        uint64 resultSubmittedAt;
        // slot 1
        uint128 entryAmount;
        uint32 resultNonce; // bumped on every veto so vetoed signatures can never be replayed
        // slot 2
        address winner;
        // slots 3..6
        bytes32 configHash;
        bytes32 allowlistRoot; // 0 = open lobby
        bytes32 rosterHash; // keccak256(abi.encodePacked(sortedRoster)), set at lock
        bytes32 resultHash; // hash of signed off-chain result evidence
    }

    enum AbortReason {
        OPERATOR_CANCELLED, // pre-lock cancel by backend
        ADMISSION_EXPIRED, // nobody locked it in time (permissionless)
        RESULT_EXPIRED, // locked but never settled in time (permissionless)
        GUARDIAN_INCIDENT // post-lock incident / dispute upheld

    }

    // ───────────────────────────── Storage ─────────────────────────────

    mapping(bytes32 matchId => Match) private _matches;
    mapping(bytes32 matchId => address[]) private _players;
    mapping(bytes32 matchId => mapping(address => uint256)) private _seatPlusOne; // 0 = not a player
    mapping(bytes32 matchId => mapping(address => bool)) public refundClaimed;

    /// @notice Pull-payment balances (failed pushes, house share if treasury rejects).
    mapping(address => uint256) public claimable;

    /// @notice Sum of stakes currently held for unsettled / unrefunded matches.
    uint256 public totalEscrowed;
    /// @notice Sum of all `claimable` balances.
    uint256 public totalClaimable;

    address public treasury;
    uint32 public disputeWindow;
    uint64 public maxMatchDuration;

    // Result signer set (m-of-n)
    address[] private _signers;
    mapping(address => bool) public isSigner;
    uint8 public signerThreshold;
    uint64 public signerSetVersion;

    // ───────────────────────────── Events ─────────────────────────────

    event MatchCreated(
        bytes32 indexed matchId,
        uint128 entryAmount,
        uint8 capacity,
        uint64 admissionDeadline,
        bytes32 configHash,
        bytes32 allowlistRoot
    );
    event PlayerJoined(bytes32 indexed matchId, address indexed player, uint256 amount, uint8 playerCount);
    event PlayerLeft(bytes32 indexed matchId, address indexed player, uint256 amount, uint8 playerCount);
    event MatchLocked(
        bytes32 indexed matchId,
        bytes32 rosterHash,
        address[] roster,
        uint256 pot,
        uint64 resultDeadline,
        uint32 disputeWindow
    );
    event ResultSubmitted(
        bytes32 indexed matchId, address indexed winner, bytes32 resultHash, uint64 signerSetVersion, uint64 finalizableAt
    );
    event ResultVetoed(bytes32 indexed matchId, address indexed guardian, bytes32 reason, uint64 newResultDeadline);
    event MatchSettled(bytes32 indexed matchId, address indexed champion, uint256 championAmount, uint256 houseAmount);
    event MatchAborted(bytes32 indexed matchId, AbortReason reason, address indexed by);
    event RefundIssued(bytes32 indexed matchId, address indexed player, uint256 amount);
    event MatchFullyRefunded(bytes32 indexed matchId);
    event PaymentPushed(address indexed to, uint256 amount);
    event PaymentCredited(address indexed to, uint256 amount);
    event Claimed(address indexed account, uint256 amount);
    event SignersUpdated(address[] signers, uint8 threshold, uint64 version);
    event TreasuryUpdated(address treasury);
    event DisputeWindowUpdated(uint32 window);
    event MaxMatchDurationUpdated(uint64 duration);

    // ───────────────────────────── Errors ─────────────────────────────

    error WrongChain(uint256 expected, uint256 actual);
    error ZeroAddress();
    error MatchExists();
    error BadStatus(Status actual);
    error BadConfig();
    error AdmissionClosed();
    error WrongAmount(uint256 expected, uint256 sent);
    error AlreadyJoined();
    error MatchFull();
    error NotAllowlisted();
    error NotAPlayer();
    error RosterMismatch();
    error ResultWindowClosed();
    error DisputeWindowOpen(uint64 finalizableAt);
    error DisputeWindowClosed();
    error BadSignatures();
    error NotAbortable();
    error RefundAlreadyClaimed();
    error NothingToClaim();
    error TransferFailed();
    error InsufficientGas();
    error BadSignerSet();
    error BadParam();

    // ───────────────────────────── Construction ─────────────────────────────

    /// @param supportedChainId  4663 (mainnet) or 46630 (testnet). Deployment reverts on any other chain.
    /// @param admin             Governance multisig (e.g. Safe). Admin transfers use a delay.
    /// @param adminTransferDelay Seconds a new admin must wait before accepting (AccessControlDefaultAdminRules).
    constructor(
        uint256 supportedChainId,
        address admin,
        uint48 adminTransferDelay,
        address treasury_,
        address[] memory signers_,
        uint8 threshold_,
        uint32 disputeWindow_,
        uint64 maxMatchDuration_
    ) AccessControlDefaultAdminRules(adminTransferDelay, admin) EIP712("HotShotsEscrow", "1") {
        if (block.chainid != supportedChainId) revert WrongChain(supportedChainId, block.chainid);
        SUPPORTED_CHAIN_ID = supportedChainId;
        _setTreasury(treasury_);
        _setSigners(signers_, threshold_);
        _setDisputeWindow(disputeWindow_);
        _setMaxMatchDuration(maxMatchDuration_);
    }

    // ───────────────────────────── Match lifecycle ─────────────────────────────

    /// @notice Open a new lobby escrow. `rosterCommitment` is a Merkle root of allowed player
    ///         addresses for private lobbies, or bytes32(0) for an open lobby.
    function createMatch(bytes32 matchId, MatchConfig calldata cfg, bytes32 rosterCommitment)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
    {
        if (matchId == bytes32(0)) revert BadConfig();
        if (_matches[matchId].status != Status.NONE) revert MatchExists();
        if (
            cfg.entryAmount == 0 || cfg.capacity < MIN_PLAYERS || cfg.capacity > MAX_PLAYERS
                || cfg.admissionDeadline <= block.timestamp
                || cfg.admissionDeadline > block.timestamp + MAX_ADMISSION_WINDOW
        ) revert BadConfig();

        Match storage m = _matches[matchId];
        m.status = Status.CREATED;
        m.capacity = cfg.capacity;
        m.admissionDeadline = cfg.admissionDeadline;
        m.entryAmount = cfg.entryAmount;
        m.configHash = cfg.configHash;
        m.allowlistRoot = rosterCommitment;

        emit MatchCreated(matchId, cfg.entryAmount, cfg.capacity, cfg.admissionDeadline, cfg.configHash, rosterCommitment);
    }

    /// @notice Deposit the exact entry stake. `proof` is required only for allowlisted (private) lobbies.
    function joinMatch(bytes32 matchId, bytes32[] calldata proof) external payable nonReentrant whenNotPaused {
        Match storage m = _matches[matchId];
        if (m.status != Status.CREATED && m.status != Status.FUNDED) revert BadStatus(m.status);
        if (block.timestamp >= m.admissionDeadline) revert AdmissionClosed();
        if (msg.value != m.entryAmount) revert WrongAmount(m.entryAmount, msg.value);
        if (_seatPlusOne[matchId][msg.sender] != 0) revert AlreadyJoined();
        if (m.playerCount >= m.capacity) revert MatchFull();
        if (m.allowlistRoot != bytes32(0)) {
            bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
            if (!MerkleProof.verifyCalldata(proof, m.allowlistRoot, leaf)) revert NotAllowlisted();
        }

        _players[matchId].push(msg.sender);
        _seatPlusOne[matchId][msg.sender] = _players[matchId].length;
        m.playerCount += 1;
        m.status = Status.FUNDED;
        totalEscrowed += msg.value;

        emit PlayerJoined(matchId, msg.sender, msg.value, m.playerCount);
    }

    /// @notice Withdraw from a lobby before it locks. Full stake is returned. Works while paused.
    function leaveMatch(bytes32 matchId) external nonReentrant {
        Match storage m = _matches[matchId];
        if (m.status != Status.FUNDED) revert BadStatus(m.status);
        uint256 seat = _seatPlusOne[matchId][msg.sender];
        if (seat == 0) revert NotAPlayer();

        address[] storage players = _players[matchId];
        uint256 last = players.length - 1;
        if (seat - 1 != last) {
            address moved = players[last];
            players[seat - 1] = moved;
            _seatPlusOne[matchId][moved] = seat;
        }
        players.pop();
        delete _seatPlusOne[matchId][msg.sender];
        m.playerCount -= 1;
        if (m.playerCount == 0) m.status = Status.CREATED;

        uint256 amount = m.entryAmount;
        totalEscrowed -= amount;
        emit PlayerLeft(matchId, msg.sender, amount, m.playerCount);
        _pushOrCredit(msg.sender, amount);
    }

    /// @notice Freeze the roster: exactly the current on-chain depositors, read from storage and
    ///         sorted here. Taking no roster argument means a last-moment join or leave cannot make
    ///         the lock revert (griefing); whoever has deposited at this block is in the match.
    ///         The sorted roster is emitted so the game server seats exactly these wallets.
    function lockMatch(bytes32 matchId) external onlyRole(OPERATOR_ROLE) whenNotPaused returns (address[] memory roster) {
        Match storage m = _matches[matchId];
        if (m.status != Status.FUNDED) revert BadStatus(m.status);
        if (block.timestamp >= m.admissionDeadline) revert AdmissionClosed();
        uint256 n = m.playerCount;
        if (n < MIN_PLAYERS) revert RosterMismatch();

        roster = _players[matchId];
        for (uint256 i = 1; i < n; ++i) {
            address key = roster[i];
            uint256 k = i;
            while (k > 0 && roster[k - 1] > key) {
                roster[k] = roster[k - 1];
                --k;
            }
            roster[k] = key;
        }

        bytes32 rosterHash = keccak256(abi.encodePacked(roster));
        uint64 resultDeadline = uint64(block.timestamp) + maxMatchDuration;
        m.rosterHash = rosterHash;
        m.resultDeadline = resultDeadline;
        m.disputeWindow = disputeWindow;
        m.status = Status.LOCKED;

        emit MatchLocked(matchId, rosterHash, roster, uint256(m.entryAmount) * n, resultDeadline, disputeWindow);
    }

    /// @notice Record the certified champion. Callable by anyone (e.g. a relayer) because authority
    ///         comes from `signatures`: at least `signerThreshold` distinct authorized signers over the
    ///         EIP-712 MatchResult, ordered by strictly ascending recovered signer address.
    ///         Deliberately NOT pausable: a pause must never run out the result deadline and turn a
    ///         legitimate win into a refund. The dispute window still guards every submitted result.
    function submitResult(bytes32 matchId, address winner, bytes32 resultHash, bytes[] calldata signatures)
        external
    {
        Match storage m = _matches[matchId];
        if (m.status != Status.LOCKED) revert BadStatus(m.status);
        if (block.timestamp > m.resultDeadline) revert ResultWindowClosed();
        if (_seatPlusOne[matchId][winner] == 0) revert NotAPlayer();

        bytes32 digest = hashMatchResult(matchId, winner, m.rosterHash, resultHash, signerSetVersion, m.resultNonce);
        _verifySignatures(digest, signatures);

        m.winner = winner;
        m.resultHash = resultHash;
        m.resultSubmittedAt = uint64(block.timestamp);
        m.status = Status.RESULT_FINAL;

        emit ResultSubmitted(
            matchId, winner, resultHash, signerSetVersion, uint64(block.timestamp) + m.disputeWindow
        );
    }

    /// @notice Guardian rejects a submitted result during its dispute window. The match returns to
    ///         LOCKED so a corrected result can be submitted, or it can be aborted and refunded.
    function vetoResult(bytes32 matchId, bytes32 reason) external onlyRole(GUARDIAN_ROLE) {
        Match storage m = _matches[matchId];
        if (m.status != Status.RESULT_FINAL) revert BadStatus(m.status);
        if (block.timestamp >= uint256(m.resultSubmittedAt) + m.disputeWindow) revert DisputeWindowClosed();

        m.winner = address(0);
        m.resultHash = bytes32(0);
        m.resultSubmittedAt = 0;
        m.resultNonce += 1; // invalidates the vetoed signatures; co-signers must sign afresh
        m.status = Status.LOCKED;
        uint64 floorDeadline = uint64(block.timestamp) + RESUBMIT_GRACE;
        if (m.resultDeadline < floorDeadline) m.resultDeadline = floorDeadline;

        emit ResultVetoed(matchId, msg.sender, reason, m.resultDeadline);
    }

    /// @notice Pay out a final result after its dispute window. Callable by anyone; exactly once.
    ///         Blocked while paused, but only for up to PAUSED_FINALIZE_DELAY past the dispute window.
    function finalizeSettlement(bytes32 matchId) external nonReentrant {
        Match storage m = _matches[matchId];
        if (m.status != Status.RESULT_FINAL) revert BadStatus(m.status);
        uint64 finalizableAt = m.resultSubmittedAt + m.disputeWindow;
        if (block.timestamp < finalizableAt) revert DisputeWindowOpen(finalizableAt);
        if (paused() && block.timestamp < uint256(finalizableAt) + PAUSED_FINALIZE_DELAY) revert EnforcedPause();

        (uint256 pot, uint256 championAmount, uint256 houseAmount) = splitPot(m.entryAmount, m.playerCount);
        address champion = m.winner;

        // Effects before interactions.
        m.status = Status.SETTLED;
        totalEscrowed -= pot;
        emit MatchSettled(matchId, champion, championAmount, houseAmount);

        _pushOrCredit(champion, championAmount);
        _pushOrCredit(treasury, houseAmount);
    }

    /// @notice Abort a match so every player can be refunded in full.
    ///         - Operator: any time before lock.
    ///         - Guardian: after lock (LOCKED or RESULT_FINAL within dispute handling).
    ///         - Anyone: pre-lock once the admission deadline passes, or post-lock once the result
    ///           deadline passes without a submitted result. Not pausable.
    function abortMatch(bytes32 matchId) external {
        Match storage m = _matches[matchId];
        Status s = m.status;
        AbortReason reason;

        if (s == Status.CREATED || s == Status.FUNDED) {
            if (hasRole(OPERATOR_ROLE, msg.sender) || hasRole(GUARDIAN_ROLE, msg.sender)) {
                reason = AbortReason.OPERATOR_CANCELLED;
            } else if (block.timestamp >= m.admissionDeadline) {
                reason = AbortReason.ADMISSION_EXPIRED;
            } else {
                revert NotAbortable();
            }
        } else if (s == Status.LOCKED) {
            if (hasRole(GUARDIAN_ROLE, msg.sender)) {
                reason = AbortReason.GUARDIAN_INCIDENT;
            } else if (block.timestamp > m.resultDeadline) {
                reason = AbortReason.RESULT_EXPIRED;
            } else {
                revert NotAbortable();
            }
        } else if (s == Status.RESULT_FINAL) {
            // Only a guardian, and only while the result is still disputable.
            if (!hasRole(GUARDIAN_ROLE, msg.sender)) revert NotAbortable();
            if (block.timestamp >= uint256(m.resultSubmittedAt) + m.disputeWindow) revert DisputeWindowClosed();
            reason = AbortReason.GUARDIAN_INCIDENT;
        } else {
            revert BadStatus(s);
        }

        m.winner = address(0);
        m.refundsRemaining = m.playerCount;
        if (m.playerCount == 0) {
            m.status = Status.REFUNDED;
            emit MatchAborted(matchId, reason, msg.sender);
            emit MatchFullyRefunded(matchId);
        } else {
            m.status = Status.ABORTED;
            emit MatchAborted(matchId, reason, msg.sender);
        }
    }

    /// @notice Refund your own stake from an aborted match.
    function claimRefund(bytes32 matchId) external nonReentrant {
        _refund(matchId, msg.sender);
    }

    /// @notice Refund a player's stake to that player's own address (relayer-friendly; funds can only
    ///         go to the depositing address). Works while paused.
    function claimRefundFor(bytes32 matchId, address player) external nonReentrant {
        _refund(matchId, player);
    }

    /// @notice Withdraw your pull-payment balance (payout or refund whose push failed).
    function claim() external nonReentrant {
        _claim(msg.sender);
    }

    /// @notice Pay out `account`'s pull balance to `account` itself, forwarding all gas. Lets a
    ///         relayer rescue funds for contract wallets that cannot make the claim call themselves.
    function claimFor(address account) external nonReentrant {
        _claim(account);
    }

    // ───────────────────────────── Governance ─────────────────────────────

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Rotate the result signer set. `signers_` must be strictly ascending. Bumps the
    ///         version, which invalidates every signature produced for the previous set.
    function setSigners(address[] calldata signers_, uint8 threshold_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setSigners(signers_, threshold_);
    }

    function setTreasury(address treasury_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTreasury(treasury_);
    }

    /// @dev Applies to matches locked after the change; in-flight matches keep their snapshot.
    function setDisputeWindow(uint32 window) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDisputeWindow(window);
    }

    /// @dev Applies to matches locked after the change.
    function setMaxMatchDuration(uint64 duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setMaxMatchDuration(duration);
    }

    // ───────────────────────────── Views ─────────────────────────────

    /// @notice Published split rule. House = floor(pot * 10%); champion = remainder (receives any dust).
    function splitPot(uint256 entryAmount, uint256 playerCount)
        public
        pure
        returns (uint256 pot, uint256 championAmount, uint256 houseAmount)
    {
        pot = entryAmount * playerCount;
        houseAmount = (pot * HOUSE_BPS) / BPS;
        championAmount = pot - houseAmount;
    }

    function hashMatchResult(
        bytes32 matchId,
        address winner,
        bytes32 rosterHash,
        bytes32 resultHash,
        uint64 version,
        uint32 resultNonce
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(MATCH_RESULT_TYPEHASH, matchId, winner, rosterHash, resultHash, version, resultNonce))
        );
    }

    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return _matches[matchId];
    }

    function getPlayers(bytes32 matchId) external view returns (address[] memory) {
        return _players[matchId];
    }

    function isPlayer(bytes32 matchId, address account) external view returns (bool) {
        return _seatPlusOne[matchId][account] != 0;
    }

    function getSigners() external view returns (address[] memory) {
        return _signers;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ───────────────────────────── Internals ─────────────────────────────

    function _claim(address account) private {
        uint256 amount = claimable[account];
        if (amount == 0) revert NothingToClaim();
        claimable[account] = 0;
        totalClaimable -= amount;
        emit Claimed(account, amount);
        (bool ok,) = payable(account).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _refund(bytes32 matchId, address player) private {
        Match storage m = _matches[matchId];
        if (m.status != Status.ABORTED) revert BadStatus(m.status);
        if (_seatPlusOne[matchId][player] == 0) revert NotAPlayer();
        if (refundClaimed[matchId][player]) revert RefundAlreadyClaimed();

        refundClaimed[matchId][player] = true;
        m.refundsRemaining -= 1;
        uint256 amount = m.entryAmount;
        totalEscrowed -= amount;
        emit RefundIssued(matchId, player, amount);
        if (m.refundsRemaining == 0) {
            m.status = Status.REFUNDED;
            emit MatchFullyRefunded(matchId);
        }
        _pushOrCredit(player, amount);
    }

    /// @dev Attempts a gas-limited push; on failure credits a pull balance. Never reverts on a
    ///      rejecting recipient, so one bad recipient cannot block settlement for others.
    function _pushOrCredit(address to, uint256 amount) private {
        if (amount == 0) return;
        // Caller must supply enough gas that the recipient really gets PUSH_GAS_LIMIT (63/64 rule);
        // otherwise a griefer could starve the push and force every winner into a manual claim.
        if (gasleft() < (PUSH_GAS_LIMIT * 64) / 63 + PUSH_GAS_RESERVE) revert InsufficientGas();
        (bool ok,) = payable(to).call{value: amount, gas: PUSH_GAS_LIMIT}("");
        if (ok) {
            emit PaymentPushed(to, amount);
        } else {
            claimable[to] += amount;
            totalClaimable += amount;
            emit PaymentCredited(to, amount);
        }
    }

    function _verifySignatures(bytes32 digest, bytes[] calldata signatures) private view {
        uint256 n = signatures.length;
        if (n < signerThreshold) revert BadSignatures();
        address prev = address(0);
        for (uint256 i; i < n; ++i) {
            (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signatures[i]);
            if (err != ECDSA.RecoverError.NoError || recovered <= prev || !isSigner[recovered]) {
                revert BadSignatures();
            }
            prev = recovered;
        }
    }

    function _setSigners(address[] memory signers_, uint8 threshold_) private {
        uint256 n = signers_.length;
        if (n == 0 || n > MAX_SIGNERS || threshold_ == 0 || threshold_ > n) revert BadSignerSet();
        for (uint256 i; i < _signers.length; ++i) {
            isSigner[_signers[i]] = false;
        }
        address prev = address(0);
        for (uint256 i; i < n; ++i) {
            address s = signers_[i];
            if (s <= prev) revert BadSignerSet(); // strictly ascending, non-zero, unique
            isSigner[s] = true;
            prev = s;
        }
        _signers = signers_;
        signerThreshold = threshold_;
        signerSetVersion += 1;
        emit SignersUpdated(signers_, threshold_, signerSetVersion);
    }

    function _setTreasury(address treasury_) private {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function _setDisputeWindow(uint32 window) private {
        if (window < MIN_DISPUTE_WINDOW || window > MAX_DISPUTE_WINDOW) revert BadParam();
        disputeWindow = window;
        emit DisputeWindowUpdated(window);
    }

    function _setMaxMatchDuration(uint64 duration) private {
        if (duration < MIN_MATCH_DURATION || duration > MAX_MATCH_DURATION) revert BadParam();
        maxMatchDuration = duration;
        emit MaxMatchDurationUpdated(duration);
    }
}

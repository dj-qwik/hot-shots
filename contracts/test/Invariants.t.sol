// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {EscrowBase} from "./Base.t.sol";
import {HotShotsEscrow} from "../src/HotShotsEscrow.sol";

/// Drives random sequences of lifecycle actions against one escrow and tracks expected totals.
contract Handler is Test {
    HotShotsEscrow public escrow;
    address public operator;
    address public guardian;
    address public treasury;
    uint256[] public signerKeys;

    bytes32[] public ids;
    address[] public actors;

    uint256 public ghostDeposited;
    uint256 public ghostPaidOut; // pushed + claimed (everything that left the contract)
    uint256 public ghostHouseReceived;
    uint256 public ghostPotsSettled;
    mapping(bytes32 => uint256) public settleCount;

    constructor(HotShotsEscrow e, address op, address g, address t, uint256[] memory keys) {
        escrow = e;
        operator = op;
        guardian = g;
        treasury = t;
        signerKeys = keys;
        for (uint256 i; i < 10; ++i) {
            address a = address(uint160(0xA0000 + i));
            actors.push(a);
            vm.deal(a, 1_000 ether);
        }
    }

    function idsLength() external view returns (uint256) {
        return ids.length;
    }

    function _id(uint256 seed) internal view returns (bytes32) {
        return ids[seed % ids.length];
    }

    function _balancesOut() internal view returns (uint256 s) {
        for (uint256 i; i < actors.length; ++i) s += actors[i].balance;
        s += treasury.balance;
    }

    modifier track() {
        uint256 before = _balancesOut();
        uint256 tb = treasury.balance;
        _;
        uint256 afterBal = _balancesOut();
        if (afterBal > before) ghostPaidOut += afterBal - before;
        if (treasury.balance > tb) ghostHouseReceived += treasury.balance - tb;
    }

    function create(uint8 cap, uint64 stakeSeed) external {
        cap = uint8(bound(cap, 2, 10));
        uint128 stake = uint128(bound(stakeSeed, 1, 5 ether));
        bytes32 id = keccak256(abi.encode(ids.length, cap, stake));
        vm.prank(operator);
        escrow.createMatch(id, HotShotsEscrow.MatchConfig(stake, cap, uint64(block.timestamp + 1 hours), 0), 0);
        ids.push(id);
    }

    function join(uint256 idSeed, uint256 actorSeed) external {
        if (ids.length == 0) return;
        bytes32 id = _id(idSeed);
        address a = actors[actorSeed % actors.length];
        uint128 stake = escrow.getMatch(id).entryAmount;
        vm.prank(a);
        try escrow.joinMatch{value: stake}(id, new bytes32[](0)) {
            ghostDeposited += stake;
        } catch {}
    }

    function leave(uint256 idSeed, uint256 actorSeed) external track {
        if (ids.length == 0) return;
        vm.prank(actors[actorSeed % actors.length]);
        try escrow.leaveMatch(_id(idSeed)) {} catch {}
    }

    function lock(uint256 idSeed) external {
        if (ids.length == 0) return;
        bytes32 id = _id(idSeed);
        vm.prank(operator);
        try escrow.lockMatch(id) {} catch {}
    }

    function submit(uint256 idSeed, uint256 winnerSeed) external {
        if (ids.length == 0) return;
        bytes32 id = _id(idSeed);
        address[] memory r = escrow.getPlayers(id);
        if (r.length == 0) return;
        address w = r[winnerSeed % r.length];
        HotShotsEscrow.Match memory m = escrow.getMatch(id);
        bytes32 rh = keccak256(abi.encode(id, w));
        bytes32 d = escrow.hashMatchResult(id, w, m.rosterHash, rh, escrow.signerSetVersion(), m.resultNonce);
        bytes[] memory sigs = new bytes[](2);
        for (uint256 i; i < 2; ++i) {
            (uint8 v, bytes32 rr, bytes32 s) = vm.sign(signerKeys[i], d);
            sigs[i] = abi.encodePacked(rr, s, v);
        }
        try escrow.submitResult(id, w, rh, sigs) {} catch {}
    }

    function finalize(uint256 idSeed) external track {
        if (ids.length == 0) return;
        bytes32 id = _id(idSeed);
        HotShotsEscrow.Match memory m = escrow.getMatch(id);
        try escrow.finalizeSettlement(id) {
            settleCount[id] += 1;
            ghostPotsSettled += uint256(m.entryAmount) * m.playerCount;
        } catch {}
    }

    function veto(uint256 idSeed) external {
        if (ids.length == 0) return;
        vm.prank(guardian);
        try escrow.vetoResult(_id(idSeed), "fuzz") {} catch {}
    }

    function abort(uint256 idSeed, bool asGuardian) external {
        if (ids.length == 0) return;
        vm.prank(asGuardian ? guardian : operator);
        try escrow.abortMatch(_id(idSeed)) {} catch {}
    }

    function refund(uint256 idSeed, uint256 actorSeed) external track {
        if (ids.length == 0) return;
        try escrow.claimRefundFor(_id(idSeed), actors[actorSeed % actors.length]) {} catch {}
    }

    /// Directed path: a whole match in one call, so settlement is exercised every run.
    /// `stopAt` leaves it in an intermediate state for the random actions to interfere with.
    function fullMatch(uint8 n, uint256 winnerSeed, uint64 stakeSeed, uint8 stopAt) external {
        n = uint8(bound(n, 2, 10));
        this.create(n, stakeSeed);
        uint256 idx = ids.length - 1;
        for (uint256 i; i < n; ++i) this.join(idx, i);
        if (stopAt % 5 == 0) return;
        this.lock(idx);
        if (stopAt % 5 == 1) return;
        this.submit(idx, winnerSeed);
        if (stopAt % 5 == 2) return;
        vm.warp(block.timestamp + 1 hours);
        this.finalize(idx);
    }

    function warp(uint32 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 6 hours));
    }
}

contract EscrowInvariants is EscrowBase {
    Handler internal h;

    function setUp() public override {
        super.setUp();
        h = new Handler(escrow, operator, guardian, treasury, signerKeys);
        targetContract(address(h));
    }

    /// Contract always holds exactly what it owes: live stakes + pull balances.
    function invariant_solvency() public view {
        assertEq(address(escrow).balance, escrow.totalEscrowed() + escrow.totalClaimable());
    }

    /// Conservation: everything deposited is either still held or has left to players/treasury.
    function invariant_conservation() public view {
        assertEq(h.ghostDeposited(), address(escrow).balance + h.ghostPaidOut());
    }

    /// House never receives more than 10% of settled pots.
    function invariant_houseCapped() public view {
        assertLe(h.ghostHouseReceived() * 10, h.ghostPotsSettled());
    }

    /// No match ever settles twice, and settled matches have a winner on the roster.
    function invariant_settleOnce() public view {
        uint256 n = h.idsLength();
        for (uint256 i; i < n; ++i) {
            bytes32 id = h.ids(i);
            assertLe(h.settleCount(id), 1);
            HotShotsEscrow.Match memory m = escrow.getMatch(id);
            if (m.status == HotShotsEscrow.Status.SETTLED) {
                assertTrue(escrow.isPlayer(id, m.winner));
            }
        }
    }
}

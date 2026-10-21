// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {HotShotsEscrow} from "../src/HotShotsEscrow.sol";

contract RejectingReceiver {
    function join(HotShotsEscrow e, bytes32 id) external payable {
        e.joinMatch{value: msg.value}(id, new bytes32[](0));
    }

    function leave(HotShotsEscrow e, bytes32 id) external {
        e.leaveMatch(id);
    }

    function claim(HotShotsEscrow e) external {
        e.claim();
    }
    // no receive(): every push to this contract fails
}

contract ReentrantReceiver {
    HotShotsEscrow public escrow;
    bytes32 public id;
    uint256 public reentryAttempts;
    bool public acceptFunds;

    constructor(HotShotsEscrow e) {
        escrow = e;
    }

    function join(bytes32 id_) external payable {
        id = id_;
        escrow.joinMatch{value: msg.value}(id_, new bytes32[](0));
    }

    function setAccept(bool a) external {
        acceptFunds = a;
    }

    function claim() external {
        escrow.claim();
    }

    receive() external payable {
        reentryAttempts++;
        // Try every value-moving entry point; all are nonReentrant.
        try escrow.finalizeSettlement(id) {} catch {}
        try escrow.claimRefund(id) {} catch {}
        try escrow.claim() {} catch {}
        if (!acceptFunds) revert("no");
    }
}

abstract contract EscrowBase is Test {
    uint256 internal constant CHAIN = 46630; // Robinhood Chain testnet
    uint32 internal constant DISPUTE = 1 hours;
    uint64 internal constant MAX_DURATION = 3 hours;
    uint128 internal constant STAKE = 0.01 ether;

    HotShotsEscrow internal escrow;
    address internal admin = makeAddr("admin");
    address internal operator = makeAddr("operator");
    address internal guardian = makeAddr("guardian");
    address internal treasury = makeAddr("treasury");

    uint256[] internal signerKeys; // sorted by address
    address[] internal signerAddrs;

    function setUp() public virtual {
        vm.chainId(CHAIN);
        vm.warp(1_800_000_000);

        // 3 signers, 2-of-3 threshold. Sort by address.
        uint256[3] memory keys = [uint256(0xA11CE), uint256(0xB0B), uint256(0xCA401)];
        for (uint256 i; i < 3; ++i) {
            signerKeys.push(keys[i]);
            signerAddrs.push(vm.addr(keys[i]));
        }
        _sortSigners();

        escrow = new HotShotsEscrow(CHAIN, admin, 2 days, treasury, signerAddrs, 2, DISPUTE, MAX_DURATION);
        bytes32 opRole = escrow.OPERATOR_ROLE();
        bytes32 gRole = escrow.GUARDIAN_ROLE();
        vm.startPrank(admin);
        escrow.grantRole(opRole, operator);
        escrow.grantRole(gRole, guardian);
        vm.stopPrank();
    }

    function _sortSigners() internal {
        uint256 n = signerAddrs.length;
        for (uint256 i; i < n; ++i) {
            for (uint256 j = i + 1; j < n; ++j) {
                if (signerAddrs[j] < signerAddrs[i]) {
                    (signerAddrs[i], signerAddrs[j]) = (signerAddrs[j], signerAddrs[i]);
                    (signerKeys[i], signerKeys[j]) = (signerKeys[j], signerKeys[i]);
                }
            }
        }
    }

    function _cfg(uint8 cap) internal view returns (HotShotsEscrow.MatchConfig memory) {
        return HotShotsEscrow.MatchConfig({
            entryAmount: STAKE,
            capacity: cap,
            admissionDeadline: uint64(block.timestamp + 10 minutes),
            configHash: keccak256("rules-v1")
        });
    }

    function _create(bytes32 id, uint8 cap) internal {
        vm.prank(operator);
        escrow.createMatch(id, _cfg(cap), bytes32(0));
    }

    function _player(uint256 i) internal returns (address p) {
        p = makeAddr(string.concat("player", vm.toString(i)));
        vm.deal(p, 10 ether);
    }

    function _join(bytes32 id, address p) internal {
        vm.prank(p);
        escrow.joinMatch{value: STAKE}(id, new bytes32[](0));
    }

    function _sorted(address[] memory a) internal pure returns (address[] memory) {
        for (uint256 i; i < a.length; ++i) {
            for (uint256 j = i + 1; j < a.length; ++j) {
                if (a[j] < a[i]) (a[i], a[j]) = (a[j], a[i]);
            }
        }
        return a;
    }

    /// Creates, fills and locks a match with n players. Returns sorted roster.
    function _lockedMatch(bytes32 id, uint8 n) internal returns (address[] memory roster) {
        _create(id, n);
        roster = new address[](n);
        for (uint256 i; i < n; ++i) {
            roster[i] = _player(i);
            _join(id, roster[i]);
        }
        roster = _sorted(roster);
        vm.prank(operator);
        escrow.lockMatch(id);
    }

    function _sig(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    /// Signatures from signer indexes (must be ascending to be valid).
    function _sigs(bytes32 id, address winner, bytes32 resultHash, uint256[] memory idx)
        internal
        view
        returns (bytes[] memory out)
    {
        HotShotsEscrow.Match memory m = escrow.getMatch(id);
        bytes32 digest =
            escrow.hashMatchResult(id, winner, m.rosterHash, resultHash, escrow.signerSetVersion(), m.resultNonce);
        out = new bytes[](idx.length);
        for (uint256 i; i < idx.length; ++i) {
            out[i] = _sig(signerKeys[idx[i]], digest);
        }
    }

    function _two() internal pure returns (uint256[] memory a) {
        a = new uint256[](2);
        a[0] = 0;
        a[1] = 1;
    }

    function _submit(bytes32 id, address winner) internal {
        bytes32 rh = keccak256("evidence");
        escrow.submitResult(id, winner, rh, _sigs(id, winner, rh, _two()));
    }
}

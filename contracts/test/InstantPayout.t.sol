// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {EscrowBase, RejectingReceiver} from "./Base.t.sol";
import {HotShotsEscrow} from "../src/HotShotsEscrow.sol";

/// Zero dispute window = instant settlement: the co-signed result pays out in submitResult itself.
contract InstantPayoutTest is EscrowBase {
    bytes32 constant ID = keccak256("instant-1");

    function setUp() public override {
        super.setUp();
        vm.prank(admin);
        escrow.setDisputeWindow(0);
    }

    function test_deploy_acceptsZeroWindow_rejectsShortNonZero() public {
        HotShotsEscrow e = new HotShotsEscrow(CHAIN, admin, 2 days, treasury, signerAddrs, 2, 0, MAX_DURATION);
        assertEq(e.disputeWindow(), 0);
        vm.expectRevert(HotShotsEscrow.BadParam.selector);
        new HotShotsEscrow(CHAIN, admin, 2 days, treasury, signerAddrs, 2, 30 minutes, MAX_DURATION);
    }

    function test_submitResult_paysChampionImmediately() public {
        address[] memory roster = _lockedMatch(ID, 2);
        address champ = roster[1];
        uint256 c0 = champ.balance;
        _submit(ID, champ);
        assertEq(champ.balance - c0, 0.018 ether);
        assertEq(treasury.balance, 0.002 ether);
        assertEq(address(escrow).balance, 0);
        assertEq(escrow.totalEscrowed(), 0);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.SETTLED));
        vm.expectRevert(abi.encodeWithSelector(HotShotsEscrow.BadStatus.selector, HotShotsEscrow.Status.SETTLED));
        escrow.finalizeSettlement(ID);
    }

    function test_noVetoOnInstantResult() public {
        address[] memory roster = _lockedMatch(ID, 2);
        _submit(ID, roster[0]);
        vm.prank(guardian);
        vm.expectRevert(abi.encodeWithSelector(HotShotsEscrow.BadStatus.selector, HotShotsEscrow.Status.SETTLED));
        escrow.vetoResult(ID, "late");
    }

    function test_paused_resultWaitsThenFinalizesAfterUnpause() public {
        address[] memory roster = _lockedMatch(ID, 2);
        vm.prank(guardian);
        escrow.pause();
        _submit(ID, roster[0]); // not pausable: recorded, but not paid while paused
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.RESULT_FINAL));
        vm.prank(admin);
        escrow.unpause();
        uint256 c0 = roster[0].balance;
        escrow.finalizeSettlement(ID);
        assertEq(roster[0].balance - c0, 0.018 ether);
    }

    function test_windowSnapshottedAtLock() public {
        address[] memory roster = _lockedMatch(ID, 2); // locked with window 0
        vm.prank(admin);
        escrow.setDisputeWindow(1 hours);
        _submit(ID, roster[0]);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.SETTLED));
    }
}

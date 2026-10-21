// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {EscrowBase, RejectingReceiver, ReentrantReceiver} from "./Base.t.sol";
import {HotShotsEscrow} from "../src/HotShotsEscrow.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract HotShotsEscrowTest is EscrowBase {
    bytes32 constant ID = keccak256("match-1");

    // ───────── deployment ─────────

    function test_deploy_revertsOnWrongChain() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(HotShotsEscrow.WrongChain.selector, CHAIN, 1));
        new HotShotsEscrow(CHAIN, admin, 2 days, treasury, signerAddrs, 2, DISPUTE, MAX_DURATION);
    }

    function test_deploy_rejectsShortDisputeWindow() public {
        vm.expectRevert(HotShotsEscrow.BadParam.selector);
        new HotShotsEscrow(CHAIN, admin, 2 days, treasury, signerAddrs, 2, 59 minutes, MAX_DURATION);
    }

    function test_deploy_rejectsBadSignerSets() public {
        address[] memory unsorted = new address[](2);
        unsorted[0] = signerAddrs[1];
        unsorted[1] = signerAddrs[0];
        vm.expectRevert(HotShotsEscrow.BadSignerSet.selector);
        new HotShotsEscrow(CHAIN, admin, 2 days, treasury, unsorted, 1, DISPUTE, MAX_DURATION);

        vm.expectRevert(HotShotsEscrow.BadSignerSet.selector);
        new HotShotsEscrow(CHAIN, admin, 2 days, treasury, signerAddrs, 4, DISPUTE, MAX_DURATION);
    }

    // ───────── create ─────────

    function test_create_onlyOperator() public {
        HotShotsEscrow.MatchConfig memory cfg = _cfg(8);
        vm.expectRevert();
        escrow.createMatch(ID, cfg, bytes32(0));
    }

    function test_create_rejectsBadConfig() public {
        HotShotsEscrow.MatchConfig memory c = _cfg(1);
        vm.startPrank(operator);
        vm.expectRevert(HotShotsEscrow.BadConfig.selector);
        escrow.createMatch(ID, c, bytes32(0));
        c = _cfg(17);
        vm.expectRevert(HotShotsEscrow.BadConfig.selector);
        escrow.createMatch(ID, c, bytes32(0));
        c = _cfg(8);
        c.entryAmount = 0;
        vm.expectRevert(HotShotsEscrow.BadConfig.selector);
        escrow.createMatch(ID, c, bytes32(0));
        c = _cfg(8);
        c.admissionDeadline = uint64(block.timestamp);
        vm.expectRevert(HotShotsEscrow.BadConfig.selector);
        escrow.createMatch(ID, c, bytes32(0));
        c = _cfg(8);
        escrow.createMatch(ID, c, bytes32(0));
        vm.expectRevert(HotShotsEscrow.MatchExists.selector);
        escrow.createMatch(ID, c, bytes32(0));
        vm.stopPrank();
    }

    // ───────── join / leave ─────────

    function test_join_happyPathAndAccounting() public {
        _create(ID, 4);
        for (uint256 i; i < 4; ++i) _join(ID, _player(i));
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.FUNDED));
        assertEq(escrow.totalEscrowed(), 4 * STAKE);
        assertEq(address(escrow).balance, 4 * STAKE);
    }

    function test_join_rejections() public {
        _create(ID, 2);
        address p = _player(0);
        vm.prank(p);
        vm.expectRevert(abi.encodeWithSelector(HotShotsEscrow.WrongAmount.selector, STAKE, STAKE - 1));
        escrow.joinMatch{value: STAKE - 1}(ID, new bytes32[](0));

        _join(ID, p);
        vm.prank(p);
        vm.expectRevert(HotShotsEscrow.AlreadyJoined.selector);
        escrow.joinMatch{value: STAKE}(ID, new bytes32[](0));

        _join(ID, _player(1));
        address late = _player(2);
        vm.prank(late);
        vm.expectRevert(HotShotsEscrow.MatchFull.selector);
        escrow.joinMatch{value: STAKE}(ID, new bytes32[](0));
    }

    function test_join_afterDeadlineReverts() public {
        _create(ID, 4);
        vm.warp(block.timestamp + 10 minutes);
        address p = _player(0);
        vm.prank(p);
        vm.expectRevert(HotShotsEscrow.AdmissionClosed.selector);
        escrow.joinMatch{value: STAKE}(ID, new bytes32[](0));
    }

    function test_join_allowlist() public {
        address a = _player(0);
        address b = _player(1);
        address outsider = _player(2);
        bytes32 la = keccak256(bytes.concat(keccak256(abi.encode(a))));
        bytes32 lb = keccak256(bytes.concat(keccak256(abi.encode(b))));
        bytes32 root = la < lb ? keccak256(abi.encodePacked(la, lb)) : keccak256(abi.encodePacked(lb, la));

        vm.prank(operator);
        escrow.createMatch(ID, _cfg(4), root);

        bytes32[] memory proofA = new bytes32[](1);
        proofA[0] = lb;
        vm.prank(a);
        escrow.joinMatch{value: STAKE}(ID, proofA);

        vm.prank(outsider);
        vm.expectRevert(HotShotsEscrow.NotAllowlisted.selector);
        escrow.joinMatch{value: STAKE}(ID, proofA);
    }

    function test_leave_refundsAndReindexes() public {
        _create(ID, 4);
        address p0 = _player(0);
        address p1 = _player(1);
        address p2 = _player(2);
        _join(ID, p0);
        _join(ID, p1);
        _join(ID, p2);

        uint256 before = p0.balance;
        vm.prank(p0);
        escrow.leaveMatch(ID);
        assertEq(p0.balance, before + STAKE);
        assertFalse(escrow.isPlayer(ID, p0));
        assertTrue(escrow.isPlayer(ID, p2));
        assertEq(escrow.getPlayers(ID).length, 2);
        assertEq(escrow.totalEscrowed(), 2 * STAKE);

        // p2 (moved into seat 0) can still leave cleanly
        vm.prank(p2);
        escrow.leaveMatch(ID);
        vm.prank(p1);
        escrow.leaveMatch(ID);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.CREATED));
        assertEq(address(escrow).balance, 0);
    }

    function test_leave_notAfterLock() public {
        address[] memory roster = _lockedMatch(ID, 2);
        vm.prank(roster[0]);
        vm.expectRevert(abi.encodeWithSelector(HotShotsEscrow.BadStatus.selector, HotShotsEscrow.Status.LOCKED));
        escrow.leaveMatch(ID);
    }

    // ───────── lock ─────────

    function test_lock_usesOnchainRosterSorted() public {
        _create(ID, 4);
        address[] memory ps = new address[](3);
        for (uint256 i; i < 3; ++i) {
            ps[i] = _player(i);
            _join(ID, ps[i]);
        }
        vm.prank(operator);
        escrow.lockMatch(ID);
        HotShotsEscrow.Match memory m = escrow.getMatch(ID);
        assertEq(uint8(m.status), uint8(HotShotsEscrow.Status.LOCKED));
        assertEq(m.rosterHash, keccak256(abi.encodePacked(_sorted(ps))));
        assertEq(m.disputeWindow, DISPUTE);
    }

    /// Review M-1: a last-moment leave or join can no longer make lock revert.
    function test_lock_cannotBeGriefedByLeaveOrJoin() public {
        _create(ID, 8);
        address[] memory ps = new address[](4);
        for (uint256 i; i < 4; ++i) {
            ps[i] = _player(i);
            _join(ID, ps[i]);
        }
        vm.prank(ps[2]);
        escrow.leaveMatch(ID); // front-run
        _join(ID, _player(7)); // front-run
        vm.prank(operator);
        escrow.lockMatch(ID);
        assertEq(escrow.getMatch(ID).playerCount, 4);
        assertFalse(escrow.isPlayer(ID, ps[2]));
        assertTrue(escrow.isPlayer(ID, _player(7)));
    }

    function test_lock_needsTwoPlayers() public {
        _create(ID, 4);
        address p = _player(0);
        _join(ID, p);
        vm.prank(operator);
        vm.expectRevert(HotShotsEscrow.RosterMismatch.selector);
        escrow.lockMatch(ID);
    }

    // ───────── results ─────────

    function test_result_requiresThresholdOfDistinctSortedSigners() public {
        address[] memory roster = _lockedMatch(ID, 3);
        address w = roster[1];
        bytes32 rh = keccak256("evidence");

        {
            uint256[] memory one = new uint256[](1);
            one[0] = 0;
            bytes[] memory s1 = _sigs(ID, w, rh, one);
            vm.expectRevert(HotShotsEscrow.BadSignatures.selector);
            escrow.submitResult(ID, w, rh, s1);
        }

        {
            uint256[] memory dup = new uint256[](2);
            bytes[] memory sd = _sigs(ID, w, rh, dup); // [0,0]
            vm.expectRevert(HotShotsEscrow.BadSignatures.selector);
            escrow.submitResult(ID, w, rh, sd);
        }

        {
            uint256[] memory rev = new uint256[](2);
            rev[0] = 1;
            rev[1] = 0;
            bytes[] memory sr = _sigs(ID, w, rh, rev);
            vm.expectRevert(HotShotsEscrow.BadSignatures.selector);
            escrow.submitResult(ID, w, rh, sr);
        }

        {
            // non-signer key
            bytes[] memory sn = _sigs(ID, w, rh, _two());
            HotShotsEscrow.Match memory m = escrow.getMatch(ID);
            sn[1] = _sig(0xBAD, escrow.hashMatchResult(ID, w, m.rosterHash, rh, escrow.signerSetVersion(), m.resultNonce));
            vm.expectRevert(HotShotsEscrow.BadSignatures.selector);
            escrow.submitResult(ID, w, rh, sn);
        }

        {
            // signatures for a different winner don't transfer
            bytes[] memory other = _sigs(ID, roster[0], rh, _two());
            vm.expectRevert(HotShotsEscrow.BadSignatures.selector);
            escrow.submitResult(ID, w, rh, other);
        }

        {

        }

        escrow.submitResult(ID, w, rh, _sigs(ID, w, rh, _two()));
        assertEq(escrow.getMatch(ID).winner, w);
    }

    function test_result_winnerMustBeOnRoster() public {
        _lockedMatch(ID, 2);
        address outsider = makeAddr("outsider");
        bytes32 rh = keccak256("e");
        bytes[] memory s = _sigs(ID, outsider, rh, _two());
        vm.expectRevert(HotShotsEscrow.NotAPlayer.selector);
        escrow.submitResult(ID, outsider, rh, s);
    }

    function test_result_signerRotationInvalidatesOldSignatures() public {
        address[] memory roster = _lockedMatch(ID, 2);
        bytes32 rh = keccak256("e");
        bytes[] memory old = _sigs(ID, roster[0], rh, _two());

        vm.prank(admin);
        escrow.setSigners(signerAddrs, 2); // same set, new version
        vm.expectRevert(HotShotsEscrow.BadSignatures.selector);
        escrow.submitResult(ID, roster[0], rh, old);

        escrow.submitResult(ID, roster[0], rh, _sigs(ID, roster[0], rh, _two()));
    }

    function test_result_afterDeadlineReverts() public {
        address[] memory roster = _lockedMatch(ID, 2);
        vm.warp(block.timestamp + MAX_DURATION + 1);
        bytes32 rh = keccak256("e");
        bytes[] memory s = _sigs(ID, roster[0], rh, _two());
        vm.expectRevert(HotShotsEscrow.ResultWindowClosed.selector);
        escrow.submitResult(ID, roster[0], rh, s);
    }

    // ───────── settlement ─────────

    function test_settle_specExample_8x001() public {
        address[] memory roster = _lockedMatch(ID, 8);
        address champ = roster[3];
        _submit(ID, champ);

        vm.expectRevert();
        escrow.finalizeSettlement(ID);

        vm.warp(block.timestamp + DISPUTE);
        uint256 c0 = champ.balance;
        escrow.finalizeSettlement(ID);

        assertEq(champ.balance - c0, 0.072 ether);
        assertEq(treasury.balance, 0.008 ether);
        assertEq(address(escrow).balance, 0);
        assertEq(escrow.totalEscrowed(), 0);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.SETTLED));

        vm.expectRevert(abi.encodeWithSelector(HotShotsEscrow.BadStatus.selector, HotShotsEscrow.Status.SETTLED));
        escrow.finalizeSettlement(ID);
    }

    function test_settle_dustGoesToChampion() public view {
        // 3 players * 7 wei = 21 wei. House = floor(2.1) = 2, champion = 19.
        (uint256 pot, uint256 champ, uint256 house) = escrow.splitPot(7, 3);
        assertEq(pot, 21);
        assertEq(house, 2);
        assertEq(champ, 19);
    }

    function test_settle_rejectingWinnerGetsCreditedAndCanClaimLater() public {
        _create(ID, 2);
        RejectingReceiver bad = new RejectingReceiver();
        vm.deal(address(this), 1 ether);
        bad.join{value: STAKE}(escrow, ID);
        address p = _player(1);
        _join(ID, p);
        address[] memory r = new address[](2);
        (r[0], r[1]) = (address(bad), p);
        r = _sorted(r);
        vm.prank(operator);
        escrow.lockMatch(ID);
        _submit(ID, address(bad));
        vm.warp(block.timestamp + DISPUTE);
        escrow.finalizeSettlement(ID); // must not revert

        uint256 champAmt = (2 * uint256(STAKE)) - (2 * uint256(STAKE)) / 10;
        assertEq(escrow.claimable(address(bad)), champAmt);
        assertEq(escrow.totalClaimable(), champAmt);
        assertEq(address(escrow).balance, champAmt);
        assertEq(treasury.balance, (2 * uint256(STAKE)) / 10);

        vm.expectRevert(HotShotsEscrow.TransferFailed.selector);
        bad.claim(escrow);
    }

    function test_settle_reentrancyCannotDoubleSpend() public {
        _create(ID, 2);
        ReentrantReceiver att = new ReentrantReceiver(escrow);
        vm.deal(address(this), 1 ether);
        att.join{value: STAKE}(ID);
        address p = _player(1);
        _join(ID, p);
        address[] memory r = new address[](2);
        (r[0], r[1]) = (address(att), p);
        r = _sorted(r);
        vm.prank(operator);
        escrow.lockMatch(ID);
        _submit(ID, address(att));
        vm.warp(block.timestamp + DISPUTE);
        escrow.finalizeSettlement(ID); // attacker reverts in receive -> credited

        uint256 champAmt = (2 * uint256(STAKE)) - (2 * uint256(STAKE)) / 10;
        assertEq(escrow.claimable(address(att)), champAmt);

        att.setAccept(true);
        att.claim();
        assertEq(address(att).balance, champAmt);
        assertEq(escrow.claimable(address(att)), 0);
        assertEq(address(escrow).balance, 0);
    }

    // ───────── dispute / veto ─────────

    function test_veto_returnsToLockedAndAllowsCorrectedResult() public {
        address[] memory roster = _lockedMatch(ID, 4);
        _submit(ID, roster[0]);

        vm.expectRevert();
        escrow.vetoResult(ID, "x"); // not guardian

        vm.prank(guardian);
        escrow.vetoResult(ID, "bad telemetry");
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.LOCKED));

        _submit(ID, roster[2]);
        vm.warp(block.timestamp + DISPUTE);
        uint256 b = roster[2].balance;
        escrow.finalizeSettlement(ID);
        assertEq(roster[2].balance - b, 4 * uint256(STAKE) - (4 * uint256(STAKE)) / 10);
    }

    function test_veto_closedAfterWindow() public {
        address[] memory roster = _lockedMatch(ID, 2);
        _submit(ID, roster[0]);
        vm.warp(block.timestamp + DISPUTE);
        vm.prank(guardian);
        vm.expectRevert(HotShotsEscrow.DisputeWindowClosed.selector);
        escrow.vetoResult(ID, "late");
    }

    // ───────── abort / refunds ─────────

    function test_abort_permissionlessAfterAdmissionDeadline() public {
        _create(ID, 4);
        address p0 = _player(0);
        address p1 = _player(1);
        _join(ID, p0);
        _join(ID, p1);

        vm.expectRevert(HotShotsEscrow.NotAbortable.selector);
        escrow.abortMatch(ID);

        vm.warp(block.timestamp + 10 minutes);
        vm.prank(makeAddr("anyone"));
        escrow.abortMatch(ID);

        uint256 b0 = p0.balance;
        vm.prank(makeAddr("relayer"));
        escrow.claimRefundFor(ID, p0);
        assertEq(p0.balance, b0 + STAKE);

        vm.expectRevert(HotShotsEscrow.RefundAlreadyClaimed.selector);
        escrow.claimRefundFor(ID, p0);

        vm.prank(p1);
        escrow.claimRefund(ID);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.REFUNDED));
        assertEq(address(escrow).balance, 0);
        assertEq(escrow.totalEscrowed(), 0);

        vm.expectRevert();
        escrow.claimRefundFor(ID, p1);
    }

    function test_abort_permissionlessAfterResultDeadline() public {
        address[] memory roster = _lockedMatch(ID, 3);
        vm.expectRevert(HotShotsEscrow.NotAbortable.selector);
        escrow.abortMatch(ID);
        vm.warp(block.timestamp + MAX_DURATION + 1);
        escrow.abortMatch(ID);
        for (uint256 i; i < 3; ++i) escrow.claimRefundFor(ID, roster[i]);
        assertEq(address(escrow).balance, 0);
    }

    function test_abort_guardianPostLockAndDuringDispute() public {
        address[] memory roster = _lockedMatch(ID, 2);
        _submit(ID, roster[0]);
        vm.expectRevert(HotShotsEscrow.NotAbortable.selector);
        escrow.abortMatch(ID); // random caller can't abort a disputable result
        vm.prank(guardian);
        escrow.abortMatch(ID);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.ABORTED));
        assertEq(escrow.getMatch(ID).winner, address(0));
    }

    function test_abort_operatorCannotAbortAfterLock() public {
        _lockedMatch(ID, 2);
        vm.prank(operator);
        vm.expectRevert(HotShotsEscrow.NotAbortable.selector);
        escrow.abortMatch(ID);
    }

    function test_abort_emptyLobbyGoesStraightToRefunded() public {
        _create(ID, 4);
        vm.prank(operator);
        escrow.abortMatch(ID);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.REFUNDED));
    }

    function test_noDoubleSettleAfterAbort() public {
        address[] memory roster = _lockedMatch(ID, 2);
        _submit(ID, roster[0]);
        vm.prank(guardian);
        escrow.abortMatch(ID);
        vm.warp(block.timestamp + DISPUTE);
        vm.expectRevert(abi.encodeWithSelector(HotShotsEscrow.BadStatus.selector, HotShotsEscrow.Status.ABORTED));
        escrow.finalizeSettlement(ID);
    }

    // ───────── pause ─────────

    function test_pause_blocksEntryButNotRefunds() public {
        _create(ID, 4);
        address p0 = _player(0);
        _join(ID, p0);
        vm.prank(guardian);
        escrow.pause();

        address p1 = _player(1);
        vm.prank(p1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.joinMatch{value: STAKE}(ID, new bytes32[](0));

        vm.prank(p0);
        escrow.leaveMatch(ID); // still allowed
        assertEq(address(escrow).balance, 0);
    }

    function test_pause_canOnlyDelaySettlementBoundedly() public {
        address[] memory roster = _lockedMatch(ID, 2);
        _submit(ID, roster[0]);
        vm.prank(guardian);
        escrow.pause();
        vm.warp(block.timestamp + DISPUTE);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.finalizeSettlement(ID);

        vm.warp(block.timestamp + escrow.PAUSED_FINALIZE_DELAY());
        escrow.finalizeSettlement(ID);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.SETTLED));
    }

    function test_unpause_onlyAdmin() public {
        vm.prank(guardian);
        escrow.pause();
        vm.prank(guardian);
        vm.expectRevert();
        escrow.unpause();
        vm.prank(admin);
        escrow.unpause();
    }

    function test_contractRejectsPlainEth() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(escrow).call{value: 1}("");
        assertFalse(ok);
    }

    // ───────── review regressions ─────────

    /// Review H-1: once vetoed, the same signatures can never be resubmitted.
    function test_veto_preventsReplayOfVetoedSignatures() public {
        address[] memory roster = _lockedMatch(ID, 3);
        bytes32 rh = keccak256("fraud");
        bytes[] memory sigs = _sigs(ID, roster[0], rh, _two());
        escrow.submitResult(ID, roster[0], rh, sigs);
        vm.prank(guardian);
        escrow.vetoResult(ID, "fraud");
        assertEq(escrow.getMatch(ID).resultNonce, 1);

        vm.expectRevert(HotShotsEscrow.BadSignatures.selector);
        escrow.submitResult(ID, roster[0], rh, sigs);

        // A fresh co-signed result (new nonce) is accepted.
        _submit(ID, roster[1]);
        assertEq(escrow.getMatch(ID).winner, roster[1]);
    }

    /// Review M-2: a pause cannot run out the clock and turn a win into a refund.
    function test_pause_doesNotBlockResultSubmission() public {
        address[] memory roster = _lockedMatch(ID, 2);
        vm.prank(guardian);
        escrow.pause();
        vm.warp(block.timestamp + MAX_DURATION - 1);
        _submit(ID, roster[1]);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.RESULT_FINAL));
    }

    /// Review L-1: a caller cannot starve the push to force winners into a manual claim.
    function test_push_revertsWhenGasStarved() public {
        address[] memory roster = _lockedMatch(ID, 2);
        _submit(ID, roster[0]);
        vm.warp(block.timestamp + DISPUTE);
        (bool ok,) = address(escrow).call{gas: 120_000}(abi.encodeCall(escrow.finalizeSettlement, (ID)));
        assertFalse(ok);
        assertEq(uint8(escrow.getMatch(ID).status), uint8(HotShotsEscrow.Status.RESULT_FINAL));
        escrow.finalizeSettlement(ID);
        assertEq(escrow.claimable(roster[0]), 0);
    }

    /// Review L-2: a relayer can rescue a credited balance to the owner itself.
    function test_claimFor_paysTheAccountOnly() public {
        _create(ID, 2);
        ReentrantReceiver r = new ReentrantReceiver(escrow);
        vm.deal(address(this), 1 ether);
        r.join{value: STAKE}(ID);
        _join(ID, _player(1));
        vm.prank(operator);
        escrow.lockMatch(ID);
        _submit(ID, address(r));
        vm.warp(block.timestamp + DISPUTE);
        escrow.finalizeSettlement(ID); // r rejects -> credited
        uint256 owed = escrow.claimable(address(r));
        assertGt(owed, 0);
        r.setAccept(true);
        vm.prank(makeAddr("relayer"));
        escrow.claimFor(address(r));
        assertEq(address(r).balance, owed);
        assertEq(escrow.totalClaimable(), 0);
    }

    // ───────── fuzz ─────────

    function testFuzz_splitPot(uint128 entry, uint8 count) public view {
        count = uint8(bound(count, 2, 16));
        (uint256 pot, uint256 champ, uint256 house) = escrow.splitPot(entry, count);
        assertEq(pot, uint256(entry) * count);
        assertEq(champ + house, pot); // nothing retained
        assertLe(house * 10, pot); // house never exceeds 10%
        assertGe(champ * 10, pot * 9); // champion always gets at least 90%
        assertLt(pot - house * 10, 10); // house is exactly floor(10%)
    }

    function testFuzz_fullMatch(uint8 n, uint8 winnerIdx, uint128 stake) public {
        n = uint8(bound(n, 2, 16));
        stake = uint128(bound(stake, 1, 100 ether));
        bytes32 id = keccak256(abi.encode(n, winnerIdx, stake));
        vm.prank(operator);
        escrow.createMatch(
            id,
            HotShotsEscrow.MatchConfig(stake, n, uint64(block.timestamp + 10 minutes), bytes32(0)),
            bytes32(0)
        );
        address[] memory roster = new address[](n);
        for (uint256 i; i < n; ++i) {
            roster[i] = address(uint160(0x10000 + i));
            vm.deal(roster[i], stake);
            vm.prank(roster[i]);
            escrow.joinMatch{value: stake}(id, new bytes32[](0));
        }
        vm.prank(operator);
        escrow.lockMatch(id);
        address w = roster[winnerIdx % n];
        _submit(id, w);
        vm.warp(block.timestamp + DISPUTE);
        uint256 t0 = treasury.balance;
        escrow.finalizeSettlement(id);

        uint256 pot = uint256(stake) * n;
        assertEq(w.balance, pot - pot / 10);
        assertEq(treasury.balance - t0, pot / 10);
        assertEq(address(escrow).balance, 0);
    }
}

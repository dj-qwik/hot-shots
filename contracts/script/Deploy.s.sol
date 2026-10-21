// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {HotShotsEscrow} from "../src/HotShotsEscrow.sol";

/// Deploys HotShotsEscrow. Run against TESTNET (46630) first.
///
///   forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --verify \
///     --account deployer            # use a Foundry keystore or hardware wallet, never a raw key in .env
///
/// Required env:
///   CHAIN_ID              4663 or 46630 (must match the RPC; the constructor also enforces it)
///   ADMIN                 governance Safe multisig address
///   TREASURY              house treasury address (Safe recommended)
///   SIGNERS               comma-separated result-signer addresses (any order; sorted here)
///   SIGNER_THRESHOLD      m in m-of-n
///   OPERATOR              backend operator address (create/lock/pre-lock abort)
///   GUARDIAN              incident-response address (pause/veto/post-lock abort)
/// Optional env:
///   ADMIN_DELAY           seconds, default 2 days
///   DISPUTE_WINDOW        seconds, default 1 hour (contract minimum; Arbitrum timestamp tolerance)
///   MAX_MATCH_DURATION    seconds, default 3 hours (a match is at most 4 × 30 s rounds ≈ 3 min; large margin covers incidents)
///
/// After deploy the deployer holds no roles. OPERATOR/GUARDIAN are granted by ADMIN.
/// Because the deployer is not ADMIN, roles must be granted from the Safe in a follow-up tx
/// unless ADMIN == deployer for a testnet run (see GRANT_ROLES_NOW).
contract Deploy is Script {
    function run() external returns (HotShotsEscrow escrow) {
        uint256 chainId = vm.envUint("CHAIN_ID");
        require(chainId == 4663 || chainId == 46630, "CHAIN_ID must be 4663 or 46630");
        require(block.chainid == chainId, "RPC chain does not match CHAIN_ID");

        address admin = vm.envAddress("ADMIN");
        address treasury = vm.envAddress("TREASURY");
        address[] memory signers = _sort(vm.envAddress("SIGNERS", ","));
        uint8 threshold = uint8(vm.envUint("SIGNER_THRESHOLD"));
        uint48 adminDelay = uint48(vm.envOr("ADMIN_DELAY", uint256(2 days)));
        uint32 dispute = uint32(vm.envOr("DISPUTE_WINDOW", uint256(1 hours)));
        uint64 maxDuration = uint64(vm.envOr("MAX_MATCH_DURATION", uint256(3 hours)));

        if (chainId == 4663) {
            require(threshold >= 2, "mainnet requires >= 2-of-n result signers");
            require(admin.code.length > 0, "mainnet ADMIN must be a multisig contract");
        }

        vm.startBroadcast();
        escrow = new HotShotsEscrow(chainId, admin, adminDelay, treasury, signers, threshold, dispute, maxDuration);
        if (vm.envOr("GRANT_ROLES_NOW", false)) {
            // Only works when the broadcaster IS the admin (testnet convenience).
            escrow.grantRole(escrow.OPERATOR_ROLE(), vm.envAddress("OPERATOR"));
            escrow.grantRole(escrow.GUARDIAN_ROLE(), vm.envAddress("GUARDIAN"));
        }
        vm.stopBroadcast();

        console.log("HotShotsEscrow deployed:", address(escrow));
        console.log("chainId:", chainId);
        console.log("signerSetVersion:", escrow.signerSetVersion());
    }

    function _sort(address[] memory a) internal pure returns (address[] memory) {
        for (uint256 i; i < a.length; ++i) {
            for (uint256 j = i + 1; j < a.length; ++j) {
                if (a[j] < a[i]) (a[i], a[j]) = (a[j], a[i]);
            }
        }
        return a;
    }
}

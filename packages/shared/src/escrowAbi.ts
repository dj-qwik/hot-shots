// Generated from contracts/out/HotShotsEscrow.sol/HotShotsEscrow.json — run `npm run abi` after contract changes.
export const escrowAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "supportedChainId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "admin",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "adminTransferDelay",
    "type": "uint48",
    "internalType": "uint48"
   },
   {
    "name": "treasury_",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "signers_",
    "type": "address[]",
    "internalType": "address[]"
   },
   {
    "name": "threshold_",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "disputeWindow_",
    "type": "uint32",
    "internalType": "uint32"
   },
   {
    "name": "maxMatchDuration_",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "DEFAULT_ADMIN_ROLE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "GUARDIAN_ROLE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "HOUSE_BPS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MATCH_RESULT_TYPEHASH",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_ADMISSION_WINDOW",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_DISPUTE_WINDOW",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_MATCH_DURATION",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_PLAYERS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MAX_SIGNERS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MIN_DISPUTE_WINDOW",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MIN_MATCH_DURATION",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "MIN_PLAYERS",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "OPERATOR_ROLE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "PAUSED_FINALIZE_DELAY",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "PUSH_GAS_LIMIT",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "RESUBMIT_GRACE",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "SUPPORTED_CHAIN_ID",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "abortMatch",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "acceptDefaultAdminTransfer",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "beginDefaultAdminTransfer",
  "inputs": [
   {
    "name": "newAdmin",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "cancelDefaultAdminTransfer",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "changeDefaultAdminDelay",
  "inputs": [
   {
    "name": "newDelay",
    "type": "uint48",
    "internalType": "uint48"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claim",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimFor",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimRefund",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimRefundFor",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "player",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "claimable",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "createMatch",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "cfg",
    "type": "tuple",
    "internalType": "struct HotShotsEscrow.MatchConfig",
    "components": [
     {
      "name": "entryAmount",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "capacity",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "admissionDeadline",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "configHash",
      "type": "bytes32",
      "internalType": "bytes32"
     }
    ]
   },
   {
    "name": "rosterCommitment",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "defaultAdmin",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "defaultAdminDelay",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint48",
    "internalType": "uint48"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "defaultAdminDelayIncreaseWait",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint48",
    "internalType": "uint48"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "disputeWindow",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "domainSeparator",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "eip712Domain",
  "inputs": [],
  "outputs": [
   {
    "name": "fields",
    "type": "bytes1",
    "internalType": "bytes1"
   },
   {
    "name": "name",
    "type": "string",
    "internalType": "string"
   },
   {
    "name": "version",
    "type": "string",
    "internalType": "string"
   },
   {
    "name": "chainId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "verifyingContract",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "extensions",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "finalizeSettlement",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "getMatch",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct HotShotsEscrow.Match",
    "components": [
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum HotShotsEscrow.Status"
     },
     {
      "name": "capacity",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "playerCount",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "refundsRemaining",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "disputeWindow",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "admissionDeadline",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "resultDeadline",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "resultSubmittedAt",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "entryAmount",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "resultNonce",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "winner",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "configHash",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "allowlistRoot",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "rosterHash",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "resultHash",
      "type": "bytes32",
      "internalType": "bytes32"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getPlayers",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "address[]",
    "internalType": "address[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getRoleAdmin",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getSigners",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address[]",
    "internalType": "address[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "grantRole",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "hasRole",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "hashMatchResult",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "winner",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rosterHash",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "resultHash",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "version",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "resultNonce",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "isPlayer",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "isSigner",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "joinMatch",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "proof",
    "type": "bytes32[]",
    "internalType": "bytes32[]"
   }
  ],
  "outputs": [],
  "stateMutability": "payable"
 },
 {
  "type": "function",
  "name": "leaveMatch",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "lockMatch",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "roster",
    "type": "address[]",
    "internalType": "address[]"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "maxMatchDuration",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "owner",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pause",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "paused",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pendingDefaultAdmin",
  "inputs": [],
  "outputs": [
   {
    "name": "newAdmin",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "schedule",
    "type": "uint48",
    "internalType": "uint48"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pendingDefaultAdminDelay",
  "inputs": [],
  "outputs": [
   {
    "name": "newDelay",
    "type": "uint48",
    "internalType": "uint48"
   },
   {
    "name": "schedule",
    "type": "uint48",
    "internalType": "uint48"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "refundClaimed",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "renounceRole",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "revokeRole",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "rollbackDefaultAdminDelay",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setDisputeWindow",
  "inputs": [
   {
    "name": "window",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setMaxMatchDuration",
  "inputs": [
   {
    "name": "duration",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setSigners",
  "inputs": [
   {
    "name": "signers_",
    "type": "address[]",
    "internalType": "address[]"
   },
   {
    "name": "threshold_",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setTreasury",
  "inputs": [
   {
    "name": "treasury_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "signerSetVersion",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "signerThreshold",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "splitPot",
  "inputs": [
   {
    "name": "entryAmount",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "playerCount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "pot",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "championAmount",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "houseAmount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "submitResult",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "winner",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "resultHash",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "signatures",
    "type": "bytes[]",
    "internalType": "bytes[]"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "supportsInterface",
  "inputs": [
   {
    "name": "interfaceId",
    "type": "bytes4",
    "internalType": "bytes4"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "totalClaimable",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "totalEscrowed",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "treasury",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "unpause",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "vetoResult",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "reason",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "event",
  "name": "Claimed",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DefaultAdminDelayChangeCanceled",
  "inputs": [],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DefaultAdminDelayChangeScheduled",
  "inputs": [
   {
    "name": "newDelay",
    "type": "uint48",
    "indexed": false,
    "internalType": "uint48"
   },
   {
    "name": "effectSchedule",
    "type": "uint48",
    "indexed": false,
    "internalType": "uint48"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DefaultAdminTransferCanceled",
  "inputs": [],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DefaultAdminTransferScheduled",
  "inputs": [
   {
    "name": "newAdmin",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "acceptSchedule",
    "type": "uint48",
    "indexed": false,
    "internalType": "uint48"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DisputeWindowUpdated",
  "inputs": [
   {
    "name": "window",
    "type": "uint32",
    "indexed": false,
    "internalType": "uint32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "EIP712DomainChanged",
  "inputs": [],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MatchAborted",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "reason",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum HotShotsEscrow.AbortReason"
   },
   {
    "name": "by",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MatchCreated",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "entryAmount",
    "type": "uint128",
    "indexed": false,
    "internalType": "uint128"
   },
   {
    "name": "capacity",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "admissionDeadline",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   },
   {
    "name": "configHash",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "allowlistRoot",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MatchFullyRefunded",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MatchLocked",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "rosterHash",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "roster",
    "type": "address[]",
    "indexed": false,
    "internalType": "address[]"
   },
   {
    "name": "pot",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "resultDeadline",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   },
   {
    "name": "disputeWindow",
    "type": "uint32",
    "indexed": false,
    "internalType": "uint32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MatchSettled",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "champion",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "championAmount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "houseAmount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MaxMatchDurationUpdated",
  "inputs": [
   {
    "name": "duration",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Paused",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PaymentCredited",
  "inputs": [
   {
    "name": "to",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PaymentPushed",
  "inputs": [
   {
    "name": "to",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PlayerJoined",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "player",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "playerCount",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PlayerLeft",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "player",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "playerCount",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RefundIssued",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "player",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "ResultSubmitted",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "winner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "resultHash",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "signerSetVersion",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   },
   {
    "name": "finalizableAt",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "ResultVetoed",
  "inputs": [
   {
    "name": "matchId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "guardian",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "reason",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "newResultDeadline",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RoleAdminChanged",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "previousAdminRole",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "newAdminRole",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RoleGranted",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "account",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "sender",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RoleRevoked",
  "inputs": [
   {
    "name": "role",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "account",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "sender",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "SignersUpdated",
  "inputs": [
   {
    "name": "signers",
    "type": "address[]",
    "indexed": false,
    "internalType": "address[]"
   },
   {
    "name": "threshold",
    "type": "uint8",
    "indexed": false,
    "internalType": "uint8"
   },
   {
    "name": "version",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "TreasuryUpdated",
  "inputs": [
   {
    "name": "treasury",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Unpaused",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "AccessControlBadConfirmation",
  "inputs": []
 },
 {
  "type": "error",
  "name": "AccessControlEnforcedDefaultAdminDelay",
  "inputs": [
   {
    "name": "schedule",
    "type": "uint48",
    "internalType": "uint48"
   }
  ]
 },
 {
  "type": "error",
  "name": "AccessControlEnforcedDefaultAdminRules",
  "inputs": []
 },
 {
  "type": "error",
  "name": "AccessControlInvalidDefaultAdmin",
  "inputs": [
   {
    "name": "defaultAdmin",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "AccessControlUnauthorizedAccount",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "neededRole",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ]
 },
 {
  "type": "error",
  "name": "AdmissionClosed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "AlreadyJoined",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadConfig",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadParam",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadSignatures",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadSignerSet",
  "inputs": []
 },
 {
  "type": "error",
  "name": "BadStatus",
  "inputs": [
   {
    "name": "actual",
    "type": "uint8",
    "internalType": "enum HotShotsEscrow.Status"
   }
  ]
 },
 {
  "type": "error",
  "name": "DisputeWindowClosed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "DisputeWindowOpen",
  "inputs": [
   {
    "name": "finalizableAt",
    "type": "uint64",
    "internalType": "uint64"
   }
  ]
 },
 {
  "type": "error",
  "name": "EnforcedPause",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ExpectedPause",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InsufficientGas",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InvalidShortString",
  "inputs": []
 },
 {
  "type": "error",
  "name": "MatchExists",
  "inputs": []
 },
 {
  "type": "error",
  "name": "MatchFull",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotAPlayer",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotAbortable",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotAllowlisted",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NothingToClaim",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ReentrancyGuardReentrantCall",
  "inputs": []
 },
 {
  "type": "error",
  "name": "RefundAlreadyClaimed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ResultWindowClosed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "RosterMismatch",
  "inputs": []
 },
 {
  "type": "error",
  "name": "SafeCastOverflowedUintDowncast",
  "inputs": [
   {
    "name": "bits",
    "type": "uint8",
    "internalType": "uint8"
   },
   {
    "name": "value",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "StringTooLong",
  "inputs": [
   {
    "name": "str",
    "type": "string",
    "internalType": "string"
   }
  ]
 },
 {
  "type": "error",
  "name": "TransferFailed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "WrongAmount",
  "inputs": [
   {
    "name": "expected",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "sent",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "WrongChain",
  "inputs": [
   {
    "name": "expected",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "actual",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "ZeroAddress",
  "inputs": []
 }
] as const

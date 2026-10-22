import { ak as createTransport, al as TransactionRejectedRpcError, am as UserRejectedRequestError, an as WalletConnectSessionSettlementError, ao as ExecutionRevertedError, ap as wait, aq as formatUnits, ar as IEvents, as as bases, at as cjsExports, au as cjsExports$1, av as C$3, aw as detect, ax as sn$3, ay as cjsExports$2, az as eventsExports, aA as k$4, aB as A$3, aC as E$4, aD as i$5, aE as h$5, aF as y$6, aG as formatJsonRpcRequest, aH as r$3, aI as Ot$3, aJ as o$4, aK as f$4, aL as isJsonRpcRequest, aM as isJsonRpcResponse, aN as formatJsonRpcResult, aO as Nt$3, aP as Po$1, aQ as Qe$4, aR as Qo, aS as safeJsonStringify, aT as safeJsonParse, aU as getBigIntRpcId, aV as formatJsonRpcError, aW as isJsonRpcResult, aX as isJsonRpcError, aY as bs58, aZ as payloadId, a_ as f$5, a2 as http, aa as toHex$1 } from "./bridge-CQaZ0Oxo.js";
function fallback(transports_, config = {}) {
  const { key = "fallback", name = "Fallback", rank = false, shouldThrow: shouldThrow_ = shouldThrow, retryCount, retryDelay } = config;
  return (({ chain, pollingInterval = 4e3, timeout, ...rest }) => {
    let transports = transports_;
    let onResponse = () => {
    };
    const transport = createTransport({
      key,
      name,
      async request({ method, params }) {
        let includes;
        const fetch2 = async (i2 = 0) => {
          const transport2 = transports[i2]({
            ...rest,
            chain,
            retryCount: 0,
            timeout
          });
          try {
            const response = await transport2.request({
              method,
              params
            });
            onResponse({
              method,
              params,
              response,
              transport: transport2,
              status: "success"
            });
            return response;
          } catch (err) {
            onResponse({
              error: err,
              method,
              params,
              transport: transport2,
              status: "error"
            });
            if (shouldThrow_(err))
              throw err;
            if (i2 === transports.length - 1)
              throw err;
            includes ??= transports.slice(i2 + 1).some((transport3) => {
              const { include, exclude } = transport3({ chain }).config.methods || {};
              if (include)
                return include.includes(method);
              if (exclude)
                return !exclude.includes(method);
              return true;
            });
            if (!includes)
              throw err;
            return fetch2(i2 + 1);
          }
        };
        return fetch2();
      },
      retryCount,
      retryDelay,
      type: "fallback"
    }, {
      onResponse: (fn2) => onResponse = fn2,
      transports: transports.map((fn2) => fn2({ chain, retryCount: 0 }))
    });
    if (rank) {
      const rankOptions = typeof rank === "object" ? rank : {};
      rankTransports({
        chain,
        interval: rankOptions.interval ?? pollingInterval,
        onTransports: (transports_2) => transports = transports_2,
        ping: rankOptions.ping,
        sampleCount: rankOptions.sampleCount,
        timeout: rankOptions.timeout,
        transports,
        weights: rankOptions.weights
      });
    }
    return transport;
  });
}
function shouldThrow(error) {
  if ("code" in error && typeof error.code === "number") {
    if (error.code === TransactionRejectedRpcError.code || error.code === UserRejectedRequestError.code || error.code === WalletConnectSessionSettlementError.code || ExecutionRevertedError.nodeMessage.test(error.message) || error.code === 5e3)
      return true;
  }
  return false;
}
function rankTransports({ chain, interval = 4e3, onTransports, ping, sampleCount = 10, timeout = 1e3, transports, weights = {} }) {
  const { stability: stabilityWeight = 0.7, latency: latencyWeight = 0.3 } = weights;
  const samples = [];
  const rankTransports_ = async () => {
    const sample = await Promise.all(transports.map(async (transport) => {
      const transport_ = transport({ chain, retryCount: 0, timeout });
      const start = Date.now();
      let end;
      let success;
      try {
        await (ping ? ping({ transport: transport_ }) : transport_.request({ method: "net_listening" }));
        success = 1;
      } catch {
        success = 0;
      } finally {
        end = Date.now();
      }
      const latency = end - start;
      return { latency, success };
    }));
    samples.push(sample);
    if (samples.length > sampleCount)
      samples.shift();
    const maxLatency = Math.max(...samples.map((sample2) => Math.max(...sample2.map(({ latency }) => latency))));
    const scores = transports.map((_2, i2) => {
      const latencies = samples.map((sample2) => sample2[i2].latency);
      const meanLatency = latencies.reduce((acc, latency) => acc + latency, 0) / latencies.length;
      const latencyScore = 1 - meanLatency / maxLatency;
      const successes = samples.map((sample2) => sample2[i2].success);
      const stabilityScore = successes.reduce((acc, success) => acc + success, 0) / successes.length;
      if (stabilityScore === 0)
        return [0, i2];
      return [
        latencyWeight * latencyScore + stabilityWeight * stabilityScore,
        i2
      ];
    }).sort((a2, b2) => b2[0] - a2[0]);
    onTransports(scores.map(([, i2]) => transports[i2]));
    await wait(interval);
    rankTransports_();
  };
  rankTransports_();
}
const ConstantsUtil$3 = {
  WC_NAME_SUFFIX: ".reown.id",
  WC_NAME_SUFFIX_LEGACY: ".wcn.id",
  BLOCKCHAIN_API_RPC_URL: "https://rpc.walletconnect.org",
  PULSE_API_URL: "https://pulse.walletconnect.org",
  W3M_API_URL: "https://api.web3modal.org",
  CONNECTOR_ID: {
    WALLET_CONNECT: "walletConnect",
    INJECTED: "injected",
    WALLET_STANDARD: "announced",
    COINBASE: "coinbaseWallet",
    COINBASE_SDK: "coinbaseWalletSDK",
    SAFE: "safe",
    LEDGER: "ledger",
    OKX: "okx",
    EIP6963: "eip6963",
    AUTH: "ID_AUTH"
  },
  CONNECTOR_NAMES: {
    AUTH: "Auth"
  },
  AUTH_CONNECTOR_SUPPORTED_CHAINS: ["eip155", "solana"],
  LIMITS: {
    PENDING_TRANSACTIONS: 99
  },
  CHAIN: {
    EVM: "eip155",
    SOLANA: "solana",
    POLKADOT: "polkadot",
    BITCOIN: "bip122"
  },
  CHAIN_NAME_MAP: {
    eip155: "EVM Networks",
    solana: "Solana",
    polkadot: "Polkadot",
    bip122: "Bitcoin",
    cosmos: "Cosmos"
  },
  ADAPTER_TYPES: {
    BITCOIN: "bitcoin",
    SOLANA: "solana",
    WAGMI: "wagmi",
    ETHERS: "ethers",
    ETHERS5: "ethers5"
  },
  USDT_CONTRACT_ADDRESSES: [
    "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
    "0x919C1c267BC06a7039e03fcc2eF738525769109c",
    "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    "0x55d398326f99059fF775485246999027B3197955",
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
  ],
  HTTP_STATUS_CODES: {
    SERVICE_UNAVAILABLE: 503,
    FORBIDDEN: 403
  },
  UNSUPPORTED_NETWORK_NAME: "Unknown Network",
  SECURE_SITE_SDK_ORIGIN: (typeof process !== "undefined" && typeof process.env !== "undefined" ? process.env["NEXT_PUBLIC_SECURE_SITE_ORIGIN"] : void 0) || "https://secure.walletconnect.org"
};
const NetworkUtil$1 = {
  caipNetworkIdToNumber(caipnetworkId) {
    return caipnetworkId ? Number(caipnetworkId.split(":")[1]) : void 0;
  },
  parseEvmChainId(chainId) {
    return typeof chainId === "string" ? this.caipNetworkIdToNumber(chainId) : chainId;
  },
  getNetworksByNamespace(networks, namespace) {
    return networks?.filter((network) => network.chainNamespace === namespace) || [];
  },
  getFirstNetworkByNamespace(networks, namespace) {
    return this.getNetworksByNamespace(networks, namespace)[0];
  },
  getNetworkNameByCaipNetworkId(caipNetworks, caipNetworkId) {
    if (!caipNetworkId) {
      return void 0;
    }
    const caipNetwork = caipNetworks.find((network) => network.caipNetworkId === caipNetworkId);
    if (caipNetwork) {
      return caipNetwork.name;
    }
    const [namespace] = caipNetworkId.split(":");
    return ConstantsUtil$3.CHAIN_NAME_MAP?.[namespace] || void 0;
  }
};
var DP = 20, RM = 1, MAX_DP = 1e6, MAX_POWER = 1e6, NE = -7, PE = 21, STRICT = false, NAME = "[big.js] ", INVALID = NAME + "Invalid ", INVALID_DP = INVALID + "decimal places", INVALID_RM = INVALID + "rounding mode", DIV_BY_ZERO = NAME + "Division by zero", P$3 = {}, UNDEFINED = void 0, NUMERIC = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
function _Big_() {
  function Big2(n3) {
    var x2 = this;
    if (!(x2 instanceof Big2)) return n3 === UNDEFINED ? _Big_() : new Big2(n3);
    if (n3 instanceof Big2) {
      x2.s = n3.s;
      x2.e = n3.e;
      x2.c = n3.c.slice();
    } else {
      if (typeof n3 !== "string") {
        if (Big2.strict === true && typeof n3 !== "bigint") {
          throw TypeError(INVALID + "value");
        }
        n3 = n3 === 0 && 1 / n3 < 0 ? "-0" : String(n3);
      }
      parse(x2, n3);
    }
    x2.constructor = Big2;
  }
  Big2.prototype = P$3;
  Big2.DP = DP;
  Big2.RM = RM;
  Big2.NE = NE;
  Big2.PE = PE;
  Big2.strict = STRICT;
  Big2.roundDown = 0;
  Big2.roundHalfUp = 1;
  Big2.roundHalfEven = 2;
  Big2.roundUp = 3;
  return Big2;
}
function parse(x2, n3) {
  var e2, i2, nl;
  if (!NUMERIC.test(n3)) {
    throw Error(INVALID + "number");
  }
  x2.s = n3.charAt(0) == "-" ? (n3 = n3.slice(1), -1) : 1;
  if ((e2 = n3.indexOf(".")) > -1) n3 = n3.replace(".", "");
  if ((i2 = n3.search(/e/i)) > 0) {
    if (e2 < 0) e2 = i2;
    e2 += +n3.slice(i2 + 1);
    n3 = n3.substring(0, i2);
  } else if (e2 < 0) {
    e2 = n3.length;
  }
  nl = n3.length;
  for (i2 = 0; i2 < nl && n3.charAt(i2) == "0"; ) ++i2;
  if (i2 == nl) {
    x2.c = [x2.e = 0];
  } else {
    for (; nl > 0 && n3.charAt(--nl) == "0"; ) ;
    x2.e = e2 - i2 - 1;
    x2.c = [];
    for (e2 = 0; i2 <= nl; ) x2.c[e2++] = +n3.charAt(i2++);
  }
  return x2;
}
function round(x2, sd, rm, more) {
  var xc2 = x2.c;
  if (rm === UNDEFINED) rm = x2.constructor.RM;
  if (rm !== 0 && rm !== 1 && rm !== 2 && rm !== 3) {
    throw Error(INVALID_RM);
  }
  if (sd < 1) {
    more = rm === 3 && (more || !!xc2[0]) || sd === 0 && (rm === 1 && xc2[0] >= 5 || rm === 2 && (xc2[0] > 5 || xc2[0] === 5 && (more || xc2[1] !== UNDEFINED)));
    xc2.length = 1;
    if (more) {
      x2.e = x2.e - sd + 1;
      xc2[0] = 1;
    } else {
      xc2[0] = x2.e = 0;
    }
  } else if (sd < xc2.length) {
    more = rm === 1 && xc2[sd] >= 5 || rm === 2 && (xc2[sd] > 5 || xc2[sd] === 5 && (more || xc2[sd + 1] !== UNDEFINED || xc2[sd - 1] & 1)) || rm === 3 && (more || !!xc2[0]);
    xc2.length = sd;
    if (more) {
      for (; ++xc2[--sd] > 9; ) {
        xc2[sd] = 0;
        if (sd === 0) {
          ++x2.e;
          xc2.unshift(1);
          break;
        }
      }
    }
    for (sd = xc2.length; !xc2[--sd]; ) xc2.pop();
  }
  return x2;
}
function stringify(x2, doExponential, isNonzero) {
  var e2 = x2.e, s2 = x2.c.join(""), n3 = s2.length;
  if (doExponential) {
    s2 = s2.charAt(0) + (n3 > 1 ? "." + s2.slice(1) : "") + (e2 < 0 ? "e" : "e+") + e2;
  } else if (e2 < 0) {
    for (; ++e2; ) s2 = "0" + s2;
    s2 = "0." + s2;
  } else if (e2 > 0) {
    if (++e2 > n3) {
      for (e2 -= n3; e2--; ) s2 += "0";
    } else if (e2 < n3) {
      s2 = s2.slice(0, e2) + "." + s2.slice(e2);
    }
  } else if (n3 > 1) {
    s2 = s2.charAt(0) + "." + s2.slice(1);
  }
  return x2.s < 0 && isNonzero ? "-" + s2 : s2;
}
P$3.abs = function() {
  var x2 = new this.constructor(this);
  x2.s = 1;
  return x2;
};
P$3.cmp = function(y4) {
  var isneg, x2 = this, xc2 = x2.c, yc2 = (y4 = new x2.constructor(y4)).c, i2 = x2.s, j2 = y4.s, k2 = x2.e, l2 = y4.e;
  if (!xc2[0] || !yc2[0]) return !xc2[0] ? !yc2[0] ? 0 : -j2 : i2;
  if (i2 != j2) return i2;
  isneg = i2 < 0;
  if (k2 != l2) return k2 > l2 ^ isneg ? 1 : -1;
  j2 = (k2 = xc2.length) < (l2 = yc2.length) ? k2 : l2;
  for (i2 = -1; ++i2 < j2; ) {
    if (xc2[i2] != yc2[i2]) return xc2[i2] > yc2[i2] ^ isneg ? 1 : -1;
  }
  return k2 == l2 ? 0 : k2 > l2 ^ isneg ? 1 : -1;
};
P$3.div = function(y4) {
  var x2 = this, Big2 = x2.constructor, a2 = x2.c, b2 = (y4 = new Big2(y4)).c, k2 = x2.s == y4.s ? 1 : -1, dp = Big2.DP;
  if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
    throw Error(INVALID_DP);
  }
  if (!b2[0]) {
    throw Error(DIV_BY_ZERO);
  }
  if (!a2[0]) {
    y4.s = k2;
    y4.c = [y4.e = 0];
    return y4;
  }
  var bl, bt2, n3, cmp, ri2, bz = b2.slice(), ai2 = bl = b2.length, al = a2.length, r2 = a2.slice(0, bl), rl = r2.length, q2 = y4, qc2 = q2.c = [], qi2 = 0, p2 = dp + (q2.e = x2.e - y4.e) + 1;
  q2.s = k2;
  k2 = p2 < 0 ? 0 : p2;
  bz.unshift(0);
  for (; rl++ < bl; ) r2.push(0);
  do {
    for (n3 = 0; n3 < 10; n3++) {
      if (bl != (rl = r2.length)) {
        cmp = bl > rl ? 1 : -1;
      } else {
        for (ri2 = -1, cmp = 0; ++ri2 < bl; ) {
          if (b2[ri2] != r2[ri2]) {
            cmp = b2[ri2] > r2[ri2] ? 1 : -1;
            break;
          }
        }
      }
      if (cmp < 0) {
        for (bt2 = rl == bl ? b2 : bz; rl; ) {
          if (r2[--rl] < bt2[rl]) {
            ri2 = rl;
            for (; ri2 && !r2[--ri2]; ) r2[ri2] = 9;
            --r2[ri2];
            r2[rl] += 10;
          }
          r2[rl] -= bt2[rl];
        }
        for (; !r2[0]; ) r2.shift();
      } else {
        break;
      }
    }
    qc2[qi2++] = cmp ? n3 : ++n3;
    if (r2[0] && cmp) r2[rl] = a2[ai2] || 0;
    else r2 = [a2[ai2]];
  } while ((ai2++ < al || r2[0] !== UNDEFINED) && k2--);
  if (!qc2[0] && qi2 != 1) {
    qc2.shift();
    q2.e--;
    p2--;
  }
  if (qi2 > p2) round(q2, p2, Big2.RM, r2[0] !== UNDEFINED);
  return q2;
};
P$3.eq = function(y4) {
  return this.cmp(y4) === 0;
};
P$3.gt = function(y4) {
  return this.cmp(y4) > 0;
};
P$3.gte = function(y4) {
  return this.cmp(y4) > -1;
};
P$3.lt = function(y4) {
  return this.cmp(y4) < 0;
};
P$3.lte = function(y4) {
  return this.cmp(y4) < 1;
};
P$3.minus = P$3.sub = function(y4) {
  var i2, j2, t2, xlty, x2 = this, Big2 = x2.constructor, a2 = x2.s, b2 = (y4 = new Big2(y4)).s;
  if (a2 != b2) {
    y4.s = -b2;
    return x2.plus(y4);
  }
  var xc2 = x2.c.slice(), xe2 = x2.e, yc2 = y4.c, ye2 = y4.e;
  if (!xc2[0] || !yc2[0]) {
    if (yc2[0]) {
      y4.s = -b2;
    } else if (xc2[0]) {
      y4 = new Big2(x2);
    } else {
      y4.s = 1;
    }
    return y4;
  }
  if (a2 = xe2 - ye2) {
    if (xlty = a2 < 0) {
      a2 = -a2;
      t2 = xc2;
    } else {
      ye2 = xe2;
      t2 = yc2;
    }
    t2.reverse();
    for (b2 = a2; b2--; ) t2.push(0);
    t2.reverse();
  } else {
    j2 = ((xlty = xc2.length < yc2.length) ? xc2 : yc2).length;
    for (a2 = b2 = 0; b2 < j2; b2++) {
      if (xc2[b2] != yc2[b2]) {
        xlty = xc2[b2] < yc2[b2];
        break;
      }
    }
  }
  if (xlty) {
    t2 = xc2;
    xc2 = yc2;
    yc2 = t2;
    y4.s = -y4.s;
  }
  if ((b2 = (j2 = yc2.length) - (i2 = xc2.length)) > 0) for (; b2--; ) xc2[i2++] = 0;
  for (b2 = i2; j2 > a2; ) {
    if (xc2[--j2] < yc2[j2]) {
      for (i2 = j2; i2 && !xc2[--i2]; ) xc2[i2] = 9;
      --xc2[i2];
      xc2[j2] += 10;
    }
    xc2[j2] -= yc2[j2];
  }
  for (; xc2[--b2] === 0; ) xc2.pop();
  for (; xc2[0] === 0; ) {
    xc2.shift();
    --ye2;
  }
  if (!xc2[0]) {
    y4.s = 1;
    xc2 = [ye2 = 0];
  }
  y4.c = xc2;
  y4.e = ye2;
  return y4;
};
P$3.mod = function(y4) {
  var ygtx, x2 = this, Big2 = x2.constructor, a2 = x2.s, b2 = (y4 = new Big2(y4)).s;
  if (!y4.c[0]) {
    throw Error(DIV_BY_ZERO);
  }
  x2.s = y4.s = 1;
  ygtx = y4.cmp(x2) == 1;
  x2.s = a2;
  y4.s = b2;
  if (ygtx) return new Big2(x2);
  a2 = Big2.DP;
  b2 = Big2.RM;
  Big2.DP = Big2.RM = 0;
  x2 = x2.div(y4);
  Big2.DP = a2;
  Big2.RM = b2;
  return this.minus(x2.times(y4));
};
P$3.neg = function() {
  var x2 = new this.constructor(this);
  x2.s = -x2.s;
  return x2;
};
P$3.plus = P$3.add = function(y4) {
  var e2, k2, t2, x2 = this, Big2 = x2.constructor;
  y4 = new Big2(y4);
  if (x2.s != y4.s) {
    y4.s = -y4.s;
    return x2.minus(y4);
  }
  var xe2 = x2.e, xc2 = x2.c, ye2 = y4.e, yc2 = y4.c;
  if (!xc2[0] || !yc2[0]) {
    if (!yc2[0]) {
      if (xc2[0]) {
        y4 = new Big2(x2);
      } else {
        y4.s = x2.s;
      }
    }
    return y4;
  }
  xc2 = xc2.slice();
  if (e2 = xe2 - ye2) {
    if (e2 > 0) {
      ye2 = xe2;
      t2 = yc2;
    } else {
      e2 = -e2;
      t2 = xc2;
    }
    t2.reverse();
    for (; e2--; ) t2.push(0);
    t2.reverse();
  }
  if (xc2.length - yc2.length < 0) {
    t2 = yc2;
    yc2 = xc2;
    xc2 = t2;
  }
  e2 = yc2.length;
  for (k2 = 0; e2; xc2[e2] %= 10) k2 = (xc2[--e2] = xc2[e2] + yc2[e2] + k2) / 10 | 0;
  if (k2) {
    xc2.unshift(k2);
    ++ye2;
  }
  for (e2 = xc2.length; xc2[--e2] === 0; ) xc2.pop();
  y4.c = xc2;
  y4.e = ye2;
  return y4;
};
P$3.pow = function(n3) {
  var x2 = this, one = new x2.constructor("1"), y4 = one, isneg = n3 < 0;
  if (n3 !== ~~n3 || n3 < -MAX_POWER || n3 > MAX_POWER) {
    throw Error(INVALID + "exponent");
  }
  if (isneg) n3 = -n3;
  for (; ; ) {
    if (n3 & 1) y4 = y4.times(x2);
    n3 >>= 1;
    if (!n3) break;
    x2 = x2.times(x2);
  }
  return isneg ? one.div(y4) : y4;
};
P$3.prec = function(sd, rm) {
  if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
    throw Error(INVALID + "precision");
  }
  return round(new this.constructor(this), sd, rm);
};
P$3.round = function(dp, rm) {
  if (dp === UNDEFINED) dp = 0;
  else if (dp !== ~~dp || dp < -MAX_DP || dp > MAX_DP) {
    throw Error(INVALID_DP);
  }
  return round(new this.constructor(this), dp + this.e + 1, rm);
};
P$3.sqrt = function() {
  var r2, c2, t2, x2 = this, Big2 = x2.constructor, s2 = x2.s, e2 = x2.e, half = new Big2("0.5");
  if (!x2.c[0]) return new Big2(x2);
  if (s2 < 0) {
    throw Error(NAME + "No square root");
  }
  s2 = Math.sqrt(+stringify(x2, true, true));
  if (s2 === 0 || s2 === 1 / 0) {
    c2 = x2.c.join("");
    if (!(c2.length + e2 & 1)) c2 += "0";
    s2 = Math.sqrt(c2);
    e2 = ((e2 + 1) / 2 | 0) - (e2 < 0 || e2 & 1);
    r2 = new Big2((s2 == 1 / 0 ? "5e" : (s2 = s2.toExponential()).slice(0, s2.indexOf("e") + 1)) + e2);
  } else {
    r2 = new Big2(s2 + "");
  }
  e2 = r2.e + (Big2.DP += 4);
  do {
    t2 = r2;
    r2 = half.times(t2.plus(x2.div(t2)));
  } while (t2.c.slice(0, e2).join("") !== r2.c.slice(0, e2).join(""));
  return round(r2, (Big2.DP -= 4) + r2.e + 1, Big2.RM);
};
P$3.times = P$3.mul = function(y4) {
  var c2, x2 = this, Big2 = x2.constructor, xc2 = x2.c, yc2 = (y4 = new Big2(y4)).c, a2 = xc2.length, b2 = yc2.length, i2 = x2.e, j2 = y4.e;
  y4.s = x2.s == y4.s ? 1 : -1;
  if (!xc2[0] || !yc2[0]) {
    y4.c = [y4.e = 0];
    return y4;
  }
  y4.e = i2 + j2;
  if (a2 < b2) {
    c2 = xc2;
    xc2 = yc2;
    yc2 = c2;
    j2 = a2;
    a2 = b2;
    b2 = j2;
  }
  for (c2 = new Array(j2 = a2 + b2); j2--; ) c2[j2] = 0;
  for (i2 = b2; i2--; ) {
    b2 = 0;
    for (j2 = a2 + i2; j2 > i2; ) {
      b2 = c2[j2] + yc2[i2] * xc2[j2 - i2 - 1] + b2;
      c2[j2--] = b2 % 10;
      b2 = b2 / 10 | 0;
    }
    c2[j2] = b2;
  }
  if (b2) ++y4.e;
  else c2.shift();
  for (i2 = c2.length; !c2[--i2]; ) c2.pop();
  y4.c = c2;
  return y4;
};
P$3.toExponential = function(dp, rm) {
  var x2 = this, n3 = x2.c[0];
  if (dp !== UNDEFINED) {
    if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
      throw Error(INVALID_DP);
    }
    x2 = round(new x2.constructor(x2), ++dp, rm);
    for (; x2.c.length < dp; ) x2.c.push(0);
  }
  return stringify(x2, true, !!n3);
};
P$3.toFixed = function(dp, rm) {
  var x2 = this, n3 = x2.c[0];
  if (dp !== UNDEFINED) {
    if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
      throw Error(INVALID_DP);
    }
    x2 = round(new x2.constructor(x2), dp + x2.e + 1, rm);
    for (dp = dp + x2.e + 1; x2.c.length < dp; ) x2.c.push(0);
  }
  return stringify(x2, false, !!n3);
};
P$3[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = P$3.toJSON = P$3.toString = function() {
  var x2 = this, Big2 = x2.constructor;
  return stringify(x2, x2.e <= Big2.NE || x2.e >= Big2.PE, !!x2.c[0]);
};
P$3.toNumber = function() {
  var n3 = +stringify(this, true, true);
  if (this.constructor.strict === true && !this.eq(n3.toString())) {
    throw Error(NAME + "Imprecise conversion");
  }
  return n3;
};
P$3.toPrecision = function(sd, rm) {
  var x2 = this, Big2 = x2.constructor, n3 = x2.c[0];
  if (sd !== UNDEFINED) {
    if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
      throw Error(INVALID + "precision");
    }
    x2 = round(new Big2(x2), sd, rm);
    for (; x2.c.length < sd; ) x2.c.push(0);
  }
  return stringify(x2, sd <= x2.e || x2.e <= Big2.NE || x2.e >= Big2.PE, !!n3);
};
P$3.valueOf = function() {
  var x2 = this, Big2 = x2.constructor;
  if (Big2.strict === true) {
    throw Error(NAME + "valueOf disallowed");
  }
  return stringify(x2, x2.e <= Big2.NE || x2.e >= Big2.PE, true);
};
var Big = _Big_();
const NumberUtil = {
  bigNumber(value) {
    if (!value) {
      return new Big(0);
    }
    return new Big(value);
  },
  multiply(a2, b2) {
    if (a2 === void 0 || b2 === void 0) {
      return new Big(0);
    }
    const aBigNumber = new Big(a2);
    const bBigNumber = new Big(b2);
    return aBigNumber.times(bBigNumber);
  },
  formatNumberToLocalString(value, decimals = 2) {
    if (value === void 0) {
      return "0.00";
    }
    if (typeof value === "number") {
      return value.toLocaleString("en-US", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals
      });
    }
    return parseFloat(value).toLocaleString("en-US", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    });
  },
  parseLocalStringToNumber(value) {
    if (value === void 0) {
      return 0;
    }
    return parseFloat(value.replace(/,/gu, ""));
  }
};
const erc20ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_to",
        type: "address"
      },
      {
        name: "_value",
        type: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool"
      }
    ]
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_from",
        type: "address"
      },
      {
        name: "_to",
        type: "address"
      },
      {
        name: "_value",
        type: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool"
      }
    ]
  }
];
const swapABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
];
const usdtABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "recipient",
        type: "address"
      },
      {
        name: "amount",
        type: "uint256"
      }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "sender",
        type: "address"
      },
      {
        name: "recipient",
        type: "address"
      },
      {
        name: "amount",
        type: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool"
      }
    ]
  }
];
const ContractUtil = {
  getERC20Abi: (tokenAddress) => {
    if (ConstantsUtil$3.USDT_CONTRACT_ADDRESSES.includes(tokenAddress)) {
      return usdtABI;
    }
    return erc20ABI;
  },
  getSwapAbi: () => swapABI
};
const ParseUtil = {
  validateCaipAddress(address) {
    if (address.split(":")?.length !== 3) {
      throw new Error("Invalid CAIP Address");
    }
    return address;
  },
  parseCaipAddress(caipAddress) {
    const parts = caipAddress.split(":");
    if (parts.length !== 3) {
      throw new Error(`Invalid CAIP-10 address: ${caipAddress}`);
    }
    const [chainNamespace, chainId, address] = parts;
    if (!chainNamespace || !chainId || !address) {
      throw new Error(`Invalid CAIP-10 address: ${caipAddress}`);
    }
    return {
      chainNamespace,
      chainId,
      address
    };
  },
  parseCaipNetworkId(caipNetworkId) {
    const parts = caipNetworkId.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid CAIP-2 network id: ${caipNetworkId}`);
    }
    const [chainNamespace, chainId] = parts;
    if (!chainNamespace || !chainId) {
      throw new Error(`Invalid CAIP-2 network id: ${caipNetworkId}`);
    }
    return {
      chainNamespace,
      chainId
    };
  }
};
const SafeLocalStorageKeys = {
  WALLET_ID: "@appkit/wallet_id",
  WALLET_NAME: "@appkit/wallet_name",
  SOLANA_WALLET: "@appkit/solana_wallet",
  SOLANA_CAIP_CHAIN: "@appkit/solana_caip_chain",
  ACTIVE_CAIP_NETWORK_ID: "@appkit/active_caip_network_id",
  CONNECTED_SOCIAL: "@appkit/connected_social",
  CONNECTED_SOCIAL_USERNAME: "@appkit-wallet/SOCIAL_USERNAME",
  RECENT_WALLETS: "@appkit/recent_wallets",
  DEEPLINK_CHOICE: "WALLETCONNECT_DEEPLINK_CHOICE",
  ACTIVE_NAMESPACE: "@appkit/active_namespace",
  CONNECTED_NAMESPACES: "@appkit/connected_namespaces",
  CONNECTION_STATUS: "@appkit/connection_status",
  SIWX_AUTH_TOKEN: "@appkit/siwx-auth-token",
  SIWX_NONCE_TOKEN: "@appkit/siwx-nonce-token",
  TELEGRAM_SOCIAL_PROVIDER: "@appkit/social_provider",
  NATIVE_BALANCE_CACHE: "@appkit/native_balance_cache",
  PORTFOLIO_CACHE: "@appkit/portfolio_cache",
  ENS_CACHE: "@appkit/ens_cache",
  IDENTITY_CACHE: "@appkit/identity_cache",
  PREFERRED_ACCOUNT_TYPES: "@appkit/preferred_account_types",
  CONNECTIONS: "@appkit/connections"
};
function getSafeConnectorIdKey(namespace) {
  if (!namespace) {
    throw new Error("Namespace is required for CONNECTED_CONNECTOR_ID");
  }
  return `@appkit/${namespace}:connected_connector_id`;
}
const SafeLocalStorage = {
  setItem(key, value) {
    if (isSafe$1() && value !== void 0) {
      localStorage.setItem(key, value);
    }
  },
  getItem(key) {
    if (isSafe$1()) {
      return localStorage.getItem(key) || void 0;
    }
    return void 0;
  },
  removeItem(key) {
    if (isSafe$1()) {
      localStorage.removeItem(key);
    }
  },
  clear() {
    if (isSafe$1()) {
      localStorage.clear();
    }
  }
};
function isSafe$1() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}
function getW3mThemeVariables(themeVariables, themeType) {
  if (themeType === "light") {
    return {
      "--w3m-accent": themeVariables?.["--w3m-accent"] || "hsla(231, 100%, 70%, 1)",
      "--w3m-background": "#fff"
    };
  }
  return {
    "--w3m-accent": themeVariables?.["--w3m-accent"] || "hsla(230, 100%, 67%, 1)",
    "--w3m-background": "#121313"
  };
}
const t$2 = /* @__PURE__ */ Symbol();
const s$3 = Object.getPrototypeOf, c$5 = /* @__PURE__ */ new WeakMap(), l$3 = (e2) => e2 && (c$5.has(e2) ? c$5.get(e2) : s$3(e2) === Object.prototype || s$3(e2) === Array.prototype), y$5 = (e2) => l$3(e2) && e2[t$2] || null, h$4 = (e2, t2 = true) => {
  c$5.set(e2, t2);
};
const __vite_import_meta_env__ = {};
const isObject = (x2) => typeof x2 === "object" && x2 !== null;
const proxyStateMap = /* @__PURE__ */ new WeakMap();
const refSet = /* @__PURE__ */ new WeakSet();
const buildProxyFunction = (objectIs = Object.is, newProxy = (target, handler) => new Proxy(target, handler), canProxy = (x2) => isObject(x2) && !refSet.has(x2) && (Array.isArray(x2) || !(Symbol.iterator in x2)) && !(x2 instanceof WeakMap) && !(x2 instanceof WeakSet) && !(x2 instanceof Error) && !(x2 instanceof Number) && !(x2 instanceof Date) && !(x2 instanceof String) && !(x2 instanceof RegExp) && !(x2 instanceof ArrayBuffer), defaultHandlePromise = (promise) => {
  switch (promise.status) {
    case "fulfilled":
      return promise.value;
    case "rejected":
      throw promise.reason;
    default:
      throw promise;
  }
}, snapCache = /* @__PURE__ */ new WeakMap(), createSnapshot = (target, version2, handlePromise = defaultHandlePromise) => {
  const cache = snapCache.get(target);
  if ((cache == null ? void 0 : cache[0]) === version2) {
    return cache[1];
  }
  const snap = Array.isArray(target) ? [] : Object.create(Object.getPrototypeOf(target));
  h$4(snap, true);
  snapCache.set(target, [version2, snap]);
  Reflect.ownKeys(target).forEach((key) => {
    if (Object.getOwnPropertyDescriptor(snap, key)) {
      return;
    }
    const value = Reflect.get(target, key);
    const { enumerable } = Reflect.getOwnPropertyDescriptor(
      target,
      key
    );
    const desc = {
      value,
      enumerable,
      // This is intentional to avoid copying with proxy-compare.
      // It's still non-writable, so it avoids assigning a value.
      configurable: true
    };
    if (refSet.has(value)) {
      h$4(value, false);
    } else if (value instanceof Promise) {
      delete desc.value;
      desc.get = () => handlePromise(value);
    } else if (proxyStateMap.has(value)) {
      const [target2, ensureVersion] = proxyStateMap.get(
        value
      );
      desc.value = createSnapshot(
        target2,
        ensureVersion(),
        handlePromise
      );
    }
    Object.defineProperty(snap, key, desc);
  });
  return Object.preventExtensions(snap);
}, proxyCache = /* @__PURE__ */ new WeakMap(), versionHolder = [1, 1], proxyFunction = (initialObject) => {
  if (!isObject(initialObject)) {
    throw new Error("object required");
  }
  const found = proxyCache.get(initialObject);
  if (found) {
    return found;
  }
  let version2 = versionHolder[0];
  const listeners = /* @__PURE__ */ new Set();
  const notifyUpdate = (op, nextVersion = ++versionHolder[0]) => {
    if (version2 !== nextVersion) {
      version2 = nextVersion;
      listeners.forEach((listener) => listener(op, nextVersion));
    }
  };
  let checkVersion = versionHolder[1];
  const ensureVersion = (nextCheckVersion = ++versionHolder[1]) => {
    if (checkVersion !== nextCheckVersion && !listeners.size) {
      checkVersion = nextCheckVersion;
      propProxyStates.forEach(([propProxyState]) => {
        const propVersion = propProxyState[1](nextCheckVersion);
        if (propVersion > version2) {
          version2 = propVersion;
        }
      });
    }
    return version2;
  };
  const createPropListener = (prop) => (op, nextVersion) => {
    const newOp = [...op];
    newOp[1] = [prop, ...newOp[1]];
    notifyUpdate(newOp, nextVersion);
  };
  const propProxyStates = /* @__PURE__ */ new Map();
  const addPropListener = (prop, propProxyState) => {
    if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && propProxyStates.has(prop)) {
      throw new Error("prop listener already exists");
    }
    if (listeners.size) {
      const remove = propProxyState[3](createPropListener(prop));
      propProxyStates.set(prop, [propProxyState, remove]);
    } else {
      propProxyStates.set(prop, [propProxyState]);
    }
  };
  const removePropListener = (prop) => {
    var _a;
    const entry = propProxyStates.get(prop);
    if (entry) {
      propProxyStates.delete(prop);
      (_a = entry[1]) == null ? void 0 : _a.call(entry);
    }
  };
  const addListener = (listener) => {
    listeners.add(listener);
    if (listeners.size === 1) {
      propProxyStates.forEach(([propProxyState, prevRemove], prop) => {
        if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && prevRemove) {
          throw new Error("remove already exists");
        }
        const remove = propProxyState[3](createPropListener(prop));
        propProxyStates.set(prop, [propProxyState, remove]);
      });
    }
    const removeListener = () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        propProxyStates.forEach(([propProxyState, remove], prop) => {
          if (remove) {
            remove();
            propProxyStates.set(prop, [propProxyState]);
          }
        });
      }
    };
    return removeListener;
  };
  const baseObject = Array.isArray(initialObject) ? [] : Object.create(Object.getPrototypeOf(initialObject));
  const handler = {
    deleteProperty(target, prop) {
      const prevValue = Reflect.get(target, prop);
      removePropListener(prop);
      const deleted = Reflect.deleteProperty(target, prop);
      if (deleted) {
        notifyUpdate(["delete", [prop], prevValue]);
      }
      return deleted;
    },
    set(target, prop, value, receiver) {
      const hasPrevValue = Reflect.has(target, prop);
      const prevValue = Reflect.get(target, prop, receiver);
      if (hasPrevValue && (objectIs(prevValue, value) || proxyCache.has(value) && objectIs(prevValue, proxyCache.get(value)))) {
        return true;
      }
      removePropListener(prop);
      if (isObject(value)) {
        value = y$5(value) || value;
      }
      let nextValue = value;
      if (value instanceof Promise) {
        value.then((v2) => {
          value.status = "fulfilled";
          value.value = v2;
          notifyUpdate(["resolve", [prop], v2]);
        }).catch((e2) => {
          value.status = "rejected";
          value.reason = e2;
          notifyUpdate(["reject", [prop], e2]);
        });
      } else {
        if (!proxyStateMap.has(value) && canProxy(value)) {
          nextValue = proxyFunction(value);
        }
        const childProxyState = !refSet.has(nextValue) && proxyStateMap.get(nextValue);
        if (childProxyState) {
          addPropListener(prop, childProxyState);
        }
      }
      Reflect.set(target, prop, nextValue, receiver);
      notifyUpdate(["set", [prop], value, prevValue]);
      return true;
    }
  };
  const proxyObject = newProxy(baseObject, handler);
  proxyCache.set(initialObject, proxyObject);
  const proxyState = [
    baseObject,
    ensureVersion,
    createSnapshot,
    addListener
  ];
  proxyStateMap.set(proxyObject, proxyState);
  Reflect.ownKeys(initialObject).forEach((key) => {
    const desc = Object.getOwnPropertyDescriptor(
      initialObject,
      key
    );
    if ("value" in desc) {
      proxyObject[key] = initialObject[key];
      delete desc.value;
      delete desc.writable;
    }
    Object.defineProperty(baseObject, key, desc);
  });
  return proxyObject;
}) => [
  // public functions
  proxyFunction,
  // shared state
  proxyStateMap,
  refSet,
  // internal things
  objectIs,
  newProxy,
  canProxy,
  defaultHandlePromise,
  snapCache,
  createSnapshot,
  proxyCache,
  versionHolder
];
const [defaultProxyFunction] = buildProxyFunction();
function proxy(initialObject = {}) {
  return defaultProxyFunction(initialObject);
}
function subscribe(proxyObject, callback, notifyInSync) {
  const proxyState = proxyStateMap.get(proxyObject);
  if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && !proxyState) {
    console.warn("Please use proxy object");
  }
  let promise;
  const ops = [];
  const addListener = proxyState[3];
  let isListenerActive = false;
  const listener = (op) => {
    ops.push(op);
    if (!promise) {
      promise = Promise.resolve().then(() => {
        promise = void 0;
        if (isListenerActive) {
          callback(ops.splice(0));
        }
      });
    }
  };
  const removeListener = addListener(listener);
  isListenerActive = true;
  return () => {
    isListenerActive = false;
    removeListener();
  };
}
function snapshot(proxyObject, handlePromise) {
  const proxyState = proxyStateMap.get(proxyObject);
  if ((__vite_import_meta_env__ ? "production" : void 0) !== "production" && !proxyState) {
    console.warn("Please use proxy object");
  }
  const [target, ensureVersion, createSnapshot] = proxyState;
  return createSnapshot(target, ensureVersion(), handlePromise);
}
function ref(obj) {
  refSet.add(obj);
  return obj;
}
function subscribeKey(proxyObject, key, callback, notifyInSync) {
  let prevValue = proxyObject[key];
  return subscribe(
    proxyObject,
    () => {
      const nextValue = proxyObject[key];
      if (!Object.is(prevValue, nextValue)) {
        callback(prevValue = nextValue);
      }
    }
  );
}
function proxyMap(entries2) {
  const map = proxy({
    data: Array.from([]),
    has(key) {
      return this.data.some((p2) => p2[0] === key);
    },
    set(key, value) {
      const record = this.data.find((p2) => p2[0] === key);
      if (record) {
        record[1] = value;
      } else {
        this.data.push([key, value]);
      }
      return this;
    },
    get(key) {
      var _a;
      return (_a = this.data.find((p2) => p2[0] === key)) == null ? void 0 : _a[1];
    },
    delete(key) {
      const index = this.data.findIndex((p2) => p2[0] === key);
      if (index === -1) {
        return false;
      }
      this.data.splice(index, 1);
      return true;
    },
    clear() {
      this.data.splice(0);
    },
    get size() {
      return this.data.length;
    },
    toJSON() {
      return new Map(this.data);
    },
    forEach(cb) {
      this.data.forEach((p2) => {
        cb(p2[1], p2[0], this);
      });
    },
    keys() {
      return this.data.map((p2) => p2[0]).values();
    },
    values() {
      return this.data.map((p2) => p2[1]).values();
    },
    entries() {
      return new Map(this.data).entries();
    },
    get [Symbol.toStringTag]() {
      return "Map";
    },
    [Symbol.iterator]() {
      return this.entries();
    }
  });
  Object.defineProperties(map, {
    data: {
      enumerable: false
    },
    size: {
      enumerable: false
    },
    toJSON: {
      enumerable: false
    }
  });
  Object.seal(map);
  return map;
}
(typeof process !== "undefined" && typeof process.env !== "undefined" ? process.env["NEXT_PUBLIC_SECURE_SITE_ORIGIN"] : void 0) || "https://secure.walletconnect.org";
const ONRAMP_PROVIDERS = [
  {
    label: "Coinbase",
    name: "coinbase",
    feeRange: "1-2%",
    url: "",
    supportedChains: ["eip155"]
  },
  {
    label: "Meld.io",
    name: "meld",
    feeRange: "1-2%",
    url: "https://meldcrypto.com",
    supportedChains: ["eip155", "solana"]
  }
];
const MELD_PUBLIC_KEY = "WXETMuFUQmqqybHuRkSgxv:25B8LJHSfpG6LVjR2ytU5Cwh7Z4Sch2ocoU";
const ConstantsUtil$2 = {
  FOUR_MINUTES_MS: 24e4,
  TEN_SEC_MS: 1e4,
  ONE_SEC_MS: 1e3,
  BALANCE_SUPPORTED_CHAINS: ["eip155", "solana"],
  NAMES_SUPPORTED_CHAIN_NAMESPACES: ["eip155"],
  NATIVE_TOKEN_ADDRESS: {
    eip155: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    solana: "So11111111111111111111111111111111111111111",
    polkadot: "0x",
    bip122: "0x",
    cosmos: "0x"
  },
  CONVERT_SLIPPAGE_TOLERANCE: 1,
  CONNECT_LABELS: {
    MOBILE: "Open and continue in the wallet app"
  },
  SEND_SUPPORTED_NAMESPACES: ["eip155", "solana"],
  DEFAULT_REMOTE_FEATURES: {
    swaps: ["1inch"],
    onramp: ["coinbase", "meld"],
    email: true,
    socials: [
      "google",
      "x",
      "discord",
      "farcaster",
      "github",
      "apple",
      "facebook"
    ],
    activity: true,
    reownBranding: true
  },
  DEFAULT_REMOTE_FEATURES_DISABLED: {
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
    activity: false,
    reownBranding: false
  },
  DEFAULT_FEATURES: {
    receive: true,
    send: true,
    emailShowWallets: true,
    connectorTypeOrder: [
      "walletConnect",
      "recent",
      "injected",
      "featured",
      "custom",
      "external",
      "recommended"
    ],
    analytics: true,
    allWallets: true,
    legalCheckbox: false,
    smartSessions: false,
    collapseWallets: false,
    walletFeaturesOrder: ["onramp", "swaps", "receive", "send"],
    connectMethodsOrder: void 0,
    pay: false
  },
  DEFAULT_ACCOUNT_TYPES: {
    bip122: "payment",
    eip155: "smartAccount",
    polkadot: "eoa",
    solana: "eoa"
  },
  ADAPTER_TYPES: {
    UNIVERSAL: "universal"
  }
};
const StorageUtil = {
  // Cache expiry in milliseconds
  cacheExpiry: {
    portfolio: 3e4,
    nativeBalance: 3e4,
    ens: 3e5,
    identity: 3e5
  },
  isCacheExpired(timestamp, cacheExpiry) {
    return Date.now() - timestamp > cacheExpiry;
  },
  getActiveNetworkProps() {
    const namespace = StorageUtil.getActiveNamespace();
    const caipNetworkId = StorageUtil.getActiveCaipNetworkId();
    const stringChainId = caipNetworkId ? caipNetworkId.split(":")[1] : void 0;
    const chainId = stringChainId ? isNaN(Number(stringChainId)) ? stringChainId : Number(stringChainId) : void 0;
    return {
      namespace,
      caipNetworkId,
      chainId
    };
  },
  setWalletConnectDeepLink({ name, href }) {
    try {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.DEEPLINK_CHOICE, JSON.stringify({ href, name }));
    } catch {
      console.info("Unable to set WalletConnect deep link");
    }
  },
  getWalletConnectDeepLink() {
    try {
      const deepLink = SafeLocalStorage.getItem(SafeLocalStorageKeys.DEEPLINK_CHOICE);
      if (deepLink) {
        return JSON.parse(deepLink);
      }
    } catch {
      console.info("Unable to get WalletConnect deep link");
    }
    return void 0;
  },
  deleteWalletConnectDeepLink() {
    try {
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.DEEPLINK_CHOICE);
    } catch {
      console.info("Unable to delete WalletConnect deep link");
    }
  },
  setActiveNamespace(namespace) {
    try {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.ACTIVE_NAMESPACE, namespace);
    } catch {
      console.info("Unable to set active namespace");
    }
  },
  setActiveCaipNetworkId(caipNetworkId) {
    try {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.ACTIVE_CAIP_NETWORK_ID, caipNetworkId);
      StorageUtil.setActiveNamespace(caipNetworkId.split(":")[0]);
    } catch {
      console.info("Unable to set active caip network id");
    }
  },
  getActiveCaipNetworkId() {
    try {
      return SafeLocalStorage.getItem(SafeLocalStorageKeys.ACTIVE_CAIP_NETWORK_ID);
    } catch {
      console.info("Unable to get active caip network id");
      return void 0;
    }
  },
  deleteActiveCaipNetworkId() {
    try {
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.ACTIVE_CAIP_NETWORK_ID);
    } catch {
      console.info("Unable to delete active caip network id");
    }
  },
  deleteConnectedConnectorId(namespace) {
    try {
      const key = getSafeConnectorIdKey(namespace);
      SafeLocalStorage.removeItem(key);
    } catch {
      console.info("Unable to delete connected connector id");
    }
  },
  setAppKitRecent(wallet) {
    try {
      const recentWallets = StorageUtil.getRecentWallets();
      const exists = recentWallets.find((w2) => w2.id === wallet.id);
      if (!exists) {
        recentWallets.unshift(wallet);
        if (recentWallets.length > 2) {
          recentWallets.pop();
        }
        SafeLocalStorage.setItem(SafeLocalStorageKeys.RECENT_WALLETS, JSON.stringify(recentWallets));
      }
    } catch {
      console.info("Unable to set AppKit recent");
    }
  },
  getRecentWallets() {
    try {
      const recent = SafeLocalStorage.getItem(SafeLocalStorageKeys.RECENT_WALLETS);
      return recent ? JSON.parse(recent) : [];
    } catch {
      console.info("Unable to get AppKit recent");
    }
    return [];
  },
  setConnectedConnectorId(namespace, connectorId) {
    try {
      const key = getSafeConnectorIdKey(namespace);
      SafeLocalStorage.setItem(key, connectorId);
    } catch {
      console.info("Unable to set Connected Connector Id");
    }
  },
  getActiveNamespace() {
    try {
      const activeNamespace = SafeLocalStorage.getItem(SafeLocalStorageKeys.ACTIVE_NAMESPACE);
      return activeNamespace;
    } catch {
      console.info("Unable to get active namespace");
    }
    return void 0;
  },
  getConnectedConnectorId(namespace) {
    if (!namespace) {
      return void 0;
    }
    try {
      const key = getSafeConnectorIdKey(namespace);
      return SafeLocalStorage.getItem(key);
    } catch (e2) {
      console.info("Unable to get connected connector id in namespace ", namespace);
    }
    return void 0;
  },
  setConnectedSocialProvider(socialProvider) {
    try {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.CONNECTED_SOCIAL, socialProvider);
    } catch {
      console.info("Unable to set connected social provider");
    }
  },
  getConnectedSocialProvider() {
    try {
      return SafeLocalStorage.getItem(SafeLocalStorageKeys.CONNECTED_SOCIAL);
    } catch {
      console.info("Unable to get connected social provider");
    }
    return void 0;
  },
  deleteConnectedSocialProvider() {
    try {
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.CONNECTED_SOCIAL);
    } catch {
      console.info("Unable to delete connected social provider");
    }
  },
  getConnectedSocialUsername() {
    try {
      return SafeLocalStorage.getItem(SafeLocalStorageKeys.CONNECTED_SOCIAL_USERNAME);
    } catch {
      console.info("Unable to get connected social username");
    }
    return void 0;
  },
  getStoredActiveCaipNetworkId() {
    const storedCaipNetworkId = SafeLocalStorage.getItem(SafeLocalStorageKeys.ACTIVE_CAIP_NETWORK_ID);
    const networkId = storedCaipNetworkId?.split(":")?.[1];
    return networkId;
  },
  setConnectionStatus(status) {
    try {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.CONNECTION_STATUS, status);
    } catch {
      console.info("Unable to set connection status");
    }
  },
  getConnectionStatus() {
    try {
      return SafeLocalStorage.getItem(SafeLocalStorageKeys.CONNECTION_STATUS);
    } catch {
      return void 0;
    }
  },
  getConnectedNamespaces() {
    try {
      const namespaces = SafeLocalStorage.getItem(SafeLocalStorageKeys.CONNECTED_NAMESPACES);
      if (!namespaces?.length) {
        return [];
      }
      return namespaces.split(",");
    } catch {
      return [];
    }
  },
  setConnectedNamespaces(namespaces) {
    try {
      const uniqueNamespaces = Array.from(new Set(namespaces));
      SafeLocalStorage.setItem(SafeLocalStorageKeys.CONNECTED_NAMESPACES, uniqueNamespaces.join(","));
    } catch {
      console.info("Unable to set namespaces in storage");
    }
  },
  addConnectedNamespace(namespace) {
    try {
      const namespaces = StorageUtil.getConnectedNamespaces();
      if (!namespaces.includes(namespace)) {
        namespaces.push(namespace);
        StorageUtil.setConnectedNamespaces(namespaces);
      }
    } catch {
      console.info("Unable to add connected namespace");
    }
  },
  removeConnectedNamespace(namespace) {
    try {
      const namespaces = StorageUtil.getConnectedNamespaces();
      const index = namespaces.indexOf(namespace);
      if (index > -1) {
        namespaces.splice(index, 1);
        StorageUtil.setConnectedNamespaces(namespaces);
      }
    } catch {
      console.info("Unable to remove connected namespace");
    }
  },
  getTelegramSocialProvider() {
    try {
      return SafeLocalStorage.getItem(SafeLocalStorageKeys.TELEGRAM_SOCIAL_PROVIDER);
    } catch {
      console.info("Unable to get telegram social provider");
      return null;
    }
  },
  setTelegramSocialProvider(socialProvider) {
    try {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.TELEGRAM_SOCIAL_PROVIDER, socialProvider);
    } catch {
      console.info("Unable to set telegram social provider");
    }
  },
  removeTelegramSocialProvider() {
    try {
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.TELEGRAM_SOCIAL_PROVIDER);
    } catch {
      console.info("Unable to remove telegram social provider");
    }
  },
  getBalanceCache() {
    let cache = {};
    try {
      const result = SafeLocalStorage.getItem(SafeLocalStorageKeys.PORTFOLIO_CACHE);
      cache = result ? JSON.parse(result) : {};
    } catch {
      console.info("Unable to get balance cache");
    }
    return cache;
  },
  removeAddressFromBalanceCache(caipAddress) {
    try {
      const cache = StorageUtil.getBalanceCache();
      SafeLocalStorage.setItem(SafeLocalStorageKeys.PORTFOLIO_CACHE, JSON.stringify({ ...cache, [caipAddress]: void 0 }));
    } catch {
      console.info("Unable to remove address from balance cache", caipAddress);
    }
  },
  getBalanceCacheForCaipAddress(caipAddress) {
    try {
      const cache = StorageUtil.getBalanceCache();
      const balanceCache = cache[caipAddress];
      if (balanceCache && !this.isCacheExpired(balanceCache.timestamp, this.cacheExpiry.portfolio)) {
        return balanceCache.balance;
      }
      StorageUtil.removeAddressFromBalanceCache(caipAddress);
    } catch {
      console.info("Unable to get balance cache for address", caipAddress);
    }
    return void 0;
  },
  updateBalanceCache(params) {
    try {
      const cache = StorageUtil.getBalanceCache();
      cache[params.caipAddress] = params;
      SafeLocalStorage.setItem(SafeLocalStorageKeys.PORTFOLIO_CACHE, JSON.stringify(cache));
    } catch {
      console.info("Unable to update balance cache", params);
    }
  },
  getNativeBalanceCache() {
    let cache = {};
    try {
      const result = SafeLocalStorage.getItem(SafeLocalStorageKeys.NATIVE_BALANCE_CACHE);
      cache = result ? JSON.parse(result) : {};
    } catch {
      console.info("Unable to get balance cache");
    }
    return cache;
  },
  removeAddressFromNativeBalanceCache(caipAddress) {
    try {
      const cache = StorageUtil.getBalanceCache();
      SafeLocalStorage.setItem(SafeLocalStorageKeys.NATIVE_BALANCE_CACHE, JSON.stringify({ ...cache, [caipAddress]: void 0 }));
    } catch {
      console.info("Unable to remove address from balance cache", caipAddress);
    }
  },
  getNativeBalanceCacheForCaipAddress(caipAddress) {
    try {
      const cache = StorageUtil.getNativeBalanceCache();
      const nativeBalanceCache = cache[caipAddress];
      if (nativeBalanceCache && !this.isCacheExpired(nativeBalanceCache.timestamp, this.cacheExpiry.nativeBalance)) {
        return nativeBalanceCache;
      }
      console.info("Discarding cache for address", caipAddress);
      StorageUtil.removeAddressFromBalanceCache(caipAddress);
    } catch {
      console.info("Unable to get balance cache for address", caipAddress);
    }
    return void 0;
  },
  updateNativeBalanceCache(params) {
    try {
      const cache = StorageUtil.getNativeBalanceCache();
      cache[params.caipAddress] = params;
      SafeLocalStorage.setItem(SafeLocalStorageKeys.NATIVE_BALANCE_CACHE, JSON.stringify(cache));
    } catch {
      console.info("Unable to update balance cache", params);
    }
  },
  getEnsCache() {
    let cache = {};
    try {
      const result = SafeLocalStorage.getItem(SafeLocalStorageKeys.ENS_CACHE);
      cache = result ? JSON.parse(result) : {};
    } catch {
      console.info("Unable to get ens name cache");
    }
    return cache;
  },
  getEnsFromCacheForAddress(address) {
    try {
      const cache = StorageUtil.getEnsCache();
      const ensCache = cache[address];
      if (ensCache && !this.isCacheExpired(ensCache.timestamp, this.cacheExpiry.ens)) {
        return ensCache.ens;
      }
      StorageUtil.removeEnsFromCache(address);
    } catch {
      console.info("Unable to get ens name from cache", address);
    }
    return void 0;
  },
  updateEnsCache(params) {
    try {
      const cache = StorageUtil.getEnsCache();
      cache[params.address] = params;
      SafeLocalStorage.setItem(SafeLocalStorageKeys.ENS_CACHE, JSON.stringify(cache));
    } catch {
      console.info("Unable to update ens name cache", params);
    }
  },
  removeEnsFromCache(address) {
    try {
      const cache = StorageUtil.getEnsCache();
      SafeLocalStorage.setItem(SafeLocalStorageKeys.ENS_CACHE, JSON.stringify({ ...cache, [address]: void 0 }));
    } catch {
      console.info("Unable to remove ens name from cache", address);
    }
  },
  getIdentityCache() {
    let cache = {};
    try {
      const result = SafeLocalStorage.getItem(SafeLocalStorageKeys.IDENTITY_CACHE);
      cache = result ? JSON.parse(result) : {};
    } catch {
      console.info("Unable to get identity cache");
    }
    return cache;
  },
  getIdentityFromCacheForAddress(address) {
    try {
      const cache = StorageUtil.getIdentityCache();
      const identityCache = cache[address];
      if (identityCache && !this.isCacheExpired(identityCache.timestamp, this.cacheExpiry.identity)) {
        return identityCache.identity;
      }
      StorageUtil.removeIdentityFromCache(address);
    } catch {
      console.info("Unable to get identity from cache", address);
    }
    return void 0;
  },
  updateIdentityCache(params) {
    try {
      const cache = StorageUtil.getIdentityCache();
      cache[params.address] = {
        identity: params.identity,
        timestamp: params.timestamp
      };
      SafeLocalStorage.setItem(SafeLocalStorageKeys.IDENTITY_CACHE, JSON.stringify(cache));
    } catch {
      console.info("Unable to update identity cache", params);
    }
  },
  removeIdentityFromCache(address) {
    try {
      const cache = StorageUtil.getIdentityCache();
      SafeLocalStorage.setItem(SafeLocalStorageKeys.IDENTITY_CACHE, JSON.stringify({ ...cache, [address]: void 0 }));
    } catch {
      console.info("Unable to remove identity from cache", address);
    }
  },
  clearAddressCache() {
    try {
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.PORTFOLIO_CACHE);
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.NATIVE_BALANCE_CACHE);
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.ENS_CACHE);
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.IDENTITY_CACHE);
    } catch {
      console.info("Unable to clear address cache");
    }
  },
  setPreferredAccountTypes(accountTypes) {
    try {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.PREFERRED_ACCOUNT_TYPES, JSON.stringify(accountTypes));
    } catch {
      console.info("Unable to set preferred account types", accountTypes);
    }
  },
  getPreferredAccountTypes() {
    try {
      const result = SafeLocalStorage.getItem(SafeLocalStorageKeys.PREFERRED_ACCOUNT_TYPES);
      if (!result) {
        return {};
      }
      return JSON.parse(result);
    } catch {
      console.info("Unable to get preferred account types");
    }
    return {};
  },
  setConnections(connections, chainNamespace) {
    try {
      const newConnections = {
        ...StorageUtil.getConnections(),
        [chainNamespace]: connections
      };
      SafeLocalStorage.setItem(SafeLocalStorageKeys.CONNECTIONS, JSON.stringify(newConnections));
    } catch (error) {
      console.error("Unable to sync connections to storage", error);
    }
  },
  getConnections() {
    try {
      const connectionsStorage = SafeLocalStorage.getItem(SafeLocalStorageKeys.CONNECTIONS);
      if (!connectionsStorage) {
        return {};
      }
      return JSON.parse(connectionsStorage);
    } catch (error) {
      console.error("Unable to get connections from storage", error);
      return {};
    }
  }
};
const CoreHelperUtil = {
  isMobile() {
    if (this.isClient()) {
      return Boolean(typeof window?.matchMedia === "function" && window?.matchMedia("(pointer:coarse)")?.matches || /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/u.test(navigator.userAgent));
    }
    return false;
  },
  checkCaipNetwork(network, networkName = "") {
    return network?.caipNetworkId.toLocaleLowerCase().includes(networkName.toLowerCase());
  },
  isAndroid() {
    if (!this.isMobile()) {
      return false;
    }
    const ua2 = window?.navigator.userAgent.toLowerCase();
    return CoreHelperUtil.isMobile() && ua2.includes("android");
  },
  isIos() {
    if (!this.isMobile()) {
      return false;
    }
    const ua2 = window?.navigator.userAgent.toLowerCase();
    return ua2.includes("iphone") || ua2.includes("ipad");
  },
  isSafari() {
    if (!this.isClient()) {
      return false;
    }
    const ua2 = window?.navigator.userAgent.toLowerCase();
    return ua2.includes("safari");
  },
  isClient() {
    return typeof window !== "undefined";
  },
  isPairingExpired(expiry) {
    return expiry ? expiry - Date.now() <= ConstantsUtil$2.TEN_SEC_MS : true;
  },
  isAllowedRetry(lastRetry, differenceMs = ConstantsUtil$2.ONE_SEC_MS) {
    return Date.now() - lastRetry >= differenceMs;
  },
  copyToClopboard(text) {
    navigator.clipboard.writeText(text);
  },
  isIframe() {
    try {
      return window?.self !== window?.top;
    } catch (e2) {
      return false;
    }
  },
  isSafeApp() {
    if (CoreHelperUtil.isClient() && window.self !== window.top) {
      try {
        const ancestor = window?.location?.ancestorOrigins?.[0];
        const safeAppUrl = "https://app.safe.global";
        if (ancestor) {
          const ancestorUrl = new URL(ancestor);
          const safeUrl = new URL(safeAppUrl);
          return ancestorUrl.hostname === safeUrl.hostname;
        }
      } catch {
        return false;
      }
    }
    return false;
  },
  getPairingExpiry() {
    return Date.now() + ConstantsUtil$2.FOUR_MINUTES_MS;
  },
  getNetworkId(caipAddress) {
    return caipAddress?.split(":")[1];
  },
  getPlainAddress(caipAddress) {
    return caipAddress?.split(":")[2];
  },
  async wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debounce(func, timeout = 500) {
    let timer = void 0;
    return (...args) => {
      function next() {
        func(...args);
      }
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(next, timeout);
    };
  },
  isHttpUrl(url) {
    return url.startsWith("http://") || url.startsWith("https://");
  },
  formatNativeUrl(appUrl, wcUri, universalLink = null) {
    if (CoreHelperUtil.isHttpUrl(appUrl)) {
      return this.formatUniversalUrl(appUrl, wcUri);
    }
    let safeAppUrl = appUrl;
    let safeUniversalLink = universalLink;
    if (!safeAppUrl.includes("://")) {
      safeAppUrl = appUrl.replaceAll("/", "").replaceAll(":", "");
      safeAppUrl = `${safeAppUrl}://`;
    }
    if (!safeAppUrl.endsWith("/")) {
      safeAppUrl = `${safeAppUrl}/`;
    }
    if (safeUniversalLink && !safeUniversalLink?.endsWith("/")) {
      safeUniversalLink = `${safeUniversalLink}/`;
    }
    if (this.isTelegram() && this.isAndroid()) {
      wcUri = encodeURIComponent(wcUri);
    }
    const encodedWcUrl = encodeURIComponent(wcUri);
    return {
      redirect: `${safeAppUrl}wc?uri=${encodedWcUrl}`,
      redirectUniversalLink: safeUniversalLink ? `${safeUniversalLink}wc?uri=${encodedWcUrl}` : void 0,
      href: safeAppUrl
    };
  },
  formatUniversalUrl(appUrl, wcUri) {
    if (!CoreHelperUtil.isHttpUrl(appUrl)) {
      return this.formatNativeUrl(appUrl, wcUri);
    }
    let safeAppUrl = appUrl;
    if (!safeAppUrl.endsWith("/")) {
      safeAppUrl = `${safeAppUrl}/`;
    }
    const encodedWcUrl = encodeURIComponent(wcUri);
    return {
      redirect: `${safeAppUrl}wc?uri=${encodedWcUrl}`,
      href: safeAppUrl
    };
  },
  getOpenTargetForPlatform(target) {
    if (target === "popupWindow") {
      return target;
    }
    if (this.isTelegram()) {
      if (StorageUtil.getTelegramSocialProvider()) {
        return "_top";
      }
      return "_blank";
    }
    return target;
  },
  openHref(href, target, features) {
    window?.open(href, this.getOpenTargetForPlatform(target), features || "noreferrer noopener");
  },
  returnOpenHref(href, target, features) {
    return window?.open(href, this.getOpenTargetForPlatform(target), features || "noreferrer noopener");
  },
  isTelegram() {
    return typeof window !== "undefined" && // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Boolean(window.TelegramWebviewProxy) || // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean(window.Telegram) || // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean(window.TelegramWebviewProxyProto));
  },
  isPWA() {
    if (typeof window === "undefined") {
      return false;
    }
    const isStandaloneDisplayMode = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const isIOSStandalone = window?.navigator?.standalone;
    return Boolean(isStandaloneDisplayMode || isIOSStandalone);
  },
  async preloadImage(src) {
    const imagePromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = reject;
      image.crossOrigin = "anonymous";
      image.src = src;
    });
    return Promise.race([imagePromise, CoreHelperUtil.wait(2e3)]);
  },
  formatBalance(balance, symbol) {
    let formattedBalance = "0.000";
    if (typeof balance === "string") {
      const number = Number(balance);
      if (number) {
        const formattedValue = Math.floor(number * 1e3) / 1e3;
        if (formattedValue) {
          formattedBalance = formattedValue.toString();
        }
      }
    }
    return `${formattedBalance}${symbol ? ` ${symbol}` : ""}`;
  },
  formatBalance2(balance, symbol) {
    let formattedBalance = void 0;
    if (balance === "0") {
      formattedBalance = "0";
    } else if (typeof balance === "string") {
      const number = Number(balance);
      if (number) {
        formattedBalance = number.toString().match(/^-?\d+(?:\.\d{0,3})?/u)?.[0];
      }
    }
    return {
      value: formattedBalance ?? "0",
      rest: formattedBalance === "0" ? "000" : "",
      symbol
    };
  },
  getApiUrl() {
    return ConstantsUtil$3.W3M_API_URL;
  },
  getBlockchainApiUrl() {
    return ConstantsUtil$3.BLOCKCHAIN_API_RPC_URL;
  },
  getAnalyticsUrl() {
    return ConstantsUtil$3.PULSE_API_URL;
  },
  getUUID() {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/gu, (c2) => {
      const r2 = Math.random() * 16 | 0;
      const v2 = c2 === "x" ? r2 : r2 & 3 | 8;
      return v2.toString(16);
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseError(error) {
    if (typeof error === "string") {
      return error;
    } else if (typeof error?.issues?.[0]?.message === "string") {
      return error.issues[0].message;
    } else if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error";
  },
  sortRequestedNetworks(approvedIds, requestedNetworks = []) {
    const approvedIndexMap = {};
    if (requestedNetworks && approvedIds) {
      approvedIds.forEach((id, index) => {
        approvedIndexMap[id] = index;
      });
      requestedNetworks.sort((a2, b2) => {
        const indexA = approvedIndexMap[a2.id];
        const indexB = approvedIndexMap[b2.id];
        if (indexA !== void 0 && indexB !== void 0) {
          return indexA - indexB;
        } else if (indexA !== void 0) {
          return -1;
        } else if (indexB !== void 0) {
          return 1;
        }
        return 0;
      });
    }
    return requestedNetworks;
  },
  calculateBalance(array) {
    let sum = 0;
    for (const item of array) {
      sum += item.value ?? 0;
    }
    return sum;
  },
  formatTokenBalance(number) {
    const roundedNumber = number.toFixed(2);
    const [dollars, pennies] = roundedNumber.split(".");
    return { dollars, pennies };
  },
  isAddress(address, chain = "eip155") {
    switch (chain) {
      case "eip155":
        if (!/^(?:0x)?[0-9a-f]{40}$/iu.test(address)) {
          return false;
        } else if (/^(?:0x)?[0-9a-f]{40}$/iu.test(address) || /^(?:0x)?[0-9A-F]{40}$/iu.test(address)) {
          return true;
        }
        return false;
      case "solana":
        return /[1-9A-HJ-NP-Za-km-z]{32,44}$/iu.test(address);
      default:
        return false;
    }
  },
  uniqueBy(arr, key) {
    const set = /* @__PURE__ */ new Set();
    return arr.filter((item) => {
      const keyValue = item[key];
      if (set.has(keyValue)) {
        return false;
      }
      set.add(keyValue);
      return true;
    });
  },
  generateSdkVersion(adapters, platform, version2) {
    const hasNoAdapters = adapters.length === 0;
    const adapterNames = hasNoAdapters ? ConstantsUtil$2.ADAPTER_TYPES.UNIVERSAL : adapters.map((adapter) => adapter.adapterType).join(",");
    return `${platform}-${adapterNames}-${version2}`;
  },
  // eslint-disable-next-line max-params
  createAccount(namespace, address, type, publicKey, path) {
    return {
      namespace,
      address,
      type,
      publicKey,
      path
    };
  },
  isCaipAddress(address) {
    if (typeof address !== "string") {
      return false;
    }
    const sections = address.split(":");
    const namespace = sections[0];
    return sections.filter(Boolean).length === 3 && namespace in ConstantsUtil$3.CHAIN_NAME_MAP;
  },
  isMac() {
    const ua2 = window?.navigator.userAgent.toLowerCase();
    return ua2.includes("macintosh") && !ua2.includes("safari");
  },
  formatTelegramSocialLoginUrl(url) {
    const valueToInject = `--${encodeURIComponent(window?.location.href)}`;
    const paramToInject = "state=";
    const parsedUrl = new URL(url);
    if (parsedUrl.host === "auth.magic.link") {
      const providerParam = "provider_authorization_url=";
      const providerUrl = url.substring(url.indexOf(providerParam) + providerParam.length);
      const resultUrl = this.injectIntoUrl(decodeURIComponent(providerUrl), paramToInject, valueToInject);
      return url.replace(providerUrl, encodeURIComponent(resultUrl));
    }
    return this.injectIntoUrl(url, paramToInject, valueToInject);
  },
  injectIntoUrl(url, key, appendString) {
    const keyIndex = url.indexOf(key);
    if (keyIndex === -1) {
      throw new Error(`${key} parameter not found in the URL: ${url}`);
    }
    const keyEndIndex = url.indexOf("&", keyIndex);
    const keyLength = key.length;
    const keyParamEnd = keyEndIndex !== -1 ? keyEndIndex : url.length;
    const beforeKeyValue = url.substring(0, keyIndex + keyLength);
    const currentKeyValue = url.substring(keyIndex + keyLength, keyParamEnd);
    const afterKeyValue = url.substring(keyEndIndex);
    const newKeyValue = currentKeyValue + appendString;
    const newUrl = beforeKeyValue + newKeyValue + afterKeyValue;
    return newUrl;
  }
};
async function fetchData(...args) {
  const response = await fetch(...args);
  if (!response.ok) {
    const err = new Error(`HTTP status code: ${response.status}`, {
      cause: response
    });
    throw err;
  }
  return response;
}
class FetchUtil {
  constructor({ baseUrl: baseUrl2, clientId }) {
    this.baseUrl = baseUrl2;
    this.clientId = clientId;
  }
  async get({ headers, signal, cache, ...args }) {
    const url = this.createUrl(args);
    const response = await fetchData(url, { method: "GET", headers, signal, cache });
    return response.json();
  }
  async getBlob({ headers, signal, ...args }) {
    const url = this.createUrl(args);
    const response = await fetchData(url, { method: "GET", headers, signal });
    return response.blob();
  }
  async post({ body, headers, signal, ...args }) {
    const url = this.createUrl(args);
    const response = await fetchData(url, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal
    });
    return response.json();
  }
  async put({ body, headers, signal, ...args }) {
    const url = this.createUrl(args);
    const response = await fetchData(url, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal
    });
    return response.json();
  }
  async delete({ body, headers, signal, ...args }) {
    const url = this.createUrl(args);
    const response = await fetchData(url, {
      method: "DELETE",
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal
    });
    return response.json();
  }
  createUrl({ path, params }) {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });
    }
    if (this.clientId) {
      url.searchParams.append("clientId", this.clientId);
    }
    return url;
  }
}
const OptionsUtil = {
  getFeatureValue(key, features) {
    const optionValue = features?.[key];
    if (optionValue === void 0) {
      return ConstantsUtil$2.DEFAULT_FEATURES[key];
    }
    return optionValue;
  },
  filterSocialsByPlatform(socials) {
    if (!socials || !socials.length) {
      return socials;
    }
    if (CoreHelperUtil.isTelegram()) {
      if (CoreHelperUtil.isIos()) {
        return socials.filter((s2) => s2 !== "google");
      }
      if (CoreHelperUtil.isMac()) {
        return socials.filter((s2) => s2 !== "x");
      }
      if (CoreHelperUtil.isAndroid()) {
        return socials.filter((s2) => !["facebook", "x"].includes(s2));
      }
    }
    return socials;
  }
};
const state$l = proxy({
  features: ConstantsUtil$2.DEFAULT_FEATURES,
  projectId: "",
  sdkType: "appkit",
  sdkVersion: "html-wagmi-undefined",
  defaultAccountTypes: ConstantsUtil$2.DEFAULT_ACCOUNT_TYPES,
  enableNetworkSwitch: true,
  experimental_preferUniversalLinks: false,
  remoteFeatures: {}
});
const OptionsController = {
  state: state$l,
  subscribeKey(key, callback) {
    return subscribeKey(state$l, key, callback);
  },
  setOptions(options) {
    Object.assign(state$l, options);
  },
  setRemoteFeatures(remoteFeatures) {
    if (!remoteFeatures) {
      return;
    }
    const newRemoteFeatures = { ...state$l.remoteFeatures, ...remoteFeatures };
    state$l.remoteFeatures = newRemoteFeatures;
    if (state$l.remoteFeatures?.socials) {
      state$l.remoteFeatures.socials = OptionsUtil.filterSocialsByPlatform(state$l.remoteFeatures.socials);
    }
  },
  setFeatures(features) {
    if (!features) {
      return;
    }
    if (!state$l.features) {
      state$l.features = ConstantsUtil$2.DEFAULT_FEATURES;
    }
    const newFeatures = { ...state$l.features, ...features };
    state$l.features = newFeatures;
  },
  setProjectId(projectId) {
    state$l.projectId = projectId;
  },
  setCustomRpcUrls(customRpcUrls) {
    state$l.customRpcUrls = customRpcUrls;
  },
  setAllWallets(allWallets) {
    state$l.allWallets = allWallets;
  },
  setIncludeWalletIds(includeWalletIds) {
    state$l.includeWalletIds = includeWalletIds;
  },
  setExcludeWalletIds(excludeWalletIds) {
    state$l.excludeWalletIds = excludeWalletIds;
  },
  setFeaturedWalletIds(featuredWalletIds) {
    state$l.featuredWalletIds = featuredWalletIds;
  },
  setTokens(tokens) {
    state$l.tokens = tokens;
  },
  setTermsConditionsUrl(termsConditionsUrl) {
    state$l.termsConditionsUrl = termsConditionsUrl;
  },
  setPrivacyPolicyUrl(privacyPolicyUrl) {
    state$l.privacyPolicyUrl = privacyPolicyUrl;
  },
  setCustomWallets(customWallets) {
    state$l.customWallets = customWallets;
  },
  setIsSiweEnabled(isSiweEnabled) {
    state$l.isSiweEnabled = isSiweEnabled;
  },
  setIsUniversalProvider(isUniversalProvider) {
    state$l.isUniversalProvider = isUniversalProvider;
  },
  setSdkVersion(sdkVersion) {
    state$l.sdkVersion = sdkVersion;
  },
  setMetadata(metadata) {
    state$l.metadata = metadata;
  },
  setDisableAppend(disableAppend) {
    state$l.disableAppend = disableAppend;
  },
  setEIP6963Enabled(enableEIP6963) {
    state$l.enableEIP6963 = enableEIP6963;
  },
  setDebug(debug) {
    state$l.debug = debug;
  },
  setEnableWalletConnect(enableWalletConnect) {
    state$l.enableWalletConnect = enableWalletConnect;
  },
  setEnableWalletGuide(enableWalletGuide) {
    state$l.enableWalletGuide = enableWalletGuide;
  },
  setEnableAuthLogger(enableAuthLogger) {
    state$l.enableAuthLogger = enableAuthLogger;
  },
  setEnableWallets(enableWallets) {
    state$l.enableWallets = enableWallets;
  },
  setPreferUniversalLinks(preferUniversalLinks) {
    state$l.experimental_preferUniversalLinks = preferUniversalLinks;
  },
  setHasMultipleAddresses(hasMultipleAddresses) {
    state$l.hasMultipleAddresses = hasMultipleAddresses;
  },
  setSIWX(siwx) {
    state$l.siwx = siwx;
  },
  setConnectMethodsOrder(connectMethodsOrder) {
    state$l.features = {
      ...state$l.features,
      connectMethodsOrder
    };
  },
  setWalletFeaturesOrder(walletFeaturesOrder) {
    state$l.features = {
      ...state$l.features,
      walletFeaturesOrder
    };
  },
  setSocialsOrder(socialsOrder) {
    state$l.remoteFeatures = {
      ...state$l.remoteFeatures,
      socials: socialsOrder
    };
  },
  setCollapseWallets(collapseWallets) {
    state$l.features = {
      ...state$l.features,
      collapseWallets
    };
  },
  setEnableEmbedded(enableEmbedded) {
    state$l.enableEmbedded = enableEmbedded;
  },
  setAllowUnsupportedChain(allowUnsupportedChain) {
    state$l.allowUnsupportedChain = allowUnsupportedChain;
  },
  setManualWCControl(manualWCControl) {
    state$l.manualWCControl = manualWCControl;
  },
  setEnableNetworkSwitch(enableNetworkSwitch) {
    state$l.enableNetworkSwitch = enableNetworkSwitch;
  },
  setDefaultAccountTypes(defaultAccountType = {}) {
    Object.entries(defaultAccountType).forEach(([namespace, accountType]) => {
      if (accountType) {
        state$l.defaultAccountTypes[namespace] = accountType;
      }
    });
  },
  setUniversalProviderConfigOverride(universalProviderConfigOverride) {
    state$l.universalProviderConfigOverride = universalProviderConfigOverride;
  },
  getUniversalProviderConfigOverride() {
    return state$l.universalProviderConfigOverride;
  },
  getSnapshot() {
    return snapshot(state$l);
  }
};
const DEFAULT_STATE$1 = Object.freeze({
  enabled: true,
  events: []
});
const api$2 = new FetchUtil({ baseUrl: CoreHelperUtil.getAnalyticsUrl(), clientId: null });
const MAX_ERRORS_PER_MINUTE = 5;
const ONE_MINUTE_MS = 60 * 1e3;
const state$k = proxy({
  ...DEFAULT_STATE$1
});
const TelemetryController = {
  state: state$k,
  subscribeKey(key, callback) {
    return subscribeKey(state$k, key, callback);
  },
  async sendError(error, category) {
    if (!state$k.enabled) {
      return;
    }
    const now = Date.now();
    const recentErrors = state$k.events.filter((event) => {
      const eventTime = new Date(event.properties.timestamp || "").getTime();
      return now - eventTime < ONE_MINUTE_MS;
    });
    if (recentErrors.length >= MAX_ERRORS_PER_MINUTE) {
      return;
    }
    const errorEvent = {
      type: "error",
      event: category,
      properties: {
        errorType: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    state$k.events.push(errorEvent);
    try {
      if (typeof window === "undefined") {
        return;
      }
      const { projectId, sdkType, sdkVersion } = OptionsController.state;
      await api$2.post({
        path: "/e",
        params: {
          projectId,
          st: sdkType,
          sv: sdkVersion || "html-wagmi-4.2.2"
        },
        body: {
          eventId: CoreHelperUtil.getUUID(),
          url: window.location.href,
          domain: window.location.hostname,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          props: {
            type: "error",
            event: category,
            errorType: error.name,
            errorMessage: error.message,
            stackTrace: error.stack
          }
        }
      });
    } catch {
    }
  },
  enable() {
    state$k.enabled = true;
  },
  disable() {
    state$k.enabled = false;
  },
  clearEvents() {
    state$k.events = [];
  }
};
class AppKitError extends Error {
  constructor(message, category, originalError) {
    super(message);
    this.name = "AppKitError";
    this.category = category;
    this.originalError = originalError;
    Object.setPrototypeOf(this, AppKitError.prototype);
    let isStackConstructedFromOriginal = false;
    if (originalError instanceof Error && typeof originalError.stack === "string" && originalError.stack) {
      const originalErrorStack = originalError.stack;
      const firstNewlineIndex = originalErrorStack.indexOf("\n");
      if (firstNewlineIndex > -1) {
        const originalFrames = originalErrorStack.substring(firstNewlineIndex + 1);
        this.stack = `${this.name}: ${this.message}
${originalFrames}`;
        isStackConstructedFromOriginal = true;
      }
    }
    if (!isStackConstructedFromOriginal) {
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, AppKitError);
      } else if (!this.stack) {
        this.stack = `${this.name}: ${this.message}`;
      }
    }
  }
}
function errorHandler(err, defaultCategory) {
  const error = err instanceof AppKitError ? err : new AppKitError(err instanceof Error ? err.message : String(err), defaultCategory, err);
  TelemetryController.sendError(error, error.category);
  throw error;
}
function withErrorBoundary(controller2, defaultCategory = "INTERNAL_SDK_ERROR") {
  const newController = {};
  Object.keys(controller2).forEach((key) => {
    const original = controller2[key];
    if (typeof original === "function") {
      let wrapped = original;
      if (original.constructor.name === "AsyncFunction") {
        wrapped = async (...args) => {
          try {
            return await original(...args);
          } catch (err) {
            return errorHandler(err, defaultCategory);
          }
        };
      } else {
        wrapped = (...args) => {
          try {
            return original(...args);
          } catch (err) {
            return errorHandler(err, defaultCategory);
          }
        };
      }
      newController[key] = wrapped;
    } else {
      newController[key] = original;
    }
  });
  return newController;
}
const CUSTOM_DEEPLINK_WALLETS = {
  PHANTOM: {
    id: "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393",
    url: "https://phantom.app"
  },
  SOLFLARE: {
    id: "1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79",
    url: "https://solflare.com"
  },
  COINBASE: {
    id: "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa",
    url: "https://go.cb-w.com"
  }
};
const MobileWalletUtil = {
  /**
   * Handles mobile wallet redirection for wallets that have Universal Links and doesn't support WalletConnect Deep Links.
   *
   * @param {string} id - The id of the wallet.
   * @param {ChainNamespace} namespace - The namespace of the chain.
   */
  handleMobileDeeplinkRedirect(id, namespace) {
    const href = window.location.href;
    const encodedHref = encodeURIComponent(href);
    if (id === CUSTOM_DEEPLINK_WALLETS.PHANTOM.id && !("phantom" in window)) {
      const protocol = href.startsWith("https") ? "https" : "http";
      const host = href.split("/")[2];
      const encodedRef = encodeURIComponent(`${protocol}://${host}`);
      window.location.href = `${CUSTOM_DEEPLINK_WALLETS.PHANTOM.url}/ul/browse/${encodedHref}?ref=${encodedRef}`;
    }
    if (id === CUSTOM_DEEPLINK_WALLETS.SOLFLARE.id && !("solflare" in window)) {
      window.location.href = `${CUSTOM_DEEPLINK_WALLETS.SOLFLARE.url}/ul/v1/browse/${encodedHref}?ref=${encodedHref}`;
    }
    if (namespace === ConstantsUtil$3.CHAIN.SOLANA) {
      if (id === CUSTOM_DEEPLINK_WALLETS.COINBASE.id && !("coinbaseSolana" in window)) {
        window.location.href = `${CUSTOM_DEEPLINK_WALLETS.COINBASE.url}/dapp?cb_url=${encodedHref}`;
      }
    }
  }
};
const state$j = proxy({
  walletImages: {},
  networkImages: {},
  chainImages: {},
  connectorImages: {},
  tokenImages: {},
  currencyImages: {}
});
const controller$d = {
  state: state$j,
  subscribeNetworkImages(callback) {
    return subscribe(state$j.networkImages, () => callback(state$j.networkImages));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state$j, key, callback);
  },
  subscribe(callback) {
    return subscribe(state$j, () => callback(state$j));
  },
  setWalletImage(key, value) {
    state$j.walletImages[key] = value;
  },
  setNetworkImage(key, value) {
    state$j.networkImages[key] = value;
  },
  setChainImage(key, value) {
    state$j.chainImages[key] = value;
  },
  setConnectorImage(key, value) {
    state$j.connectorImages = { ...state$j.connectorImages, [key]: value };
  },
  setTokenImage(key, value) {
    state$j.tokenImages[key] = value;
  },
  setCurrencyImage(key, value) {
    state$j.currencyImages[key] = value;
  }
};
const AssetController = withErrorBoundary(controller$d);
const namespaceImageIds = {
  // Ethereum
  eip155: "ba0ba0cd-17c6-4806-ad93-f9d174f17900",
  // Solana
  solana: "a1b58899-f671-4276-6a5e-56ca5bd59700",
  // Polkadot
  polkadot: "",
  // Bitcoin
  bip122: "0b4838db-0161-4ffe-022d-532bf03dba00",
  // Cosmos
  cosmos: ""
};
const state$i = proxy({
  networkImagePromises: {}
});
const AssetUtil = {
  async fetchWalletImage(imageId) {
    if (!imageId) {
      return void 0;
    }
    await ApiController._fetchWalletImage(imageId);
    return this.getWalletImageById(imageId);
  },
  async fetchNetworkImage(imageId) {
    if (!imageId) {
      return void 0;
    }
    const existingImage = this.getNetworkImageById(imageId);
    if (existingImage) {
      return existingImage;
    }
    if (!state$i.networkImagePromises[imageId]) {
      state$i.networkImagePromises[imageId] = ApiController._fetchNetworkImage(imageId);
    }
    await state$i.networkImagePromises[imageId];
    return this.getNetworkImageById(imageId);
  },
  getWalletImageById(imageId) {
    if (!imageId) {
      return void 0;
    }
    return AssetController.state.walletImages[imageId];
  },
  getWalletImage(wallet) {
    if (wallet?.image_url) {
      return wallet?.image_url;
    }
    if (wallet?.image_id) {
      return AssetController.state.walletImages[wallet.image_id];
    }
    return void 0;
  },
  getNetworkImage(network) {
    if (network?.assets?.imageUrl) {
      return network?.assets?.imageUrl;
    }
    if (network?.assets?.imageId) {
      return AssetController.state.networkImages[network.assets.imageId];
    }
    return void 0;
  },
  getNetworkImageById(imageId) {
    if (!imageId) {
      return void 0;
    }
    return AssetController.state.networkImages[imageId];
  },
  getConnectorImage(connector) {
    if (connector?.imageUrl) {
      return connector.imageUrl;
    }
    if (connector?.imageId) {
      return AssetController.state.connectorImages[connector.imageId];
    }
    return void 0;
  },
  getChainImage(chain) {
    return AssetController.state.networkImages[namespaceImageIds[chain]];
  }
};
const state$h = proxy({
  message: "",
  variant: "info",
  open: false
});
const controller$c = {
  state: state$h,
  subscribeKey(key, callback) {
    return subscribeKey(state$h, key, callback);
  },
  open(message, variant) {
    const { debug } = OptionsController.state;
    const { shortMessage, longMessage } = message;
    if (debug) {
      state$h.message = shortMessage;
      state$h.variant = variant;
      state$h.open = true;
    }
    if (longMessage) {
      console.error(typeof longMessage === "function" ? longMessage() : longMessage);
    }
  },
  close() {
    state$h.open = false;
    state$h.message = "";
    state$h.variant = "info";
  }
};
const AlertController = withErrorBoundary(controller$c);
const baseUrl$2 = CoreHelperUtil.getAnalyticsUrl();
const api$1 = new FetchUtil({ baseUrl: baseUrl$2, clientId: null });
const excluded = ["MODAL_CREATED"];
const state$g = proxy({
  timestamp: Date.now(),
  reportedErrors: {},
  data: {
    type: "track",
    event: "MODAL_CREATED"
  }
});
const EventsController = {
  state: state$g,
  subscribe(callback) {
    return subscribe(state$g, () => callback(state$g));
  },
  getSdkProperties() {
    const { projectId, sdkType, sdkVersion } = OptionsController.state;
    return {
      projectId,
      st: sdkType,
      sv: sdkVersion || "html-wagmi-4.2.2"
    };
  },
  async _sendAnalyticsEvent(payload) {
    try {
      const address = AccountController.state.address;
      if (excluded.includes(payload.data.event) || typeof window === "undefined") {
        return;
      }
      await api$1.post({
        path: "/e",
        params: EventsController.getSdkProperties(),
        body: {
          eventId: CoreHelperUtil.getUUID(),
          url: window.location.href,
          domain: window.location.hostname,
          timestamp: payload.timestamp,
          props: { ...payload.data, address }
        }
      });
      state$g.reportedErrors["FORBIDDEN"] = false;
    } catch (err) {
      const isForbiddenError = err instanceof Error && err.cause instanceof Response && err.cause.status === ConstantsUtil$3.HTTP_STATUS_CODES.FORBIDDEN && !state$g.reportedErrors["FORBIDDEN"];
      if (isForbiddenError) {
        AlertController.open({
          shortMessage: "Invalid App Configuration",
          longMessage: `Origin ${isSafe$1() ? window.origin : "uknown"} not found on Allowlist - update configuration on cloud.reown.com`
        }, "error");
        state$g.reportedErrors["FORBIDDEN"] = true;
      }
    }
  },
  sendEvent(data) {
    state$g.timestamp = Date.now();
    state$g.data = data;
    if (OptionsController.state.features?.analytics) {
      EventsController._sendAnalyticsEvent(state$g);
    }
  }
};
const baseUrl$1 = CoreHelperUtil.getApiUrl();
const api = new FetchUtil({
  baseUrl: baseUrl$1,
  clientId: null
});
const entries = 40;
const recommendedEntries = 4;
const imageCountToFetch = 20;
const state$f = proxy({
  promises: {},
  page: 1,
  count: 0,
  featured: [],
  allFeatured: [],
  recommended: [],
  allRecommended: [],
  wallets: [],
  filteredWallets: [],
  search: [],
  isAnalyticsEnabled: false,
  excludedWallets: [],
  isFetchingRecommendedWallets: false
});
const ApiController = {
  state: state$f,
  subscribeKey(key, callback) {
    return subscribeKey(state$f, key, callback);
  },
  _getSdkProperties() {
    const { projectId, sdkType, sdkVersion } = OptionsController.state;
    return {
      projectId,
      st: sdkType || "appkit",
      sv: sdkVersion || "html-wagmi-4.2.2"
    };
  },
  _filterOutExtensions(wallets) {
    if (OptionsController.state.isUniversalProvider) {
      return wallets.filter((w2) => Boolean(w2.mobile_link || w2.desktop_link || w2.webapp_link));
    }
    return wallets;
  },
  async _fetchWalletImage(imageId) {
    const imageUrl = `${api.baseUrl}/getWalletImage/${imageId}`;
    const blob = await api.getBlob({ path: imageUrl, params: ApiController._getSdkProperties() });
    AssetController.setWalletImage(imageId, URL.createObjectURL(blob));
  },
  async _fetchNetworkImage(imageId) {
    const imageUrl = `${api.baseUrl}/public/getAssetImage/${imageId}`;
    const blob = await api.getBlob({ path: imageUrl, params: ApiController._getSdkProperties() });
    AssetController.setNetworkImage(imageId, URL.createObjectURL(blob));
  },
  async _fetchConnectorImage(imageId) {
    const imageUrl = `${api.baseUrl}/public/getAssetImage/${imageId}`;
    const blob = await api.getBlob({ path: imageUrl, params: ApiController._getSdkProperties() });
    AssetController.setConnectorImage(imageId, URL.createObjectURL(blob));
  },
  async _fetchCurrencyImage(countryCode) {
    const imageUrl = `${api.baseUrl}/public/getCurrencyImage/${countryCode}`;
    const blob = await api.getBlob({ path: imageUrl, params: ApiController._getSdkProperties() });
    AssetController.setCurrencyImage(countryCode, URL.createObjectURL(blob));
  },
  async _fetchTokenImage(symbol) {
    const imageUrl = `${api.baseUrl}/public/getTokenImage/${symbol}`;
    const blob = await api.getBlob({ path: imageUrl, params: ApiController._getSdkProperties() });
    AssetController.setTokenImage(symbol, URL.createObjectURL(blob));
  },
  _filterWalletsByPlatform(wallets) {
    const filteredWallets = CoreHelperUtil.isMobile() ? wallets?.filter((w2) => {
      if (w2.mobile_link) {
        return true;
      }
      if (w2.id === CUSTOM_DEEPLINK_WALLETS.COINBASE.id) {
        return true;
      }
      const isSolana = ChainController.state.activeChain === "solana";
      return isSolana && (w2.id === CUSTOM_DEEPLINK_WALLETS.SOLFLARE.id || w2.id === CUSTOM_DEEPLINK_WALLETS.PHANTOM.id);
    }) : wallets;
    return filteredWallets;
  },
  async fetchProjectConfig() {
    const response = await api.get({
      path: "/appkit/v1/config",
      params: ApiController._getSdkProperties()
    });
    return response.features;
  },
  async fetchAllowedOrigins() {
    try {
      const { allowedOrigins } = await api.get({
        path: "/projects/v1/origins",
        params: ApiController._getSdkProperties()
      });
      return allowedOrigins;
    } catch (error) {
      return [];
    }
  },
  async fetchNetworkImages() {
    const requestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const ids = requestedCaipNetworks?.map(({ assets }) => assets?.imageId).filter(Boolean).filter((imageId) => !AssetUtil.getNetworkImageById(imageId));
    if (ids) {
      await Promise.allSettled(ids.map((id) => ApiController._fetchNetworkImage(id)));
    }
  },
  async fetchConnectorImages() {
    const { connectors } = ConnectorController.state;
    const ids = connectors.map(({ imageId }) => imageId).filter(Boolean);
    await Promise.allSettled(ids.map((id) => ApiController._fetchConnectorImage(id)));
  },
  async fetchCurrencyImages(currencies = []) {
    await Promise.allSettled(currencies.map((currency) => ApiController._fetchCurrencyImage(currency)));
  },
  async fetchTokenImages(tokens = []) {
    await Promise.allSettled(tokens.map((token) => ApiController._fetchTokenImage(token)));
  },
  async fetchWallets(params) {
    const exclude = params.exclude ?? [];
    const sdkProperties = ApiController._getSdkProperties();
    if (sdkProperties.sv.startsWith("html-core-")) {
      exclude.push(...Object.values(CUSTOM_DEEPLINK_WALLETS).map((w2) => w2.id));
    }
    const wallets = await api.get({
      path: "/getWallets",
      params: {
        ...ApiController._getSdkProperties(),
        ...params,
        page: String(params.page),
        entries: String(params.entries),
        include: params.include?.join(","),
        exclude: exclude.join(",")
      }
    });
    const filteredWallets = ApiController._filterWalletsByPlatform(wallets?.data);
    return {
      data: filteredWallets || [],
      // Keep original count for display on main page
      count: wallets?.count
    };
  },
  async fetchFeaturedWallets() {
    const { featuredWalletIds } = OptionsController.state;
    if (featuredWalletIds?.length) {
      const params = {
        ...ApiController._getSdkProperties(),
        page: 1,
        entries: featuredWalletIds?.length ?? recommendedEntries,
        include: featuredWalletIds
      };
      const { data } = await ApiController.fetchWallets(params);
      const sortedData = [...data].sort((a2, b2) => featuredWalletIds.indexOf(a2.id) - featuredWalletIds.indexOf(b2.id));
      const images = sortedData.map((d3) => d3.image_id).filter(Boolean);
      await Promise.allSettled(images.map((id) => ApiController._fetchWalletImage(id)));
      state$f.featured = sortedData;
      state$f.allFeatured = sortedData;
    }
  },
  async fetchRecommendedWallets() {
    try {
      state$f.isFetchingRecommendedWallets = true;
      const { includeWalletIds, excludeWalletIds, featuredWalletIds } = OptionsController.state;
      const exclude = [...excludeWalletIds ?? [], ...featuredWalletIds ?? []].filter(Boolean);
      const chains = ChainController.getRequestedCaipNetworkIds().join(",");
      const params = {
        page: 1,
        entries: recommendedEntries,
        include: includeWalletIds,
        exclude,
        chains
      };
      const { data, count } = await ApiController.fetchWallets(params);
      const recent = StorageUtil.getRecentWallets();
      const recommendedImages = data.map((d3) => d3.image_id).filter(Boolean);
      const recentImages = recent.map((r2) => r2.image_id).filter(Boolean);
      await Promise.allSettled([...recommendedImages, ...recentImages].map((id) => ApiController._fetchWalletImage(id)));
      state$f.recommended = data;
      state$f.allRecommended = data;
      state$f.count = count ?? 0;
    } catch {
    } finally {
      state$f.isFetchingRecommendedWallets = false;
    }
  },
  async fetchWalletsByPage({ page }) {
    const { includeWalletIds, excludeWalletIds, featuredWalletIds } = OptionsController.state;
    const chains = ChainController.getRequestedCaipNetworkIds().join(",");
    const exclude = [
      ...state$f.recommended.map(({ id }) => id),
      ...excludeWalletIds ?? [],
      ...featuredWalletIds ?? []
    ].filter(Boolean);
    const params = {
      page,
      entries,
      include: includeWalletIds,
      exclude,
      chains
    };
    const { data, count } = await ApiController.fetchWallets(params);
    const images = data.slice(0, imageCountToFetch).map((w2) => w2.image_id).filter(Boolean);
    await Promise.allSettled(images.map((id) => ApiController._fetchWalletImage(id)));
    state$f.wallets = CoreHelperUtil.uniqueBy([...state$f.wallets, ...ApiController._filterOutExtensions(data)], "id").filter((w2) => w2.chains?.some((chain) => chains.includes(chain)));
    state$f.count = count > state$f.count ? count : state$f.count;
    state$f.page = page;
  },
  async initializeExcludedWallets({ ids }) {
    const params = {
      page: 1,
      entries: ids.length,
      include: ids
    };
    const { data } = await ApiController.fetchWallets(params);
    if (data) {
      data.forEach((wallet) => {
        state$f.excludedWallets.push({ rdns: wallet.rdns, name: wallet.name });
      });
    }
  },
  async searchWallet({ search, badge }) {
    const { includeWalletIds, excludeWalletIds } = OptionsController.state;
    const chains = ChainController.getRequestedCaipNetworkIds().join(",");
    state$f.search = [];
    const params = {
      page: 1,
      entries: 100,
      search: search?.trim(),
      badge_type: badge,
      include: includeWalletIds,
      exclude: excludeWalletIds,
      chains
    };
    const { data } = await ApiController.fetchWallets(params);
    EventsController.sendEvent({
      type: "track",
      event: "SEARCH_WALLET",
      properties: { badge: badge ?? "", search: search ?? "" }
    });
    const images = data.map((w2) => w2.image_id).filter(Boolean);
    await Promise.allSettled([
      ...images.map((id) => ApiController._fetchWalletImage(id)),
      CoreHelperUtil.wait(300)
    ]);
    state$f.search = ApiController._filterOutExtensions(data);
  },
  initPromise(key, fetchFn) {
    const existingPromise = state$f.promises[key];
    if (existingPromise) {
      return existingPromise;
    }
    return state$f.promises[key] = fetchFn();
  },
  prefetch({ fetchConnectorImages = true, fetchFeaturedWallets = true, fetchRecommendedWallets = true, fetchNetworkImages = true } = {}) {
    const promises = [
      fetchConnectorImages && ApiController.initPromise("connectorImages", ApiController.fetchConnectorImages),
      fetchFeaturedWallets && ApiController.initPromise("featuredWallets", ApiController.fetchFeaturedWallets),
      fetchRecommendedWallets && ApiController.initPromise("recommendedWallets", ApiController.fetchRecommendedWallets),
      fetchNetworkImages && ApiController.initPromise("networkImages", ApiController.fetchNetworkImages)
    ].filter(Boolean);
    return Promise.allSettled(promises);
  },
  prefetchAnalyticsConfig() {
    if (OptionsController.state.features?.analytics) {
      ApiController.fetchAnalyticsConfig();
    }
  },
  async fetchAnalyticsConfig() {
    try {
      const { isAnalyticsEnabled } = await api.get({
        path: "/getAnalyticsConfig",
        params: ApiController._getSdkProperties()
      });
      OptionsController.setFeatures({ analytics: isAnalyticsEnabled });
    } catch (error) {
      OptionsController.setFeatures({ analytics: false });
    }
  },
  filterByNamespaces(namespaces) {
    if (!namespaces?.length) {
      state$f.featured = state$f.allFeatured;
      state$f.recommended = state$f.allRecommended;
      return;
    }
    const caipNetworkIds = ChainController.getRequestedCaipNetworkIds().join(",");
    state$f.featured = state$f.allFeatured.filter((wallet) => wallet.chains?.some((chain) => caipNetworkIds.includes(chain)));
    state$f.recommended = state$f.allRecommended.filter((wallet) => wallet.chains?.some((chain) => caipNetworkIds.includes(chain)));
    state$f.filteredWallets = state$f.wallets.filter((wallet) => wallet.chains?.some((chain) => caipNetworkIds.includes(chain)));
  },
  clearFilterByNamespaces() {
    state$f.filteredWallets = [];
  },
  setFilterByNamespace(namespace) {
    if (!namespace) {
      state$f.featured = state$f.allFeatured;
      state$f.recommended = state$f.allRecommended;
      return;
    }
    const caipNetworkIds = ChainController.getRequestedCaipNetworkIds().join(",");
    state$f.featured = state$f.allFeatured.filter((wallet) => wallet.chains?.some((chain) => caipNetworkIds.includes(chain)));
    state$f.recommended = state$f.allRecommended.filter((wallet) => wallet.chains?.some((chain) => caipNetworkIds.includes(chain)));
    state$f.filteredWallets = state$f.wallets.filter((wallet) => wallet.chains?.some((chain) => caipNetworkIds.includes(chain)));
  }
};
const state$e = proxy({
  view: "Connect",
  history: ["Connect"],
  transactionStack: []
});
const controller$b = {
  state: state$e,
  subscribeKey(key, callback) {
    return subscribeKey(state$e, key, callback);
  },
  pushTransactionStack(action) {
    state$e.transactionStack.push(action);
  },
  popTransactionStack(status) {
    const action = state$e.transactionStack.pop();
    if (!action) {
      return;
    }
    const { onSuccess, onError, onCancel } = action;
    switch (status) {
      case "success":
        onSuccess?.();
        break;
      case "error":
        onError?.();
        RouterController.goBack();
        break;
      case "cancel":
        onCancel?.();
        RouterController.goBack();
        break;
    }
  },
  push(view, data) {
    if (view !== state$e.view) {
      state$e.view = view;
      state$e.history.push(view);
      state$e.data = data;
    }
  },
  reset(view, data) {
    state$e.view = view;
    state$e.history = [view];
    state$e.data = data;
  },
  replace(view, data) {
    const lastView = state$e.history.at(-1);
    const isSameView = lastView === view;
    if (!isSameView) {
      state$e.view = view;
      state$e.history[state$e.history.length - 1] = view;
      state$e.data = data;
    }
  },
  goBack() {
    const isConnected = ChainController.state.activeCaipAddress;
    const isFarcasterView = RouterController.state.view === "ConnectingFarcaster";
    const shouldReload = !isConnected && isFarcasterView;
    if (state$e.history.length > 1) {
      state$e.history.pop();
      const [last] = state$e.history.slice(-1);
      if (last) {
        const isConnectView = last === "Connect";
        if (isConnected && isConnectView) {
          state$e.view = "Account";
        } else {
          state$e.view = last;
        }
      }
    } else {
      ModalController.close();
    }
    if (state$e.data?.wallet) {
      state$e.data.wallet = void 0;
    }
    setTimeout(() => {
      if (shouldReload) {
        AccountController.setFarcasterUrl(void 0, ChainController.state.activeChain);
        const authConnector = ConnectorController.getAuthConnector();
        authConnector?.provider?.reload();
        const optionsState = snapshot(OptionsController.state);
        authConnector?.provider?.syncDappData?.({
          metadata: optionsState.metadata,
          sdkVersion: optionsState.sdkVersion,
          projectId: optionsState.projectId,
          sdkType: optionsState.sdkType
        });
      }
    }, 100);
  },
  goBackToIndex(historyIndex) {
    if (state$e.history.length > 1) {
      state$e.history = state$e.history.slice(0, historyIndex + 1);
      const [last] = state$e.history.slice(-1);
      if (last) {
        state$e.view = last;
      }
    }
  },
  goBackOrCloseModal() {
    if (RouterController.state.history.length > 1) {
      RouterController.goBack();
    } else {
      ModalController.close();
    }
  }
};
const RouterController = withErrorBoundary(controller$b);
const state$d = proxy({
  themeMode: "dark",
  themeVariables: {},
  w3mThemeVariables: void 0
});
const controller$a = {
  state: state$d,
  subscribe(callback) {
    return subscribe(state$d, () => callback(state$d));
  },
  setThemeMode(themeMode) {
    state$d.themeMode = themeMode;
    try {
      const authConnector = ConnectorController.getAuthConnector();
      if (authConnector) {
        const themeVariables = controller$a.getSnapshot().themeVariables;
        authConnector.provider.syncTheme({
          themeMode,
          themeVariables,
          w3mThemeVariables: getW3mThemeVariables(themeVariables, themeMode)
        });
      }
    } catch {
      console.info("Unable to sync theme to auth connector");
    }
  },
  setThemeVariables(themeVariables) {
    state$d.themeVariables = { ...state$d.themeVariables, ...themeVariables };
    try {
      const authConnector = ConnectorController.getAuthConnector();
      if (authConnector) {
        const themeVariablesSnapshot = controller$a.getSnapshot().themeVariables;
        authConnector.provider.syncTheme({
          themeVariables: themeVariablesSnapshot,
          w3mThemeVariables: getW3mThemeVariables(state$d.themeVariables, state$d.themeMode)
        });
      }
    } catch {
      console.info("Unable to sync theme to auth connector");
    }
  },
  getSnapshot() {
    return snapshot(state$d);
  }
};
const ThemeController = withErrorBoundary(controller$a);
const defaultActiveConnectors = {
  eip155: void 0,
  solana: void 0,
  polkadot: void 0,
  bip122: void 0,
  cosmos: void 0
};
const state$c = proxy({
  allConnectors: [],
  connectors: [],
  activeConnector: void 0,
  filterByNamespace: void 0,
  activeConnectorIds: { ...defaultActiveConnectors },
  filterByNamespaceMap: {
    eip155: true,
    solana: true,
    polkadot: true,
    bip122: true,
    cosmos: true
  }
});
const controller$9 = {
  state: state$c,
  subscribe(callback) {
    return subscribe(state$c, () => {
      callback(state$c);
    });
  },
  subscribeKey(key, callback) {
    return subscribeKey(state$c, key, callback);
  },
  initialize(namespaces) {
    namespaces.forEach((namespace) => {
      const connectorId = StorageUtil.getConnectedConnectorId(namespace);
      if (connectorId) {
        ConnectorController.setConnectorId(connectorId, namespace);
      }
    });
  },
  setActiveConnector(connector) {
    if (connector) {
      state$c.activeConnector = ref(connector);
    }
  },
  setConnectors(connectors) {
    const newConnectors = connectors.filter((newConnector) => !state$c.allConnectors.some((existingConnector) => existingConnector.id === newConnector.id && ConnectorController.getConnectorName(existingConnector.name) === ConnectorController.getConnectorName(newConnector.name) && existingConnector.chain === newConnector.chain));
    newConnectors.forEach((connector) => {
      if (connector.type !== "MULTI_CHAIN") {
        state$c.allConnectors.push(ref(connector));
      }
    });
    const enabledNamespaces = ConnectorController.getEnabledNamespaces();
    const connectorsFilteredByNamespaces = ConnectorController.getEnabledConnectors(enabledNamespaces);
    state$c.connectors = ConnectorController.mergeMultiChainConnectors(connectorsFilteredByNamespaces);
  },
  filterByNamespaces(enabledNamespaces) {
    Object.keys(state$c.filterByNamespaceMap).forEach((namespace) => {
      state$c.filterByNamespaceMap[namespace] = false;
    });
    enabledNamespaces.forEach((namespace) => {
      state$c.filterByNamespaceMap[namespace] = true;
    });
    ConnectorController.updateConnectorsForEnabledNamespaces();
  },
  filterByNamespace(namespace, enabled) {
    state$c.filterByNamespaceMap[namespace] = enabled;
    ConnectorController.updateConnectorsForEnabledNamespaces();
  },
  updateConnectorsForEnabledNamespaces() {
    const enabledNamespaces = ConnectorController.getEnabledNamespaces();
    const enabledConnectors = ConnectorController.getEnabledConnectors(enabledNamespaces);
    const areAllNamespacesEnabled = ConnectorController.areAllNamespacesEnabled();
    state$c.connectors = ConnectorController.mergeMultiChainConnectors(enabledConnectors);
    if (areAllNamespacesEnabled) {
      ApiController.clearFilterByNamespaces();
    } else {
      ApiController.filterByNamespaces(enabledNamespaces);
    }
  },
  getEnabledNamespaces() {
    return Object.entries(state$c.filterByNamespaceMap).filter(([_2, enabled]) => enabled).map(([namespace]) => namespace);
  },
  getEnabledConnectors(enabledNamespaces) {
    return state$c.allConnectors.filter((connector) => enabledNamespaces.includes(connector.chain));
  },
  areAllNamespacesEnabled() {
    return Object.values(state$c.filterByNamespaceMap).every((enabled) => enabled);
  },
  mergeMultiChainConnectors(connectors) {
    const connectorsByNameMap = ConnectorController.generateConnectorMapByName(connectors);
    const mergedConnectors = [];
    connectorsByNameMap.forEach((keyConnectors) => {
      const firstItem = keyConnectors[0];
      const isAuthConnector = firstItem?.id === ConstantsUtil$3.CONNECTOR_ID.AUTH;
      if (keyConnectors.length > 1 && firstItem) {
        mergedConnectors.push({
          name: firstItem.name,
          imageUrl: firstItem.imageUrl,
          imageId: firstItem.imageId,
          connectors: [...keyConnectors],
          type: isAuthConnector ? "AUTH" : "MULTI_CHAIN",
          // These values are just placeholders, we don't use them in multi-chain connector select screen
          chain: "eip155",
          id: firstItem?.id || ""
        });
      } else if (firstItem) {
        mergedConnectors.push(firstItem);
      }
    });
    return mergedConnectors;
  },
  generateConnectorMapByName(connectors) {
    const connectorsByNameMap = /* @__PURE__ */ new Map();
    connectors.forEach((connector) => {
      const { name } = connector;
      const connectorName = ConnectorController.getConnectorName(name);
      if (!connectorName) {
        return;
      }
      const connectorsByName = connectorsByNameMap.get(connectorName) || [];
      const haveSameConnector = connectorsByName.find((c2) => c2.chain === connector.chain);
      if (!haveSameConnector) {
        connectorsByName.push(connector);
      }
      connectorsByNameMap.set(connectorName, connectorsByName);
    });
    return connectorsByNameMap;
  },
  getConnectorName(name) {
    if (!name) {
      return name;
    }
    const nameOverrideMap = {
      "Trust Wallet": "Trust"
    };
    return nameOverrideMap[name] || name;
  },
  getUniqueConnectorsByName(connectors) {
    const uniqueConnectors = [];
    connectors.forEach((c2) => {
      if (!uniqueConnectors.find((uc2) => uc2.chain === c2.chain)) {
        uniqueConnectors.push(c2);
      }
    });
    return uniqueConnectors;
  },
  addConnector(connector) {
    if (connector.id === ConstantsUtil$3.CONNECTOR_ID.AUTH) {
      const authConnector = connector;
      const optionsState = snapshot(OptionsController.state);
      const themeMode = ThemeController.getSnapshot().themeMode;
      const themeVariables = ThemeController.getSnapshot().themeVariables;
      authConnector?.provider?.syncDappData?.({
        metadata: optionsState.metadata,
        sdkVersion: optionsState.sdkVersion,
        projectId: optionsState.projectId,
        sdkType: optionsState.sdkType
      });
      authConnector?.provider?.syncTheme({
        themeMode,
        themeVariables,
        w3mThemeVariables: getW3mThemeVariables(themeVariables, themeMode)
      });
      ConnectorController.setConnectors([connector]);
    } else {
      ConnectorController.setConnectors([connector]);
    }
  },
  getAuthConnector(chainNamespace) {
    const activeNamespace = chainNamespace || ChainController.state.activeChain;
    const authConnector = state$c.connectors.find((c2) => c2.id === ConstantsUtil$3.CONNECTOR_ID.AUTH);
    if (!authConnector) {
      return void 0;
    }
    if (authConnector?.connectors?.length) {
      const connector = authConnector.connectors.find((c2) => c2.chain === activeNamespace);
      return connector;
    }
    return authConnector;
  },
  getAnnouncedConnectorRdns() {
    return state$c.connectors.filter((c2) => c2.type === "ANNOUNCED").map((c2) => c2.info?.rdns);
  },
  getConnectorById(id) {
    return state$c.allConnectors.find((c2) => c2.id === id);
  },
  getConnector(id, rdns) {
    const connectorsByNamespace = state$c.allConnectors.filter((c2) => c2.chain === ChainController.state.activeChain);
    return connectorsByNamespace.find((c2) => c2.explorerId === id || c2.info?.rdns === rdns);
  },
  syncIfAuthConnector(connector) {
    if (connector.id !== "ID_AUTH") {
      return;
    }
    const authConnector = connector;
    const optionsState = snapshot(OptionsController.state);
    const themeMode = ThemeController.getSnapshot().themeMode;
    const themeVariables = ThemeController.getSnapshot().themeVariables;
    authConnector?.provider?.syncDappData?.({
      metadata: optionsState.metadata,
      sdkVersion: optionsState.sdkVersion,
      sdkType: optionsState.sdkType,
      projectId: optionsState.projectId
    });
    authConnector.provider.syncTheme({
      themeMode,
      themeVariables,
      w3mThemeVariables: getW3mThemeVariables(themeVariables, themeMode)
    });
  },
  /**
   * Returns the connectors filtered by namespace.
   * @param namespace - The namespace to filter the connectors by.
   * @returns ConnectorWithProviders[].
   */
  getConnectorsByNamespace(namespace) {
    const namespaceConnectors = state$c.allConnectors.filter((connector) => connector.chain === namespace);
    return ConnectorController.mergeMultiChainConnectors(namespaceConnectors);
  },
  selectWalletConnector(wallet) {
    const connector = ConnectorController.getConnector(wallet.id, wallet.rdns);
    const namespace = ChainController.state.activeChain;
    MobileWalletUtil.handleMobileDeeplinkRedirect(connector?.explorerId || wallet.id, namespace);
    if (connector) {
      RouterController.push("ConnectingExternal", { connector });
    } else {
      RouterController.push("ConnectingWalletConnect", { wallet });
    }
  },
  /**
   * Returns the connectors. If a namespace is provided, the connectors are filtered by namespace.
   * @param namespace - The namespace to filter the connectors by. If not provided, all connectors are returned.
   * @returns ConnectorWithProviders[].
   */
  getConnectors(namespace) {
    if (namespace) {
      return ConnectorController.getConnectorsByNamespace(namespace);
    }
    return ConnectorController.mergeMultiChainConnectors(state$c.allConnectors);
  },
  /**
   * Sets the filter by namespace and updates the connectors.
   * @param namespace - The namespace to filter the connectors by.
   */
  setFilterByNamespace(namespace) {
    state$c.filterByNamespace = namespace;
    state$c.connectors = ConnectorController.getConnectors(namespace);
    ApiController.setFilterByNamespace(namespace);
  },
  setConnectorId(connectorId, namespace) {
    if (connectorId) {
      state$c.activeConnectorIds = {
        ...state$c.activeConnectorIds,
        [namespace]: connectorId
      };
      StorageUtil.setConnectedConnectorId(namespace, connectorId);
    }
  },
  removeConnectorId(namespace) {
    state$c.activeConnectorIds = {
      ...state$c.activeConnectorIds,
      [namespace]: void 0
    };
    StorageUtil.deleteConnectedConnectorId(namespace);
  },
  getConnectorId(namespace) {
    if (!namespace) {
      return void 0;
    }
    return state$c.activeConnectorIds[namespace];
  },
  isConnected(namespace) {
    if (!namespace) {
      return Object.values(state$c.activeConnectorIds).some((id) => Boolean(id));
    }
    return Boolean(state$c.activeConnectorIds[namespace]);
  },
  resetConnectorIds() {
    state$c.activeConnectorIds = { ...defaultActiveConnectors };
  }
};
const ConnectorController = withErrorBoundary(controller$9);
const DEFAULT_SDK_URL = "https://secure.walletconnect.org/sdk";
(typeof process !== "undefined" && typeof process.env !== "undefined" ? process.env["NEXT_PUBLIC_SECURE_SITE_SDK_URL"] : void 0) || DEFAULT_SDK_URL;
(typeof process !== "undefined" && typeof process.env !== "undefined" ? process.env["NEXT_PUBLIC_DEFAULT_LOG_LEVEL"] : void 0) || "error";
(typeof process !== "undefined" && typeof process.env !== "undefined" ? process.env["NEXT_PUBLIC_SECURE_SITE_SDK_VERSION"] : void 0) || "4";
const W3mFrameRpcConstants = {
  ACCOUNT_TYPES: {
    SMART_ACCOUNT: "smartAccount"
  }
};
const DEFAULT_STATE = Object.freeze({
  message: "",
  variant: "success",
  svg: void 0,
  open: false,
  autoClose: true
});
const state$b = proxy({
  ...DEFAULT_STATE
});
const controller$8 = {
  state: state$b,
  subscribeKey(key, callback) {
    return subscribeKey(state$b, key, callback);
  },
  showLoading(message, options = {}) {
    this._showMessage({ message, variant: "loading", ...options });
  },
  showSuccess(message) {
    this._showMessage({ message, variant: "success" });
  },
  showSvg(message, svg) {
    this._showMessage({ message, svg });
  },
  showError(message) {
    const errorMessage = CoreHelperUtil.parseError(message);
    this._showMessage({ message: errorMessage, variant: "error" });
  },
  hide() {
    state$b.message = DEFAULT_STATE.message;
    state$b.variant = DEFAULT_STATE.variant;
    state$b.svg = DEFAULT_STATE.svg;
    state$b.open = DEFAULT_STATE.open;
    state$b.autoClose = DEFAULT_STATE.autoClose;
  },
  _showMessage({ message, svg, variant = "success", autoClose = DEFAULT_STATE.autoClose }) {
    if (state$b.open) {
      state$b.open = false;
      setTimeout(() => {
        state$b.message = message;
        state$b.variant = variant;
        state$b.svg = svg;
        state$b.open = true;
        state$b.autoClose = autoClose;
      }, 150);
    } else {
      state$b.message = message;
      state$b.variant = variant;
      state$b.svg = svg;
      state$b.open = true;
      state$b.autoClose = autoClose;
    }
  }
};
const SnackController = controller$8;
const state$a = proxy({
  transactions: [],
  coinbaseTransactions: {},
  transactionsByYear: {},
  lastNetworkInView: void 0,
  loading: false,
  empty: false,
  next: void 0
});
const controller$7 = {
  state: state$a,
  subscribe(callback) {
    return subscribe(state$a, () => callback(state$a));
  },
  setLastNetworkInView(lastNetworkInView) {
    state$a.lastNetworkInView = lastNetworkInView;
  },
  async fetchTransactions(accountAddress, onramp) {
    if (!accountAddress) {
      throw new Error("Transactions can't be fetched without an accountAddress");
    }
    state$a.loading = true;
    try {
      const response = await BlockchainApiController.fetchTransactions({
        account: accountAddress,
        cursor: state$a.next,
        onramp,
        // Coinbase transaction history state updates require the latest data
        cache: onramp === "coinbase" ? "no-cache" : void 0,
        chainId: ChainController.state.activeCaipNetwork?.caipNetworkId
      });
      const nonSpamTransactions = TransactionsController.filterSpamTransactions(response.data);
      const sameChainTransactions = TransactionsController.filterByConnectedChain(nonSpamTransactions);
      const filteredTransactions = [...state$a.transactions, ...sameChainTransactions];
      state$a.loading = false;
      if (onramp === "coinbase") {
        state$a.coinbaseTransactions = TransactionsController.groupTransactionsByYearAndMonth(state$a.coinbaseTransactions, response.data);
      } else {
        state$a.transactions = filteredTransactions;
        state$a.transactionsByYear = TransactionsController.groupTransactionsByYearAndMonth(state$a.transactionsByYear, sameChainTransactions);
      }
      state$a.empty = filteredTransactions.length === 0;
      state$a.next = response.next ? response.next : void 0;
    } catch (error) {
      const activeChainNamespace = ChainController.state.activeChain;
      EventsController.sendEvent({
        type: "track",
        event: "ERROR_FETCH_TRANSACTIONS",
        properties: {
          address: accountAddress,
          projectId: OptionsController.state.projectId,
          cursor: state$a.next,
          isSmartAccount: AccountController.state.preferredAccountTypes?.[activeChainNamespace] === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
        }
      });
      SnackController.showError("Failed to fetch transactions");
      state$a.loading = false;
      state$a.empty = true;
      state$a.next = void 0;
    }
  },
  groupTransactionsByYearAndMonth(transactionsMap = {}, transactions = []) {
    const grouped = transactionsMap;
    transactions.forEach((transaction) => {
      const year = new Date(transaction.metadata.minedAt).getFullYear();
      const month = new Date(transaction.metadata.minedAt).getMonth();
      const yearTransactions = grouped[year] ?? {};
      const monthTransactions = yearTransactions[month] ?? [];
      const newMonthTransactions = monthTransactions.filter((tx) => tx.id !== transaction.id);
      grouped[year] = {
        ...yearTransactions,
        [month]: [...newMonthTransactions, transaction].sort((a2, b2) => new Date(b2.metadata.minedAt).getTime() - new Date(a2.metadata.minedAt).getTime())
      };
    });
    return grouped;
  },
  filterSpamTransactions(transactions) {
    return transactions.filter((transaction) => {
      const isAllSpam = transaction.transfers.every((transfer) => transfer.nft_info?.flags.is_spam === true);
      return !isAllSpam;
    });
  },
  filterByConnectedChain(transactions) {
    const chainId = ChainController.state.activeCaipNetwork?.caipNetworkId;
    const filteredTransactions = transactions.filter((transaction) => transaction.metadata.chain === chainId);
    return filteredTransactions;
  },
  clearCursor() {
    state$a.next = void 0;
  },
  resetTransactions() {
    state$a.transactions = [];
    state$a.transactionsByYear = {};
    state$a.lastNetworkInView = void 0;
    state$a.loading = false;
    state$a.empty = false;
    state$a.next = void 0;
  }
};
const TransactionsController = withErrorBoundary(controller$7, "API_ERROR");
const state$9 = proxy({
  connections: /* @__PURE__ */ new Map(),
  wcError: false,
  buffering: false,
  status: "disconnected"
});
let wcConnectionPromise;
const controller$6 = {
  state: state$9,
  subscribeKey(key, callback) {
    return subscribeKey(state$9, key, callback);
  },
  _getClient() {
    return state$9._client;
  },
  setClient(client) {
    state$9._client = ref(client);
  },
  async connectWalletConnect() {
    if (CoreHelperUtil.isTelegram() || CoreHelperUtil.isSafari() && CoreHelperUtil.isIos()) {
      if (wcConnectionPromise) {
        await wcConnectionPromise;
        wcConnectionPromise = void 0;
        return;
      }
      if (!CoreHelperUtil.isPairingExpired(state$9?.wcPairingExpiry)) {
        const link = state$9.wcUri;
        state$9.wcUri = link;
        return;
      }
      wcConnectionPromise = ConnectionController._getClient()?.connectWalletConnect?.().catch(() => void 0);
      ConnectionController.state.status = "connecting";
      await wcConnectionPromise;
      wcConnectionPromise = void 0;
      state$9.wcPairingExpiry = void 0;
      ConnectionController.state.status = "connected";
    } else {
      await ConnectionController._getClient()?.connectWalletConnect?.();
    }
  },
  async connectExternal(options, chain, setChain = true) {
    await ConnectionController._getClient()?.connectExternal?.(options);
    if (setChain) {
      ChainController.setActiveNamespace(chain);
    }
  },
  async reconnectExternal(options) {
    await ConnectionController._getClient()?.reconnectExternal?.(options);
    const namespace = options.chain || ChainController.state.activeChain;
    if (namespace) {
      ConnectorController.setConnectorId(options.id, namespace);
    }
  },
  async setPreferredAccountType(accountType, namespace) {
    ModalController.setLoading(true, ChainController.state.activeChain);
    const authConnector = ConnectorController.getAuthConnector();
    if (!authConnector) {
      return;
    }
    AccountController.setPreferredAccountType(accountType, namespace);
    await authConnector.provider.setPreferredAccount(accountType);
    StorageUtil.setPreferredAccountTypes(AccountController.state.preferredAccountTypes ?? { [namespace]: accountType });
    await ConnectionController.reconnectExternal(authConnector);
    ModalController.setLoading(false, ChainController.state.activeChain);
    EventsController.sendEvent({
      type: "track",
      event: "SET_PREFERRED_ACCOUNT_TYPE",
      properties: {
        accountType,
        network: ChainController.state.activeCaipNetwork?.caipNetworkId || ""
      }
    });
  },
  async signMessage(message) {
    return ConnectionController._getClient()?.signMessage(message);
  },
  parseUnits(value, decimals) {
    return ConnectionController._getClient()?.parseUnits(value, decimals);
  },
  formatUnits(value, decimals) {
    return ConnectionController._getClient()?.formatUnits(value, decimals);
  },
  async sendTransaction(args) {
    return ConnectionController._getClient()?.sendTransaction(args);
  },
  async getCapabilities(params) {
    return ConnectionController._getClient()?.getCapabilities(params);
  },
  async grantPermissions(params) {
    return ConnectionController._getClient()?.grantPermissions(params);
  },
  async walletGetAssets(params) {
    return ConnectionController._getClient()?.walletGetAssets(params) ?? {};
  },
  async estimateGas(args) {
    return ConnectionController._getClient()?.estimateGas(args);
  },
  async writeContract(args) {
    return ConnectionController._getClient()?.writeContract(args);
  },
  async getEnsAddress(value) {
    return ConnectionController._getClient()?.getEnsAddress(value);
  },
  async getEnsAvatar(value) {
    return ConnectionController._getClient()?.getEnsAvatar(value);
  },
  checkInstalled(ids) {
    return ConnectionController._getClient()?.checkInstalled?.(ids) || false;
  },
  resetWcConnection() {
    state$9.wcUri = void 0;
    state$9.wcPairingExpiry = void 0;
    state$9.wcLinking = void 0;
    state$9.recentWallet = void 0;
    state$9.status = "disconnected";
    TransactionsController.resetTransactions();
    StorageUtil.deleteWalletConnectDeepLink();
  },
  resetUri() {
    state$9.wcUri = void 0;
    state$9.wcPairingExpiry = void 0;
    wcConnectionPromise = void 0;
  },
  finalizeWcConnection() {
    const { wcLinking, recentWallet } = ConnectionController.state;
    if (wcLinking) {
      StorageUtil.setWalletConnectDeepLink(wcLinking);
    }
    if (recentWallet) {
      StorageUtil.setAppKitRecent(recentWallet);
    }
    EventsController.sendEvent({
      type: "track",
      event: "CONNECT_SUCCESS",
      properties: {
        method: wcLinking ? "mobile" : "qrcode",
        name: RouterController.state.data?.wallet?.name || "Unknown"
      }
    });
  },
  setWcBasic(wcBasic) {
    state$9.wcBasic = wcBasic;
  },
  setUri(uri) {
    state$9.wcUri = uri;
    state$9.wcPairingExpiry = CoreHelperUtil.getPairingExpiry();
  },
  setWcLinking(wcLinking) {
    state$9.wcLinking = wcLinking;
  },
  setWcError(wcError) {
    state$9.wcError = wcError;
    state$9.buffering = false;
  },
  setRecentWallet(wallet) {
    state$9.recentWallet = wallet;
  },
  setBuffering(buffering) {
    state$9.buffering = buffering;
  },
  setStatus(status) {
    state$9.status = status;
  },
  async disconnect(namespace) {
    try {
      await ConnectionController._getClient()?.disconnect(namespace);
    } catch (error) {
      throw new AppKitError("Failed to disconnect", "INTERNAL_SDK_ERROR", error);
    }
  },
  setConnections(connections, chainNamespace) {
    state$9.connections.set(chainNamespace, connections);
  },
  switchAccount({ connection, address, namespace }) {
    const connectedConnectorId = ConnectorController.state.activeConnectorIds[namespace];
    const isConnectorConnected = connectedConnectorId === connection.connectorId;
    if (isConnectorConnected) {
      const currentNetwork = ChainController.state.activeCaipNetwork;
      if (currentNetwork) {
        const caipAddress = `${namespace}:${currentNetwork.id}:${address}`;
        AccountController.setCaipAddress(caipAddress, namespace);
      } else {
        console.warn(`No current network found for namespace "${namespace}"`);
      }
    } else {
      const connector = ConnectorController.getConnector(connection.connectorId);
      if (connector) {
        ConnectionController.connectExternal(connector, namespace);
      } else {
        console.warn(`No connector found for namespace "${namespace}"`);
      }
    }
  }
};
const ConnectionController = withErrorBoundary(controller$6);
const state$8 = proxy({
  loading: false,
  open: false,
  selectedNetworkId: void 0,
  activeChain: void 0,
  initialized: false
});
const PublicStateController = {
  state: state$8,
  subscribe(callback) {
    return subscribe(state$8, () => callback(state$8));
  },
  subscribeOpen(callback) {
    return subscribeKey(state$8, "open", callback);
  },
  set(newState) {
    Object.assign(state$8, { ...state$8, ...newState });
  }
};
const ERC7811Utils = {
  /**
   * Creates a Balance object from an ERC7811 Asset object
   * @param asset - Asset object to convert
   * @param chainId - Chain ID in CAIP-2 format
   * @returns Balance object
   */
  createBalance(asset, chainId) {
    const metadata = {
      name: asset.metadata["name"] || "",
      symbol: asset.metadata["symbol"] || "",
      decimals: asset.metadata["decimals"] || 0,
      value: asset.metadata["value"] || 0,
      price: asset.metadata["price"] || 0,
      iconUrl: asset.metadata["iconUrl"] || ""
    };
    return {
      name: metadata.name,
      symbol: metadata.symbol,
      chainId,
      address: asset.address === "native" ? void 0 : this.convertAddressToCAIP10Address(asset.address, chainId),
      value: metadata.value,
      price: metadata.price,
      quantity: {
        decimals: metadata.decimals.toString(),
        numeric: this.convertHexToBalance({
          hex: asset.balance,
          decimals: metadata.decimals
        })
      },
      iconUrl: metadata.iconUrl
    };
  },
  /**
   * Converts a hex string to a Balance object
   * @param hex - Hex string to convert
   * @param decimals - Number of decimals to use
   * @returns Balance object
   */
  convertHexToBalance({ hex, decimals }) {
    return formatUnits(BigInt(hex), decimals);
  },
  /**
   * Converts an address to a CAIP-10 address
   * @param address - Address to convert
   * @param chainId - Chain ID in CAIP-2 format
   * @returns CAIP-10 address
   */
  convertAddressToCAIP10Address(address, chainId) {
    return `${chainId}:${address}`;
  },
  /**
   *  Creates a CAIP-2 Chain ID from a chain ID and namespace
   * @param chainId  - Chain ID in hex format
   * @param namespace  - Chain namespace
   * @returns
   */
  createCAIP2ChainId(chainId, namespace) {
    return `${namespace}:${parseInt(chainId, 16)}`;
  },
  /**
   * Gets the chain ID in hex format from a CAIP-2 Chain ID
   * @param caip2ChainId - CAIP-2 Chain ID
   * @returns Chain ID in hex format
   */
  getChainIdHexFromCAIP2ChainId(caip2ChainId) {
    const parts = caip2ChainId.split(":");
    if (parts.length < 2 || !parts[1]) {
      return "0x0";
    }
    const chainPart = parts[1];
    const parsed = parseInt(chainPart, 10);
    return isNaN(parsed) ? "0x0" : `0x${parsed.toString(16)}`;
  },
  /**
   * Checks if a response is a valid WalletGetAssetsResponse
   * @param response - The response to check
   * @returns True if the response is a valid WalletGetAssetsResponse, false otherwise
   */
  isWalletGetAssetsResponse(response) {
    if (typeof response !== "object" || response === null) {
      return false;
    }
    return Object.values(response).every((value) => Array.isArray(value) && value.every((asset) => this.isValidAsset(asset)));
  },
  /**
   * Checks if an asset object is valid.
   * @param asset - The asset object to check.
   * @returns True if the asset is valid, false otherwise.
   */
  isValidAsset(asset) {
    return typeof asset === "object" && asset !== null && typeof asset.address === "string" && typeof asset.balance === "string" && (asset.type === "ERC20" || asset.type === "NATIVE") && typeof asset.metadata === "object" && asset.metadata !== null && typeof asset.metadata["name"] === "string" && typeof asset.metadata["symbol"] === "string" && typeof asset.metadata["decimals"] === "number" && typeof asset.metadata["price"] === "number" && typeof asset.metadata["iconUrl"] === "string";
  }
};
const SendApiUtil = {
  async getMyTokensWithBalance(forceUpdate) {
    const address = AccountController.state.address;
    const caipNetwork = ChainController.state.activeCaipNetwork;
    if (!address || !caipNetwork) {
      return [];
    }
    if (caipNetwork.chainNamespace === "eip155") {
      const eip155Balances = await this.getEIP155Balances(address, caipNetwork);
      if (eip155Balances) {
        return this.filterLowQualityTokens(eip155Balances);
      }
    }
    const response = await BlockchainApiController.getBalance(address, caipNetwork.caipNetworkId, forceUpdate);
    return this.filterLowQualityTokens(response.balances);
  },
  async getEIP155Balances(address, caipNetwork) {
    try {
      const chainIdHex = ERC7811Utils.getChainIdHexFromCAIP2ChainId(caipNetwork.caipNetworkId);
      const walletCapabilities = await ConnectionController.getCapabilities(address);
      if (!walletCapabilities?.[chainIdHex]?.["assetDiscovery"]?.supported) {
        return null;
      }
      const walletGetAssetsResponse = await ConnectionController.walletGetAssets({
        account: address,
        chainFilter: [chainIdHex]
      });
      if (!ERC7811Utils.isWalletGetAssetsResponse(walletGetAssetsResponse)) {
        return null;
      }
      const assets = walletGetAssetsResponse[chainIdHex] || [];
      return assets.map((asset) => ERC7811Utils.createBalance(asset, caipNetwork.caipNetworkId));
    } catch (error) {
      return null;
    }
  },
  /**
   * The 1Inch API includes many low-quality tokens in the balance response,
   * which appear inconsistently. This filter prevents them from being displayed.
   */
  filterLowQualityTokens(balances) {
    return balances.filter((balance) => balance.quantity.decimals !== "0");
  },
  mapBalancesToSwapTokens(balances) {
    return balances?.map((token) => ({
      ...token,
      address: token?.address ? token.address : ChainController.getActiveNetworkTokenAddress(),
      decimals: parseInt(token.quantity.decimals, 10),
      logoUri: token.iconUrl,
      eip2612: false
    })) || [];
  }
};
const state$7 = proxy({
  tokenBalances: [],
  loading: false
});
const controller$5 = {
  state: state$7,
  subscribe(callback) {
    return subscribe(state$7, () => callback(state$7));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state$7, key, callback);
  },
  setToken(token) {
    if (token) {
      state$7.token = ref(token);
    }
  },
  setTokenAmount(sendTokenAmount) {
    state$7.sendTokenAmount = sendTokenAmount;
  },
  setReceiverAddress(receiverAddress) {
    state$7.receiverAddress = receiverAddress;
  },
  setReceiverProfileImageUrl(receiverProfileImageUrl) {
    state$7.receiverProfileImageUrl = receiverProfileImageUrl;
  },
  setReceiverProfileName(receiverProfileName) {
    state$7.receiverProfileName = receiverProfileName;
  },
  setNetworkBalanceInUsd(networkBalanceInUSD) {
    state$7.networkBalanceInUSD = networkBalanceInUSD;
  },
  setLoading(loading) {
    state$7.loading = loading;
  },
  async sendToken() {
    try {
      SendController.setLoading(true);
      switch (ChainController.state.activeCaipNetwork?.chainNamespace) {
        case "eip155":
          await SendController.sendEvmToken();
          return;
        case "solana":
          await SendController.sendSolanaToken();
          return;
        default:
          throw new Error("Unsupported chain");
      }
    } finally {
      SendController.setLoading(false);
    }
  },
  async sendEvmToken() {
    const activeChainNamespace = ChainController.state.activeChain;
    const activeAccountType = AccountController.state.preferredAccountTypes?.[activeChainNamespace];
    if (!SendController.state.sendTokenAmount || !SendController.state.receiverAddress) {
      throw new Error("An amount and receiver address are required");
    }
    if (!SendController.state.token) {
      throw new Error("A token is required");
    }
    if (SendController.state.token?.address) {
      EventsController.sendEvent({
        type: "track",
        event: "SEND_INITIATED",
        properties: {
          isSmartAccount: activeAccountType === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT,
          token: SendController.state.token.address,
          amount: SendController.state.sendTokenAmount,
          network: ChainController.state.activeCaipNetwork?.caipNetworkId || ""
        }
      });
      await SendController.sendERC20Token({
        receiverAddress: SendController.state.receiverAddress,
        tokenAddress: SendController.state.token.address,
        sendTokenAmount: SendController.state.sendTokenAmount,
        decimals: SendController.state.token.quantity.decimals
      });
    } else {
      EventsController.sendEvent({
        type: "track",
        event: "SEND_INITIATED",
        properties: {
          isSmartAccount: activeAccountType === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT,
          token: SendController.state.token.symbol || "",
          amount: SendController.state.sendTokenAmount,
          network: ChainController.state.activeCaipNetwork?.caipNetworkId || ""
        }
      });
      await SendController.sendNativeToken({
        receiverAddress: SendController.state.receiverAddress,
        sendTokenAmount: SendController.state.sendTokenAmount,
        decimals: SendController.state.token.quantity.decimals
      });
    }
  },
  async fetchTokenBalance(onError) {
    state$7.loading = true;
    const chainId = ChainController.state.activeCaipNetwork?.caipNetworkId;
    const chain = ChainController.state.activeCaipNetwork?.chainNamespace;
    const caipAddress = ChainController.state.activeCaipAddress;
    const address = caipAddress ? CoreHelperUtil.getPlainAddress(caipAddress) : void 0;
    if (state$7.lastRetry && !CoreHelperUtil.isAllowedRetry(state$7.lastRetry, 30 * ConstantsUtil$2.ONE_SEC_MS)) {
      state$7.loading = false;
      return [];
    }
    try {
      if (address && chainId && chain) {
        const balances = await SendApiUtil.getMyTokensWithBalance();
        state$7.tokenBalances = balances;
        state$7.lastRetry = void 0;
        return balances;
      }
    } catch (error) {
      state$7.lastRetry = Date.now();
      onError?.(error);
      SnackController.showError("Token Balance Unavailable");
    } finally {
      state$7.loading = false;
    }
    return [];
  },
  fetchNetworkBalance() {
    if (state$7.tokenBalances.length === 0) {
      return;
    }
    const networkTokenBalances = SendApiUtil.mapBalancesToSwapTokens(state$7.tokenBalances);
    if (!networkTokenBalances) {
      return;
    }
    const networkToken = networkTokenBalances.find((token) => token.address === ChainController.getActiveNetworkTokenAddress());
    if (!networkToken) {
      return;
    }
    state$7.networkBalanceInUSD = networkToken ? NumberUtil.multiply(networkToken.quantity.numeric, networkToken.price).toString() : "0";
  },
  async sendNativeToken(params) {
    RouterController.pushTransactionStack({});
    const to2 = params.receiverAddress;
    const address = AccountController.state.address;
    const value = ConnectionController.parseUnits(params.sendTokenAmount.toString(), Number(params.decimals));
    const data = "0x";
    await ConnectionController.sendTransaction({
      chainNamespace: "eip155",
      to: to2,
      address,
      data,
      value: value ?? BigInt(0)
    });
    EventsController.sendEvent({
      type: "track",
      event: "SEND_SUCCESS",
      properties: {
        isSmartAccount: AccountController.state.preferredAccountTypes?.["eip155"] === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT,
        token: SendController.state.token?.symbol || "",
        amount: params.sendTokenAmount,
        network: ChainController.state.activeCaipNetwork?.caipNetworkId || ""
      }
    });
    ConnectionController._getClient()?.updateBalance("eip155");
    SendController.resetSend();
  },
  async sendERC20Token(params) {
    RouterController.pushTransactionStack({
      onSuccess() {
        RouterController.replace("Account");
      }
    });
    const amount = ConnectionController.parseUnits(params.sendTokenAmount.toString(), Number(params.decimals));
    if (AccountController.state.address && params.sendTokenAmount && params.receiverAddress && params.tokenAddress) {
      const tokenAddress = CoreHelperUtil.getPlainAddress(params.tokenAddress);
      await ConnectionController.writeContract({
        fromAddress: AccountController.state.address,
        tokenAddress,
        args: [params.receiverAddress, amount ?? BigInt(0)],
        method: "transfer",
        abi: ContractUtil.getERC20Abi(tokenAddress),
        chainNamespace: "eip155"
      });
      SendController.resetSend();
    }
  },
  async sendSolanaToken() {
    if (!SendController.state.sendTokenAmount || !SendController.state.receiverAddress) {
      throw new Error("An amount and receiver address are required");
    }
    RouterController.pushTransactionStack({
      onSuccess() {
        RouterController.replace("Account");
      }
    });
    await ConnectionController.sendTransaction({
      chainNamespace: "solana",
      to: SendController.state.receiverAddress,
      value: SendController.state.sendTokenAmount
    });
    ConnectionController._getClient()?.updateBalance("solana");
    SendController.resetSend();
  },
  resetSend() {
    state$7.token = void 0;
    state$7.sendTokenAmount = void 0;
    state$7.receiverAddress = void 0;
    state$7.receiverProfileImageUrl = void 0;
    state$7.receiverProfileName = void 0;
    state$7.loading = false;
    state$7.tokenBalances = [];
  }
};
const SendController = withErrorBoundary(controller$5);
const accountState = {
  currentTab: 0,
  tokenBalance: [],
  smartAccountDeployed: false,
  addressLabels: /* @__PURE__ */ new Map(),
  allAccounts: [],
  user: void 0
};
const networkState = {
  caipNetwork: void 0,
  supportsAllNetworks: true,
  smartAccountEnabledNetworks: []
};
const state$6 = proxy({
  chains: proxyMap(),
  activeCaipAddress: void 0,
  activeChain: void 0,
  activeCaipNetwork: void 0,
  noAdapters: false,
  universalAdapter: {
    networkControllerClient: void 0,
    connectionControllerClient: void 0
  },
  isSwitchingNamespace: false
});
const controller$4 = {
  state: state$6,
  subscribe(callback) {
    return subscribe(state$6, () => {
      callback(state$6);
    });
  },
  subscribeKey(key, callback) {
    return subscribeKey(state$6, key, callback);
  },
  subscribeChainProp(property, callback, chain) {
    let prev = void 0;
    return subscribe(state$6.chains, () => {
      const activeChain = chain || state$6.activeChain;
      if (activeChain) {
        const nextValue = state$6.chains.get(activeChain)?.[property];
        if (prev !== nextValue) {
          prev = nextValue;
          callback(nextValue);
        }
      }
    });
  },
  initialize(adapters, caipNetworks, clients) {
    const { chainId: activeChainId, namespace: activeNamespace } = StorageUtil.getActiveNetworkProps();
    const activeCaipNetwork = caipNetworks?.find((network) => network.id.toString() === activeChainId?.toString());
    const defaultAdapter = adapters.find((adapter) => adapter?.namespace === activeNamespace);
    const adapterToActivate = defaultAdapter || adapters?.[0];
    const namespacesFromAdapters = adapters.map((a2) => a2.namespace).filter((n3) => n3 !== void 0);
    const namespaces = OptionsController.state.enableEmbedded ? /* @__PURE__ */ new Set([...namespacesFromAdapters]) : /* @__PURE__ */ new Set([...caipNetworks?.map((network) => network.chainNamespace) ?? []]);
    if (adapters?.length === 0 || !adapterToActivate) {
      state$6.noAdapters = true;
    }
    if (!state$6.noAdapters) {
      state$6.activeChain = adapterToActivate?.namespace;
      state$6.activeCaipNetwork = activeCaipNetwork;
      ChainController.setChainNetworkData(adapterToActivate?.namespace, {
        caipNetwork: activeCaipNetwork
      });
      if (state$6.activeChain) {
        PublicStateController.set({ activeChain: adapterToActivate?.namespace });
      }
    }
    namespaces.forEach((namespace) => {
      const namespaceNetworks = caipNetworks?.filter((network) => network.chainNamespace === namespace);
      ChainController.state.chains.set(namespace, {
        namespace,
        networkState: proxy({
          ...networkState,
          caipNetwork: namespaceNetworks?.[0]
        }),
        accountState: proxy(accountState),
        caipNetworks: namespaceNetworks ?? [],
        ...clients
      });
      ChainController.setRequestedCaipNetworks(namespaceNetworks ?? [], namespace);
    });
  },
  removeAdapter(namespace) {
    if (state$6.activeChain === namespace) {
      const nextAdapter = Array.from(state$6.chains.entries()).find(([chainNamespace]) => chainNamespace !== namespace);
      if (nextAdapter) {
        const caipNetwork = nextAdapter[1]?.caipNetworks?.[0];
        if (caipNetwork) {
          ChainController.setActiveCaipNetwork(caipNetwork);
        }
      }
    }
    state$6.chains.delete(namespace);
  },
  addAdapter(adapter, { networkControllerClient, connectionControllerClient }, caipNetworks) {
    state$6.chains.set(adapter.namespace, {
      namespace: adapter.namespace,
      networkState: {
        ...networkState,
        caipNetwork: caipNetworks[0]
      },
      accountState,
      caipNetworks,
      connectionControllerClient,
      networkControllerClient
    });
    ChainController.setRequestedCaipNetworks(caipNetworks?.filter((caipNetwork) => caipNetwork.chainNamespace === adapter.namespace) ?? [], adapter.namespace);
  },
  addNetwork(network) {
    const chainAdapter = state$6.chains.get(network.chainNamespace);
    if (chainAdapter) {
      const newNetworks = [...chainAdapter.caipNetworks || []];
      if (!chainAdapter.caipNetworks?.find((caipNetwork) => caipNetwork.id === network.id)) {
        newNetworks.push(network);
      }
      state$6.chains.set(network.chainNamespace, { ...chainAdapter, caipNetworks: newNetworks });
      ChainController.setRequestedCaipNetworks(newNetworks, network.chainNamespace);
      ConnectorController.filterByNamespace(network.chainNamespace, true);
    }
  },
  removeNetwork(namespace, networkId) {
    const chainAdapter = state$6.chains.get(namespace);
    if (chainAdapter) {
      const isActiveNetwork = state$6.activeCaipNetwork?.id === networkId;
      const newCaipNetworksOfAdapter = [
        ...chainAdapter.caipNetworks?.filter((network) => network.id !== networkId) || []
      ];
      if (isActiveNetwork && chainAdapter?.caipNetworks?.[0]) {
        ChainController.setActiveCaipNetwork(chainAdapter.caipNetworks[0]);
      }
      state$6.chains.set(namespace, { ...chainAdapter, caipNetworks: newCaipNetworksOfAdapter });
      ChainController.setRequestedCaipNetworks(newCaipNetworksOfAdapter || [], namespace);
      if (newCaipNetworksOfAdapter.length === 0) {
        ConnectorController.filterByNamespace(namespace, false);
      }
    }
  },
  setAdapterNetworkState(chain, props) {
    const chainAdapter = state$6.chains.get(chain);
    if (chainAdapter) {
      chainAdapter.networkState = {
        ...chainAdapter.networkState || networkState,
        ...props
      };
      state$6.chains.set(chain, chainAdapter);
    }
  },
  setChainAccountData(chain, accountProps, _unknown = true) {
    if (!chain) {
      throw new Error("Chain is required to update chain account data");
    }
    const chainAdapter = state$6.chains.get(chain);
    if (chainAdapter) {
      const newAccountState = { ...chainAdapter.accountState || accountState, ...accountProps };
      state$6.chains.set(chain, { ...chainAdapter, accountState: newAccountState });
      if (state$6.chains.size === 1 || state$6.activeChain === chain) {
        if (accountProps.caipAddress) {
          state$6.activeCaipAddress = accountProps.caipAddress;
        }
        AccountController.replaceState(newAccountState);
      }
    }
  },
  setChainNetworkData(chain, networkProps) {
    if (!chain) {
      return;
    }
    const chainAdapter = state$6.chains.get(chain);
    if (chainAdapter) {
      const newNetworkState = { ...chainAdapter.networkState || networkState, ...networkProps };
      state$6.chains.set(chain, { ...chainAdapter, networkState: newNetworkState });
    }
  },
  // eslint-disable-next-line max-params
  setAccountProp(prop, value, chain, replaceState = true) {
    ChainController.setChainAccountData(chain, { [prop]: value }, replaceState);
    if (prop === "status" && value === "disconnected" && chain) {
      ConnectorController.removeConnectorId(chain);
    }
  },
  setActiveNamespace(chain) {
    state$6.activeChain = chain;
    const newAdapter = chain ? state$6.chains.get(chain) : void 0;
    const caipNetwork = newAdapter?.networkState?.caipNetwork;
    if (caipNetwork?.id && chain) {
      state$6.activeCaipAddress = newAdapter?.accountState?.caipAddress;
      state$6.activeCaipNetwork = caipNetwork;
      ChainController.setChainNetworkData(chain, { caipNetwork });
      StorageUtil.setActiveCaipNetworkId(caipNetwork?.caipNetworkId);
      PublicStateController.set({
        activeChain: chain,
        selectedNetworkId: caipNetwork?.caipNetworkId
      });
    }
  },
  setActiveCaipNetwork(caipNetwork) {
    if (!caipNetwork) {
      return;
    }
    if (state$6.activeChain !== caipNetwork.chainNamespace) {
      ChainController.setIsSwitchingNamespace(true);
    }
    const newAdapter = state$6.chains.get(caipNetwork.chainNamespace);
    state$6.activeChain = caipNetwork.chainNamespace;
    state$6.activeCaipNetwork = caipNetwork;
    ChainController.setChainNetworkData(caipNetwork.chainNamespace, { caipNetwork });
    if (newAdapter?.accountState?.address) {
      state$6.activeCaipAddress = `${caipNetwork.chainNamespace}:${caipNetwork.id}:${newAdapter?.accountState?.address}`;
    } else {
      state$6.activeCaipAddress = void 0;
    }
    ChainController.setAccountProp("caipAddress", state$6.activeCaipAddress, caipNetwork.chainNamespace);
    if (newAdapter) {
      AccountController.replaceState(newAdapter.accountState);
    }
    SendController.resetSend();
    PublicStateController.set({
      activeChain: state$6.activeChain,
      selectedNetworkId: state$6.activeCaipNetwork?.caipNetworkId
    });
    StorageUtil.setActiveCaipNetworkId(caipNetwork.caipNetworkId);
    const isSupported = ChainController.checkIfSupportedNetwork(caipNetwork.chainNamespace);
    if (!isSupported && OptionsController.state.enableNetworkSwitch && !OptionsController.state.allowUnsupportedChain && !ConnectionController.state.wcBasic) {
      ChainController.showUnsupportedChainUI();
    }
  },
  addCaipNetwork(caipNetwork) {
    if (!caipNetwork) {
      return;
    }
    const chain = state$6.chains.get(caipNetwork.chainNamespace);
    if (chain) {
      chain?.caipNetworks?.push(caipNetwork);
    }
  },
  async switchActiveNamespace(namespace) {
    if (!namespace) {
      return;
    }
    const isDifferentChain = namespace !== ChainController.state.activeChain;
    const caipNetworkOfNamespace = ChainController.getNetworkData(namespace)?.caipNetwork;
    const firstNetworkWithChain = ChainController.getCaipNetworkByNamespace(namespace, caipNetworkOfNamespace?.id);
    if (isDifferentChain && firstNetworkWithChain) {
      await ChainController.switchActiveNetwork(firstNetworkWithChain);
    }
  },
  async switchActiveNetwork(network) {
    const activeAdapter = ChainController.state.chains.get(ChainController.state.activeChain);
    const unsupportedNetwork = !activeAdapter?.caipNetworks?.some((caipNetwork) => caipNetwork.id === state$6.activeCaipNetwork?.id);
    const networkControllerClient = ChainController.getNetworkControllerClient(network.chainNamespace);
    if (networkControllerClient) {
      try {
        await networkControllerClient.switchCaipNetwork(network);
        if (unsupportedNetwork) {
          ModalController.close();
        }
      } catch (error) {
        RouterController.goBack();
      }
      EventsController.sendEvent({
        type: "track",
        event: "SWITCH_NETWORK",
        properties: { network: network.caipNetworkId }
      });
    }
  },
  getNetworkControllerClient(chainNamespace) {
    const chain = chainNamespace || state$6.activeChain;
    const chainAdapter = state$6.chains.get(chain);
    if (!chainAdapter) {
      throw new Error("Chain adapter not found");
    }
    if (!chainAdapter.networkControllerClient) {
      throw new Error("NetworkController client not set");
    }
    return chainAdapter.networkControllerClient;
  },
  getConnectionControllerClient(_chain) {
    const chain = _chain || state$6.activeChain;
    if (!chain) {
      throw new Error("Chain is required to get connection controller client");
    }
    const chainAdapter = state$6.chains.get(chain);
    if (!chainAdapter?.connectionControllerClient) {
      throw new Error("ConnectionController client not set");
    }
    return chainAdapter.connectionControllerClient;
  },
  getAccountProp(key, _chain) {
    let chain = state$6.activeChain;
    if (_chain) {
      chain = _chain;
    }
    if (!chain) {
      return void 0;
    }
    const chainAccountState = state$6.chains.get(chain)?.accountState;
    if (!chainAccountState) {
      return void 0;
    }
    return chainAccountState[key];
  },
  getNetworkProp(key, namespace) {
    const chainNetworkState = state$6.chains.get(namespace)?.networkState;
    if (!chainNetworkState) {
      return void 0;
    }
    return chainNetworkState[key];
  },
  getRequestedCaipNetworks(chainToFilter) {
    const adapter = state$6.chains.get(chainToFilter);
    const { approvedCaipNetworkIds = [], requestedCaipNetworks = [] } = adapter?.networkState || {};
    const sortedNetworks = CoreHelperUtil.sortRequestedNetworks(approvedCaipNetworkIds, requestedCaipNetworks);
    return sortedNetworks;
  },
  getAllRequestedCaipNetworks() {
    const requestedCaipNetworks = [];
    state$6.chains.forEach((chainAdapter) => {
      const caipNetworks = ChainController.getRequestedCaipNetworks(chainAdapter.namespace);
      requestedCaipNetworks.push(...caipNetworks);
    });
    return requestedCaipNetworks;
  },
  setRequestedCaipNetworks(caipNetworks, chain) {
    ChainController.setAdapterNetworkState(chain, { requestedCaipNetworks: caipNetworks });
    const allRequestedCaipNetworks = ChainController.getAllRequestedCaipNetworks();
    const namespaces = allRequestedCaipNetworks.map((network) => network.chainNamespace);
    const uniqueNamespaces = Array.from(new Set(namespaces));
    ConnectorController.filterByNamespaces(uniqueNamespaces);
  },
  getAllApprovedCaipNetworkIds() {
    const approvedCaipNetworkIds = [];
    state$6.chains.forEach((chainAdapter) => {
      const approvedIds = ChainController.getApprovedCaipNetworkIds(chainAdapter.namespace);
      approvedCaipNetworkIds.push(...approvedIds);
    });
    return approvedCaipNetworkIds;
  },
  getActiveCaipNetwork() {
    return state$6.activeCaipNetwork;
  },
  getActiveCaipAddress() {
    return state$6.activeCaipAddress;
  },
  getApprovedCaipNetworkIds(namespace) {
    const adapter = state$6.chains.get(namespace);
    const approvedCaipNetworkIds = adapter?.networkState?.approvedCaipNetworkIds || [];
    return approvedCaipNetworkIds;
  },
  async setApprovedCaipNetworksData(namespace) {
    const networkControllerClient = ChainController.getNetworkControllerClient();
    const data = await networkControllerClient?.getApprovedCaipNetworksData();
    ChainController.setAdapterNetworkState(namespace, {
      approvedCaipNetworkIds: data?.approvedCaipNetworkIds,
      supportsAllNetworks: data?.supportsAllNetworks
    });
  },
  checkIfSupportedNetwork(namespace, caipNetwork) {
    const activeCaipNetwork = caipNetwork || state$6.activeCaipNetwork;
    const requestedCaipNetworks = ChainController.getRequestedCaipNetworks(namespace);
    if (!requestedCaipNetworks.length) {
      return true;
    }
    return requestedCaipNetworks?.some((network) => network.id === activeCaipNetwork?.id);
  },
  checkIfSupportedChainId(chainId) {
    if (!state$6.activeChain) {
      return true;
    }
    const requestedCaipNetworks = ChainController.getRequestedCaipNetworks(state$6.activeChain);
    return requestedCaipNetworks?.some((network) => network.id === chainId);
  },
  // Smart Account Network Handlers
  setSmartAccountEnabledNetworks(smartAccountEnabledNetworks, chain) {
    ChainController.setAdapterNetworkState(chain, { smartAccountEnabledNetworks });
  },
  checkIfSmartAccountEnabled() {
    const networkId = NetworkUtil$1.caipNetworkIdToNumber(state$6.activeCaipNetwork?.caipNetworkId);
    const activeChain = state$6.activeChain;
    if (!activeChain || !networkId) {
      return false;
    }
    const smartAccountEnabledNetworks = ChainController.getNetworkProp("smartAccountEnabledNetworks", activeChain);
    return Boolean(smartAccountEnabledNetworks?.includes(Number(networkId)));
  },
  getActiveNetworkTokenAddress() {
    const namespace = state$6.activeCaipNetwork?.chainNamespace || "eip155";
    const chainId = state$6.activeCaipNetwork?.id || 1;
    const address = ConstantsUtil$2.NATIVE_TOKEN_ADDRESS[namespace];
    return `${namespace}:${chainId}:${address}`;
  },
  showUnsupportedChainUI() {
    ModalController.open({ view: "UnsupportedChain" });
  },
  checkIfNamesSupported() {
    const activeCaipNetwork = state$6.activeCaipNetwork;
    return Boolean(activeCaipNetwork?.chainNamespace && ConstantsUtil$2.NAMES_SUPPORTED_CHAIN_NAMESPACES.includes(activeCaipNetwork.chainNamespace));
  },
  resetNetwork(namespace) {
    ChainController.setAdapterNetworkState(namespace, {
      approvedCaipNetworkIds: void 0,
      supportsAllNetworks: true,
      smartAccountEnabledNetworks: []
    });
  },
  resetAccount(chain) {
    const chainToWrite = chain;
    if (!chainToWrite) {
      throw new Error("Chain is required to set account prop");
    }
    state$6.activeCaipAddress = void 0;
    ChainController.setChainAccountData(chainToWrite, {
      smartAccountDeployed: false,
      currentTab: 0,
      caipAddress: void 0,
      address: void 0,
      balance: void 0,
      balanceSymbol: void 0,
      profileName: void 0,
      profileImage: void 0,
      addressExplorerUrl: void 0,
      tokenBalance: [],
      connectedWalletInfo: void 0,
      preferredAccountTypes: void 0,
      socialProvider: void 0,
      socialWindow: void 0,
      farcasterUrl: void 0,
      allAccounts: [],
      user: void 0,
      status: "disconnected"
    });
    ConnectorController.removeConnectorId(chainToWrite);
  },
  setIsSwitchingNamespace(isSwitchingNamespace) {
    state$6.isSwitchingNamespace = isSwitchingNamespace;
  },
  getFirstCaipNetworkSupportsAuthConnector() {
    const availableChains = [];
    let firstCaipNetwork = void 0;
    state$6.chains.forEach((chain) => {
      if (ConstantsUtil$3.AUTH_CONNECTOR_SUPPORTED_CHAINS.find((ns2) => ns2 === chain.namespace)) {
        if (chain.namespace) {
          availableChains.push(chain.namespace);
        }
      }
    });
    if (availableChains.length > 0) {
      const firstAvailableChain = availableChains[0];
      firstCaipNetwork = firstAvailableChain ? state$6.chains.get(firstAvailableChain)?.caipNetworks?.[0] : void 0;
      return firstCaipNetwork;
    }
    return void 0;
  },
  getAccountData(chainNamespace) {
    if (!chainNamespace) {
      return AccountController.state;
    }
    return ChainController.state.chains.get(chainNamespace)?.accountState;
  },
  getNetworkData(chainNamespace) {
    const namespace = chainNamespace || state$6.activeChain;
    if (!namespace) {
      return void 0;
    }
    return ChainController.state.chains.get(namespace)?.networkState;
  },
  getCaipNetworkByNamespace(chainNamespace, chainId) {
    if (!chainNamespace) {
      return void 0;
    }
    const chain = ChainController.state.chains.get(chainNamespace);
    const byChainId = chain?.caipNetworks?.find((network) => network.id === chainId);
    if (byChainId) {
      return byChainId;
    }
    return chain?.networkState?.caipNetwork || chain?.caipNetworks?.[0];
  },
  /**
   * Get the requested CaipNetwork IDs for a given namespace. If namespace is not provided, all requested CaipNetwork IDs will be returned
   * @param namespace - The namespace to get the requested CaipNetwork IDs for
   * @returns The requested CaipNetwork IDs
   */
  getRequestedCaipNetworkIds() {
    const namespace = ConnectorController.state.filterByNamespace;
    const chains = namespace ? [state$6.chains.get(namespace)] : Array.from(state$6.chains.values());
    return chains.flatMap((chain) => chain?.caipNetworks || []).map((caipNetwork) => caipNetwork.caipNetworkId);
  },
  getCaipNetworks(namespace) {
    if (namespace) {
      return ChainController.getRequestedCaipNetworks(namespace);
    }
    return ChainController.getAllRequestedCaipNetworks();
  }
};
const ChainController = withErrorBoundary(controller$4);
const DEFAULT_OPTIONS = {
  purchaseCurrencies: [
    {
      id: "2b92315d-eab7-5bef-84fa-089a131333f5",
      name: "USD Coin",
      symbol: "USDC",
      networks: [
        {
          name: "ethereum-mainnet",
          display_name: "Ethereum",
          chain_id: "1",
          contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        },
        {
          name: "polygon-mainnet",
          display_name: "Polygon",
          chain_id: "137",
          contract_address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
        }
      ]
    },
    {
      id: "2b92315d-eab7-5bef-84fa-089a131333f5",
      name: "Ether",
      symbol: "ETH",
      networks: [
        {
          name: "ethereum-mainnet",
          display_name: "Ethereum",
          chain_id: "1",
          contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        },
        {
          name: "polygon-mainnet",
          display_name: "Polygon",
          chain_id: "137",
          contract_address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
        }
      ]
    }
  ],
  paymentCurrencies: [
    {
      id: "USD",
      payment_method_limits: [
        {
          id: "card",
          min: "10.00",
          max: "7500.00"
        },
        {
          id: "ach_bank_account",
          min: "10.00",
          max: "25000.00"
        }
      ]
    },
    {
      id: "EUR",
      payment_method_limits: [
        {
          id: "card",
          min: "10.00",
          max: "7500.00"
        },
        {
          id: "ach_bank_account",
          min: "10.00",
          max: "25000.00"
        }
      ]
    }
  ]
};
const baseUrl = CoreHelperUtil.getBlockchainApiUrl();
const state$5 = proxy({
  clientId: null,
  api: new FetchUtil({ baseUrl, clientId: null }),
  supportedChains: { http: [], ws: [] }
});
const BlockchainApiController = {
  state: state$5,
  async get(request) {
    const { st: st2, sv } = BlockchainApiController.getSdkProperties();
    const projectId = OptionsController.state.projectId;
    const params = {
      ...request.params || {},
      st: st2,
      sv,
      projectId
    };
    return state$5.api.get({
      ...request,
      params
    });
  },
  getSdkProperties() {
    const { sdkType, sdkVersion } = OptionsController.state;
    return {
      st: sdkType || "unknown",
      sv: sdkVersion || "unknown"
    };
  },
  async isNetworkSupported(networkId) {
    if (!networkId) {
      return false;
    }
    try {
      if (!state$5.supportedChains.http.length) {
        await BlockchainApiController.getSupportedNetworks();
      }
    } catch (e2) {
      return false;
    }
    return state$5.supportedChains.http.includes(networkId);
  },
  async getSupportedNetworks() {
    try {
      const supportedChains = await BlockchainApiController.get({
        path: "v1/supported-chains"
      });
      state$5.supportedChains = supportedChains;
      return supportedChains;
    } catch {
      return state$5.supportedChains;
    }
  },
  async fetchIdentity({ address, caipNetworkId }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(caipNetworkId);
    if (!isSupported) {
      return { avatar: "", name: "" };
    }
    const identityCache = StorageUtil.getIdentityFromCacheForAddress(address);
    if (identityCache) {
      return identityCache;
    }
    const result = await BlockchainApiController.get({
      path: `/v1/identity/${address}`,
      params: {
        sender: ChainController.state.activeCaipAddress ? CoreHelperUtil.getPlainAddress(ChainController.state.activeCaipAddress) : void 0
      }
    });
    StorageUtil.updateIdentityCache({
      address,
      identity: result,
      timestamp: Date.now()
    });
    return result;
  },
  async fetchTransactions({ account, cursor, onramp, signal, cache, chainId }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { data: [], next: void 0 };
    }
    return BlockchainApiController.get({
      path: `/v1/account/${account}/history`,
      params: {
        cursor,
        onramp,
        chainId
      },
      signal,
      cache
    });
  },
  async fetchSwapQuote({ amount, userAddress, from, to: to2, gasPrice }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { quotes: [] };
    }
    return BlockchainApiController.get({
      path: `/v1/convert/quotes`,
      headers: {
        "Content-Type": "application/json"
      },
      params: {
        amount,
        userAddress,
        from,
        to: to2,
        gasPrice
      }
    });
  },
  async fetchSwapTokens({ chainId }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { tokens: [] };
    }
    return BlockchainApiController.get({
      path: `/v1/convert/tokens`,
      params: { chainId }
    });
  },
  async fetchTokenPrice({ addresses }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { fungibles: [] };
    }
    return state$5.api.post({
      path: "/v1/fungible/price",
      body: {
        currency: "usd",
        addresses,
        projectId: OptionsController.state.projectId
      },
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  async fetchSwapAllowance({ tokenAddress, userAddress }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { allowance: "0" };
    }
    return BlockchainApiController.get({
      path: `/v1/convert/allowance`,
      params: {
        tokenAddress,
        userAddress
      },
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  async fetchGasPrice({ chainId }) {
    const { st: st2, sv } = BlockchainApiController.getSdkProperties();
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      throw new Error("Network not supported for Gas Price");
    }
    return BlockchainApiController.get({
      path: `/v1/convert/gas-price`,
      headers: {
        "Content-Type": "application/json"
      },
      params: {
        chainId,
        st: st2,
        sv
      }
    });
  },
  async generateSwapCalldata({ amount, from, to: to2, userAddress, disableEstimate }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      throw new Error("Network not supported for Swaps");
    }
    return state$5.api.post({
      path: "/v1/convert/build-transaction",
      headers: {
        "Content-Type": "application/json"
      },
      body: {
        amount,
        eip155: {
          slippage: ConstantsUtil$2.CONVERT_SLIPPAGE_TOLERANCE
        },
        projectId: OptionsController.state.projectId,
        from,
        to: to2,
        userAddress,
        disableEstimate
      }
    });
  },
  async generateApproveCalldata({ from, to: to2, userAddress }) {
    const { st: st2, sv } = BlockchainApiController.getSdkProperties();
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      throw new Error("Network not supported for Swaps");
    }
    return BlockchainApiController.get({
      path: `/v1/convert/build-approve`,
      headers: {
        "Content-Type": "application/json"
      },
      params: {
        userAddress,
        from,
        to: to2,
        st: st2,
        sv
      }
    });
  },
  async getBalance(address, chainId, forceUpdate) {
    const { st: st2, sv } = BlockchainApiController.getSdkProperties();
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      SnackController.showError("Token Balance Unavailable");
      return { balances: [] };
    }
    const caipAddress = `${chainId}:${address}`;
    const cachedBalance = StorageUtil.getBalanceCacheForCaipAddress(caipAddress);
    if (cachedBalance) {
      return cachedBalance;
    }
    const balance = await BlockchainApiController.get({
      path: `/v1/account/${address}/balance`,
      params: {
        currency: "usd",
        chainId,
        forceUpdate,
        st: st2,
        sv
      }
    });
    StorageUtil.updateBalanceCache({
      caipAddress,
      balance,
      timestamp: Date.now()
    });
    return balance;
  },
  async lookupEnsName(name) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { addresses: {}, attributes: [] };
    }
    return BlockchainApiController.get({
      path: `/v1/profile/account/${name}`,
      params: { apiVersion: "2" }
    });
  },
  async reverseLookupEnsName({ address }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return [];
    }
    return BlockchainApiController.get({
      path: `/v1/profile/reverse/${address}`,
      params: {
        sender: AccountController.state.address,
        apiVersion: "2"
      }
    });
  },
  async getEnsNameSuggestions(name) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { suggestions: [] };
    }
    return BlockchainApiController.get({
      path: `/v1/profile/suggestions/${name}`,
      params: { zone: "reown.id" }
    });
  },
  async registerEnsName({ coinType, address, message, signature }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { success: false };
    }
    return state$5.api.post({
      path: `/v1/profile/account`,
      body: { coin_type: coinType, address, message, signature },
      headers: {
        "Content-Type": "application/json"
      }
    });
  },
  async generateOnRampURL({ destinationWallets, partnerUserId, defaultNetwork, purchaseAmount, paymentAmount }) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return "";
    }
    const response = await state$5.api.post({
      path: `/v1/generators/onrampurl`,
      params: {
        projectId: OptionsController.state.projectId
      },
      body: {
        destinationWallets,
        defaultNetwork,
        partnerUserId,
        defaultExperience: "buy",
        presetCryptoAmount: purchaseAmount,
        presetFiatAmount: paymentAmount
      }
    });
    return response.url;
  },
  async getOnrampOptions() {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { paymentCurrencies: [], purchaseCurrencies: [] };
    }
    try {
      const response = await BlockchainApiController.get({
        path: `/v1/onramp/options`
      });
      return response;
    } catch (e2) {
      return DEFAULT_OPTIONS;
    }
  },
  async getOnrampQuote({ purchaseCurrency, paymentCurrency, amount, network }) {
    try {
      const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
      if (!isSupported) {
        return null;
      }
      const response = await state$5.api.post({
        path: `/v1/onramp/quote`,
        params: {
          projectId: OptionsController.state.projectId
        },
        body: {
          purchaseCurrency,
          paymentCurrency,
          amount,
          network
        }
      });
      return response;
    } catch (e2) {
      return {
        coinbaseFee: { amount, currency: paymentCurrency.id },
        networkFee: { amount, currency: paymentCurrency.id },
        paymentSubtotal: { amount, currency: paymentCurrency.id },
        paymentTotal: { amount, currency: paymentCurrency.id },
        purchaseAmount: { amount, currency: paymentCurrency.id },
        quoteId: "mocked-quote-id"
      };
    }
  },
  async getSmartSessions(caipAddress) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return [];
    }
    return BlockchainApiController.get({
      path: `/v1/sessions/${caipAddress}`
    });
  },
  async revokeSmartSession(address, pci, signature) {
    const isSupported = await BlockchainApiController.isNetworkSupported(ChainController.state.activeCaipNetwork?.caipNetworkId);
    if (!isSupported) {
      return { success: false };
    }
    return state$5.api.post({
      path: `/v1/sessions/${address}/revoke`,
      params: {
        projectId: OptionsController.state.projectId
      },
      body: {
        pci,
        signature
      }
    });
  },
  setClientId(clientId) {
    state$5.clientId = clientId;
    state$5.api = new FetchUtil({ baseUrl, clientId });
  }
};
const state$4 = proxy({
  currentTab: 0,
  tokenBalance: [],
  smartAccountDeployed: false,
  addressLabels: /* @__PURE__ */ new Map(),
  allAccounts: []
});
const controller$3 = {
  state: state$4,
  replaceState(newState) {
    if (!newState) {
      return;
    }
    Object.assign(state$4, ref(newState));
  },
  subscribe(callback) {
    return ChainController.subscribeChainProp("accountState", (accountState2) => {
      if (accountState2) {
        return callback(accountState2);
      }
      return void 0;
    });
  },
  subscribeKey(property, callback, chain) {
    let prev = void 0;
    return ChainController.subscribeChainProp("accountState", (accountState2) => {
      if (accountState2) {
        const nextValue = accountState2[property];
        if (prev !== nextValue) {
          prev = nextValue;
          callback(nextValue);
        }
      }
    }, chain);
  },
  setStatus(status, chain) {
    ChainController.setAccountProp("status", status, chain);
  },
  getCaipAddress(chain) {
    return ChainController.getAccountProp("caipAddress", chain);
  },
  setCaipAddress(caipAddress, chain) {
    const newAddress = caipAddress ? CoreHelperUtil.getPlainAddress(caipAddress) : void 0;
    if (chain === ChainController.state.activeChain) {
      ChainController.state.activeCaipAddress = caipAddress;
    }
    ChainController.setAccountProp("caipAddress", caipAddress, chain);
    ChainController.setAccountProp("address", newAddress, chain);
  },
  setBalance(balance, balanceSymbol, chain) {
    ChainController.setAccountProp("balance", balance, chain);
    ChainController.setAccountProp("balanceSymbol", balanceSymbol, chain);
  },
  setProfileName(profileName, chain) {
    ChainController.setAccountProp("profileName", profileName, chain);
  },
  setProfileImage(profileImage, chain) {
    ChainController.setAccountProp("profileImage", profileImage, chain);
  },
  setUser(user, chain) {
    ChainController.setAccountProp("user", user, chain);
  },
  setAddressExplorerUrl(explorerUrl, chain) {
    ChainController.setAccountProp("addressExplorerUrl", explorerUrl, chain);
  },
  setSmartAccountDeployed(isDeployed, chain) {
    ChainController.setAccountProp("smartAccountDeployed", isDeployed, chain);
  },
  setCurrentTab(currentTab) {
    ChainController.setAccountProp("currentTab", currentTab, ChainController.state.activeChain);
  },
  setTokenBalance(tokenBalance, chain) {
    if (tokenBalance) {
      ChainController.setAccountProp("tokenBalance", tokenBalance, chain);
    }
  },
  setShouldUpdateToAddress(address, chain) {
    ChainController.setAccountProp("shouldUpdateToAddress", address, chain);
  },
  setAllAccounts(accounts, namespace) {
    ChainController.setAccountProp("allAccounts", accounts, namespace);
  },
  addAddressLabel(address, label, chain) {
    const map = ChainController.getAccountProp("addressLabels", chain) || /* @__PURE__ */ new Map();
    map.set(address, label);
    ChainController.setAccountProp("addressLabels", map, chain);
  },
  removeAddressLabel(address, chain) {
    const map = ChainController.getAccountProp("addressLabels", chain) || /* @__PURE__ */ new Map();
    map.delete(address);
    ChainController.setAccountProp("addressLabels", map, chain);
  },
  setConnectedWalletInfo(connectedWalletInfo, chain) {
    ChainController.setAccountProp("connectedWalletInfo", connectedWalletInfo, chain, false);
  },
  setPreferredAccountType(preferredAccountType, chain) {
    ChainController.setAccountProp("preferredAccountTypes", {
      ...state$4.preferredAccountTypes,
      [chain]: preferredAccountType
    }, chain);
  },
  setPreferredAccountTypes(preferredAccountTypes) {
    state$4.preferredAccountTypes = preferredAccountTypes;
  },
  setSocialProvider(socialProvider, chain) {
    if (socialProvider) {
      ChainController.setAccountProp("socialProvider", socialProvider, chain);
    }
  },
  setSocialWindow(socialWindow, chain) {
    ChainController.setAccountProp("socialWindow", socialWindow ? ref(socialWindow) : void 0, chain);
  },
  setFarcasterUrl(farcasterUrl, chain) {
    ChainController.setAccountProp("farcasterUrl", farcasterUrl, chain);
  },
  async fetchTokenBalance(onError) {
    state$4.balanceLoading = true;
    const chainId = ChainController.state.activeCaipNetwork?.caipNetworkId;
    const chain = ChainController.state.activeCaipNetwork?.chainNamespace;
    const caipAddress = ChainController.state.activeCaipAddress;
    const address = caipAddress ? CoreHelperUtil.getPlainAddress(caipAddress) : void 0;
    if (state$4.lastRetry && !CoreHelperUtil.isAllowedRetry(state$4.lastRetry, 30 * ConstantsUtil$2.ONE_SEC_MS)) {
      state$4.balanceLoading = false;
      return [];
    }
    try {
      if (address && chainId && chain) {
        const response = await BlockchainApiController.getBalance(address, chainId);
        const filteredBalances = response.balances.filter((balance) => balance.quantity.decimals !== "0");
        AccountController.setTokenBalance(filteredBalances, chain);
        state$4.lastRetry = void 0;
        state$4.balanceLoading = false;
        return filteredBalances;
      }
    } catch (error) {
      state$4.lastRetry = Date.now();
      onError?.(error);
      SnackController.showError("Token Balance Unavailable");
    } finally {
      state$4.balanceLoading = false;
    }
    return [];
  },
  resetAccount(chain) {
    ChainController.resetAccount(chain);
  }
};
const AccountController = withErrorBoundary(controller$3);
const NetworkUtil = {
  /**
   * Function to handle the network switch.
   * This function has variety of conditions to handle the network switch depending on the connectors or namespace's connection states.
   * @param args.network - The network to switch to.
   * @param args.shouldConfirmSwitch - Whether to confirm the switch. If true, the user will be asked to confirm the switch if necessary.
   * @returns void
   */
  onSwitchNetwork({ network, ignoreSwitchConfirmation = false }) {
    const currentNetwork = ChainController.state.activeCaipNetwork;
    const routerData = RouterController.state.data;
    const isSameNetwork = network.id === currentNetwork?.id;
    if (isSameNetwork) {
      return;
    }
    const isCurrentNamespaceConnected = AccountController.getCaipAddress(ChainController.state.activeChain);
    const isDifferentNamespace = network.chainNamespace !== ChainController.state.activeChain;
    const isNextNamespaceConnected = AccountController.getCaipAddress(network.chainNamespace);
    const connectorId = ConnectorController.getConnectorId(ChainController.state.activeChain);
    const isConnectedWithAuth = connectorId === ConstantsUtil$3.CONNECTOR_ID.AUTH;
    const isSupportedForAuthConnector = ConstantsUtil$3.AUTH_CONNECTOR_SUPPORTED_CHAINS.find((c2) => c2 === network.chainNamespace);
    if (ignoreSwitchConfirmation || isConnectedWithAuth && isSupportedForAuthConnector) {
      RouterController.push("SwitchNetwork", { ...routerData, network });
    } else if (
      /**
       * If user switching to a different namespace and next namespace is not connected, we need to show switch active chain view for confirmation first.
       */
      isCurrentNamespaceConnected && isDifferentNamespace && !isNextNamespaceConnected
    ) {
      RouterController.push("SwitchActiveChain", {
        switchToChain: network.chainNamespace,
        navigateTo: "Connect",
        navigateWithReplace: true,
        network
      });
    } else {
      RouterController.push("SwitchNetwork", { ...routerData, network });
    }
  }
};
const state$3 = proxy({
  loading: false,
  loadingNamespaceMap: /* @__PURE__ */ new Map(),
  open: false,
  shake: false,
  namespace: void 0
});
const controller$2 = {
  state: state$3,
  subscribe(callback) {
    return subscribe(state$3, () => callback(state$3));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state$3, key, callback);
  },
  async open(options) {
    const isConnected = AccountController.state.status === "connected";
    const namespace = options?.namespace;
    const currentNamespace = ChainController.state.activeChain;
    const isSwitchingNamespace = namespace && namespace !== currentNamespace;
    const caipAddress = ChainController.getAccountData(options?.namespace)?.caipAddress;
    if (ConnectionController.state.wcBasic) {
      ApiController.prefetch({ fetchNetworkImages: false, fetchConnectorImages: false });
    } else {
      await ApiController.prefetch({
        fetchConnectorImages: !isConnected,
        fetchFeaturedWallets: !isConnected,
        fetchRecommendedWallets: !isConnected
      });
    }
    ConnectorController.setFilterByNamespace(options?.namespace);
    ModalController.setLoading(true, namespace);
    if (namespace && isSwitchingNamespace) {
      const namespaceNetwork = ChainController.getNetworkData(namespace)?.caipNetwork || ChainController.getRequestedCaipNetworks(namespace)[0];
      if (namespaceNetwork) {
        NetworkUtil.onSwitchNetwork({ network: namespaceNetwork, ignoreSwitchConfirmation: true });
      }
    } else {
      const hasNoAdapters = ChainController.state.noAdapters;
      if (OptionsController.state.manualWCControl || hasNoAdapters && !caipAddress) {
        if (CoreHelperUtil.isMobile()) {
          RouterController.reset("AllWallets");
        } else {
          RouterController.reset("ConnectingWalletConnectBasic");
        }
      } else if (options?.view) {
        RouterController.reset(options.view, options.data);
      } else if (caipAddress) {
        RouterController.reset("Account");
      } else {
        RouterController.reset("Connect");
      }
    }
    state$3.open = true;
    PublicStateController.set({ open: true });
    EventsController.sendEvent({
      type: "track",
      event: "MODAL_OPEN",
      properties: { connected: Boolean(caipAddress) }
    });
  },
  close() {
    const isEmbeddedEnabled = OptionsController.state.enableEmbedded;
    const isConnected = Boolean(ChainController.state.activeCaipAddress);
    if (state$3.open) {
      EventsController.sendEvent({
        type: "track",
        event: "MODAL_CLOSE",
        properties: { connected: isConnected }
      });
    }
    state$3.open = false;
    RouterController.reset("Connect");
    ModalController.clearLoading();
    if (isEmbeddedEnabled) {
      if (isConnected) {
        RouterController.replace("Account");
      } else {
        RouterController.push("Connect");
      }
    } else {
      PublicStateController.set({ open: false });
    }
    ConnectionController.resetUri();
  },
  setLoading(loading, namespace) {
    if (namespace) {
      state$3.loadingNamespaceMap.set(namespace, loading);
    }
    state$3.loading = loading;
    PublicStateController.set({ loading });
  },
  clearLoading() {
    state$3.loadingNamespaceMap.clear();
    state$3.loading = false;
  },
  shake() {
    if (state$3.shake) {
      return;
    }
    state$3.shake = true;
    setTimeout(() => {
      state$3.shake = false;
    }, 500);
  }
};
const ModalController = withErrorBoundary(controller$2);
const USDC_CURRENCY_DEFAULT = {
  id: "2b92315d-eab7-5bef-84fa-089a131333f5",
  name: "USD Coin",
  symbol: "USDC",
  networks: [
    {
      name: "ethereum-mainnet",
      display_name: "Ethereum",
      chain_id: "1",
      contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    },
    {
      name: "polygon-mainnet",
      display_name: "Polygon",
      chain_id: "137",
      contract_address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    }
  ]
};
const USD_CURRENCY_DEFAULT = {
  id: "USD",
  payment_method_limits: [
    {
      id: "card",
      min: "10.00",
      max: "7500.00"
    },
    {
      id: "ach_bank_account",
      min: "10.00",
      max: "25000.00"
    }
  ]
};
const defaultState = {
  providers: ONRAMP_PROVIDERS,
  selectedProvider: null,
  error: null,
  purchaseCurrency: USDC_CURRENCY_DEFAULT,
  paymentCurrency: USD_CURRENCY_DEFAULT,
  purchaseCurrencies: [USDC_CURRENCY_DEFAULT],
  paymentCurrencies: [],
  quotesLoading: false
};
const state$2 = proxy(defaultState);
const controller$1 = {
  state: state$2,
  subscribe(callback) {
    return subscribe(state$2, () => callback(state$2));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state$2, key, callback);
  },
  setSelectedProvider(provider) {
    if (provider && provider.name === "meld") {
      const currency = ChainController.state.activeChain === ConstantsUtil$3.CHAIN.SOLANA ? "SOL" : "USDC";
      const address = AccountController.state.address ?? "";
      const url = new URL(provider.url);
      url.searchParams.append("publicKey", MELD_PUBLIC_KEY);
      url.searchParams.append("destinationCurrencyCode", currency);
      url.searchParams.append("walletAddress", address);
      url.searchParams.append("externalCustomerId", OptionsController.state.projectId);
      state$2.selectedProvider = { ...provider, url: url.toString() };
    } else {
      state$2.selectedProvider = provider;
    }
  },
  setOnrampProviders(providers) {
    if (Array.isArray(providers) && providers.every((item) => typeof item === "string")) {
      const validOnramp = providers;
      const newProviders = ONRAMP_PROVIDERS.filter((provider) => validOnramp.includes(provider.name));
      state$2.providers = newProviders;
    } else {
      state$2.providers = [];
    }
  },
  setPurchaseCurrency(currency) {
    state$2.purchaseCurrency = currency;
  },
  setPaymentCurrency(currency) {
    state$2.paymentCurrency = currency;
  },
  setPurchaseAmount(amount) {
    OnRampController.state.purchaseAmount = amount;
  },
  setPaymentAmount(amount) {
    OnRampController.state.paymentAmount = amount;
  },
  async getAvailableCurrencies() {
    const options = await BlockchainApiController.getOnrampOptions();
    state$2.purchaseCurrencies = options.purchaseCurrencies;
    state$2.paymentCurrencies = options.paymentCurrencies;
    state$2.paymentCurrency = options.paymentCurrencies[0] || USD_CURRENCY_DEFAULT;
    state$2.purchaseCurrency = options.purchaseCurrencies[0] || USDC_CURRENCY_DEFAULT;
    await ApiController.fetchCurrencyImages(options.paymentCurrencies.map((currency) => currency.id));
    await ApiController.fetchTokenImages(options.purchaseCurrencies.map((currency) => currency.symbol));
  },
  async getQuote() {
    state$2.quotesLoading = true;
    try {
      const quote = await BlockchainApiController.getOnrampQuote({
        purchaseCurrency: state$2.purchaseCurrency,
        paymentCurrency: state$2.paymentCurrency,
        amount: state$2.paymentAmount?.toString() || "0",
        network: state$2.purchaseCurrency?.symbol
      });
      state$2.quotesLoading = false;
      state$2.purchaseAmount = Number(quote?.purchaseAmount.amount);
      return quote;
    } catch (error) {
      state$2.error = error.message;
      state$2.quotesLoading = false;
      return null;
    } finally {
      state$2.quotesLoading = false;
    }
  },
  resetState() {
    state$2.selectedProvider = null;
    state$2.error = null;
    state$2.purchaseCurrency = USDC_CURRENCY_DEFAULT;
    state$2.paymentCurrency = USD_CURRENCY_DEFAULT;
    state$2.purchaseCurrencies = [USDC_CURRENCY_DEFAULT];
    state$2.paymentCurrencies = [];
    state$2.paymentAmount = void 0;
    state$2.purchaseAmount = void 0;
    state$2.quotesLoading = false;
  }
};
const OnRampController = withErrorBoundary(controller$1);
const SLIP44_MSB = 2147483648;
const EnsUtil = {
  convertEVMChainIdToCoinType(chainId) {
    if (chainId >= SLIP44_MSB) {
      throw new Error("Invalid chainId");
    }
    return (SLIP44_MSB | chainId) >>> 0;
  }
};
const state$1 = proxy({
  suggestions: [],
  loading: false
});
const controller = {
  state: state$1,
  subscribe(callback) {
    return subscribe(state$1, () => callback(state$1));
  },
  subscribeKey(key, callback) {
    return subscribeKey(state$1, key, callback);
  },
  async resolveName(name) {
    try {
      return await BlockchainApiController.lookupEnsName(name);
    } catch (e2) {
      const error = e2;
      throw new Error(error?.reasons?.[0]?.description || "Error resolving name");
    }
  },
  async isNameRegistered(name) {
    try {
      await BlockchainApiController.lookupEnsName(name);
      return true;
    } catch {
      return false;
    }
  },
  async getSuggestions(value) {
    try {
      state$1.loading = true;
      state$1.suggestions = [];
      const response = await BlockchainApiController.getEnsNameSuggestions(value);
      state$1.suggestions = response.suggestions.map((suggestion) => ({
        ...suggestion,
        name: suggestion.name
      })) || [];
      return state$1.suggestions;
    } catch (e2) {
      const errorMessage = EnsController.parseEnsApiError(e2, "Error fetching name suggestions");
      throw new Error(errorMessage);
    } finally {
      state$1.loading = false;
    }
  },
  async getNamesForAddress(address) {
    try {
      const network = ChainController.state.activeCaipNetwork;
      if (!network) {
        return [];
      }
      const cachedEns = StorageUtil.getEnsFromCacheForAddress(address);
      if (cachedEns) {
        return cachedEns;
      }
      const response = await BlockchainApiController.reverseLookupEnsName({ address });
      StorageUtil.updateEnsCache({
        address,
        ens: response,
        timestamp: Date.now()
      });
      return response;
    } catch (e2) {
      const errorMessage = EnsController.parseEnsApiError(e2, "Error fetching names for address");
      throw new Error(errorMessage);
    }
  },
  async registerName(name) {
    const network = ChainController.state.activeCaipNetwork;
    if (!network) {
      throw new Error("Network not found");
    }
    const address = AccountController.state.address;
    const emailConnector = ConnectorController.getAuthConnector();
    if (!address || !emailConnector) {
      throw new Error("Address or auth connector not found");
    }
    state$1.loading = true;
    try {
      const message = JSON.stringify({
        name,
        attributes: {},
        // Unix timestamp
        timestamp: Math.floor(Date.now() / 1e3)
      });
      RouterController.pushTransactionStack({
        onCancel() {
          RouterController.replace("RegisterAccountName");
        }
      });
      const signature = await ConnectionController.signMessage(message);
      state$1.loading = false;
      const networkId = network.id;
      if (!networkId) {
        throw new Error("Network not found");
      }
      const coinType = EnsUtil.convertEVMChainIdToCoinType(Number(networkId));
      await BlockchainApiController.registerEnsName({
        coinType,
        address,
        signature,
        message
      });
      AccountController.setProfileName(name, network.chainNamespace);
      RouterController.replace("RegisterAccountNameSuccess");
    } catch (e2) {
      const errorMessage = EnsController.parseEnsApiError(e2, `Error registering name ${name}`);
      RouterController.replace("RegisterAccountName");
      throw new Error(errorMessage);
    } finally {
      state$1.loading = false;
    }
  },
  validateName(name) {
    return /^[a-zA-Z0-9-]{4,}$/u.test(name);
  },
  parseEnsApiError(error, defaultError) {
    const ensError = error;
    return ensError?.reasons?.[0]?.description || defaultError;
  }
};
const EnsController = withErrorBoundary(controller);
var a$2 = Object.defineProperty, u$3 = (e2, s2, r2) => s2 in e2 ? a$2(e2, s2, { enumerable: true, configurable: true, writable: true, value: r2 }) : e2[s2] = r2, c$4 = (e2, s2, r2) => u$3(e2, typeof s2 != "symbol" ? s2 + "" : s2, r2);
let h$3 = class h extends IEvents {
  constructor(s2) {
    super(), this.opts = s2, c$4(this, "protocol", "wc"), c$4(this, "version", 2);
  }
};
var p$3 = Object.defineProperty, b$4 = (e2, s2, r2) => s2 in e2 ? p$3(e2, s2, { enumerable: true, configurable: true, writable: true, value: r2 }) : e2[s2] = r2, v$3 = (e2, s2, r2) => b$4(e2, s2 + "", r2);
let I$2 = class I extends IEvents {
  constructor(s2, r2) {
    super(), this.core = s2, this.logger = r2, v$3(this, "records", /* @__PURE__ */ new Map());
  }
};
let y$4 = class y {
  constructor(s2, r2) {
    this.logger = s2, this.core = r2;
  }
};
let m$1 = class m extends IEvents {
  constructor(s2, r2) {
    super(), this.relayer = s2, this.logger = r2;
  }
};
let d$3 = class d extends IEvents {
  constructor(s2) {
    super();
  }
};
let f$3 = class f {
  constructor(s2, r2, t2, q2) {
    this.core = s2, this.logger = r2, this.name = t2;
  }
};
let P$2 = class P extends IEvents {
  constructor(s2, r2) {
    super(), this.relayer = s2, this.logger = r2;
  }
};
let S$4 = class S extends IEvents {
  constructor(s2, r2) {
    super(), this.core = s2, this.logger = r2;
  }
};
let M$3 = class M {
  constructor(s2, r2, t2) {
    this.core = s2, this.logger = r2, this.store = t2;
  }
};
let O$2 = class O {
  constructor(s2, r2) {
    this.projectId = s2, this.logger = r2;
  }
};
let R$2 = class R {
  constructor(s2, r2, t2) {
    this.core = s2, this.logger = r2, this.telemetryEnabled = t2;
  }
};
function anumber(n3) {
  if (!Number.isSafeInteger(n3) || n3 < 0)
    throw new Error("positive integer expected, got " + n3);
}
function isBytes(a2) {
  return a2 instanceof Uint8Array || ArrayBuffer.isView(a2) && a2.constructor.name === "Uint8Array";
}
function abytes(b2, ...lengths) {
  if (!isBytes(b2))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b2.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b2.length);
}
function ahash(h3) {
  if (typeof h3 !== "function" || typeof h3.create !== "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  anumber(h3.outputLen);
  anumber(h3.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n3, le2 = false) {
  if (le2)
    return { h: Number(n3 & U32_MASK64), l: Number(n3 >> _32n & U32_MASK64) };
  return { h: Number(n3 >> _32n & U32_MASK64) | 0, l: Number(n3 & U32_MASK64) | 0 };
}
function split(lst, le2 = false) {
  let Ah = new Uint32Array(lst.length);
  let Al = new Uint32Array(lst.length);
  for (let i2 = 0; i2 < lst.length; i2++) {
    const { h: h3, l: l2 } = fromBig(lst[i2], le2);
    [Ah[i2], Al[i2]] = [h3, l2];
  }
  return [Ah, Al];
}
const rotlSH = (h3, l2, s2) => h3 << s2 | l2 >>> 32 - s2;
const rotlSL = (h3, l2, s2) => l2 << s2 | h3 >>> 32 - s2;
const rotlBH = (h3, l2, s2) => l2 << s2 - 32 | h3 >>> 64 - s2;
const rotlBL = (h3, l2, s2) => h3 << s2 - 32 | l2 >>> 64 - s2;
const crypto$1 = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
const isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i2 = 0; i2 < arr.length; i2++) {
    arr[i2] = byteSwap(arr[i2]);
  }
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("utf8ToBytes expected string, got " + typeof str);
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes$1(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i2 = 0; i2 < arrays.length; i2++) {
    const a2 = arrays[i2];
    abytes(a2);
    sum += a2.length;
  }
  const res = new Uint8Array(sum);
  for (let i2 = 0, pad2 = 0; i2 < arrays.length; i2++) {
    const a2 = arrays[i2];
    res.set(a2, pad2);
    pad2 += a2.length;
  }
  return res;
}
class Hash {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function wrapConstructor(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes$1(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto$1 && typeof crypto$1.getRandomValues === "function") {
    return crypto$1.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto$1 && typeof crypto$1.randomBytes === "function") {
    return crypto$1.randomBytes(bytesLength);
  }
  throw new Error("crypto.getRandomValues must be defined");
}
const SHA3_PI = [];
const SHA3_ROTL = [];
const _SHA3_IOTA = [];
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n = /* @__PURE__ */ BigInt(2);
const _7n = /* @__PURE__ */ BigInt(7);
const _256n = /* @__PURE__ */ BigInt(256);
const _0x71n = /* @__PURE__ */ BigInt(113);
for (let round2 = 0, R3 = _1n, x2 = 1, y4 = 0; round2 < 24; round2++) {
  [x2, y4] = [y4, (2 * x2 + 3 * y4) % 5];
  SHA3_PI.push(2 * (5 * y4 + x2));
  SHA3_ROTL.push((round2 + 1) * (round2 + 2) / 2 % 64);
  let t2 = _0n;
  for (let j2 = 0; j2 < 7; j2++) {
    R3 = (R3 << _1n ^ (R3 >> _7n) * _0x71n) % _256n;
    if (R3 & _2n)
      t2 ^= _1n << (_1n << /* @__PURE__ */ BigInt(j2)) - _1n;
  }
  _SHA3_IOTA.push(t2);
}
const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ split(_SHA3_IOTA, true);
const rotlH = (h3, l2, s2) => s2 > 32 ? rotlBH(h3, l2, s2) : rotlSH(h3, l2, s2);
const rotlL = (h3, l2, s2) => s2 > 32 ? rotlBL(h3, l2, s2) : rotlSL(h3, l2, s2);
function keccakP(s2, rounds = 24) {
  const B3 = new Uint32Array(5 * 2);
  for (let round2 = 24 - rounds; round2 < 24; round2++) {
    for (let x2 = 0; x2 < 10; x2++)
      B3[x2] = s2[x2] ^ s2[x2 + 10] ^ s2[x2 + 20] ^ s2[x2 + 30] ^ s2[x2 + 40];
    for (let x2 = 0; x2 < 10; x2 += 2) {
      const idx1 = (x2 + 8) % 10;
      const idx0 = (x2 + 2) % 10;
      const B0 = B3[idx0];
      const B1 = B3[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B3[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B3[idx1 + 1];
      for (let y4 = 0; y4 < 50; y4 += 10) {
        s2[x2 + y4] ^= Th;
        s2[x2 + y4 + 1] ^= Tl;
      }
    }
    let curH = s2[2];
    let curL = s2[3];
    for (let t2 = 0; t2 < 24; t2++) {
      const shift = SHA3_ROTL[t2];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t2];
      curH = s2[PI];
      curL = s2[PI + 1];
      s2[PI] = Th;
      s2[PI + 1] = Tl;
    }
    for (let y4 = 0; y4 < 50; y4 += 10) {
      for (let x2 = 0; x2 < 10; x2++)
        B3[x2] = s2[y4 + x2];
      for (let x2 = 0; x2 < 10; x2++)
        s2[y4 + x2] ^= ~B3[(x2 + 2) % 10] & B3[(x2 + 4) % 10];
    }
    s2[0] ^= SHA3_IOTA_H[round2];
    s2[1] ^= SHA3_IOTA_L[round2];
  }
  B3.fill(0);
}
class Keccak extends Hash {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
    super();
    this.blockLen = blockLen;
    this.suffix = suffix;
    this.outputLen = outputLen;
    this.enableXOF = enableXOF;
    this.rounds = rounds;
    this.pos = 0;
    this.posOut = 0;
    this.finished = false;
    this.destroyed = false;
    anumber(outputLen);
    if (0 >= this.blockLen || this.blockLen >= 200)
      throw new Error("Sha3 supports only keccak-f1600 function");
    this.state = new Uint8Array(200);
    this.state32 = u32(this.state);
  }
  keccak() {
    if (!isLE)
      byteSwap32(this.state32);
    keccakP(this.state32, this.rounds);
    if (!isLE)
      byteSwap32(this.state32);
    this.posOut = 0;
    this.pos = 0;
  }
  update(data) {
    aexists(this);
    const { blockLen, state: state2 } = this;
    data = toBytes$1(data);
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      for (let i2 = 0; i2 < take; i2++)
        state2[this.pos++] ^= data[pos++];
      if (this.pos === blockLen)
        this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = true;
    const { state: state2, suffix, pos, blockLen } = this;
    state2[pos] ^= suffix;
    if ((suffix & 128) !== 0 && pos === blockLen - 1)
      this.keccak();
    state2[blockLen - 1] ^= 128;
    this.keccak();
  }
  writeInto(out) {
    aexists(this, false);
    abytes(out);
    this.finish();
    const bufferOut = this.state;
    const { blockLen } = this;
    for (let pos = 0, len = out.length; pos < len; ) {
      if (this.posOut >= blockLen)
        this.keccak();
      const take = Math.min(blockLen - this.posOut, len - pos);
      out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
      this.posOut += take;
      pos += take;
    }
    return out;
  }
  xofInto(out) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(out);
  }
  xof(bytes) {
    anumber(bytes);
    return this.xofInto(new Uint8Array(bytes));
  }
  digestInto(out) {
    aoutput(out, this);
    if (this.finished)
      throw new Error("digest() was already called");
    this.writeInto(out);
    this.destroy();
    return out;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true;
    this.state.fill(0);
  }
  _cloneInto(to2) {
    const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
    to2 || (to2 = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
    to2.state32.set(this.state32);
    to2.pos = this.pos;
    to2.posOut = this.posOut;
    to2.finished = this.finished;
    to2.rounds = rounds;
    to2.suffix = suffix;
    to2.outputLen = outputLen;
    to2.enableXOF = enableXOF;
    to2.destroyed = this.destroyed;
    return to2;
  }
}
const gen = (suffix, blockLen, outputLen) => wrapConstructor(() => new Keccak(blockLen, suffix, outputLen));
const keccak_256 = /* @__PURE__ */ gen(1, 136, 256 / 8);
function allocUnsafe(size2 = 0) {
  if (globalThis.Buffer != null && globalThis.Buffer.allocUnsafe != null) {
    return globalThis.Buffer.allocUnsafe(size2);
  }
  return new Uint8Array(size2);
}
function concat(arrays, length) {
  if (!length) {
    length = arrays.reduce((acc, curr) => acc + curr.length, 0);
  }
  const output = allocUnsafe(length);
  let offset = 0;
  for (const arr of arrays) {
    output.set(arr, offset);
    offset += arr.length;
  }
  return output;
}
function createCodec(name, prefix, encode, decode) {
  return {
    name,
    prefix,
    encoder: {
      name,
      prefix,
      encode
    },
    decoder: { decode }
  };
}
const string = createCodec("utf8", "u", (buf) => {
  const decoder = new TextDecoder("utf8");
  return "u" + decoder.decode(buf);
}, (str) => {
  const encoder2 = new TextEncoder();
  return encoder2.encode(str.substring(1));
});
const ascii = createCodec("ascii", "a", (buf) => {
  let string2 = "a";
  for (let i2 = 0; i2 < buf.length; i2++) {
    string2 += String.fromCharCode(buf[i2]);
  }
  return string2;
}, (str) => {
  str = str.substring(1);
  const buf = allocUnsafe(str.length);
  for (let i2 = 0; i2 < str.length; i2++) {
    buf[i2] = str.charCodeAt(i2);
  }
  return buf;
});
const BASES = {
  utf8: string,
  "utf-8": string,
  hex: bases.base16,
  latin1: ascii,
  ascii,
  binary: ascii,
  ...bases
};
function fromString(string2, encoding = "utf8") {
  const base = BASES[encoding];
  if (!base) {
    throw new Error(`Unsupported encoding "${encoding}"`);
  }
  if ((encoding === "utf8" || encoding === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null) {
    return globalThis.Buffer.from(string2, "utf8");
  }
  return base.decoder.decode(`${base.prefix}${string2}`);
}
function toString(array, encoding = "utf8") {
  const base = BASES[encoding];
  if (!base) {
    throw new Error(`Unsupported encoding "${encoding}"`);
  }
  if ((encoding === "utf8" || encoding === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null) {
    return globalThis.Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString("utf8");
  }
  return base.encoder.encode(array).substring(1);
}
const $n$2 = "ReactNative", Y$3 = { reactNative: "react-native", node: "node", browser: "browser", unknown: "unknown" }, jn$1 = "js";
function _e$4() {
  return typeof process < "u" && typeof process.versions < "u" && typeof process.versions.node < "u";
}
function pt$3() {
  return !cjsExports$1.getDocument() && !!cjsExports$1.getNavigator() && navigator.product === $n$2;
}
function ei$1() {
  return pt$3() && typeof global < "u" && typeof (global == null ? void 0 : global.Platform) < "u" && (global == null ? void 0 : global.Platform.OS) === "android";
}
function ni$1() {
  return pt$3() && typeof global < "u" && typeof (global == null ? void 0 : global.Platform) < "u" && (global == null ? void 0 : global.Platform.OS) === "ios";
}
function Tt$3() {
  return !_e$4() && !!cjsExports$1.getNavigator() && !!cjsExports$1.getDocument();
}
function xt$3() {
  return pt$3() ? Y$3.reactNative : _e$4() ? Y$3.node : Tt$3() ? Y$3.browser : Y$3.unknown;
}
function ri$1() {
  var t2;
  try {
    return pt$3() && typeof global < "u" && typeof (global == null ? void 0 : global.Application) < "u" ? (t2 = global.Application) == null ? void 0 : t2.applicationId : void 0;
  } catch {
    return;
  }
}
function Cn$1(t2, e2) {
  const n3 = new URLSearchParams(t2);
  for (const r2 of Object.keys(e2).sort()) if (e2.hasOwnProperty(r2)) {
    const o2 = e2[r2];
    o2 !== void 0 && n3.set(r2, o2);
  }
  return n3.toString();
}
function Pn$2() {
  return cjsExports$2.getWindowMetadata() || { name: "", description: "", url: "", icons: [""] };
}
function kn$1() {
  if (xt$3() === Y$3.reactNative && typeof global < "u" && typeof (global == null ? void 0 : global.Platform) < "u") {
    const { OS: n3, Version: r2 } = global.Platform;
    return [n3, r2].join("-");
  }
  const t2 = detect();
  if (t2 === null) return "unknown";
  const e2 = t2.os ? t2.os.replace(" ", "").toLowerCase() : "unknown";
  return t2.type === "browser" ? [e2, t2.name, t2.version].join("-") : [e2, t2.version].join("-");
}
function Vn$1() {
  var t2;
  const e2 = xt$3();
  return e2 === Y$3.browser ? [e2, ((t2 = cjsExports$1.getLocation()) == null ? void 0 : t2.host) || "unknown"].join(":") : e2;
}
function Mn$1(t2, e2, n3) {
  const r2 = kn$1(), o2 = Vn$1();
  return [[t2, e2].join("-"), [jn$1, n3].join("-"), r2, o2].join("/");
}
function si$1({ protocol: t2, version: e2, relayUrl: n3, sdkVersion: r2, auth: o2, projectId: i2, useOnCloseEvent: s2, bundleId: c2, packageName: a2 }) {
  const u2 = n3.split("?"), l2 = Mn$1(t2, e2, r2), f3 = { auth: o2, ua: l2, projectId: i2, useOnCloseEvent: s2, packageName: a2 || void 0, bundleId: c2 || void 0 }, h3 = Cn$1(u2[1] || "", f3);
  return u2[0] + "?" + h3;
}
function fi$1(t2) {
  return Object.fromEntries(t2.entries());
}
function li$1(t2) {
  return new Map(Object.entries(t2));
}
function gi$2(t2 = cjsExports.FIVE_MINUTES, e2) {
  const n3 = cjsExports.toMiliseconds(t2 || cjsExports.FIVE_MINUTES);
  let r2, o2, i2, s2;
  return { resolve: (c2) => {
    i2 && r2 && (clearTimeout(i2), r2(c2), s2 = Promise.resolve(c2));
  }, reject: (c2) => {
    i2 && o2 && (clearTimeout(i2), o2(c2));
  }, done: () => new Promise((c2, a2) => {
    if (s2) return c2(s2);
    i2 = setTimeout(() => {
      const u2 = new Error(e2);
      s2 = Promise.reject(u2), a2(u2);
    }, n3), r2 = c2, o2 = a2;
  }) };
}
function yi$1(t2, e2, n3) {
  return new Promise(async (r2, o2) => {
    const i2 = setTimeout(() => o2(new Error(n3)), e2);
    try {
      const s2 = await t2;
      r2(s2);
    } catch (s2) {
      o2(s2);
    }
    clearTimeout(i2);
  });
}
function $e$2(t2, e2) {
  if (typeof e2 == "string" && e2.startsWith(`${t2}:`)) return e2;
  if (t2.toLowerCase() === "topic") {
    if (typeof e2 != "string") throw new Error('Value must be "string" for expirer target type: topic');
    return `topic:${e2}`;
  } else if (t2.toLowerCase() === "id") {
    if (typeof e2 != "number") throw new Error('Value must be "number" for expirer target type: id');
    return `id:${e2}`;
  }
  throw new Error(`Unknown expirer target type: ${t2}`);
}
function mi$1(t2) {
  return $e$2("topic", t2);
}
function wi$1(t2) {
  return $e$2("id", t2);
}
function bi$2(t2) {
  const [e2, n3] = t2.split(":"), r2 = { id: void 0, topic: void 0 };
  if (e2 === "topic" && typeof n3 == "string") r2.topic = n3;
  else if (e2 === "id" && Number.isInteger(Number(n3))) r2.id = Number(n3);
  else throw new Error(`Invalid target, expected id:number or topic:string, got ${e2}:${n3}`);
  return r2;
}
function Ei$2(t2, e2) {
  return cjsExports.fromMiliseconds(Date.now() + cjsExports.toMiliseconds(t2));
}
function vi$2(t2) {
  return Date.now() >= cjsExports.toMiliseconds(t2);
}
function xi$2(t2, e2) {
  return `${t2}${e2 ? `:${e2}` : ""}`;
}
function Bi$1() {
  return typeof crypto < "u" && crypto != null && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/gu, (t2) => {
    const e2 = Math.random() * 16 | 0;
    return (t2 === "x" ? e2 : e2 & 3 | 8).toString(16);
  });
}
function Ii$2() {
  return typeof process < "u" && process.env.IS_VITEST === "true";
}
function je$2(t2) {
  return Buffer.from(t2, "base64").toString("utf-8");
}
function Ni$1(t2) {
  return new Promise((e2) => setTimeout(e2, t2));
}
function Wt$3(t2) {
  if (!Number.isSafeInteger(t2) || t2 < 0) throw new Error("positive integer expected, got " + t2);
}
function Ui$2(t2) {
  return t2 instanceof Uint8Array || ArrayBuffer.isView(t2) && t2.constructor.name === "Uint8Array";
}
function Xt$3(t2, ...e2) {
  if (!Ui$2(t2)) throw new Error("Uint8Array expected");
  if (e2.length > 0 && !e2.includes(t2.length)) throw new Error("Uint8Array expected of length " + e2 + ", got length=" + t2.length);
}
function Ce$2(t2) {
  if (typeof t2 != "function" || typeof t2.create != "function") throw new Error("Hash should be wrapped by utils.wrapConstructor");
  Wt$3(t2.outputLen), Wt$3(t2.blockLen);
}
function Rt$3(t2, e2 = true) {
  if (t2.destroyed) throw new Error("Hash instance has been destroyed");
  if (e2 && t2.finished) throw new Error("Hash#digest() has already been called");
}
function Gn$2(t2, e2) {
  Xt$3(t2);
  const n3 = e2.outputLen;
  if (t2.length < n3) throw new Error("digestInto() expects output buffer of length at least " + n3);
}
const le$3 = BigInt(2 ** 32 - 1), Wn$2 = BigInt(32);
function Ti$2(t2, e2 = false) {
  return e2 ? { h: Number(t2 & le$3), l: Number(t2 >> Wn$2 & le$3) } : { h: Number(t2 >> Wn$2 & le$3) | 0, l: Number(t2 & le$3) | 0 };
}
function Ri$2(t2, e2 = false) {
  let n3 = new Uint32Array(t2.length), r2 = new Uint32Array(t2.length);
  for (let o2 = 0; o2 < t2.length; o2++) {
    const { h: i2, l: s2 } = Ti$2(t2[o2], e2);
    [n3[o2], r2[o2]] = [i2, s2];
  }
  return [n3, r2];
}
const _i$2 = (t2, e2, n3) => t2 << n3 | e2 >>> 32 - n3, $i$2 = (t2, e2, n3) => e2 << n3 | t2 >>> 32 - n3, Li$2 = (t2, e2, n3) => e2 << n3 - 32 | t2 >>> 64 - n3, ji$2 = (t2, e2, n3) => t2 << n3 - 32 | e2 >>> 64 - n3, _t$3 = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
function Ci$2(t2) {
  return new Uint32Array(t2.buffer, t2.byteOffset, Math.floor(t2.byteLength / 4));
}
function Pe$2(t2) {
  return new DataView(t2.buffer, t2.byteOffset, t2.byteLength);
}
function ct$2(t2, e2) {
  return t2 << 32 - e2 | t2 >>> e2;
}
const Xn$2 = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function Pi$2(t2) {
  return t2 << 24 & 4278190080 | t2 << 8 & 16711680 | t2 >>> 8 & 65280 | t2 >>> 24 & 255;
}
function Jn$2(t2) {
  for (let e2 = 0; e2 < t2.length; e2++) t2[e2] = Pi$2(t2[e2]);
}
function ki$2(t2) {
  if (typeof t2 != "string") throw new Error("utf8ToBytes expected string, got " + typeof t2);
  return new Uint8Array(new TextEncoder().encode(t2));
}
function $t$2(t2) {
  return typeof t2 == "string" && (t2 = ki$2(t2)), Xt$3(t2), t2;
}
function Vi$2(...t2) {
  let e2 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) {
    const o2 = t2[r2];
    Xt$3(o2), e2 += o2.length;
  }
  const n3 = new Uint8Array(e2);
  for (let r2 = 0, o2 = 0; r2 < t2.length; r2++) {
    const i2 = t2[r2];
    n3.set(i2, o2), o2 += i2.length;
  }
  return n3;
}
let ke$4 = class ke {
  clone() {
    return this._cloneInto();
  }
};
function Qn$2(t2) {
  const e2 = (r2) => t2().update($t$2(r2)).digest(), n3 = t2();
  return e2.outputLen = n3.outputLen, e2.blockLen = n3.blockLen, e2.create = () => t2(), e2;
}
function Lt$3(t2 = 32) {
  if (_t$3 && typeof _t$3.getRandomValues == "function") return _t$3.getRandomValues(new Uint8Array(t2));
  if (_t$3 && typeof _t$3.randomBytes == "function") return _t$3.randomBytes(t2);
  throw new Error("crypto.getRandomValues must be defined");
}
const tr$2 = [], er$2 = [], nr$2 = [], Mi$2 = BigInt(0), Jt$3 = BigInt(1), Di$2 = BigInt(2), Hi$1 = BigInt(7), qi$2 = BigInt(256), Ki$2 = BigInt(113);
for (let t2 = 0, e2 = Jt$3, n3 = 1, r2 = 0; t2 < 24; t2++) {
  [n3, r2] = [r2, (2 * n3 + 3 * r2) % 5], tr$2.push(2 * (5 * r2 + n3)), er$2.push((t2 + 1) * (t2 + 2) / 2 % 64);
  let o2 = Mi$2;
  for (let i2 = 0; i2 < 7; i2++) e2 = (e2 << Jt$3 ^ (e2 >> Hi$1) * Ki$2) % qi$2, e2 & Di$2 && (o2 ^= Jt$3 << (Jt$3 << BigInt(i2)) - Jt$3);
  nr$2.push(o2);
}
const [Fi$2, zi$2] = Ri$2(nr$2, true), rr$2 = (t2, e2, n3) => n3 > 32 ? Li$2(t2, e2, n3) : _i$2(t2, e2, n3), or$2 = (t2, e2, n3) => n3 > 32 ? ji$2(t2, e2, n3) : $i$2(t2, e2, n3);
function Zi$1(t2, e2 = 24) {
  const n3 = new Uint32Array(10);
  for (let r2 = 24 - e2; r2 < 24; r2++) {
    for (let s2 = 0; s2 < 10; s2++) n3[s2] = t2[s2] ^ t2[s2 + 10] ^ t2[s2 + 20] ^ t2[s2 + 30] ^ t2[s2 + 40];
    for (let s2 = 0; s2 < 10; s2 += 2) {
      const c2 = (s2 + 8) % 10, a2 = (s2 + 2) % 10, u2 = n3[a2], l2 = n3[a2 + 1], f3 = rr$2(u2, l2, 1) ^ n3[c2], h3 = or$2(u2, l2, 1) ^ n3[c2 + 1];
      for (let y4 = 0; y4 < 50; y4 += 10) t2[s2 + y4] ^= f3, t2[s2 + y4 + 1] ^= h3;
    }
    let o2 = t2[2], i2 = t2[3];
    for (let s2 = 0; s2 < 24; s2++) {
      const c2 = er$2[s2], a2 = rr$2(o2, i2, c2), u2 = or$2(o2, i2, c2), l2 = tr$2[s2];
      o2 = t2[l2], i2 = t2[l2 + 1], t2[l2] = a2, t2[l2 + 1] = u2;
    }
    for (let s2 = 0; s2 < 50; s2 += 10) {
      for (let c2 = 0; c2 < 10; c2++) n3[c2] = t2[s2 + c2];
      for (let c2 = 0; c2 < 10; c2++) t2[s2 + c2] ^= ~n3[(c2 + 2) % 10] & n3[(c2 + 4) % 10];
    }
    t2[0] ^= Fi$2[r2], t2[1] ^= zi$2[r2];
  }
  n3.fill(0);
}
let En$2 = class En extends ke$4 {
  constructor(e2, n3, r2, o2 = false, i2 = 24) {
    if (super(), this.blockLen = e2, this.suffix = n3, this.outputLen = r2, this.enableXOF = o2, this.rounds = i2, this.pos = 0, this.posOut = 0, this.finished = false, this.destroyed = false, Wt$3(r2), 0 >= this.blockLen || this.blockLen >= 200) throw new Error("Sha3 supports only keccak-f1600 function");
    this.state = new Uint8Array(200), this.state32 = Ci$2(this.state);
  }
  keccak() {
    Xn$2 || Jn$2(this.state32), Zi$1(this.state32, this.rounds), Xn$2 || Jn$2(this.state32), this.posOut = 0, this.pos = 0;
  }
  update(e2) {
    Rt$3(this);
    const { blockLen: n3, state: r2 } = this;
    e2 = $t$2(e2);
    const o2 = e2.length;
    for (let i2 = 0; i2 < o2; ) {
      const s2 = Math.min(n3 - this.pos, o2 - i2);
      for (let c2 = 0; c2 < s2; c2++) r2[this.pos++] ^= e2[i2++];
      this.pos === n3 && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    const { state: e2, suffix: n3, pos: r2, blockLen: o2 } = this;
    e2[r2] ^= n3, (n3 & 128) !== 0 && r2 === o2 - 1 && this.keccak(), e2[o2 - 1] ^= 128, this.keccak();
  }
  writeInto(e2) {
    Rt$3(this, false), Xt$3(e2), this.finish();
    const n3 = this.state, { blockLen: r2 } = this;
    for (let o2 = 0, i2 = e2.length; o2 < i2; ) {
      this.posOut >= r2 && this.keccak();
      const s2 = Math.min(r2 - this.posOut, i2 - o2);
      e2.set(n3.subarray(this.posOut, this.posOut + s2), o2), this.posOut += s2, o2 += s2;
    }
    return e2;
  }
  xofInto(e2) {
    if (!this.enableXOF) throw new Error("XOF is not possible for this instance");
    return this.writeInto(e2);
  }
  xof(e2) {
    return Wt$3(e2), this.xofInto(new Uint8Array(e2));
  }
  digestInto(e2) {
    if (Gn$2(e2, this), this.finished) throw new Error("digest() was already called");
    return this.writeInto(e2), this.destroy(), e2;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true, this.state.fill(0);
  }
  _cloneInto(e2) {
    const { blockLen: n3, suffix: r2, outputLen: o2, rounds: i2, enableXOF: s2 } = this;
    return e2 || (e2 = new En(n3, r2, o2, s2, i2)), e2.state32.set(this.state32), e2.pos = this.pos, e2.posOut = this.posOut, e2.finished = this.finished, e2.rounds = i2, e2.suffix = r2, e2.outputLen = o2, e2.enableXOF = s2, e2.destroyed = this.destroyed, e2;
  }
};
const Yi$1 = (t2, e2, n3) => Qn$2(() => new En$2(e2, t2, n3));
Yi$1(1, 136, 256 / 8);
function Fe$3(t2) {
  if (!Number.isSafeInteger(t2) || t2 < 0) throw new Error("positive integer expected, got " + t2);
}
function Sr$2(t2) {
  return t2 instanceof Uint8Array || ArrayBuffer.isView(t2) && t2.constructor.name === "Uint8Array";
}
function tt$1(t2, ...e2) {
  if (!Sr$2(t2)) throw new Error("Uint8Array expected");
  if (e2.length > 0 && !e2.includes(t2.length)) throw new Error("Uint8Array expected of length " + e2 + ", got length=" + t2.length);
}
function Or$2(t2, e2 = true) {
  if (t2.destroyed) throw new Error("Hash instance has been destroyed");
  if (e2 && t2.finished) throw new Error("Hash#digest() has already been called");
}
function ps$1(t2, e2) {
  tt$1(t2);
  const n3 = e2.outputLen;
  if (t2.length < n3) throw new Error("digestInto() expects output buffer of length at least " + n3);
}
function Ar$2(t2) {
  if (typeof t2 != "boolean") throw new Error(`boolean expected, not ${t2}`);
}
const mt$3 = (t2) => new Uint32Array(t2.buffer, t2.byteOffset, Math.floor(t2.byteLength / 4)), gs$1 = (t2) => new DataView(t2.buffer, t2.byteOffset, t2.byteLength), ys$1 = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
if (!ys$1) throw new Error("Non little-endian hardware is not supported");
function ms$1(t2) {
  if (typeof t2 != "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t2));
}
function ze$3(t2) {
  if (typeof t2 == "string") t2 = ms$1(t2);
  else if (Sr$2(t2)) t2 = Ze$3(t2);
  else throw new Error("Uint8Array expected, got " + typeof t2);
  return t2;
}
function ws$1(t2, e2) {
  if (e2 == null || typeof e2 != "object") throw new Error("options must be defined");
  return Object.assign(t2, e2);
}
function bs$2(t2, e2) {
  if (t2.length !== e2.length) return false;
  let n3 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) n3 |= t2[r2] ^ e2[r2];
  return n3 === 0;
}
const Es$1 = (t2, e2) => {
  function n3(r2, ...o2) {
    if (tt$1(r2), t2.nonceLength !== void 0) {
      const l2 = o2[0];
      if (!l2) throw new Error("nonce / iv required");
      t2.varSizeNonce ? tt$1(l2) : tt$1(l2, t2.nonceLength);
    }
    const i2 = t2.tagLength;
    i2 && o2[1] !== void 0 && tt$1(o2[1]);
    const s2 = e2(r2, ...o2), c2 = (l2, f3) => {
      if (f3 !== void 0) {
        if (l2 !== 2) throw new Error("cipher output not supported");
        tt$1(f3);
      }
    };
    let a2 = false;
    return { encrypt(l2, f3) {
      if (a2) throw new Error("cannot encrypt() twice with same key + nonce");
      return a2 = true, tt$1(l2), c2(s2.encrypt.length, f3), s2.encrypt(l2, f3);
    }, decrypt(l2, f3) {
      if (tt$1(l2), i2 && l2.length < i2) throw new Error("invalid ciphertext length: smaller than tagLength=" + i2);
      return c2(s2.decrypt.length, f3), s2.decrypt(l2, f3);
    } };
  }
  return Object.assign(n3, t2), n3;
};
function Br$2(t2, e2, n3 = true) {
  if (e2 === void 0) return new Uint8Array(t2);
  if (e2.length !== t2) throw new Error("invalid output length, expected " + t2 + ", got: " + e2.length);
  if (n3 && !vs$2(e2)) throw new Error("invalid output, must be aligned");
  return e2;
}
function Ir$2(t2, e2, n3, r2) {
  if (typeof t2.setBigUint64 == "function") return t2.setBigUint64(e2, n3, r2);
  const o2 = BigInt(32), i2 = BigInt(4294967295), s2 = Number(n3 >> o2 & i2), c2 = Number(n3 & i2), a2 = 4, u2 = 0;
  t2.setUint32(e2 + a2, s2, r2), t2.setUint32(e2 + u2, c2, r2);
}
function vs$2(t2) {
  return t2.byteOffset % 4 === 0;
}
function Ze$3(t2) {
  return Uint8Array.from(t2);
}
function jt$3(...t2) {
  for (let e2 = 0; e2 < t2.length; e2++) t2[e2].fill(0);
}
const Nr$2 = (t2) => Uint8Array.from(t2.split("").map((e2) => e2.charCodeAt(0))), xs$2 = Nr$2("expand 16-byte k"), Ss$1 = Nr$2("expand 32-byte k"), Os$2 = mt$3(xs$2), As$2 = mt$3(Ss$1);
function V$5(t2, e2) {
  return t2 << e2 | t2 >>> 32 - e2;
}
function Ye$3(t2) {
  return t2.byteOffset % 4 === 0;
}
const ge$3 = 64, Bs$1 = 16, Ur$2 = 2 ** 32 - 1, Tr$2 = new Uint32Array();
function Is$2(t2, e2, n3, r2, o2, i2, s2, c2) {
  const a2 = o2.length, u2 = new Uint8Array(ge$3), l2 = mt$3(u2), f3 = Ye$3(o2) && Ye$3(i2), h3 = f3 ? mt$3(o2) : Tr$2, y4 = f3 ? mt$3(i2) : Tr$2;
  for (let E2 = 0; E2 < a2; s2++) {
    if (t2(e2, n3, r2, l2, s2, c2), s2 >= Ur$2) throw new Error("arx: counter overflow");
    const p2 = Math.min(ge$3, a2 - E2);
    if (f3 && p2 === ge$3) {
      const d3 = E2 / 4;
      if (E2 % 4 !== 0) throw new Error("arx: invalid block position");
      for (let v2 = 0, m3; v2 < Bs$1; v2++) m3 = d3 + v2, y4[m3] = h3[m3] ^ l2[v2];
      E2 += ge$3;
      continue;
    }
    for (let d3 = 0, v2; d3 < p2; d3++) v2 = E2 + d3, i2[v2] = o2[v2] ^ u2[d3];
    E2 += p2;
  }
}
function Ns$2(t2, e2) {
  const { allowShortKeys: n3, extendNonceFn: r2, counterLength: o2, counterRight: i2, rounds: s2 } = ws$1({ allowShortKeys: false, counterLength: 8, counterRight: false, rounds: 20 }, e2);
  if (typeof t2 != "function") throw new Error("core must be a function");
  return Fe$3(o2), Fe$3(s2), Ar$2(i2), Ar$2(n3), (c2, a2, u2, l2, f3 = 0) => {
    tt$1(c2), tt$1(a2), tt$1(u2);
    const h3 = u2.length;
    if (l2 === void 0 && (l2 = new Uint8Array(h3)), tt$1(l2), Fe$3(f3), f3 < 0 || f3 >= Ur$2) throw new Error("arx: counter overflow");
    if (l2.length < h3) throw new Error(`arx: output (${l2.length}) is shorter than data (${h3})`);
    const y4 = [];
    let E2 = c2.length, p2, d3;
    if (E2 === 32) y4.push(p2 = Ze$3(c2)), d3 = As$2;
    else if (E2 === 16 && n3) p2 = new Uint8Array(32), p2.set(c2), p2.set(c2, 16), d3 = Os$2, y4.push(p2);
    else throw new Error(`arx: invalid 32-byte key, got length=${E2}`);
    Ye$3(a2) || y4.push(a2 = Ze$3(a2));
    const v2 = mt$3(p2);
    if (r2) {
      if (a2.length !== 24) throw new Error("arx: extended nonce must be 24 bytes");
      r2(d3, v2, mt$3(a2.subarray(0, 16)), v2), a2 = a2.subarray(16);
    }
    const m3 = 16 - o2;
    if (m3 !== a2.length) throw new Error(`arx: nonce must be ${m3} or 16 bytes`);
    if (m3 !== 12) {
      const N2 = new Uint8Array(12);
      N2.set(a2, i2 ? 0 : 12 - a2.length), a2 = N2, y4.push(a2);
    }
    const O3 = mt$3(a2);
    return Is$2(t2, d3, v2, O3, u2, l2, f3, s2), jt$3(...y4), l2;
  };
}
const F$3 = (t2, e2) => t2[e2++] & 255 | (t2[e2++] & 255) << 8;
let Us$1 = class Us {
  constructor(e2) {
    this.blockLen = 16, this.outputLen = 16, this.buffer = new Uint8Array(16), this.r = new Uint16Array(10), this.h = new Uint16Array(10), this.pad = new Uint16Array(8), this.pos = 0, this.finished = false, e2 = ze$3(e2), tt$1(e2, 32);
    const n3 = F$3(e2, 0), r2 = F$3(e2, 2), o2 = F$3(e2, 4), i2 = F$3(e2, 6), s2 = F$3(e2, 8), c2 = F$3(e2, 10), a2 = F$3(e2, 12), u2 = F$3(e2, 14);
    this.r[0] = n3 & 8191, this.r[1] = (n3 >>> 13 | r2 << 3) & 8191, this.r[2] = (r2 >>> 10 | o2 << 6) & 7939, this.r[3] = (o2 >>> 7 | i2 << 9) & 8191, this.r[4] = (i2 >>> 4 | s2 << 12) & 255, this.r[5] = s2 >>> 1 & 8190, this.r[6] = (s2 >>> 14 | c2 << 2) & 8191, this.r[7] = (c2 >>> 11 | a2 << 5) & 8065, this.r[8] = (a2 >>> 8 | u2 << 8) & 8191, this.r[9] = u2 >>> 5 & 127;
    for (let l2 = 0; l2 < 8; l2++) this.pad[l2] = F$3(e2, 16 + 2 * l2);
  }
  process(e2, n3, r2 = false) {
    const o2 = r2 ? 0 : 2048, { h: i2, r: s2 } = this, c2 = s2[0], a2 = s2[1], u2 = s2[2], l2 = s2[3], f3 = s2[4], h3 = s2[5], y4 = s2[6], E2 = s2[7], p2 = s2[8], d3 = s2[9], v2 = F$3(e2, n3 + 0), m3 = F$3(e2, n3 + 2), O3 = F$3(e2, n3 + 4), N2 = F$3(e2, n3 + 6), $2 = F$3(e2, n3 + 8), B3 = F$3(e2, n3 + 10), A2 = F$3(e2, n3 + 12), T2 = F$3(e2, n3 + 14);
    let S3 = i2[0] + (v2 & 8191), L2 = i2[1] + ((v2 >>> 13 | m3 << 3) & 8191), U2 = i2[2] + ((m3 >>> 10 | O3 << 6) & 8191), _2 = i2[3] + ((O3 >>> 7 | N2 << 9) & 8191), j2 = i2[4] + ((N2 >>> 4 | $2 << 12) & 8191), g2 = i2[5] + ($2 >>> 1 & 8191), w2 = i2[6] + (($2 >>> 14 | B3 << 2) & 8191), b2 = i2[7] + ((B3 >>> 11 | A2 << 5) & 8191), I3 = i2[8] + ((A2 >>> 8 | T2 << 8) & 8191), R3 = i2[9] + (T2 >>> 5 | o2), x2 = 0, C2 = x2 + S3 * c2 + L2 * (5 * d3) + U2 * (5 * p2) + _2 * (5 * E2) + j2 * (5 * y4);
    x2 = C2 >>> 13, C2 &= 8191, C2 += g2 * (5 * h3) + w2 * (5 * f3) + b2 * (5 * l2) + I3 * (5 * u2) + R3 * (5 * a2), x2 += C2 >>> 13, C2 &= 8191;
    let P3 = x2 + S3 * a2 + L2 * c2 + U2 * (5 * d3) + _2 * (5 * p2) + j2 * (5 * E2);
    x2 = P3 >>> 13, P3 &= 8191, P3 += g2 * (5 * y4) + w2 * (5 * h3) + b2 * (5 * f3) + I3 * (5 * l2) + R3 * (5 * u2), x2 += P3 >>> 13, P3 &= 8191;
    let k2 = x2 + S3 * u2 + L2 * a2 + U2 * c2 + _2 * (5 * d3) + j2 * (5 * p2);
    x2 = k2 >>> 13, k2 &= 8191, k2 += g2 * (5 * E2) + w2 * (5 * y4) + b2 * (5 * h3) + I3 * (5 * f3) + R3 * (5 * l2), x2 += k2 >>> 13, k2 &= 8191;
    let M3 = x2 + S3 * l2 + L2 * u2 + U2 * a2 + _2 * c2 + j2 * (5 * d3);
    x2 = M3 >>> 13, M3 &= 8191, M3 += g2 * (5 * p2) + w2 * (5 * E2) + b2 * (5 * y4) + I3 * (5 * h3) + R3 * (5 * f3), x2 += M3 >>> 13, M3 &= 8191;
    let D2 = x2 + S3 * f3 + L2 * l2 + U2 * u2 + _2 * a2 + j2 * c2;
    x2 = D2 >>> 13, D2 &= 8191, D2 += g2 * (5 * d3) + w2 * (5 * p2) + b2 * (5 * E2) + I3 * (5 * y4) + R3 * (5 * h3), x2 += D2 >>> 13, D2 &= 8191;
    let z2 = x2 + S3 * h3 + L2 * f3 + U2 * l2 + _2 * u2 + j2 * a2;
    x2 = z2 >>> 13, z2 &= 8191, z2 += g2 * c2 + w2 * (5 * d3) + b2 * (5 * p2) + I3 * (5 * E2) + R3 * (5 * y4), x2 += z2 >>> 13, z2 &= 8191;
    let Z2 = x2 + S3 * y4 + L2 * h3 + U2 * f3 + _2 * l2 + j2 * u2;
    x2 = Z2 >>> 13, Z2 &= 8191, Z2 += g2 * a2 + w2 * c2 + b2 * (5 * d3) + I3 * (5 * p2) + R3 * (5 * E2), x2 += Z2 >>> 13, Z2 &= 8191;
    let st2 = x2 + S3 * E2 + L2 * y4 + U2 * h3 + _2 * f3 + j2 * l2;
    x2 = st2 >>> 13, st2 &= 8191, st2 += g2 * u2 + w2 * a2 + b2 * c2 + I3 * (5 * d3) + R3 * (5 * p2), x2 += st2 >>> 13, st2 &= 8191;
    let W2 = x2 + S3 * p2 + L2 * E2 + U2 * y4 + _2 * h3 + j2 * f3;
    x2 = W2 >>> 13, W2 &= 8191, W2 += g2 * l2 + w2 * u2 + b2 * a2 + I3 * c2 + R3 * (5 * d3), x2 += W2 >>> 13, W2 &= 8191;
    let J3 = x2 + S3 * d3 + L2 * p2 + U2 * E2 + _2 * y4 + j2 * h3;
    x2 = J3 >>> 13, J3 &= 8191, J3 += g2 * f3 + w2 * l2 + b2 * u2 + I3 * a2 + R3 * c2, x2 += J3 >>> 13, J3 &= 8191, x2 = (x2 << 2) + x2 | 0, x2 = x2 + C2 | 0, C2 = x2 & 8191, x2 = x2 >>> 13, P3 += x2, i2[0] = C2, i2[1] = P3, i2[2] = k2, i2[3] = M3, i2[4] = D2, i2[5] = z2, i2[6] = Z2, i2[7] = st2, i2[8] = W2, i2[9] = J3;
  }
  finalize() {
    const { h: e2, pad: n3 } = this, r2 = new Uint16Array(10);
    let o2 = e2[1] >>> 13;
    e2[1] &= 8191;
    for (let c2 = 2; c2 < 10; c2++) e2[c2] += o2, o2 = e2[c2] >>> 13, e2[c2] &= 8191;
    e2[0] += o2 * 5, o2 = e2[0] >>> 13, e2[0] &= 8191, e2[1] += o2, o2 = e2[1] >>> 13, e2[1] &= 8191, e2[2] += o2, r2[0] = e2[0] + 5, o2 = r2[0] >>> 13, r2[0] &= 8191;
    for (let c2 = 1; c2 < 10; c2++) r2[c2] = e2[c2] + o2, o2 = r2[c2] >>> 13, r2[c2] &= 8191;
    r2[9] -= 8192;
    let i2 = (o2 ^ 1) - 1;
    for (let c2 = 0; c2 < 10; c2++) r2[c2] &= i2;
    i2 = ~i2;
    for (let c2 = 0; c2 < 10; c2++) e2[c2] = e2[c2] & i2 | r2[c2];
    e2[0] = (e2[0] | e2[1] << 13) & 65535, e2[1] = (e2[1] >>> 3 | e2[2] << 10) & 65535, e2[2] = (e2[2] >>> 6 | e2[3] << 7) & 65535, e2[3] = (e2[3] >>> 9 | e2[4] << 4) & 65535, e2[4] = (e2[4] >>> 12 | e2[5] << 1 | e2[6] << 14) & 65535, e2[5] = (e2[6] >>> 2 | e2[7] << 11) & 65535, e2[6] = (e2[7] >>> 5 | e2[8] << 8) & 65535, e2[7] = (e2[8] >>> 8 | e2[9] << 5) & 65535;
    let s2 = e2[0] + n3[0];
    e2[0] = s2 & 65535;
    for (let c2 = 1; c2 < 8; c2++) s2 = (e2[c2] + n3[c2] | 0) + (s2 >>> 16) | 0, e2[c2] = s2 & 65535;
    jt$3(r2);
  }
  update(e2) {
    Or$2(this);
    const { buffer: n3, blockLen: r2 } = this;
    e2 = ze$3(e2);
    const o2 = e2.length;
    for (let i2 = 0; i2 < o2; ) {
      const s2 = Math.min(r2 - this.pos, o2 - i2);
      if (s2 === r2) {
        for (; r2 <= o2 - i2; i2 += r2) this.process(e2, i2);
        continue;
      }
      n3.set(e2.subarray(i2, i2 + s2), this.pos), this.pos += s2, i2 += s2, this.pos === r2 && (this.process(n3, 0, false), this.pos = 0);
    }
    return this;
  }
  destroy() {
    jt$3(this.h, this.r, this.buffer, this.pad);
  }
  digestInto(e2) {
    Or$2(this), ps$1(e2, this), this.finished = true;
    const { buffer: n3, h: r2 } = this;
    let { pos: o2 } = this;
    if (o2) {
      for (n3[o2++] = 1; o2 < 16; o2++) n3[o2] = 0;
      this.process(n3, 0, true);
    }
    this.finalize();
    let i2 = 0;
    for (let s2 = 0; s2 < 8; s2++) e2[i2++] = r2[s2] >>> 0, e2[i2++] = r2[s2] >>> 8;
    return e2;
  }
  digest() {
    const { buffer: e2, outputLen: n3 } = this;
    this.digestInto(e2);
    const r2 = e2.slice(0, n3);
    return this.destroy(), r2;
  }
};
function Ts$2(t2) {
  const e2 = (r2, o2) => t2(o2).update(ze$3(r2)).digest(), n3 = t2(new Uint8Array(32));
  return e2.outputLen = n3.outputLen, e2.blockLen = n3.blockLen, e2.create = (r2) => t2(r2), e2;
}
const Rs$1 = Ts$2((t2) => new Us$1(t2));
function _s$1(t2, e2, n3, r2, o2, i2 = 20) {
  let s2 = t2[0], c2 = t2[1], a2 = t2[2], u2 = t2[3], l2 = e2[0], f3 = e2[1], h3 = e2[2], y4 = e2[3], E2 = e2[4], p2 = e2[5], d3 = e2[6], v2 = e2[7], m3 = o2, O3 = n3[0], N2 = n3[1], $2 = n3[2], B3 = s2, A2 = c2, T2 = a2, S3 = u2, L2 = l2, U2 = f3, _2 = h3, j2 = y4, g2 = E2, w2 = p2, b2 = d3, I3 = v2, R3 = m3, x2 = O3, C2 = N2, P3 = $2;
  for (let M3 = 0; M3 < i2; M3 += 2) B3 = B3 + L2 | 0, R3 = V$5(R3 ^ B3, 16), g2 = g2 + R3 | 0, L2 = V$5(L2 ^ g2, 12), B3 = B3 + L2 | 0, R3 = V$5(R3 ^ B3, 8), g2 = g2 + R3 | 0, L2 = V$5(L2 ^ g2, 7), A2 = A2 + U2 | 0, x2 = V$5(x2 ^ A2, 16), w2 = w2 + x2 | 0, U2 = V$5(U2 ^ w2, 12), A2 = A2 + U2 | 0, x2 = V$5(x2 ^ A2, 8), w2 = w2 + x2 | 0, U2 = V$5(U2 ^ w2, 7), T2 = T2 + _2 | 0, C2 = V$5(C2 ^ T2, 16), b2 = b2 + C2 | 0, _2 = V$5(_2 ^ b2, 12), T2 = T2 + _2 | 0, C2 = V$5(C2 ^ T2, 8), b2 = b2 + C2 | 0, _2 = V$5(_2 ^ b2, 7), S3 = S3 + j2 | 0, P3 = V$5(P3 ^ S3, 16), I3 = I3 + P3 | 0, j2 = V$5(j2 ^ I3, 12), S3 = S3 + j2 | 0, P3 = V$5(P3 ^ S3, 8), I3 = I3 + P3 | 0, j2 = V$5(j2 ^ I3, 7), B3 = B3 + U2 | 0, P3 = V$5(P3 ^ B3, 16), b2 = b2 + P3 | 0, U2 = V$5(U2 ^ b2, 12), B3 = B3 + U2 | 0, P3 = V$5(P3 ^ B3, 8), b2 = b2 + P3 | 0, U2 = V$5(U2 ^ b2, 7), A2 = A2 + _2 | 0, R3 = V$5(R3 ^ A2, 16), I3 = I3 + R3 | 0, _2 = V$5(_2 ^ I3, 12), A2 = A2 + _2 | 0, R3 = V$5(R3 ^ A2, 8), I3 = I3 + R3 | 0, _2 = V$5(_2 ^ I3, 7), T2 = T2 + j2 | 0, x2 = V$5(x2 ^ T2, 16), g2 = g2 + x2 | 0, j2 = V$5(j2 ^ g2, 12), T2 = T2 + j2 | 0, x2 = V$5(x2 ^ T2, 8), g2 = g2 + x2 | 0, j2 = V$5(j2 ^ g2, 7), S3 = S3 + L2 | 0, C2 = V$5(C2 ^ S3, 16), w2 = w2 + C2 | 0, L2 = V$5(L2 ^ w2, 12), S3 = S3 + L2 | 0, C2 = V$5(C2 ^ S3, 8), w2 = w2 + C2 | 0, L2 = V$5(L2 ^ w2, 7);
  let k2 = 0;
  r2[k2++] = s2 + B3 | 0, r2[k2++] = c2 + A2 | 0, r2[k2++] = a2 + T2 | 0, r2[k2++] = u2 + S3 | 0, r2[k2++] = l2 + L2 | 0, r2[k2++] = f3 + U2 | 0, r2[k2++] = h3 + _2 | 0, r2[k2++] = y4 + j2 | 0, r2[k2++] = E2 + g2 | 0, r2[k2++] = p2 + w2 | 0, r2[k2++] = d3 + b2 | 0, r2[k2++] = v2 + I3 | 0, r2[k2++] = m3 + R3 | 0, r2[k2++] = O3 + x2 | 0, r2[k2++] = N2 + C2 | 0, r2[k2++] = $2 + P3 | 0;
}
const $s$1 = Ns$2(_s$1, { counterRight: false, counterLength: 4, allowShortKeys: false }), Ls$2 = new Uint8Array(16), Rr$2 = (t2, e2) => {
  t2.update(e2);
  const n3 = e2.length % 16;
  n3 && t2.update(Ls$2.subarray(n3));
}, js$1 = new Uint8Array(32);
function _r$2(t2, e2, n3, r2, o2) {
  const i2 = t2(e2, n3, js$1), s2 = Rs$1.create(i2);
  o2 && Rr$2(s2, o2), Rr$2(s2, r2);
  const c2 = new Uint8Array(16), a2 = gs$1(c2);
  Ir$2(a2, 0, BigInt(o2 ? o2.length : 0), true), Ir$2(a2, 8, BigInt(r2.length), true), s2.update(c2);
  const u2 = s2.digest();
  return jt$3(i2, c2), u2;
}
const Cs$2 = (t2) => (e2, n3, r2) => ({ encrypt(i2, s2) {
  const c2 = i2.length;
  s2 = Br$2(c2 + 16, s2, false), s2.set(i2);
  const a2 = s2.subarray(0, -16);
  t2(e2, n3, a2, a2, 1);
  const u2 = _r$2(t2, e2, n3, a2, r2);
  return s2.set(u2, c2), jt$3(u2), s2;
}, decrypt(i2, s2) {
  s2 = Br$2(i2.length - 16, s2, false);
  const c2 = i2.subarray(0, -16), a2 = i2.subarray(-16), u2 = _r$2(t2, e2, n3, c2, r2);
  if (!bs$2(a2, u2)) throw new Error("invalid tag");
  return s2.set(i2.subarray(0, -16)), t2(e2, n3, s2, s2, 1), jt$3(u2), s2;
} }), $r$1 = Es$1({ blockSize: 64, nonceLength: 12, tagLength: 16 }, Cs$2($s$1));
let Lr$2 = class Lr extends ke$4 {
  constructor(e2, n3) {
    super(), this.finished = false, this.destroyed = false, Ce$2(e2);
    const r2 = $t$2(n3);
    if (this.iHash = e2.create(), typeof this.iHash.update != "function") throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const o2 = this.blockLen, i2 = new Uint8Array(o2);
    i2.set(r2.length > o2 ? e2.create().update(r2).digest() : r2);
    for (let s2 = 0; s2 < i2.length; s2++) i2[s2] ^= 54;
    this.iHash.update(i2), this.oHash = e2.create();
    for (let s2 = 0; s2 < i2.length; s2++) i2[s2] ^= 106;
    this.oHash.update(i2), i2.fill(0);
  }
  update(e2) {
    return Rt$3(this), this.iHash.update(e2), this;
  }
  digestInto(e2) {
    Rt$3(this), Xt$3(e2, this.outputLen), this.finished = true, this.iHash.digestInto(e2), this.oHash.update(e2), this.oHash.digestInto(e2), this.destroy();
  }
  digest() {
    const e2 = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e2), e2;
  }
  _cloneInto(e2) {
    e2 || (e2 = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n3, iHash: r2, finished: o2, destroyed: i2, blockLen: s2, outputLen: c2 } = this;
    return e2 = e2, e2.finished = o2, e2.destroyed = i2, e2.blockLen = s2, e2.outputLen = c2, e2.oHash = n3._cloneInto(e2.oHash), e2.iHash = r2._cloneInto(e2.iHash), e2;
  }
  destroy() {
    this.destroyed = true, this.oHash.destroy(), this.iHash.destroy();
  }
};
const ye$3 = (t2, e2, n3) => new Lr$2(t2, e2).update(n3).digest();
ye$3.create = (t2, e2) => new Lr$2(t2, e2);
function Ps$1(t2, e2, n3) {
  return Ce$2(t2), n3 === void 0 && (n3 = new Uint8Array(t2.outputLen)), ye$3(t2, $t$2(n3), $t$2(e2));
}
const Ge$3 = new Uint8Array([0]), jr$1 = new Uint8Array();
function ks$1(t2, e2, n3, r2 = 32) {
  if (Ce$2(t2), Wt$3(r2), r2 > 255 * t2.outputLen) throw new Error("Length should be <= 255*HashLen");
  const o2 = Math.ceil(r2 / t2.outputLen);
  n3 === void 0 && (n3 = jr$1);
  const i2 = new Uint8Array(o2 * t2.outputLen), s2 = ye$3.create(t2, e2), c2 = s2._cloneInto(), a2 = new Uint8Array(s2.outputLen);
  for (let u2 = 0; u2 < o2; u2++) Ge$3[0] = u2 + 1, c2.update(u2 === 0 ? jr$1 : a2).update(n3).update(Ge$3).digestInto(a2), i2.set(a2, t2.outputLen * u2), s2._cloneInto(c2);
  return s2.destroy(), c2.destroy(), a2.fill(0), Ge$3.fill(0), i2.slice(0, r2);
}
const Vs$1 = (t2, e2, n3, r2, o2) => ks$1(t2, Ps$1(t2, e2, n3), r2, o2);
function Ms$2(t2, e2, n3, r2) {
  if (typeof t2.setBigUint64 == "function") return t2.setBigUint64(e2, n3, r2);
  const o2 = BigInt(32), i2 = BigInt(4294967295), s2 = Number(n3 >> o2 & i2), c2 = Number(n3 & i2), a2 = r2 ? 4 : 0, u2 = r2 ? 0 : 4;
  t2.setUint32(e2 + a2, s2, r2), t2.setUint32(e2 + u2, c2, r2);
}
function Ds$2(t2, e2, n3) {
  return t2 & e2 ^ ~t2 & n3;
}
function Hs$1(t2, e2, n3) {
  return t2 & e2 ^ t2 & n3 ^ e2 & n3;
}
let qs$2 = class qs extends ke$4 {
  constructor(e2, n3, r2, o2) {
    super(), this.blockLen = e2, this.outputLen = n3, this.padOffset = r2, this.isLE = o2, this.finished = false, this.length = 0, this.pos = 0, this.destroyed = false, this.buffer = new Uint8Array(e2), this.view = Pe$2(this.buffer);
  }
  update(e2) {
    Rt$3(this);
    const { view: n3, buffer: r2, blockLen: o2 } = this;
    e2 = $t$2(e2);
    const i2 = e2.length;
    for (let s2 = 0; s2 < i2; ) {
      const c2 = Math.min(o2 - this.pos, i2 - s2);
      if (c2 === o2) {
        const a2 = Pe$2(e2);
        for (; o2 <= i2 - s2; s2 += o2) this.process(a2, s2);
        continue;
      }
      r2.set(e2.subarray(s2, s2 + c2), this.pos), this.pos += c2, s2 += c2, this.pos === o2 && (this.process(n3, 0), this.pos = 0);
    }
    return this.length += e2.length, this.roundClean(), this;
  }
  digestInto(e2) {
    Rt$3(this), Gn$2(e2, this), this.finished = true;
    const { buffer: n3, view: r2, blockLen: o2, isLE: i2 } = this;
    let { pos: s2 } = this;
    n3[s2++] = 128, this.buffer.subarray(s2).fill(0), this.padOffset > o2 - s2 && (this.process(r2, 0), s2 = 0);
    for (let f3 = s2; f3 < o2; f3++) n3[f3] = 0;
    Ms$2(r2, o2 - 8, BigInt(this.length * 8), i2), this.process(r2, 0);
    const c2 = Pe$2(e2), a2 = this.outputLen;
    if (a2 % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u2 = a2 / 4, l2 = this.get();
    if (u2 > l2.length) throw new Error("_sha2: outputLen bigger than state");
    for (let f3 = 0; f3 < u2; f3++) c2.setUint32(4 * f3, l2[f3], i2);
  }
  digest() {
    const { buffer: e2, outputLen: n3 } = this;
    this.digestInto(e2);
    const r2 = e2.slice(0, n3);
    return this.destroy(), r2;
  }
  _cloneInto(e2) {
    e2 || (e2 = new this.constructor()), e2.set(...this.get());
    const { blockLen: n3, buffer: r2, length: o2, finished: i2, destroyed: s2, pos: c2 } = this;
    return e2.length = o2, e2.pos = c2, e2.finished = i2, e2.destroyed = s2, o2 % n3 && e2.buffer.set(r2), e2;
  }
};
const Ks$1 = new Uint32Array([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), wt$3 = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]), bt$2 = new Uint32Array(64);
let Fs$1 = class Fs extends qs$2 {
  constructor() {
    super(64, 32, 8, false), this.A = wt$3[0] | 0, this.B = wt$3[1] | 0, this.C = wt$3[2] | 0, this.D = wt$3[3] | 0, this.E = wt$3[4] | 0, this.F = wt$3[5] | 0, this.G = wt$3[6] | 0, this.H = wt$3[7] | 0;
  }
  get() {
    const { A: e2, B: n3, C: r2, D: o2, E: i2, F: s2, G: c2, H: a2 } = this;
    return [e2, n3, r2, o2, i2, s2, c2, a2];
  }
  set(e2, n3, r2, o2, i2, s2, c2, a2) {
    this.A = e2 | 0, this.B = n3 | 0, this.C = r2 | 0, this.D = o2 | 0, this.E = i2 | 0, this.F = s2 | 0, this.G = c2 | 0, this.H = a2 | 0;
  }
  process(e2, n3) {
    for (let f3 = 0; f3 < 16; f3++, n3 += 4) bt$2[f3] = e2.getUint32(n3, false);
    for (let f3 = 16; f3 < 64; f3++) {
      const h3 = bt$2[f3 - 15], y4 = bt$2[f3 - 2], E2 = ct$2(h3, 7) ^ ct$2(h3, 18) ^ h3 >>> 3, p2 = ct$2(y4, 17) ^ ct$2(y4, 19) ^ y4 >>> 10;
      bt$2[f3] = p2 + bt$2[f3 - 7] + E2 + bt$2[f3 - 16] | 0;
    }
    let { A: r2, B: o2, C: i2, D: s2, E: c2, F: a2, G: u2, H: l2 } = this;
    for (let f3 = 0; f3 < 64; f3++) {
      const h3 = ct$2(c2, 6) ^ ct$2(c2, 11) ^ ct$2(c2, 25), y4 = l2 + h3 + Ds$2(c2, a2, u2) + Ks$1[f3] + bt$2[f3] | 0, p2 = (ct$2(r2, 2) ^ ct$2(r2, 13) ^ ct$2(r2, 22)) + Hs$1(r2, o2, i2) | 0;
      l2 = u2, u2 = a2, a2 = c2, c2 = s2 + y4 | 0, s2 = i2, i2 = o2, o2 = r2, r2 = y4 + p2 | 0;
    }
    r2 = r2 + this.A | 0, o2 = o2 + this.B | 0, i2 = i2 + this.C | 0, s2 = s2 + this.D | 0, c2 = c2 + this.E | 0, a2 = a2 + this.F | 0, u2 = u2 + this.G | 0, l2 = l2 + this.H | 0, this.set(r2, o2, i2, s2, c2, a2, u2, l2);
  }
  roundClean() {
    bt$2.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
};
const Qt$3 = Qn$2(() => new Fs$1());
const me$3 = BigInt(0), we$3 = BigInt(1), zs$1 = BigInt(2);
function St$4(t2) {
  return t2 instanceof Uint8Array || ArrayBuffer.isView(t2) && t2.constructor.name === "Uint8Array";
}
function te$2(t2) {
  if (!St$4(t2)) throw new Error("Uint8Array expected");
}
function Ct$2(t2, e2) {
  if (typeof e2 != "boolean") throw new Error(t2 + " boolean expected, got " + e2);
}
const Zs$2 = Array.from({ length: 256 }, (t2, e2) => e2.toString(16).padStart(2, "0"));
function Pt$3(t2) {
  te$2(t2);
  let e2 = "";
  for (let n3 = 0; n3 < t2.length; n3++) e2 += Zs$2[t2[n3]];
  return e2;
}
function kt$3(t2) {
  const e2 = t2.toString(16);
  return e2.length & 1 ? "0" + e2 : e2;
}
function We$3(t2) {
  if (typeof t2 != "string") throw new Error("hex string expected, got " + typeof t2);
  return t2 === "" ? me$3 : BigInt("0x" + t2);
}
const ut$3 = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Cr$2(t2) {
  if (t2 >= ut$3._0 && t2 <= ut$3._9) return t2 - ut$3._0;
  if (t2 >= ut$3.A && t2 <= ut$3.F) return t2 - (ut$3.A - 10);
  if (t2 >= ut$3.a && t2 <= ut$3.f) return t2 - (ut$3.a - 10);
}
function Vt$3(t2) {
  if (typeof t2 != "string") throw new Error("hex string expected, got " + typeof t2);
  const e2 = t2.length, n3 = e2 / 2;
  if (e2 % 2) throw new Error("hex string expected, got unpadded hex of length " + e2);
  const r2 = new Uint8Array(n3);
  for (let o2 = 0, i2 = 0; o2 < n3; o2++, i2 += 2) {
    const s2 = Cr$2(t2.charCodeAt(i2)), c2 = Cr$2(t2.charCodeAt(i2 + 1));
    if (s2 === void 0 || c2 === void 0) {
      const a2 = t2[i2] + t2[i2 + 1];
      throw new Error('hex string expected, got non-hex character "' + a2 + '" at index ' + i2);
    }
    r2[o2] = s2 * 16 + c2;
  }
  return r2;
}
function Ot$2(t2) {
  return We$3(Pt$3(t2));
}
function ee$2(t2) {
  return te$2(t2), We$3(Pt$3(Uint8Array.from(t2).reverse()));
}
function Mt$3(t2, e2) {
  return Vt$3(t2.toString(16).padStart(e2 * 2, "0"));
}
function be$3(t2, e2) {
  return Mt$3(t2, e2).reverse();
}
function Ys$1(t2) {
  return Vt$3(kt$3(t2));
}
function et$2(t2, e2, n3) {
  let r2;
  if (typeof e2 == "string") try {
    r2 = Vt$3(e2);
  } catch (i2) {
    throw new Error(t2 + " must be hex string or Uint8Array, cause: " + i2);
  }
  else if (St$4(e2)) r2 = Uint8Array.from(e2);
  else throw new Error(t2 + " must be hex string or Uint8Array");
  const o2 = r2.length;
  if (typeof n3 == "number" && o2 !== n3) throw new Error(t2 + " of length " + n3 + " expected, got " + o2);
  return r2;
}
function ne$3(...t2) {
  let e2 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) {
    const o2 = t2[r2];
    te$2(o2), e2 += o2.length;
  }
  const n3 = new Uint8Array(e2);
  for (let r2 = 0, o2 = 0; r2 < t2.length; r2++) {
    const i2 = t2[r2];
    n3.set(i2, o2), o2 += i2.length;
  }
  return n3;
}
function Gs$1(t2, e2) {
  if (t2.length !== e2.length) return false;
  let n3 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) n3 |= t2[r2] ^ e2[r2];
  return n3 === 0;
}
function Ws$1(t2) {
  if (typeof t2 != "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t2));
}
const Xe$3 = (t2) => typeof t2 == "bigint" && me$3 <= t2;
function Ee$4(t2, e2, n3) {
  return Xe$3(t2) && Xe$3(e2) && Xe$3(n3) && e2 <= t2 && t2 < n3;
}
function ft$3(t2, e2, n3, r2) {
  if (!Ee$4(e2, n3, r2)) throw new Error("expected valid " + t2 + ": " + n3 + " <= n < " + r2 + ", got " + e2);
}
function Pr$2(t2) {
  let e2;
  for (e2 = 0; t2 > me$3; t2 >>= we$3, e2 += 1) ;
  return e2;
}
function Xs$1(t2, e2) {
  return t2 >> BigInt(e2) & we$3;
}
function Js$1(t2, e2, n3) {
  return t2 | (n3 ? we$3 : me$3) << BigInt(e2);
}
const Je$3 = (t2) => (zs$1 << BigInt(t2 - 1)) - we$3, Qe$3 = (t2) => new Uint8Array(t2), kr$2 = (t2) => Uint8Array.from(t2);
function Vr$2(t2, e2, n3) {
  if (typeof t2 != "number" || t2 < 2) throw new Error("hashLen must be a number");
  if (typeof e2 != "number" || e2 < 2) throw new Error("qByteLen must be a number");
  if (typeof n3 != "function") throw new Error("hmacFn must be a function");
  let r2 = Qe$3(t2), o2 = Qe$3(t2), i2 = 0;
  const s2 = () => {
    r2.fill(1), o2.fill(0), i2 = 0;
  }, c2 = (...f3) => n3(o2, r2, ...f3), a2 = (f3 = Qe$3()) => {
    o2 = c2(kr$2([0]), f3), r2 = c2(), f3.length !== 0 && (o2 = c2(kr$2([1]), f3), r2 = c2());
  }, u2 = () => {
    if (i2++ >= 1e3) throw new Error("drbg: tried 1000 values");
    let f3 = 0;
    const h3 = [];
    for (; f3 < e2; ) {
      r2 = c2();
      const y4 = r2.slice();
      h3.push(y4), f3 += r2.length;
    }
    return ne$3(...h3);
  };
  return (f3, h3) => {
    s2(), a2(f3);
    let y4;
    for (; !(y4 = h3(u2())); ) a2();
    return s2(), y4;
  };
}
const Qs$1 = { bigint: (t2) => typeof t2 == "bigint", function: (t2) => typeof t2 == "function", boolean: (t2) => typeof t2 == "boolean", string: (t2) => typeof t2 == "string", stringOrUint8Array: (t2) => typeof t2 == "string" || St$4(t2), isSafeInteger: (t2) => Number.isSafeInteger(t2), array: (t2) => Array.isArray(t2), field: (t2, e2) => e2.Fp.isValid(t2), hash: (t2) => typeof t2 == "function" && Number.isSafeInteger(t2.outputLen) };
function Dt$2(t2, e2, n3 = {}) {
  const r2 = (o2, i2, s2) => {
    const c2 = Qs$1[i2];
    if (typeof c2 != "function") throw new Error("invalid validator function");
    const a2 = t2[o2];
    if (!(s2 && a2 === void 0) && !c2(a2, t2)) throw new Error("param " + String(o2) + " is invalid. Expected " + i2 + ", got " + a2);
  };
  for (const [o2, i2] of Object.entries(e2)) r2(o2, i2, false);
  for (const [o2, i2] of Object.entries(n3)) r2(o2, i2, true);
  return t2;
}
const tc$1 = () => {
  throw new Error("not implemented");
};
function tn$2(t2) {
  const e2 = /* @__PURE__ */ new WeakMap();
  return (n3, ...r2) => {
    const o2 = e2.get(n3);
    if (o2 !== void 0) return o2;
    const i2 = t2(n3, ...r2);
    return e2.set(n3, i2), i2;
  };
}
var ec$1 = Object.freeze({ __proto__: null, isBytes: St$4, abytes: te$2, abool: Ct$2, bytesToHex: Pt$3, numberToHexUnpadded: kt$3, hexToNumber: We$3, hexToBytes: Vt$3, bytesToNumberBE: Ot$2, bytesToNumberLE: ee$2, numberToBytesBE: Mt$3, numberToBytesLE: be$3, numberToVarBytesBE: Ys$1, ensureBytes: et$2, concatBytes: ne$3, equalBytes: Gs$1, utf8ToBytes: Ws$1, inRange: Ee$4, aInRange: ft$3, bitLen: Pr$2, bitGet: Xs$1, bitSet: Js$1, bitMask: Je$3, createHmacDrbg: Vr$2, validateObject: Dt$2, notImplemented: tc$1, memoized: tn$2 });
const q$2 = BigInt(0), H$3 = BigInt(1), At$2 = BigInt(2), nc$1 = BigInt(3), en$1 = BigInt(4), Mr$2 = BigInt(5), Dr$2 = BigInt(8);
function X$2(t2, e2) {
  const n3 = t2 % e2;
  return n3 >= q$2 ? n3 : e2 + n3;
}
function Hr$2(t2, e2, n3) {
  if (e2 < q$2) throw new Error("invalid exponent, negatives unsupported");
  if (n3 <= q$2) throw new Error("invalid modulus");
  if (n3 === H$3) return q$2;
  let r2 = H$3;
  for (; e2 > q$2; ) e2 & H$3 && (r2 = r2 * t2 % n3), t2 = t2 * t2 % n3, e2 >>= H$3;
  return r2;
}
function it$2(t2, e2, n3) {
  let r2 = t2;
  for (; e2-- > q$2; ) r2 *= r2, r2 %= n3;
  return r2;
}
function nn$2(t2, e2) {
  if (t2 === q$2) throw new Error("invert: expected non-zero number");
  if (e2 <= q$2) throw new Error("invert: expected positive modulus, got " + e2);
  let n3 = X$2(t2, e2), r2 = e2, o2 = q$2, i2 = H$3;
  for (; n3 !== q$2; ) {
    const c2 = r2 / n3, a2 = r2 % n3, u2 = o2 - i2 * c2;
    r2 = n3, n3 = a2, o2 = i2, i2 = u2;
  }
  if (r2 !== H$3) throw new Error("invert: does not exist");
  return X$2(o2, e2);
}
function rc$1(t2) {
  const e2 = (t2 - H$3) / At$2;
  let n3, r2, o2;
  for (n3 = t2 - H$3, r2 = 0; n3 % At$2 === q$2; n3 /= At$2, r2++) ;
  for (o2 = At$2; o2 < t2 && Hr$2(o2, e2, t2) !== t2 - H$3; o2++) if (o2 > 1e3) throw new Error("Cannot find square root: likely non-prime P");
  if (r2 === 1) {
    const s2 = (t2 + H$3) / en$1;
    return function(a2, u2) {
      const l2 = a2.pow(u2, s2);
      if (!a2.eql(a2.sqr(l2), u2)) throw new Error("Cannot find square root");
      return l2;
    };
  }
  const i2 = (n3 + H$3) / At$2;
  return function(c2, a2) {
    if (c2.pow(a2, e2) === c2.neg(c2.ONE)) throw new Error("Cannot find square root");
    let u2 = r2, l2 = c2.pow(c2.mul(c2.ONE, o2), n3), f3 = c2.pow(a2, i2), h3 = c2.pow(a2, n3);
    for (; !c2.eql(h3, c2.ONE); ) {
      if (c2.eql(h3, c2.ZERO)) return c2.ZERO;
      let y4 = 1;
      for (let p2 = c2.sqr(h3); y4 < u2 && !c2.eql(p2, c2.ONE); y4++) p2 = c2.sqr(p2);
      const E2 = c2.pow(l2, H$3 << BigInt(u2 - y4 - 1));
      l2 = c2.sqr(E2), f3 = c2.mul(f3, E2), h3 = c2.mul(h3, l2), u2 = y4;
    }
    return f3;
  };
}
function oc$1(t2) {
  if (t2 % en$1 === nc$1) {
    const e2 = (t2 + H$3) / en$1;
    return function(r2, o2) {
      const i2 = r2.pow(o2, e2);
      if (!r2.eql(r2.sqr(i2), o2)) throw new Error("Cannot find square root");
      return i2;
    };
  }
  if (t2 % Dr$2 === Mr$2) {
    const e2 = (t2 - Mr$2) / Dr$2;
    return function(r2, o2) {
      const i2 = r2.mul(o2, At$2), s2 = r2.pow(i2, e2), c2 = r2.mul(o2, s2), a2 = r2.mul(r2.mul(c2, At$2), s2), u2 = r2.mul(c2, r2.sub(a2, r2.ONE));
      if (!r2.eql(r2.sqr(u2), o2)) throw new Error("Cannot find square root");
      return u2;
    };
  }
  return rc$1(t2);
}
const ic$1 = ["create", "isValid", "is0", "neg", "inv", "sqrt", "sqr", "eql", "add", "sub", "mul", "pow", "div", "addN", "subN", "mulN", "sqrN"];
function sc$1(t2) {
  const e2 = { ORDER: "bigint", MASK: "bigint", BYTES: "isSafeInteger", BITS: "isSafeInteger" }, n3 = ic$1.reduce((r2, o2) => (r2[o2] = "function", r2), e2);
  return Dt$2(t2, n3);
}
function cc$1(t2, e2, n3) {
  if (n3 < q$2) throw new Error("invalid exponent, negatives unsupported");
  if (n3 === q$2) return t2.ONE;
  if (n3 === H$3) return e2;
  let r2 = t2.ONE, o2 = e2;
  for (; n3 > q$2; ) n3 & H$3 && (r2 = t2.mul(r2, o2)), o2 = t2.sqr(o2), n3 >>= H$3;
  return r2;
}
function ac$1(t2, e2) {
  const n3 = new Array(e2.length), r2 = e2.reduce((i2, s2, c2) => t2.is0(s2) ? i2 : (n3[c2] = i2, t2.mul(i2, s2)), t2.ONE), o2 = t2.inv(r2);
  return e2.reduceRight((i2, s2, c2) => t2.is0(s2) ? i2 : (n3[c2] = t2.mul(i2, n3[c2]), t2.mul(i2, s2)), o2), n3;
}
function qr$2(t2, e2) {
  const n3 = e2 !== void 0 ? e2 : t2.toString(2).length, r2 = Math.ceil(n3 / 8);
  return { nBitLength: n3, nByteLength: r2 };
}
function Kr$2(t2, e2, n3 = false, r2 = {}) {
  if (t2 <= q$2) throw new Error("invalid field: expected ORDER > 0, got " + t2);
  const { nBitLength: o2, nByteLength: i2 } = qr$2(t2, e2);
  if (i2 > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s2;
  const c2 = Object.freeze({ ORDER: t2, isLE: n3, BITS: o2, BYTES: i2, MASK: Je$3(o2), ZERO: q$2, ONE: H$3, create: (a2) => X$2(a2, t2), isValid: (a2) => {
    if (typeof a2 != "bigint") throw new Error("invalid field element: expected bigint, got " + typeof a2);
    return q$2 <= a2 && a2 < t2;
  }, is0: (a2) => a2 === q$2, isOdd: (a2) => (a2 & H$3) === H$3, neg: (a2) => X$2(-a2, t2), eql: (a2, u2) => a2 === u2, sqr: (a2) => X$2(a2 * a2, t2), add: (a2, u2) => X$2(a2 + u2, t2), sub: (a2, u2) => X$2(a2 - u2, t2), mul: (a2, u2) => X$2(a2 * u2, t2), pow: (a2, u2) => cc$1(c2, a2, u2), div: (a2, u2) => X$2(a2 * nn$2(u2, t2), t2), sqrN: (a2) => a2 * a2, addN: (a2, u2) => a2 + u2, subN: (a2, u2) => a2 - u2, mulN: (a2, u2) => a2 * u2, inv: (a2) => nn$2(a2, t2), sqrt: r2.sqrt || ((a2) => (s2 || (s2 = oc$1(t2)), s2(c2, a2))), invertBatch: (a2) => ac$1(c2, a2), cmov: (a2, u2, l2) => l2 ? u2 : a2, toBytes: (a2) => n3 ? be$3(a2, i2) : Mt$3(a2, i2), fromBytes: (a2) => {
    if (a2.length !== i2) throw new Error("Field.fromBytes: expected " + i2 + " bytes, got " + a2.length);
    return n3 ? ee$2(a2) : Ot$2(a2);
  } });
  return Object.freeze(c2);
}
function Fr$2(t2) {
  if (typeof t2 != "bigint") throw new Error("field order must be bigint");
  const e2 = t2.toString(2).length;
  return Math.ceil(e2 / 8);
}
function zr$2(t2) {
  const e2 = Fr$2(t2);
  return e2 + Math.ceil(e2 / 2);
}
function uc$1(t2, e2, n3 = false) {
  const r2 = t2.length, o2 = Fr$2(e2), i2 = zr$2(e2);
  if (r2 < 16 || r2 < i2 || r2 > 1024) throw new Error("expected " + i2 + "-1024 bytes of input, got " + r2);
  const s2 = n3 ? ee$2(t2) : Ot$2(t2), c2 = X$2(s2, e2 - H$3) + H$3;
  return n3 ? be$3(c2, o2) : Mt$3(c2, o2);
}
const Zr$2 = BigInt(0), ve$2 = BigInt(1);
function rn$2(t2, e2) {
  const n3 = e2.negate();
  return t2 ? n3 : e2;
}
function Yr$2(t2, e2) {
  if (!Number.isSafeInteger(t2) || t2 <= 0 || t2 > e2) throw new Error("invalid window size, expected [1.." + e2 + "], got W=" + t2);
}
function on$2(t2, e2) {
  Yr$2(t2, e2);
  const n3 = Math.ceil(e2 / t2) + 1, r2 = 2 ** (t2 - 1);
  return { windows: n3, windowSize: r2 };
}
function fc$1(t2, e2) {
  if (!Array.isArray(t2)) throw new Error("array expected");
  t2.forEach((n3, r2) => {
    if (!(n3 instanceof e2)) throw new Error("invalid point at index " + r2);
  });
}
function lc$1(t2, e2) {
  if (!Array.isArray(t2)) throw new Error("array of scalars expected");
  t2.forEach((n3, r2) => {
    if (!e2.isValid(n3)) throw new Error("invalid scalar at index " + r2);
  });
}
const sn$2 = /* @__PURE__ */ new WeakMap(), Gr$2 = /* @__PURE__ */ new WeakMap();
function cn$2(t2) {
  return Gr$2.get(t2) || 1;
}
function dc$1(t2, e2) {
  return { constTimeNegate: rn$2, hasPrecomputes(n3) {
    return cn$2(n3) !== 1;
  }, unsafeLadder(n3, r2, o2 = t2.ZERO) {
    let i2 = n3;
    for (; r2 > Zr$2; ) r2 & ve$2 && (o2 = o2.add(i2)), i2 = i2.double(), r2 >>= ve$2;
    return o2;
  }, precomputeWindow(n3, r2) {
    const { windows: o2, windowSize: i2 } = on$2(r2, e2), s2 = [];
    let c2 = n3, a2 = c2;
    for (let u2 = 0; u2 < o2; u2++) {
      a2 = c2, s2.push(a2);
      for (let l2 = 1; l2 < i2; l2++) a2 = a2.add(c2), s2.push(a2);
      c2 = a2.double();
    }
    return s2;
  }, wNAF(n3, r2, o2) {
    const { windows: i2, windowSize: s2 } = on$2(n3, e2);
    let c2 = t2.ZERO, a2 = t2.BASE;
    const u2 = BigInt(2 ** n3 - 1), l2 = 2 ** n3, f3 = BigInt(n3);
    for (let h3 = 0; h3 < i2; h3++) {
      const y4 = h3 * s2;
      let E2 = Number(o2 & u2);
      o2 >>= f3, E2 > s2 && (E2 -= l2, o2 += ve$2);
      const p2 = y4, d3 = y4 + Math.abs(E2) - 1, v2 = h3 % 2 !== 0, m3 = E2 < 0;
      E2 === 0 ? a2 = a2.add(rn$2(v2, r2[p2])) : c2 = c2.add(rn$2(m3, r2[d3]));
    }
    return { p: c2, f: a2 };
  }, wNAFUnsafe(n3, r2, o2, i2 = t2.ZERO) {
    const { windows: s2, windowSize: c2 } = on$2(n3, e2), a2 = BigInt(2 ** n3 - 1), u2 = 2 ** n3, l2 = BigInt(n3);
    for (let f3 = 0; f3 < s2; f3++) {
      const h3 = f3 * c2;
      if (o2 === Zr$2) break;
      let y4 = Number(o2 & a2);
      if (o2 >>= l2, y4 > c2 && (y4 -= u2, o2 += ve$2), y4 === 0) continue;
      let E2 = r2[h3 + Math.abs(y4) - 1];
      y4 < 0 && (E2 = E2.negate()), i2 = i2.add(E2);
    }
    return i2;
  }, getPrecomputes(n3, r2, o2) {
    let i2 = sn$2.get(r2);
    return i2 || (i2 = this.precomputeWindow(r2, n3), n3 !== 1 && sn$2.set(r2, o2(i2))), i2;
  }, wNAFCached(n3, r2, o2) {
    const i2 = cn$2(n3);
    return this.wNAF(i2, this.getPrecomputes(i2, n3, o2), r2);
  }, wNAFCachedUnsafe(n3, r2, o2, i2) {
    const s2 = cn$2(n3);
    return s2 === 1 ? this.unsafeLadder(n3, r2, i2) : this.wNAFUnsafe(s2, this.getPrecomputes(s2, n3, o2), r2, i2);
  }, setWindowSize(n3, r2) {
    Yr$2(r2, e2), Gr$2.set(n3, r2), sn$2.delete(n3);
  } };
}
function hc$1(t2, e2, n3, r2) {
  if (fc$1(n3, t2), lc$1(r2, e2), n3.length !== r2.length) throw new Error("arrays of points and scalars must have equal length");
  const o2 = t2.ZERO, i2 = Pr$2(BigInt(n3.length)), s2 = i2 > 12 ? i2 - 3 : i2 > 4 ? i2 - 2 : i2 ? 2 : 1, c2 = (1 << s2) - 1, a2 = new Array(c2 + 1).fill(o2), u2 = Math.floor((e2.BITS - 1) / s2) * s2;
  let l2 = o2;
  for (let f3 = u2; f3 >= 0; f3 -= s2) {
    a2.fill(o2);
    for (let y4 = 0; y4 < r2.length; y4++) {
      const E2 = r2[y4], p2 = Number(E2 >> BigInt(f3) & BigInt(c2));
      a2[p2] = a2[p2].add(n3[y4]);
    }
    let h3 = o2;
    for (let y4 = a2.length - 1, E2 = o2; y4 > 0; y4--) E2 = E2.add(a2[y4]), h3 = h3.add(E2);
    if (l2 = l2.add(h3), f3 !== 0) for (let y4 = 0; y4 < s2; y4++) l2 = l2.double();
  }
  return l2;
}
function Wr$2(t2) {
  return sc$1(t2.Fp), Dt$2(t2, { n: "bigint", h: "bigint", Gx: "field", Gy: "field" }, { nBitLength: "isSafeInteger", nByteLength: "isSafeInteger" }), Object.freeze({ ...qr$2(t2.n, t2.nBitLength), ...t2, p: t2.Fp.ORDER });
}
BigInt(0), BigInt(1), BigInt(2), BigInt(8);
const Ht$2 = BigInt(0), an$2 = BigInt(1);
function pc$1(t2) {
  return Dt$2(t2, { a: "bigint" }, { montgomeryBits: "isSafeInteger", nByteLength: "isSafeInteger", adjustScalarBytes: "function", domain: "function", powPminus2: "function", Gu: "bigint" }), Object.freeze({ ...t2 });
}
function gc$1(t2) {
  const e2 = pc$1(t2), { P: n3 } = e2, r2 = (m3) => X$2(m3, n3), o2 = e2.montgomeryBits, i2 = Math.ceil(o2 / 8), s2 = e2.nByteLength, c2 = e2.adjustScalarBytes || ((m3) => m3), a2 = e2.powPminus2 || ((m3) => Hr$2(m3, n3 - BigInt(2), n3));
  function u2(m3, O3, N2) {
    const $2 = r2(m3 * (O3 - N2));
    return O3 = r2(O3 - $2), N2 = r2(N2 + $2), [O3, N2];
  }
  const l2 = (e2.a - BigInt(2)) / BigInt(4);
  function f3(m3, O3) {
    ft$3("u", m3, Ht$2, n3), ft$3("scalar", O3, Ht$2, n3);
    const N2 = O3, $2 = m3;
    let B3 = an$2, A2 = Ht$2, T2 = m3, S3 = an$2, L2 = Ht$2, U2;
    for (let j2 = BigInt(o2 - 1); j2 >= Ht$2; j2--) {
      const g2 = N2 >> j2 & an$2;
      L2 ^= g2, U2 = u2(L2, B3, T2), B3 = U2[0], T2 = U2[1], U2 = u2(L2, A2, S3), A2 = U2[0], S3 = U2[1], L2 = g2;
      const w2 = B3 + A2, b2 = r2(w2 * w2), I3 = B3 - A2, R3 = r2(I3 * I3), x2 = b2 - R3, C2 = T2 + S3, P3 = T2 - S3, k2 = r2(P3 * w2), M3 = r2(C2 * I3), D2 = k2 + M3, z2 = k2 - M3;
      T2 = r2(D2 * D2), S3 = r2($2 * r2(z2 * z2)), B3 = r2(b2 * R3), A2 = r2(x2 * (b2 + r2(l2 * x2)));
    }
    U2 = u2(L2, B3, T2), B3 = U2[0], T2 = U2[1], U2 = u2(L2, A2, S3), A2 = U2[0], S3 = U2[1];
    const _2 = a2(A2);
    return r2(B3 * _2);
  }
  function h3(m3) {
    return be$3(r2(m3), i2);
  }
  function y4(m3) {
    const O3 = et$2("u coordinate", m3, i2);
    return s2 === 32 && (O3[31] &= 127), ee$2(O3);
  }
  function E2(m3) {
    const O3 = et$2("scalar", m3), N2 = O3.length;
    if (N2 !== i2 && N2 !== s2) {
      let $2 = "" + i2 + " or " + s2;
      throw new Error("invalid scalar, expected " + $2 + " bytes, got " + N2);
    }
    return ee$2(c2(O3));
  }
  function p2(m3, O3) {
    const N2 = y4(O3), $2 = E2(m3), B3 = f3(N2, $2);
    if (B3 === Ht$2) throw new Error("invalid private or public key received");
    return h3(B3);
  }
  const d3 = h3(e2.Gu);
  function v2(m3) {
    return p2(m3, d3);
  }
  return { scalarMult: p2, scalarMultBase: v2, getSharedSecret: (m3, O3) => p2(m3, O3), getPublicKey: (m3) => v2(m3), utils: { randomPrivateKey: () => e2.randomBytes(e2.nByteLength) }, GuBytes: d3 };
}
const un$2 = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819949");
BigInt(0);
const yc$1 = BigInt(1), Xr$2 = BigInt(2), mc$1 = BigInt(3), wc$1 = BigInt(5);
BigInt(8);
function bc$1(t2) {
  const e2 = BigInt(10), n3 = BigInt(20), r2 = BigInt(40), o2 = BigInt(80), i2 = un$2, c2 = t2 * t2 % i2 * t2 % i2, a2 = it$2(c2, Xr$2, i2) * c2 % i2, u2 = it$2(a2, yc$1, i2) * t2 % i2, l2 = it$2(u2, wc$1, i2) * u2 % i2, f3 = it$2(l2, e2, i2) * l2 % i2, h3 = it$2(f3, n3, i2) * f3 % i2, y4 = it$2(h3, r2, i2) * h3 % i2, E2 = it$2(y4, o2, i2) * y4 % i2, p2 = it$2(E2, o2, i2) * y4 % i2, d3 = it$2(p2, e2, i2) * l2 % i2;
  return { pow_p_5_8: it$2(d3, Xr$2, i2) * t2 % i2, b2: c2 };
}
function Ec$1(t2) {
  return t2[0] &= 248, t2[31] &= 127, t2[31] |= 64, t2;
}
const fn$1 = gc$1({ P: un$2, a: BigInt(486662), montgomeryBits: 255, nByteLength: 32, Gu: BigInt(9), powPminus2: (t2) => {
  const e2 = un$2, { pow_p_5_8: n3, b2: r2 } = bc$1(t2);
  return X$2(it$2(n3, mc$1, e2) * r2, e2);
}, adjustScalarBytes: Ec$1, randomBytes: Lt$3 });
function Jr$2(t2) {
  t2.lowS !== void 0 && Ct$2("lowS", t2.lowS), t2.prehash !== void 0 && Ct$2("prehash", t2.prehash);
}
function vc$1(t2) {
  const e2 = Wr$2(t2);
  Dt$2(e2, { a: "field", b: "field" }, { allowedPrivateKeyLengths: "array", wrapPrivateKey: "boolean", isTorsionFree: "function", clearCofactor: "function", allowInfinityPoint: "boolean", fromBytes: "function", toBytes: "function" });
  const { endo: n3, Fp: r2, a: o2 } = e2;
  if (n3) {
    if (!r2.eql(o2, r2.ZERO)) throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    if (typeof n3 != "object" || typeof n3.beta != "bigint" || typeof n3.splitScalar != "function") throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
  }
  return Object.freeze({ ...e2 });
}
const { bytesToNumberBE: xc$1, hexToBytes: Sc$1 } = ec$1;
let Oc$1 = class Oc extends Error {
  constructor(e2 = "") {
    super(e2);
  }
};
const lt$2 = { Err: Oc$1, _tlv: { encode: (t2, e2) => {
  const { Err: n3 } = lt$2;
  if (t2 < 0 || t2 > 256) throw new n3("tlv.encode: wrong tag");
  if (e2.length & 1) throw new n3("tlv.encode: unpadded data");
  const r2 = e2.length / 2, o2 = kt$3(r2);
  if (o2.length / 2 & 128) throw new n3("tlv.encode: long form length too big");
  const i2 = r2 > 127 ? kt$3(o2.length / 2 | 128) : "";
  return kt$3(t2) + i2 + o2 + e2;
}, decode(t2, e2) {
  const { Err: n3 } = lt$2;
  let r2 = 0;
  if (t2 < 0 || t2 > 256) throw new n3("tlv.encode: wrong tag");
  if (e2.length < 2 || e2[r2++] !== t2) throw new n3("tlv.decode: wrong tlv");
  const o2 = e2[r2++], i2 = !!(o2 & 128);
  let s2 = 0;
  if (!i2) s2 = o2;
  else {
    const a2 = o2 & 127;
    if (!a2) throw new n3("tlv.decode(long): indefinite length not supported");
    if (a2 > 4) throw new n3("tlv.decode(long): byte length is too big");
    const u2 = e2.subarray(r2, r2 + a2);
    if (u2.length !== a2) throw new n3("tlv.decode: length bytes not complete");
    if (u2[0] === 0) throw new n3("tlv.decode(long): zero leftmost byte");
    for (const l2 of u2) s2 = s2 << 8 | l2;
    if (r2 += a2, s2 < 128) throw new n3("tlv.decode(long): not minimal encoding");
  }
  const c2 = e2.subarray(r2, r2 + s2);
  if (c2.length !== s2) throw new n3("tlv.decode: wrong value length");
  return { v: c2, l: e2.subarray(r2 + s2) };
} }, _int: { encode(t2) {
  const { Err: e2 } = lt$2;
  if (t2 < dt$3) throw new e2("integer: negative integers are not allowed");
  let n3 = kt$3(t2);
  if (Number.parseInt(n3[0], 16) & 8 && (n3 = "00" + n3), n3.length & 1) throw new e2("unexpected DER parsing assertion: unpadded hex");
  return n3;
}, decode(t2) {
  const { Err: e2 } = lt$2;
  if (t2[0] & 128) throw new e2("invalid signature integer: negative");
  if (t2[0] === 0 && !(t2[1] & 128)) throw new e2("invalid signature integer: unnecessary leading zero");
  return xc$1(t2);
} }, toSig(t2) {
  const { Err: e2, _int: n3, _tlv: r2 } = lt$2, o2 = typeof t2 == "string" ? Sc$1(t2) : t2;
  te$2(o2);
  const { v: i2, l: s2 } = r2.decode(48, o2);
  if (s2.length) throw new e2("invalid signature: left bytes after parsing");
  const { v: c2, l: a2 } = r2.decode(2, i2), { v: u2, l: l2 } = r2.decode(2, a2);
  if (l2.length) throw new e2("invalid signature: left bytes after parsing");
  return { r: n3.decode(c2), s: n3.decode(u2) };
}, hexFromSig(t2) {
  const { _tlv: e2, _int: n3 } = lt$2, r2 = e2.encode(2, n3.encode(t2.r)), o2 = e2.encode(2, n3.encode(t2.s)), i2 = r2 + o2;
  return e2.encode(48, i2);
} }, dt$3 = BigInt(0), K$2 = BigInt(1);
BigInt(2);
const Qr$2 = BigInt(3);
BigInt(4);
function Ac$1(t2) {
  const e2 = vc$1(t2), { Fp: n3 } = e2, r2 = Kr$2(e2.n, e2.nBitLength), o2 = e2.toBytes || ((p2, d3, v2) => {
    const m3 = d3.toAffine();
    return ne$3(Uint8Array.from([4]), n3.toBytes(m3.x), n3.toBytes(m3.y));
  }), i2 = e2.fromBytes || ((p2) => {
    const d3 = p2.subarray(1), v2 = n3.fromBytes(d3.subarray(0, n3.BYTES)), m3 = n3.fromBytes(d3.subarray(n3.BYTES, 2 * n3.BYTES));
    return { x: v2, y: m3 };
  });
  function s2(p2) {
    const { a: d3, b: v2 } = e2, m3 = n3.sqr(p2), O3 = n3.mul(m3, p2);
    return n3.add(n3.add(O3, n3.mul(p2, d3)), v2);
  }
  if (!n3.eql(n3.sqr(e2.Gy), s2(e2.Gx))) throw new Error("bad generator point: equation left != right");
  function c2(p2) {
    return Ee$4(p2, K$2, e2.n);
  }
  function a2(p2) {
    const { allowedPrivateKeyLengths: d3, nByteLength: v2, wrapPrivateKey: m3, n: O3 } = e2;
    if (d3 && typeof p2 != "bigint") {
      if (St$4(p2) && (p2 = Pt$3(p2)), typeof p2 != "string" || !d3.includes(p2.length)) throw new Error("invalid private key");
      p2 = p2.padStart(v2 * 2, "0");
    }
    let N2;
    try {
      N2 = typeof p2 == "bigint" ? p2 : Ot$2(et$2("private key", p2, v2));
    } catch {
      throw new Error("invalid private key, expected hex or " + v2 + " bytes, got " + typeof p2);
    }
    return m3 && (N2 = X$2(N2, O3)), ft$3("private key", N2, K$2, O3), N2;
  }
  function u2(p2) {
    if (!(p2 instanceof h3)) throw new Error("ProjectivePoint expected");
  }
  const l2 = tn$2((p2, d3) => {
    const { px: v2, py: m3, pz: O3 } = p2;
    if (n3.eql(O3, n3.ONE)) return { x: v2, y: m3 };
    const N2 = p2.is0();
    d3 == null && (d3 = N2 ? n3.ONE : n3.inv(O3));
    const $2 = n3.mul(v2, d3), B3 = n3.mul(m3, d3), A2 = n3.mul(O3, d3);
    if (N2) return { x: n3.ZERO, y: n3.ZERO };
    if (!n3.eql(A2, n3.ONE)) throw new Error("invZ was invalid");
    return { x: $2, y: B3 };
  }), f3 = tn$2((p2) => {
    if (p2.is0()) {
      if (e2.allowInfinityPoint && !n3.is0(p2.py)) return;
      throw new Error("bad point: ZERO");
    }
    const { x: d3, y: v2 } = p2.toAffine();
    if (!n3.isValid(d3) || !n3.isValid(v2)) throw new Error("bad point: x or y not FE");
    const m3 = n3.sqr(v2), O3 = s2(d3);
    if (!n3.eql(m3, O3)) throw new Error("bad point: equation left != right");
    if (!p2.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  class h3 {
    constructor(d3, v2, m3) {
      if (this.px = d3, this.py = v2, this.pz = m3, d3 == null || !n3.isValid(d3)) throw new Error("x required");
      if (v2 == null || !n3.isValid(v2)) throw new Error("y required");
      if (m3 == null || !n3.isValid(m3)) throw new Error("z required");
      Object.freeze(this);
    }
    static fromAffine(d3) {
      const { x: v2, y: m3 } = d3 || {};
      if (!d3 || !n3.isValid(v2) || !n3.isValid(m3)) throw new Error("invalid affine point");
      if (d3 instanceof h3) throw new Error("projective point not allowed");
      const O3 = (N2) => n3.eql(N2, n3.ZERO);
      return O3(v2) && O3(m3) ? h3.ZERO : new h3(v2, m3, n3.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    static normalizeZ(d3) {
      const v2 = n3.invertBatch(d3.map((m3) => m3.pz));
      return d3.map((m3, O3) => m3.toAffine(v2[O3])).map(h3.fromAffine);
    }
    static fromHex(d3) {
      const v2 = h3.fromAffine(i2(et$2("pointHex", d3)));
      return v2.assertValidity(), v2;
    }
    static fromPrivateKey(d3) {
      return h3.BASE.multiply(a2(d3));
    }
    static msm(d3, v2) {
      return hc$1(h3, r2, d3, v2);
    }
    _setWindowSize(d3) {
      E2.setWindowSize(this, d3);
    }
    assertValidity() {
      f3(this);
    }
    hasEvenY() {
      const { y: d3 } = this.toAffine();
      if (n3.isOdd) return !n3.isOdd(d3);
      throw new Error("Field doesn't support isOdd");
    }
    equals(d3) {
      u2(d3);
      const { px: v2, py: m3, pz: O3 } = this, { px: N2, py: $2, pz: B3 } = d3, A2 = n3.eql(n3.mul(v2, B3), n3.mul(N2, O3)), T2 = n3.eql(n3.mul(m3, B3), n3.mul($2, O3));
      return A2 && T2;
    }
    negate() {
      return new h3(this.px, n3.neg(this.py), this.pz);
    }
    double() {
      const { a: d3, b: v2 } = e2, m3 = n3.mul(v2, Qr$2), { px: O3, py: N2, pz: $2 } = this;
      let B3 = n3.ZERO, A2 = n3.ZERO, T2 = n3.ZERO, S3 = n3.mul(O3, O3), L2 = n3.mul(N2, N2), U2 = n3.mul($2, $2), _2 = n3.mul(O3, N2);
      return _2 = n3.add(_2, _2), T2 = n3.mul(O3, $2), T2 = n3.add(T2, T2), B3 = n3.mul(d3, T2), A2 = n3.mul(m3, U2), A2 = n3.add(B3, A2), B3 = n3.sub(L2, A2), A2 = n3.add(L2, A2), A2 = n3.mul(B3, A2), B3 = n3.mul(_2, B3), T2 = n3.mul(m3, T2), U2 = n3.mul(d3, U2), _2 = n3.sub(S3, U2), _2 = n3.mul(d3, _2), _2 = n3.add(_2, T2), T2 = n3.add(S3, S3), S3 = n3.add(T2, S3), S3 = n3.add(S3, U2), S3 = n3.mul(S3, _2), A2 = n3.add(A2, S3), U2 = n3.mul(N2, $2), U2 = n3.add(U2, U2), S3 = n3.mul(U2, _2), B3 = n3.sub(B3, S3), T2 = n3.mul(U2, L2), T2 = n3.add(T2, T2), T2 = n3.add(T2, T2), new h3(B3, A2, T2);
    }
    add(d3) {
      u2(d3);
      const { px: v2, py: m3, pz: O3 } = this, { px: N2, py: $2, pz: B3 } = d3;
      let A2 = n3.ZERO, T2 = n3.ZERO, S3 = n3.ZERO;
      const L2 = e2.a, U2 = n3.mul(e2.b, Qr$2);
      let _2 = n3.mul(v2, N2), j2 = n3.mul(m3, $2), g2 = n3.mul(O3, B3), w2 = n3.add(v2, m3), b2 = n3.add(N2, $2);
      w2 = n3.mul(w2, b2), b2 = n3.add(_2, j2), w2 = n3.sub(w2, b2), b2 = n3.add(v2, O3);
      let I3 = n3.add(N2, B3);
      return b2 = n3.mul(b2, I3), I3 = n3.add(_2, g2), b2 = n3.sub(b2, I3), I3 = n3.add(m3, O3), A2 = n3.add($2, B3), I3 = n3.mul(I3, A2), A2 = n3.add(j2, g2), I3 = n3.sub(I3, A2), S3 = n3.mul(L2, b2), A2 = n3.mul(U2, g2), S3 = n3.add(A2, S3), A2 = n3.sub(j2, S3), S3 = n3.add(j2, S3), T2 = n3.mul(A2, S3), j2 = n3.add(_2, _2), j2 = n3.add(j2, _2), g2 = n3.mul(L2, g2), b2 = n3.mul(U2, b2), j2 = n3.add(j2, g2), g2 = n3.sub(_2, g2), g2 = n3.mul(L2, g2), b2 = n3.add(b2, g2), _2 = n3.mul(j2, b2), T2 = n3.add(T2, _2), _2 = n3.mul(I3, b2), A2 = n3.mul(w2, A2), A2 = n3.sub(A2, _2), _2 = n3.mul(w2, j2), S3 = n3.mul(I3, S3), S3 = n3.add(S3, _2), new h3(A2, T2, S3);
    }
    subtract(d3) {
      return this.add(d3.negate());
    }
    is0() {
      return this.equals(h3.ZERO);
    }
    wNAF(d3) {
      return E2.wNAFCached(this, d3, h3.normalizeZ);
    }
    multiplyUnsafe(d3) {
      const { endo: v2, n: m3 } = e2;
      ft$3("scalar", d3, dt$3, m3);
      const O3 = h3.ZERO;
      if (d3 === dt$3) return O3;
      if (this.is0() || d3 === K$2) return this;
      if (!v2 || E2.hasPrecomputes(this)) return E2.wNAFCachedUnsafe(this, d3, h3.normalizeZ);
      let { k1neg: N2, k1: $2, k2neg: B3, k2: A2 } = v2.splitScalar(d3), T2 = O3, S3 = O3, L2 = this;
      for (; $2 > dt$3 || A2 > dt$3; ) $2 & K$2 && (T2 = T2.add(L2)), A2 & K$2 && (S3 = S3.add(L2)), L2 = L2.double(), $2 >>= K$2, A2 >>= K$2;
      return N2 && (T2 = T2.negate()), B3 && (S3 = S3.negate()), S3 = new h3(n3.mul(S3.px, v2.beta), S3.py, S3.pz), T2.add(S3);
    }
    multiply(d3) {
      const { endo: v2, n: m3 } = e2;
      ft$3("scalar", d3, K$2, m3);
      let O3, N2;
      if (v2) {
        const { k1neg: $2, k1: B3, k2neg: A2, k2: T2 } = v2.splitScalar(d3);
        let { p: S3, f: L2 } = this.wNAF(B3), { p: U2, f: _2 } = this.wNAF(T2);
        S3 = E2.constTimeNegate($2, S3), U2 = E2.constTimeNegate(A2, U2), U2 = new h3(n3.mul(U2.px, v2.beta), U2.py, U2.pz), O3 = S3.add(U2), N2 = L2.add(_2);
      } else {
        const { p: $2, f: B3 } = this.wNAF(d3);
        O3 = $2, N2 = B3;
      }
      return h3.normalizeZ([O3, N2])[0];
    }
    multiplyAndAddUnsafe(d3, v2, m3) {
      const O3 = h3.BASE, N2 = (B3, A2) => A2 === dt$3 || A2 === K$2 || !B3.equals(O3) ? B3.multiplyUnsafe(A2) : B3.multiply(A2), $2 = N2(this, v2).add(N2(d3, m3));
      return $2.is0() ? void 0 : $2;
    }
    toAffine(d3) {
      return l2(this, d3);
    }
    isTorsionFree() {
      const { h: d3, isTorsionFree: v2 } = e2;
      if (d3 === K$2) return true;
      if (v2) return v2(h3, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: d3, clearCofactor: v2 } = e2;
      return d3 === K$2 ? this : v2 ? v2(h3, this) : this.multiplyUnsafe(e2.h);
    }
    toRawBytes(d3 = true) {
      return Ct$2("isCompressed", d3), this.assertValidity(), o2(h3, this, d3);
    }
    toHex(d3 = true) {
      return Ct$2("isCompressed", d3), Pt$3(this.toRawBytes(d3));
    }
  }
  h3.BASE = new h3(e2.Gx, e2.Gy, n3.ONE), h3.ZERO = new h3(n3.ZERO, n3.ONE, n3.ZERO);
  const y4 = e2.nBitLength, E2 = dc$1(h3, e2.endo ? Math.ceil(y4 / 2) : y4);
  return { CURVE: e2, ProjectivePoint: h3, normPrivateKeyToScalar: a2, weierstrassEquation: s2, isWithinCurveOrder: c2 };
}
function Bc$1(t2) {
  const e2 = Wr$2(t2);
  return Dt$2(e2, { hash: "hash", hmac: "function", randomBytes: "function" }, { bits2int: "function", bits2int_modN: "function", lowS: "boolean" }), Object.freeze({ lowS: true, ...e2 });
}
function Ic$1(t2) {
  const e2 = Bc$1(t2), { Fp: n3, n: r2 } = e2, o2 = n3.BYTES + 1, i2 = 2 * n3.BYTES + 1;
  function s2(g2) {
    return X$2(g2, r2);
  }
  function c2(g2) {
    return nn$2(g2, r2);
  }
  const { ProjectivePoint: a2, normPrivateKeyToScalar: u2, weierstrassEquation: l2, isWithinCurveOrder: f3 } = Ac$1({ ...e2, toBytes(g2, w2, b2) {
    const I3 = w2.toAffine(), R3 = n3.toBytes(I3.x), x2 = ne$3;
    return Ct$2("isCompressed", b2), b2 ? x2(Uint8Array.from([w2.hasEvenY() ? 2 : 3]), R3) : x2(Uint8Array.from([4]), R3, n3.toBytes(I3.y));
  }, fromBytes(g2) {
    const w2 = g2.length, b2 = g2[0], I3 = g2.subarray(1);
    if (w2 === o2 && (b2 === 2 || b2 === 3)) {
      const R3 = Ot$2(I3);
      if (!Ee$4(R3, K$2, n3.ORDER)) throw new Error("Point is not on curve");
      const x2 = l2(R3);
      let C2;
      try {
        C2 = n3.sqrt(x2);
      } catch (M3) {
        const D2 = M3 instanceof Error ? ": " + M3.message : "";
        throw new Error("Point is not on curve" + D2);
      }
      const P3 = (C2 & K$2) === K$2;
      return (b2 & 1) === 1 !== P3 && (C2 = n3.neg(C2)), { x: R3, y: C2 };
    } else if (w2 === i2 && b2 === 4) {
      const R3 = n3.fromBytes(I3.subarray(0, n3.BYTES)), x2 = n3.fromBytes(I3.subarray(n3.BYTES, 2 * n3.BYTES));
      return { x: R3, y: x2 };
    } else {
      const R3 = o2, x2 = i2;
      throw new Error("invalid Point, expected length of " + R3 + ", or uncompressed " + x2 + ", got " + w2);
    }
  } }), h3 = (g2) => Pt$3(Mt$3(g2, e2.nByteLength));
  function y4(g2) {
    const w2 = r2 >> K$2;
    return g2 > w2;
  }
  function E2(g2) {
    return y4(g2) ? s2(-g2) : g2;
  }
  const p2 = (g2, w2, b2) => Ot$2(g2.slice(w2, b2));
  class d3 {
    constructor(w2, b2, I3) {
      this.r = w2, this.s = b2, this.recovery = I3, this.assertValidity();
    }
    static fromCompact(w2) {
      const b2 = e2.nByteLength;
      return w2 = et$2("compactSignature", w2, b2 * 2), new d3(p2(w2, 0, b2), p2(w2, b2, 2 * b2));
    }
    static fromDER(w2) {
      const { r: b2, s: I3 } = lt$2.toSig(et$2("DER", w2));
      return new d3(b2, I3);
    }
    assertValidity() {
      ft$3("r", this.r, K$2, r2), ft$3("s", this.s, K$2, r2);
    }
    addRecoveryBit(w2) {
      return new d3(this.r, this.s, w2);
    }
    recoverPublicKey(w2) {
      const { r: b2, s: I3, recovery: R3 } = this, x2 = B3(et$2("msgHash", w2));
      if (R3 == null || ![0, 1, 2, 3].includes(R3)) throw new Error("recovery id invalid");
      const C2 = R3 === 2 || R3 === 3 ? b2 + e2.n : b2;
      if (C2 >= n3.ORDER) throw new Error("recovery id 2 or 3 invalid");
      const P3 = (R3 & 1) === 0 ? "02" : "03", k2 = a2.fromHex(P3 + h3(C2)), M3 = c2(C2), D2 = s2(-x2 * M3), z2 = s2(I3 * M3), Z2 = a2.BASE.multiplyAndAddUnsafe(k2, D2, z2);
      if (!Z2) throw new Error("point at infinify");
      return Z2.assertValidity(), Z2;
    }
    hasHighS() {
      return y4(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new d3(this.r, s2(-this.s), this.recovery) : this;
    }
    toDERRawBytes() {
      return Vt$3(this.toDERHex());
    }
    toDERHex() {
      return lt$2.hexFromSig({ r: this.r, s: this.s });
    }
    toCompactRawBytes() {
      return Vt$3(this.toCompactHex());
    }
    toCompactHex() {
      return h3(this.r) + h3(this.s);
    }
  }
  const v2 = { isValidPrivateKey(g2) {
    try {
      return u2(g2), true;
    } catch {
      return false;
    }
  }, normPrivateKeyToScalar: u2, randomPrivateKey: () => {
    const g2 = zr$2(e2.n);
    return uc$1(e2.randomBytes(g2), e2.n);
  }, precompute(g2 = 8, w2 = a2.BASE) {
    return w2._setWindowSize(g2), w2.multiply(BigInt(3)), w2;
  } };
  function m3(g2, w2 = true) {
    return a2.fromPrivateKey(g2).toRawBytes(w2);
  }
  function O3(g2) {
    const w2 = St$4(g2), b2 = typeof g2 == "string", I3 = (w2 || b2) && g2.length;
    return w2 ? I3 === o2 || I3 === i2 : b2 ? I3 === 2 * o2 || I3 === 2 * i2 : g2 instanceof a2;
  }
  function N2(g2, w2, b2 = true) {
    if (O3(g2)) throw new Error("first arg must be private key");
    if (!O3(w2)) throw new Error("second arg must be public key");
    return a2.fromHex(w2).multiply(u2(g2)).toRawBytes(b2);
  }
  const $2 = e2.bits2int || function(g2) {
    if (g2.length > 8192) throw new Error("input is too large");
    const w2 = Ot$2(g2), b2 = g2.length * 8 - e2.nBitLength;
    return b2 > 0 ? w2 >> BigInt(b2) : w2;
  }, B3 = e2.bits2int_modN || function(g2) {
    return s2($2(g2));
  }, A2 = Je$3(e2.nBitLength);
  function T2(g2) {
    return ft$3("num < 2^" + e2.nBitLength, g2, dt$3, A2), Mt$3(g2, e2.nByteLength);
  }
  function S3(g2, w2, b2 = L2) {
    if (["recovered", "canonical"].some((W2) => W2 in b2)) throw new Error("sign() legacy options not supported");
    const { hash: I3, randomBytes: R3 } = e2;
    let { lowS: x2, prehash: C2, extraEntropy: P3 } = b2;
    x2 == null && (x2 = true), g2 = et$2("msgHash", g2), Jr$2(b2), C2 && (g2 = et$2("prehashed msgHash", I3(g2)));
    const k2 = B3(g2), M3 = u2(w2), D2 = [T2(M3), T2(k2)];
    if (P3 != null && P3 !== false) {
      const W2 = P3 === true ? R3(n3.BYTES) : P3;
      D2.push(et$2("extraEntropy", W2));
    }
    const z2 = ne$3(...D2), Z2 = k2;
    function st2(W2) {
      const J3 = $2(W2);
      if (!f3(J3)) return;
      const Be2 = c2(J3), zt2 = a2.BASE.multiply(J3).toAffine(), vt2 = s2(zt2.x);
      if (vt2 === dt$3) return;
      const Zt2 = s2(Be2 * s2(Z2 + vt2 * M3));
      if (Zt2 === dt$3) return;
      let Ut2 = (zt2.x === vt2 ? 0 : 2) | Number(zt2.y & K$2), vn2 = Zt2;
      return x2 && y4(Zt2) && (vn2 = E2(Zt2), Ut2 ^= 1), new d3(vt2, vn2, Ut2);
    }
    return { seed: z2, k2sig: st2 };
  }
  const L2 = { lowS: e2.lowS, prehash: false }, U2 = { lowS: e2.lowS, prehash: false };
  function _2(g2, w2, b2 = L2) {
    const { seed: I3, k2sig: R3 } = S3(g2, w2, b2), x2 = e2;
    return Vr$2(x2.hash.outputLen, x2.nByteLength, x2.hmac)(I3, R3);
  }
  a2.BASE._setWindowSize(8);
  function j2(g2, w2, b2, I3 = U2) {
    const R3 = g2;
    w2 = et$2("msgHash", w2), b2 = et$2("publicKey", b2);
    const { lowS: x2, prehash: C2, format: P3 } = I3;
    if (Jr$2(I3), "strict" in I3) throw new Error("options.strict was renamed to lowS");
    if (P3 !== void 0 && P3 !== "compact" && P3 !== "der") throw new Error("format must be compact or der");
    const k2 = typeof R3 == "string" || St$4(R3), M3 = !k2 && !P3 && typeof R3 == "object" && R3 !== null && typeof R3.r == "bigint" && typeof R3.s == "bigint";
    if (!k2 && !M3) throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let D2, z2;
    try {
      if (M3 && (D2 = new d3(R3.r, R3.s)), k2) {
        try {
          P3 !== "compact" && (D2 = d3.fromDER(R3));
        } catch (Ut2) {
          if (!(Ut2 instanceof lt$2.Err)) throw Ut2;
        }
        !D2 && P3 !== "der" && (D2 = d3.fromCompact(R3));
      }
      z2 = a2.fromHex(b2);
    } catch {
      return false;
    }
    if (!D2 || x2 && D2.hasHighS()) return false;
    C2 && (w2 = e2.hash(w2));
    const { r: Z2, s: st2 } = D2, W2 = B3(w2), J3 = c2(st2), Be2 = s2(W2 * J3), zt2 = s2(Z2 * J3), vt2 = a2.BASE.multiplyAndAddUnsafe(z2, Be2, zt2)?.toAffine();
    return vt2 ? s2(vt2.x) === Z2 : false;
  }
  return { CURVE: e2, getPublicKey: m3, getSharedSecret: N2, sign: _2, verify: j2, ProjectivePoint: a2, Signature: d3, utils: v2 };
}
function Nc$1(t2) {
  return { hash: t2, hmac: (e2, ...n3) => ye$3(t2, e2, Vi$2(...n3)), randomBytes: Lt$3 };
}
function Uc$1(t2, e2) {
  const n3 = (r2) => Ic$1({ ...t2, ...Nc$1(r2) });
  return { ...n3(e2), create: n3 };
}
const to$2 = Kr$2(BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff")), Tc$1 = to$2.create(BigInt("-3")), Rc$1 = BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"), _c = Uc$1({ a: Tc$1, b: Rc$1, Fp: to$2, n: BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"), Gx: BigInt("0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"), Gy: BigInt("0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5"), h: BigInt(1), lowS: false }, Qt$3), ln$1 = "base10", G$2 = "base16", qt$3 = "base64pad", xe$2 = "base64url", Kt$3 = "utf8", dn$1 = 0, Ft$3 = 1, re$3 = 2, $c = 0, eo$1 = 1, oe$1 = 12, hn$1 = 32;
function Lc() {
  const t2 = fn$1.utils.randomPrivateKey(), e2 = fn$1.getPublicKey(t2);
  return { privateKey: toString(t2, G$2), publicKey: toString(e2, G$2) };
}
function jc() {
  const t2 = Lt$3(hn$1);
  return toString(t2, G$2);
}
function Cc(t2, e2) {
  const n3 = fn$1.getSharedSecret(fromString(t2, G$2), fromString(e2, G$2)), r2 = Vs$1(Qt$3, n3, void 0, void 0, hn$1);
  return toString(r2, G$2);
}
function Pc$1(t2) {
  const e2 = Qt$3(fromString(t2, G$2));
  return toString(e2, G$2);
}
function kc$1(t2) {
  const e2 = Qt$3(fromString(t2, Kt$3));
  return toString(e2, G$2);
}
function pn$1(t2) {
  return fromString(`${t2}`, ln$1);
}
function Bt$2(t2) {
  return Number(toString(t2, ln$1));
}
function no$1(t2) {
  return t2.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function ro$1(t2) {
  const e2 = t2.replace(/-/g, "+").replace(/_/g, "/"), n3 = (4 - e2.length % 4) % 4;
  return e2 + "=".repeat(n3);
}
function Vc(t2) {
  const e2 = pn$1(typeof t2.type < "u" ? t2.type : dn$1);
  if (Bt$2(e2) === Ft$3 && typeof t2.senderPublicKey > "u") throw new Error("Missing sender public key for type 1 envelope");
  const n3 = typeof t2.senderPublicKey < "u" ? fromString(t2.senderPublicKey, G$2) : void 0, r2 = typeof t2.iv < "u" ? fromString(t2.iv, G$2) : Lt$3(oe$1), o2 = fromString(t2.symKey, G$2), i2 = $r$1(o2, r2).encrypt(fromString(t2.message, Kt$3)), s2 = gn$1({ type: e2, sealed: i2, iv: r2, senderPublicKey: n3 });
  return t2.encoding === xe$2 ? no$1(s2) : s2;
}
function Mc(t2) {
  const e2 = fromString(t2.symKey, G$2), { sealed: n3, iv: r2 } = Se$1({ encoded: t2.encoded, encoding: t2.encoding }), o2 = $r$1(e2, r2).decrypt(n3);
  if (o2 === null) throw new Error("Failed to decrypt");
  return toString(o2, Kt$3);
}
function Dc(t2, e2) {
  const n3 = pn$1(re$3), r2 = Lt$3(oe$1), o2 = fromString(t2, Kt$3), i2 = gn$1({ type: n3, sealed: o2, iv: r2 });
  return e2 === xe$2 ? no$1(i2) : i2;
}
function Hc(t2, e2) {
  const { sealed: n3 } = Se$1({ encoded: t2, encoding: e2 });
  return toString(n3, Kt$3);
}
function gn$1(t2) {
  if (Bt$2(t2.type) === re$3) return toString(concat([t2.type, t2.sealed]), qt$3);
  if (Bt$2(t2.type) === Ft$3) {
    if (typeof t2.senderPublicKey > "u") throw new Error("Missing sender public key for type 1 envelope");
    return toString(concat([t2.type, t2.senderPublicKey, t2.iv, t2.sealed]), qt$3);
  }
  return toString(concat([t2.type, t2.iv, t2.sealed]), qt$3);
}
function Se$1(t2) {
  const e2 = (t2.encoding || qt$3) === xe$2 ? ro$1(t2.encoded) : t2.encoded, n3 = fromString(e2, qt$3), r2 = n3.slice($c, eo$1), o2 = eo$1;
  if (Bt$2(r2) === Ft$3) {
    const a2 = o2 + hn$1, u2 = a2 + oe$1, l2 = n3.slice(o2, a2), f3 = n3.slice(a2, u2), h3 = n3.slice(u2);
    return { type: r2, sealed: h3, iv: f3, senderPublicKey: l2 };
  }
  if (Bt$2(r2) === re$3) {
    const a2 = n3.slice(o2), u2 = Lt$3(oe$1);
    return { type: r2, sealed: a2, iv: u2 };
  }
  const i2 = o2 + oe$1, s2 = n3.slice(o2, i2), c2 = n3.slice(i2);
  return { type: r2, sealed: c2, iv: s2 };
}
function qc(t2, e2) {
  const n3 = Se$1({ encoded: t2, encoding: e2?.encoding });
  return oo$1({ type: Bt$2(n3.type), senderPublicKey: typeof n3.senderPublicKey < "u" ? toString(n3.senderPublicKey, G$2) : void 0, receiverPublicKey: e2?.receiverPublicKey });
}
function oo$1(t2) {
  const e2 = t2?.type || dn$1;
  if (e2 === Ft$3) {
    if (typeof t2?.senderPublicKey > "u") throw new Error("missing sender public key");
    if (typeof t2?.receiverPublicKey > "u") throw new Error("missing receiver public key");
  }
  return { type: e2, senderPublicKey: t2?.senderPublicKey, receiverPublicKey: t2?.receiverPublicKey };
}
function Kc(t2) {
  return t2.type === Ft$3 && typeof t2.senderPublicKey == "string" && typeof t2.receiverPublicKey == "string";
}
function Fc(t2) {
  return t2.type === re$3;
}
function io$1(t2) {
  const e2 = Buffer.from(t2.x, "base64"), n3 = Buffer.from(t2.y, "base64");
  return concat([new Uint8Array([4]), e2, n3]);
}
function zc(t2, e2) {
  const [n3, r2, o2] = t2.split("."), i2 = Buffer.from(ro$1(o2), "base64");
  if (i2.length !== 64) throw new Error("Invalid signature length");
  const s2 = i2.slice(0, 32), c2 = i2.slice(32, 64), a2 = `${n3}.${r2}`, u2 = Qt$3(a2), l2 = io$1(e2);
  if (!_c.verify(concat([s2, c2]), u2, l2)) throw new Error("Invalid signature");
  return sn$3(t2).payload;
}
const so$1 = "irn";
function Zc(t2) {
  return t2?.relay || { protocol: so$1 };
}
function Yc(t2) {
  const e2 = C$3[t2];
  if (typeof e2 > "u") throw new Error(`Relay Protocol not supported: ${t2}`);
  return e2;
}
function co$1(t2, e2 = "-") {
  const n3 = {}, r2 = "relay" + e2;
  return Object.keys(t2).forEach((o2) => {
    if (o2.startsWith(r2)) {
      const i2 = o2.replace(r2, ""), s2 = t2[o2];
      n3[i2] = s2;
    }
  }), n3;
}
function Gc(t2) {
  if (!t2.includes("wc:")) {
    const u2 = je$2(t2);
    u2 != null && u2.includes("wc:") && (t2 = u2);
  }
  t2 = t2.includes("wc://") ? t2.replace("wc://", "") : t2, t2 = t2.includes("wc:") ? t2.replace("wc:", "") : t2;
  const e2 = t2.indexOf(":"), n3 = t2.indexOf("?") !== -1 ? t2.indexOf("?") : void 0, r2 = t2.substring(0, e2), o2 = t2.substring(e2 + 1, n3).split("@"), i2 = typeof n3 < "u" ? t2.substring(n3) : "", s2 = new URLSearchParams(i2), c2 = {};
  s2.forEach((u2, l2) => {
    c2[l2] = u2;
  });
  const a2 = typeof c2.methods == "string" ? c2.methods.split(",") : void 0;
  return { protocol: r2, topic: ao$1(o2[0]), version: parseInt(o2[1], 10), symKey: c2.symKey, relay: co$1(c2), methods: a2, expiryTimestamp: c2.expiryTimestamp ? parseInt(c2.expiryTimestamp, 10) : void 0 };
}
function ao$1(t2) {
  return t2.startsWith("//") ? t2.substring(2) : t2;
}
function uo$1(t2, e2 = "-") {
  const n3 = "relay", r2 = {};
  return Object.keys(t2).forEach((o2) => {
    const i2 = o2, s2 = n3 + e2 + i2;
    t2[i2] && (r2[s2] = t2[i2]);
  }), r2;
}
function Wc(t2) {
  const e2 = new URLSearchParams(), n3 = uo$1(t2.relay);
  Object.keys(n3).sort().forEach((o2) => {
    e2.set(o2, n3[o2]);
  }), e2.set("symKey", t2.symKey), t2.expiryTimestamp && e2.set("expiryTimestamp", t2.expiryTimestamp.toString()), t2.methods && e2.set("methods", t2.methods.join(","));
  const r2 = e2.toString();
  return `${t2.protocol}:${t2.topic}@${t2.version}?${r2}`;
}
const wo$2 = { INVALID_METHOD: { message: "Invalid method.", code: 1001 }, INVALID_EVENT: { message: "Invalid event.", code: 1002 }, INVALID_UPDATE_REQUEST: { message: "Invalid update request.", code: 1003 }, INVALID_EXTEND_REQUEST: { message: "Invalid extend request.", code: 1004 }, INVALID_SESSION_SETTLE_REQUEST: { message: "Invalid session settle request.", code: 1005 }, UNAUTHORIZED_METHOD: { message: "Unauthorized method.", code: 3001 }, UNAUTHORIZED_EVENT: { message: "Unauthorized event.", code: 3002 }, UNAUTHORIZED_UPDATE_REQUEST: { message: "Unauthorized update request.", code: 3003 }, UNAUTHORIZED_EXTEND_REQUEST: { message: "Unauthorized extend request.", code: 3004 }, USER_REJECTED: { message: "User rejected.", code: 5e3 }, USER_REJECTED_CHAINS: { message: "User rejected chains.", code: 5001 }, USER_REJECTED_METHODS: { message: "User rejected methods.", code: 5002 }, USER_REJECTED_EVENTS: { message: "User rejected events.", code: 5003 }, UNSUPPORTED_CHAINS: { message: "Unsupported chains.", code: 5100 }, UNSUPPORTED_METHODS: { message: "Unsupported methods.", code: 5101 }, UNSUPPORTED_EVENTS: { message: "Unsupported events.", code: 5102 }, UNSUPPORTED_ACCOUNTS: { message: "Unsupported accounts.", code: 5103 }, UNSUPPORTED_NAMESPACE_KEY: { message: "Unsupported namespace key.", code: 5104 }, USER_DISCONNECTED: { message: "User disconnected.", code: 6e3 }, SESSION_SETTLEMENT_FAILED: { message: "Session settlement failed.", code: 7e3 }, WC_METHOD_UNSUPPORTED: { message: "Unsupported wc_ method.", code: 10001 } }, bo$2 = { NOT_INITIALIZED: { message: "Not initialized.", code: 1 }, NO_MATCHING_KEY: { message: "No matching key.", code: 2 }, RESTORE_WILL_OVERRIDE: { message: "Restore will override.", code: 3 }, RESUBSCRIBED: { message: "Resubscribed.", code: 4 }, MISSING_OR_INVALID: { message: "Missing or invalid.", code: 5 }, EXPIRED: { message: "Expired.", code: 6 }, UNKNOWN_TYPE: { message: "Unknown type.", code: 7 }, MISMATCHED_TOPIC: { message: "Mismatched topic.", code: 8 }, NON_CONFORMING_NAMESPACES: { message: "Non conforming namespaces.", code: 9 } };
function ht$3(t2, e2) {
  const { message: n3, code: r2 } = bo$2[t2];
  return { message: e2 ? `${n3} ${e2}` : n3, code: r2 };
}
function Nt$2(t2, e2) {
  const { message: n3, code: r2 } = wo$2[t2];
  return { message: e2 ? `${n3} ${e2}` : n3, code: r2 };
}
function Et$3(t2) {
  return typeof t2 > "u";
}
function nt$2(t2, e2) {
  return typeof t2 == "string" && !!t2.trim().length;
}
function fa(t2) {
  function e2(n3) {
    try {
      return typeof new URL(n3) < "u";
    } catch {
      return false;
    }
  }
  try {
    if (nt$2(t2, false)) {
      if (e2(t2)) return true;
      const n3 = je$2(t2);
      return e2(n3);
    }
  } catch {
  }
  return false;
}
function la(t2) {
  var e2;
  return (e2 = t2?.proposer) == null ? void 0 : e2.publicKey;
}
function da(t2) {
  return t2?.topic;
}
function ma$1(t2) {
  return typeof t2 < "u" && typeof t2 !== null;
}
function Na() {
  const t2 = xt$3();
  return new Promise((e2) => {
    switch (t2) {
      case Y$3.browser:
        e2(To$1());
        break;
      case Y$3.reactNative:
        e2(Ro$1());
        break;
      case Y$3.node:
        e2(_o$1());
        break;
      default:
        e2(true);
    }
  });
}
function To$1() {
  return Tt$3() && navigator?.onLine;
}
async function Ro$1() {
  if (pt$3() && typeof global < "u" && global != null && global.NetInfo) {
    const t2 = await (global == null ? void 0 : global.NetInfo.fetch());
    return t2?.isConnected;
  }
  return true;
}
function _o$1() {
  return true;
}
function Ua(t2) {
  switch (xt$3()) {
    case Y$3.browser:
      $o$1(t2);
      break;
    case Y$3.reactNative:
      Lo$1(t2);
      break;
  }
}
function $o$1(t2) {
  !pt$3() && Tt$3() && (window.addEventListener("online", () => t2(true)), window.addEventListener("offline", () => t2(false)));
}
function Lo$1(t2) {
  pt$3() && typeof global < "u" && global != null && global.NetInfo && global?.NetInfo.addEventListener((e2) => t2(e2?.isConnected));
}
function Ta() {
  var t2;
  return Tt$3() && cjsExports$1.getDocument() ? ((t2 = cjsExports$1.getDocument()) == null ? void 0 : t2.visibilityState) === "visible" : true;
}
const ze$2 = "wc", Le$2 = 2, he$2 = "core", B$2 = `${ze$2}@2:${he$2}:`, Et$2 = { logger: "error" }, It$2 = { database: ":memory:" }, Tt$2 = "crypto", ke$3 = "client_ed25519_seed", Ct$1 = cjsExports.ONE_DAY, Pt$2 = "keychain", St$3 = "0.3", Ot$1 = "messages", Rt$2 = "0.3", je$1 = cjsExports.SIX_HOURS, At$1 = "publisher", xt$2 = "irn", Nt$1 = "error", Ue$2 = "wss://relay.walletconnect.org", $t$1 = "relayer", C$2 = { message: "relayer_message", message_ack: "relayer_message_ack", connect: "relayer_connect", disconnect: "relayer_disconnect", error: "relayer_error", connection_stalled: "relayer_connection_stalled", transport_closed: "relayer_transport_closed", publish: "relayer_publish" }, zt$1 = "_subscription", L$2 = { payload: "payload", connect: "connect", disconnect: "disconnect", error: "error" }, Lt$2 = 0.1, _e$3 = "2.21.0", Q$1 = { link_mode: "link_mode", relay: "relay" }, le$2 = { inbound: "inbound", outbound: "outbound" }, kt$2 = "0.3", jt$2 = "WALLETCONNECT_CLIENT_ID", Fe$2 = "WALLETCONNECT_LINK_MODE_APPS", $$3 = { created: "subscription_created", deleted: "subscription_deleted", expired: "subscription_expired", disabled: "subscription_disabled", sync: "subscription_sync", resubscribed: "subscription_resubscribed" }, Ut$1 = "subscription", Ft$2 = "0.3", Mt$2 = "pairing", Kt$2 = "0.3", se$2 = { wc_pairingDelete: { req: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1e3 }, res: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1001 } }, wc_pairingPing: { req: { ttl: cjsExports.THIRTY_SECONDS, prompt: false, tag: 1002 }, res: { ttl: cjsExports.THIRTY_SECONDS, prompt: false, tag: 1003 } }, unregistered_method: { req: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 0 }, res: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 0 } } }, re$2 = { create: "pairing_create", expire: "pairing_expire", delete: "pairing_delete", ping: "pairing_ping" }, F$2 = { created: "history_created", updated: "history_updated", deleted: "history_deleted", sync: "history_sync" }, Bt$1 = "history", Vt$2 = "0.3", qt$2 = "expirer", M$2 = { created: "expirer_created", deleted: "expirer_deleted", expired: "expirer_expired", sync: "expirer_sync" }, Gt$1 = "0.3", Wt$2 = "verify-api", Zs$1 = "https://verify.walletconnect.com", Ht$1 = "https://verify.walletconnect.org", ue$2 = Ht$1, Yt$1 = `${ue$2}/v3`, Jt$2 = [Zs$1, Ht$1], Xt$2 = "echo", Zt$1 = "https://echo.walletconnect.com", G$1 = { pairing_started: "pairing_started", pairing_uri_validation_success: "pairing_uri_validation_success", pairing_uri_not_expired: "pairing_uri_not_expired", store_new_pairing: "store_new_pairing", subscribing_pairing_topic: "subscribing_pairing_topic", subscribe_pairing_topic_success: "subscribe_pairing_topic_success", existing_pairing: "existing_pairing", pairing_not_expired: "pairing_not_expired", emit_inactive_pairing: "emit_inactive_pairing", emit_session_proposal: "emit_session_proposal", subscribing_to_pairing_topic: "subscribing_to_pairing_topic" }, Y$2 = { no_wss_connection: "no_wss_connection", no_internet_connection: "no_internet_connection", malformed_pairing_uri: "malformed_pairing_uri", active_pairing_already_exists: "active_pairing_already_exists", subscribe_pairing_topic_failure: "subscribe_pairing_topic_failure", pairing_expired: "pairing_expired", proposal_expired: "proposal_expired", proposal_listener_not_found: "proposal_listener_not_found" }, er$1 = { session_approve_started: "session_approve_started", proposal_not_expired: "proposal_not_expired", session_namespaces_validation_success: "session_namespaces_validation_success", create_session_topic: "create_session_topic", subscribing_session_topic: "subscribing_session_topic", subscribe_session_topic_success: "subscribe_session_topic_success", publishing_session_approve: "publishing_session_approve", session_approve_publish_success: "session_approve_publish_success", store_session: "store_session", publishing_session_settle: "publishing_session_settle", session_settle_publish_success: "session_settle_publish_success" }, tr$1 = { no_internet_connection: "no_internet_connection", no_wss_connection: "no_wss_connection", proposal_expired: "proposal_expired", subscribe_session_topic_failure: "subscribe_session_topic_failure", session_approve_publish_failure: "session_approve_publish_failure", session_settle_publish_failure: "session_settle_publish_failure", session_approve_namespace_validation_failure: "session_approve_namespace_validation_failure", proposal_not_found: "proposal_not_found" }, ir$1 = { authenticated_session_approve_started: "authenticated_session_approve_started", create_authenticated_session_topic: "create_authenticated_session_topic", cacaos_verified: "cacaos_verified", store_authenticated_session: "store_authenticated_session", subscribing_authenticated_session_topic: "subscribing_authenticated_session_topic", subscribe_authenticated_session_topic_success: "subscribe_authenticated_session_topic_success", publishing_authenticated_session_approve: "publishing_authenticated_session_approve" }, sr$1 = { no_internet_connection: "no_internet_connection", invalid_cacao: "invalid_cacao", subscribe_authenticated_session_topic_failure: "subscribe_authenticated_session_topic_failure", authenticated_session_approve_publish_failure: "authenticated_session_approve_publish_failure", authenticated_session_pending_request_not_found: "authenticated_session_pending_request_not_found" }, Qt$2 = 0.1, ei = "event-client", ti = 86400, ii = "https://pulse.walletconnect.org/batch";
function rr$1(r2, e2) {
  if (r2.length >= 255) throw new TypeError("Alphabet too long");
  for (var t2 = new Uint8Array(256), i2 = 0; i2 < t2.length; i2++) t2[i2] = 255;
  for (var s2 = 0; s2 < r2.length; s2++) {
    var n3 = r2.charAt(s2), o2 = n3.charCodeAt(0);
    if (t2[o2] !== 255) throw new TypeError(n3 + " is ambiguous");
    t2[o2] = s2;
  }
  var a2 = r2.length, c2 = r2.charAt(0), h3 = Math.log(a2) / Math.log(256), l2 = Math.log(256) / Math.log(a2);
  function d3(u2) {
    if (u2 instanceof Uint8Array || (ArrayBuffer.isView(u2) ? u2 = new Uint8Array(u2.buffer, u2.byteOffset, u2.byteLength) : Array.isArray(u2) && (u2 = Uint8Array.from(u2))), !(u2 instanceof Uint8Array)) throw new TypeError("Expected Uint8Array");
    if (u2.length === 0) return "";
    for (var b2 = 0, x2 = 0, I3 = 0, D2 = u2.length; I3 !== D2 && u2[I3] === 0; ) I3++, b2++;
    for (var j2 = (D2 - I3) * l2 + 1 >>> 0, T2 = new Uint8Array(j2); I3 !== D2; ) {
      for (var q2 = u2[I3], J3 = 0, K2 = j2 - 1; (q2 !== 0 || J3 < x2) && K2 !== -1; K2--, J3++) q2 += 256 * T2[K2] >>> 0, T2[K2] = q2 % a2 >>> 0, q2 = q2 / a2 >>> 0;
      if (q2 !== 0) throw new Error("Non-zero carry");
      x2 = J3, I3++;
    }
    for (var H2 = j2 - x2; H2 !== j2 && T2[H2] === 0; ) H2++;
    for (var me2 = c2.repeat(b2); H2 < j2; ++H2) me2 += r2.charAt(T2[H2]);
    return me2;
  }
  function g2(u2) {
    if (typeof u2 != "string") throw new TypeError("Expected String");
    if (u2.length === 0) return new Uint8Array();
    var b2 = 0;
    if (u2[b2] !== " ") {
      for (var x2 = 0, I3 = 0; u2[b2] === c2; ) x2++, b2++;
      for (var D2 = (u2.length - b2) * h3 + 1 >>> 0, j2 = new Uint8Array(D2); u2[b2]; ) {
        var T2 = t2[u2.charCodeAt(b2)];
        if (T2 === 255) return;
        for (var q2 = 0, J3 = D2 - 1; (T2 !== 0 || q2 < I3) && J3 !== -1; J3--, q2++) T2 += a2 * j2[J3] >>> 0, j2[J3] = T2 % 256 >>> 0, T2 = T2 / 256 >>> 0;
        if (T2 !== 0) throw new Error("Non-zero carry");
        I3 = q2, b2++;
      }
      if (u2[b2] !== " ") {
        for (var K2 = D2 - I3; K2 !== D2 && j2[K2] === 0; ) K2++;
        for (var H2 = new Uint8Array(x2 + (D2 - K2)), me2 = x2; K2 !== D2; ) H2[me2++] = j2[K2++];
        return H2;
      }
    }
  }
  function _2(u2) {
    var b2 = g2(u2);
    if (b2) return b2;
    throw new Error(`Non-${e2} character`);
  }
  return { encode: d3, decodeUnsafe: g2, decode: _2 };
}
var nr$1 = rr$1, or$1 = nr$1;
const si = (r2) => {
  if (r2 instanceof Uint8Array && r2.constructor.name === "Uint8Array") return r2;
  if (r2 instanceof ArrayBuffer) return new Uint8Array(r2);
  if (ArrayBuffer.isView(r2)) return new Uint8Array(r2.buffer, r2.byteOffset, r2.byteLength);
  throw new Error("Unknown type, must be binary type");
}, ar$1 = (r2) => new TextEncoder().encode(r2), cr$1 = (r2) => new TextDecoder().decode(r2);
let hr$1 = class hr {
  constructor(e2, t2, i2) {
    this.name = e2, this.prefix = t2, this.baseEncode = i2;
  }
  encode(e2) {
    if (e2 instanceof Uint8Array) return `${this.prefix}${this.baseEncode(e2)}`;
    throw Error("Unknown type, must be binary type");
  }
};
let lr$1 = class lr {
  constructor(e2, t2, i2) {
    if (this.name = e2, this.prefix = t2, t2.codePointAt(0) === void 0) throw new Error("Invalid prefix character");
    this.prefixCodePoint = t2.codePointAt(0), this.baseDecode = i2;
  }
  decode(e2) {
    if (typeof e2 == "string") {
      if (e2.codePointAt(0) !== this.prefixCodePoint) throw Error(`Unable to decode multibase string ${JSON.stringify(e2)}, ${this.name} decoder only supports inputs prefixed with ${this.prefix}`);
      return this.baseDecode(e2.slice(this.prefix.length));
    } else throw Error("Can only multibase decode strings");
  }
  or(e2) {
    return ri(this, e2);
  }
};
let ur$1 = class ur {
  constructor(e2) {
    this.decoders = e2;
  }
  or(e2) {
    return ri(this, e2);
  }
  decode(e2) {
    const t2 = e2[0], i2 = this.decoders[t2];
    if (i2) return i2.decode(e2);
    throw RangeError(`Unable to decode multibase string ${JSON.stringify(e2)}, only inputs prefixed with ${Object.keys(this.decoders)} are supported`);
  }
};
const ri = (r2, e2) => new ur$1({ ...r2.decoders || { [r2.prefix]: r2 }, ...e2.decoders || { [e2.prefix]: e2 } });
let dr$1 = class dr {
  constructor(e2, t2, i2, s2) {
    this.name = e2, this.prefix = t2, this.baseEncode = i2, this.baseDecode = s2, this.encoder = new hr$1(e2, t2, i2), this.decoder = new lr$1(e2, t2, s2);
  }
  encode(e2) {
    return this.encoder.encode(e2);
  }
  decode(e2) {
    return this.decoder.decode(e2);
  }
};
const Ee$3 = ({ name: r2, prefix: e2, encode: t2, decode: i2 }) => new dr$1(r2, e2, t2, i2), de$2 = ({ prefix: r2, name: e2, alphabet: t2 }) => {
  const { encode: i2, decode: s2 } = or$1(t2, e2);
  return Ee$3({ prefix: r2, name: e2, encode: i2, decode: (n3) => si(s2(n3)) });
}, gr = (r2, e2, t2, i2) => {
  const s2 = {};
  for (let l2 = 0; l2 < e2.length; ++l2) s2[e2[l2]] = l2;
  let n3 = r2.length;
  for (; r2[n3 - 1] === "="; ) --n3;
  const o2 = new Uint8Array(n3 * t2 / 8 | 0);
  let a2 = 0, c2 = 0, h3 = 0;
  for (let l2 = 0; l2 < n3; ++l2) {
    const d3 = s2[r2[l2]];
    if (d3 === void 0) throw new SyntaxError(`Non-${i2} character`);
    c2 = c2 << t2 | d3, a2 += t2, a2 >= 8 && (a2 -= 8, o2[h3++] = 255 & c2 >> a2);
  }
  if (a2 >= t2 || 255 & c2 << 8 - a2) throw new SyntaxError("Unexpected end of data");
  return o2;
}, pr = (r2, e2, t2) => {
  const i2 = e2[e2.length - 1] === "=", s2 = (1 << t2) - 1;
  let n3 = "", o2 = 0, a2 = 0;
  for (let c2 = 0; c2 < r2.length; ++c2) for (a2 = a2 << 8 | r2[c2], o2 += 8; o2 > t2; ) o2 -= t2, n3 += e2[s2 & a2 >> o2];
  if (o2 && (n3 += e2[s2 & a2 << t2 - o2]), i2) for (; n3.length * t2 & 7; ) n3 += "=";
  return n3;
}, P$1 = ({ name: r2, prefix: e2, bitsPerChar: t2, alphabet: i2 }) => Ee$3({ prefix: e2, name: r2, encode(s2) {
  return pr(s2, i2, t2);
}, decode(s2) {
  return gr(s2, i2, t2, r2);
} }), yr = Ee$3({ prefix: "\0", name: "identity", encode: (r2) => cr$1(r2), decode: (r2) => ar$1(r2) });
var br$1 = Object.freeze({ __proto__: null, identity: yr });
const mr$1 = P$1({ prefix: "0", name: "base2", alphabet: "01", bitsPerChar: 1 });
var fr$1 = Object.freeze({ __proto__: null, base2: mr$1 });
const Dr$1 = P$1({ prefix: "7", name: "base8", alphabet: "01234567", bitsPerChar: 3 });
var vr$1 = Object.freeze({ __proto__: null, base8: Dr$1 });
const wr$1 = de$2({ prefix: "9", name: "base10", alphabet: "0123456789" });
var _r$1 = Object.freeze({ __proto__: null, base10: wr$1 });
const Er = P$1({ prefix: "f", name: "base16", alphabet: "0123456789abcdef", bitsPerChar: 4 }), Ir$1 = P$1({ prefix: "F", name: "base16upper", alphabet: "0123456789ABCDEF", bitsPerChar: 4 });
var Tr$1 = Object.freeze({ __proto__: null, base16: Er, base16upper: Ir$1 });
const Cr$1 = P$1({ prefix: "b", name: "base32", alphabet: "abcdefghijklmnopqrstuvwxyz234567", bitsPerChar: 5 }), Pr$1 = P$1({ prefix: "B", name: "base32upper", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", bitsPerChar: 5 }), Sr$1 = P$1({ prefix: "c", name: "base32pad", alphabet: "abcdefghijklmnopqrstuvwxyz234567=", bitsPerChar: 5 }), Or$1 = P$1({ prefix: "C", name: "base32padupper", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=", bitsPerChar: 5 }), Rr$1 = P$1({ prefix: "v", name: "base32hex", alphabet: "0123456789abcdefghijklmnopqrstuv", bitsPerChar: 5 }), Ar$1 = P$1({ prefix: "V", name: "base32hexupper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV", bitsPerChar: 5 }), xr = P$1({ prefix: "t", name: "base32hexpad", alphabet: "0123456789abcdefghijklmnopqrstuv=", bitsPerChar: 5 }), Nr$1 = P$1({ prefix: "T", name: "base32hexpadupper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUV=", bitsPerChar: 5 }), $r = P$1({ prefix: "h", name: "base32z", alphabet: "ybndrfg8ejkmcpqxot1uwisza345h769", bitsPerChar: 5 });
var zr$1 = Object.freeze({ __proto__: null, base32: Cr$1, base32upper: Pr$1, base32pad: Sr$1, base32padupper: Or$1, base32hex: Rr$1, base32hexupper: Ar$1, base32hexpad: xr, base32hexpadupper: Nr$1, base32z: $r });
const Lr$1 = de$2({ prefix: "k", name: "base36", alphabet: "0123456789abcdefghijklmnopqrstuvwxyz" }), kr$1 = de$2({ prefix: "K", name: "base36upper", alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" });
var jr = Object.freeze({ __proto__: null, base36: Lr$1, base36upper: kr$1 });
const Ur$1 = de$2({ name: "base58btc", prefix: "z", alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" }), Fr$1 = de$2({ name: "base58flickr", prefix: "Z", alphabet: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ" });
var Mr$1 = Object.freeze({ __proto__: null, base58btc: Ur$1, base58flickr: Fr$1 });
const Kr$1 = P$1({ prefix: "m", name: "base64", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", bitsPerChar: 6 }), Br$1 = P$1({ prefix: "M", name: "base64pad", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", bitsPerChar: 6 }), Vr$1 = P$1({ prefix: "u", name: "base64url", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", bitsPerChar: 6 }), qr$1 = P$1({ prefix: "U", name: "base64urlpad", alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=", bitsPerChar: 6 });
var Gr$1 = Object.freeze({ __proto__: null, base64: Kr$1, base64pad: Br$1, base64url: Vr$1, base64urlpad: qr$1 });
const ni = Array.from("🚀🪐☄🛰🌌🌑🌒🌓🌔🌕🌖🌗🌘🌍🌏🌎🐉☀💻🖥💾💿😂❤😍🤣😊🙏💕😭😘👍😅👏😁🔥🥰💔💖💙😢🤔😆🙄💪😉☺👌🤗💜😔😎😇🌹🤦🎉💞✌✨🤷😱😌🌸🙌😋💗💚😏💛🙂💓🤩😄😀🖤😃💯🙈👇🎶😒🤭❣😜💋👀😪😑💥🙋😞😩😡🤪👊🥳😥🤤👉💃😳✋😚😝😴🌟😬🙃🍀🌷😻😓⭐✅🥺🌈😈🤘💦✔😣🏃💐☹🎊💘😠☝😕🌺🎂🌻😐🖕💝🙊😹🗣💫💀👑🎵🤞😛🔴😤🌼😫⚽🤙☕🏆🤫👈😮🙆🍻🍃🐶💁😲🌿🧡🎁⚡🌞🎈❌✊👋😰🤨😶🤝🚶💰🍓💢🤟🙁🚨💨🤬✈🎀🍺🤓😙💟🌱😖👶🥴▶➡❓💎💸⬇😨🌚🦋😷🕺⚠🙅😟😵👎🤲🤠🤧📌🔵💅🧐🐾🍒😗🤑🌊🤯🐷☎💧😯💆👆🎤🙇🍑❄🌴💣🐸💌📍🥀🤢👅💡💩👐📸👻🤐🤮🎼🥵🚩🍎🍊👼💍📣🥂"), Wr$1 = ni.reduce((r2, e2, t2) => (r2[t2] = e2, r2), []), Hr$1 = ni.reduce((r2, e2, t2) => (r2[e2.codePointAt(0)] = t2, r2), []);
function Yr$1(r2) {
  return r2.reduce((e2, t2) => (e2 += Wr$1[t2], e2), "");
}
function Jr$1(r2) {
  const e2 = [];
  for (const t2 of r2) {
    const i2 = Hr$1[t2.codePointAt(0)];
    if (i2 === void 0) throw new Error(`Non-base256emoji character: ${t2}`);
    e2.push(i2);
  }
  return new Uint8Array(e2);
}
const Xr$1 = Ee$3({ prefix: "🚀", name: "base256emoji", encode: Yr$1, decode: Jr$1 });
var Zr$1 = Object.freeze({ __proto__: null, base256emoji: Xr$1 }), Qr$1 = ai, oi$1 = 128, tn$1 = -128, sn$1 = Math.pow(2, 31);
function ai(r2, e2, t2) {
  e2 = e2 || [], t2 = t2 || 0;
  for (var i2 = t2; r2 >= sn$1; ) e2[t2++] = r2 & 255 | oi$1, r2 /= 128;
  for (; r2 & tn$1; ) e2[t2++] = r2 & 255 | oi$1, r2 >>>= 7;
  return e2[t2] = r2 | 0, ai.bytes = t2 - i2 + 1, e2;
}
var rn$1 = Me$3, nn$1 = 128, ci = 127;
function Me$3(r2, i2) {
  var t2 = 0, i2 = i2 || 0, s2 = 0, n3 = i2, o2, a2 = r2.length;
  do {
    if (n3 >= a2) throw Me$3.bytes = 0, new RangeError("Could not decode varint");
    o2 = r2[n3++], t2 += s2 < 28 ? (o2 & ci) << s2 : (o2 & ci) * Math.pow(2, s2), s2 += 7;
  } while (o2 >= nn$1);
  return Me$3.bytes = n3 - i2, t2;
}
var on$1 = Math.pow(2, 7), an$1 = Math.pow(2, 14), cn$1 = Math.pow(2, 21), hn = Math.pow(2, 28), ln = Math.pow(2, 35), un$1 = Math.pow(2, 42), dn = Math.pow(2, 49), gn = Math.pow(2, 56), pn = Math.pow(2, 63), yn$1 = function(r2) {
  return r2 < on$1 ? 1 : r2 < an$1 ? 2 : r2 < cn$1 ? 3 : r2 < hn ? 4 : r2 < ln ? 5 : r2 < un$1 ? 6 : r2 < dn ? 7 : r2 < gn ? 8 : r2 < pn ? 9 : 10;
}, bn$1 = { encode: Qr$1, decode: rn$1, encodingLength: yn$1 }, hi = bn$1;
const li = (r2, e2, t2 = 0) => (hi.encode(r2, e2, t2), e2), ui = (r2) => hi.encodingLength(r2), Ke$3 = (r2, e2) => {
  const t2 = e2.byteLength, i2 = ui(r2), s2 = i2 + ui(t2), n3 = new Uint8Array(s2 + t2);
  return li(r2, n3, 0), li(t2, n3, i2), n3.set(e2, s2), new mn$1(r2, t2, e2, n3);
};
let mn$1 = class mn {
  constructor(e2, t2, i2, s2) {
    this.code = e2, this.size = t2, this.digest = i2, this.bytes = s2;
  }
};
const di = ({ name: r2, code: e2, encode: t2 }) => new fn(r2, e2, t2);
class fn {
  constructor(e2, t2, i2) {
    this.name = e2, this.code = t2, this.encode = i2;
  }
  digest(e2) {
    if (e2 instanceof Uint8Array) {
      const t2 = this.encode(e2);
      return t2 instanceof Uint8Array ? Ke$3(this.code, t2) : t2.then((i2) => Ke$3(this.code, i2));
    } else throw Error("Unknown type, must be binary type");
  }
}
const gi$1 = (r2) => async (e2) => new Uint8Array(await crypto.subtle.digest(r2, e2)), Dn = di({ name: "sha2-256", code: 18, encode: gi$1("SHA-256") }), vn = di({ name: "sha2-512", code: 19, encode: gi$1("SHA-512") });
var wn$1 = Object.freeze({ __proto__: null, sha256: Dn, sha512: vn });
const pi = 0, _n$1 = "identity", yi = si, En$1 = (r2) => Ke$3(pi, yi(r2)), In = { code: pi, name: _n$1, encode: yi, digest: En$1 };
var Tn$1 = Object.freeze({ __proto__: null, identity: In });
new TextEncoder(), new TextDecoder();
const bi$1 = { ...br$1, ...fr$1, ...vr$1, ..._r$1, ...Tr$1, ...zr$1, ...jr, ...Mr$1, ...Gr$1, ...Zr$1 };
({ ...wn$1, ...Tn$1 });
function Cn(r2 = 0) {
  return globalThis.Buffer != null && globalThis.Buffer.allocUnsafe != null ? globalThis.Buffer.allocUnsafe(r2) : new Uint8Array(r2);
}
function mi(r2, e2, t2, i2) {
  return { name: r2, prefix: e2, encoder: { name: r2, prefix: e2, encode: t2 }, decoder: { decode: i2 } };
}
const fi = mi("utf8", "u", (r2) => "u" + new TextDecoder("utf8").decode(r2), (r2) => new TextEncoder().encode(r2.substring(1))), Be$1 = mi("ascii", "a", (r2) => {
  let e2 = "a";
  for (let t2 = 0; t2 < r2.length; t2++) e2 += String.fromCharCode(r2[t2]);
  return e2;
}, (r2) => {
  r2 = r2.substring(1);
  const e2 = Cn(r2.length);
  for (let t2 = 0; t2 < r2.length; t2++) e2[t2] = r2.charCodeAt(t2);
  return e2;
}), Pn$1 = { utf8: fi, "utf-8": fi, hex: bi$1.base16, latin1: Be$1, ascii: Be$1, binary: Be$1, ...bi$1 };
function Sn(r2, e2 = "utf8") {
  const t2 = Pn$1[e2];
  if (!t2) throw new Error(`Unsupported encoding "${e2}"`);
  return (e2 === "utf8" || e2 === "utf-8") && globalThis.Buffer != null && globalThis.Buffer.from != null ? globalThis.Buffer.from(r2, "utf8") : t2.decoder.decode(`${t2.prefix}${r2}`);
}
var On = Object.defineProperty, Rn$1 = (r2, e2, t2) => e2 in r2 ? On(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, W$1 = (r2, e2, t2) => Rn$1(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let Di$1 = class Di {
  constructor(e2, t2) {
    this.core = e2, this.logger = t2, W$1(this, "keychain", /* @__PURE__ */ new Map()), W$1(this, "name", Pt$2), W$1(this, "version", St$3), W$1(this, "initialized", false), W$1(this, "storagePrefix", B$2), W$1(this, "init", async () => {
      if (!this.initialized) {
        const i2 = await this.getKeyChain();
        typeof i2 < "u" && (this.keychain = i2), this.initialized = true;
      }
    }), W$1(this, "has", (i2) => (this.isInitialized(), this.keychain.has(i2))), W$1(this, "set", async (i2, s2) => {
      this.isInitialized(), this.keychain.set(i2, s2), await this.persist();
    }), W$1(this, "get", (i2) => {
      this.isInitialized();
      const s2 = this.keychain.get(i2);
      if (typeof s2 > "u") {
        const { message: n3 } = ht$3("NO_MATCHING_KEY", `${this.name}: ${i2}`);
        throw new Error(n3);
      }
      return s2;
    }), W$1(this, "del", async (i2) => {
      this.isInitialized(), this.keychain.delete(i2), await this.persist();
    }), this.core = e2, this.logger = E$4(t2, this.name);
  }
  get context() {
    return y$6(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  async setKeyChain(e2) {
    await this.core.storage.setItem(this.storageKey, fi$1(e2));
  }
  async getKeyChain() {
    const e2 = await this.core.storage.getItem(this.storageKey);
    return typeof e2 < "u" ? li$1(e2) : void 0;
  }
  async persist() {
    await this.setKeyChain(this.keychain);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
};
var An = Object.defineProperty, xn = (r2, e2, t2) => e2 in r2 ? An(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, S$3 = (r2, e2, t2) => xn(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let vi$1 = class vi {
  constructor(e2, t2, i2) {
    this.core = e2, this.logger = t2, S$3(this, "name", Tt$2), S$3(this, "keychain"), S$3(this, "randomSessionIdentifier", jc()), S$3(this, "initialized", false), S$3(this, "init", async () => {
      this.initialized || (await this.keychain.init(), this.initialized = true);
    }), S$3(this, "hasKeys", (s2) => (this.isInitialized(), this.keychain.has(s2))), S$3(this, "getClientId", async () => {
      this.isInitialized();
      const s2 = await this.getClientSeed(), n3 = Po$1(s2);
      return Qe$4(n3.publicKey);
    }), S$3(this, "generateKeyPair", () => {
      this.isInitialized();
      const s2 = Lc();
      return this.setPrivateKey(s2.publicKey, s2.privateKey);
    }), S$3(this, "signJWT", async (s2) => {
      this.isInitialized();
      const n3 = await this.getClientSeed(), o2 = Po$1(n3), a2 = this.randomSessionIdentifier, c2 = Ct$1;
      return await Qo(a2, s2, c2, o2);
    }), S$3(this, "generateSharedKey", (s2, n3, o2) => {
      this.isInitialized();
      const a2 = this.getPrivateKey(s2), c2 = Cc(a2, n3);
      return this.setSymKey(c2, o2);
    }), S$3(this, "setSymKey", async (s2, n3) => {
      this.isInitialized();
      const o2 = n3 || Pc$1(s2);
      return await this.keychain.set(o2, s2), o2;
    }), S$3(this, "deleteKeyPair", async (s2) => {
      this.isInitialized(), await this.keychain.del(s2);
    }), S$3(this, "deleteSymKey", async (s2) => {
      this.isInitialized(), await this.keychain.del(s2);
    }), S$3(this, "encode", async (s2, n3, o2) => {
      this.isInitialized();
      const a2 = oo$1(o2), c2 = safeJsonStringify(n3);
      if (Fc(a2)) return Dc(c2, o2?.encoding);
      if (Kc(a2)) {
        const g2 = a2.senderPublicKey, _2 = a2.receiverPublicKey;
        s2 = await this.generateSharedKey(g2, _2);
      }
      const h3 = this.getSymKey(s2), { type: l2, senderPublicKey: d3 } = a2;
      return Vc({ type: l2, symKey: h3, message: c2, senderPublicKey: d3, encoding: o2?.encoding });
    }), S$3(this, "decode", async (s2, n3, o2) => {
      this.isInitialized();
      const a2 = qc(n3, o2);
      if (Fc(a2)) {
        const c2 = Hc(n3, o2?.encoding);
        return safeJsonParse(c2);
      }
      if (Kc(a2)) {
        const c2 = a2.receiverPublicKey, h3 = a2.senderPublicKey;
        s2 = await this.generateSharedKey(c2, h3);
      }
      try {
        const c2 = this.getSymKey(s2), h3 = Mc({ symKey: c2, encoded: n3, encoding: o2?.encoding });
        return safeJsonParse(h3);
      } catch (c2) {
        this.logger.error(`Failed to decode message from topic: '${s2}', clientId: '${await this.getClientId()}'`), this.logger.error(c2);
      }
    }), S$3(this, "getPayloadType", (s2, n3 = qt$3) => {
      const o2 = Se$1({ encoded: s2, encoding: n3 });
      return Bt$2(o2.type);
    }), S$3(this, "getPayloadSenderPublicKey", (s2, n3 = qt$3) => {
      const o2 = Se$1({ encoded: s2, encoding: n3 });
      return o2.senderPublicKey ? toString(o2.senderPublicKey, G$2) : void 0;
    }), this.core = e2, this.logger = E$4(t2, this.name), this.keychain = i2 || new Di$1(this.core, this.logger);
  }
  get context() {
    return y$6(this.logger);
  }
  async setPrivateKey(e2, t2) {
    return await this.keychain.set(e2, t2), e2;
  }
  getPrivateKey(e2) {
    return this.keychain.get(e2);
  }
  async getClientSeed() {
    let e2 = "";
    try {
      e2 = this.keychain.get(ke$3);
    } catch {
      e2 = jc(), await this.keychain.set(ke$3, e2);
    }
    return Sn(e2, "base16");
  }
  getSymKey(e2) {
    return this.keychain.get(e2);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
};
var Nn = Object.defineProperty, $n$1 = Object.defineProperties, zn$1 = Object.getOwnPropertyDescriptors, wi = Object.getOwnPropertySymbols, Ln = Object.prototype.hasOwnProperty, kn = Object.prototype.propertyIsEnumerable, Ve$2 = (r2, e2, t2) => e2 in r2 ? Nn(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, jn = (r2, e2) => {
  for (var t2 in e2 || (e2 = {})) Ln.call(e2, t2) && Ve$2(r2, t2, e2[t2]);
  if (wi) for (var t2 of wi(e2)) kn.call(e2, t2) && Ve$2(r2, t2, e2[t2]);
  return r2;
}, Un = (r2, e2) => $n$1(r2, zn$1(e2)), k$3 = (r2, e2, t2) => Ve$2(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let _i$1 = class _i extends y$4 {
  constructor(e2, t2) {
    super(e2, t2), this.logger = e2, this.core = t2, k$3(this, "messages", /* @__PURE__ */ new Map()), k$3(this, "messagesWithoutClientAck", /* @__PURE__ */ new Map()), k$3(this, "name", Ot$1), k$3(this, "version", Rt$2), k$3(this, "initialized", false), k$3(this, "storagePrefix", B$2), k$3(this, "init", async () => {
      if (!this.initialized) {
        this.logger.trace("Initialized");
        try {
          const i2 = await this.getRelayerMessages();
          typeof i2 < "u" && (this.messages = i2);
          const s2 = await this.getRelayerMessagesWithoutClientAck();
          typeof s2 < "u" && (this.messagesWithoutClientAck = s2), this.logger.debug(`Successfully Restored records for ${this.name}`), this.logger.trace({ type: "method", method: "restore", size: this.messages.size });
        } catch (i2) {
          this.logger.debug(`Failed to Restore records for ${this.name}`), this.logger.error(i2);
        } finally {
          this.initialized = true;
        }
      }
    }), k$3(this, "set", async (i2, s2, n3) => {
      this.isInitialized();
      const o2 = kc$1(s2);
      let a2 = this.messages.get(i2);
      if (typeof a2 > "u" && (a2 = {}), typeof a2[o2] < "u") return o2;
      if (a2[o2] = s2, this.messages.set(i2, a2), n3 === le$2.inbound) {
        const c2 = this.messagesWithoutClientAck.get(i2) || {};
        this.messagesWithoutClientAck.set(i2, Un(jn({}, c2), { [o2]: s2 }));
      }
      return await this.persist(), o2;
    }), k$3(this, "get", (i2) => {
      this.isInitialized();
      let s2 = this.messages.get(i2);
      return typeof s2 > "u" && (s2 = {}), s2;
    }), k$3(this, "getWithoutAck", (i2) => {
      this.isInitialized();
      const s2 = {};
      for (const n3 of i2) {
        const o2 = this.messagesWithoutClientAck.get(n3) || {};
        s2[n3] = Object.values(o2);
      }
      return s2;
    }), k$3(this, "has", (i2, s2) => {
      this.isInitialized();
      const n3 = this.get(i2), o2 = kc$1(s2);
      return typeof n3[o2] < "u";
    }), k$3(this, "ack", async (i2, s2) => {
      this.isInitialized();
      const n3 = this.messagesWithoutClientAck.get(i2);
      if (typeof n3 > "u") return;
      const o2 = kc$1(s2);
      delete n3[o2], Object.keys(n3).length === 0 ? this.messagesWithoutClientAck.delete(i2) : this.messagesWithoutClientAck.set(i2, n3), await this.persist();
    }), k$3(this, "del", async (i2) => {
      this.isInitialized(), this.messages.delete(i2), this.messagesWithoutClientAck.delete(i2), await this.persist();
    }), this.logger = E$4(e2, this.name), this.core = t2;
  }
  get context() {
    return y$6(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get storageKeyWithoutClientAck() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name + "_withoutClientAck";
  }
  async setRelayerMessages(e2) {
    await this.core.storage.setItem(this.storageKey, fi$1(e2));
  }
  async setRelayerMessagesWithoutClientAck(e2) {
    await this.core.storage.setItem(this.storageKeyWithoutClientAck, fi$1(e2));
  }
  async getRelayerMessages() {
    const e2 = await this.core.storage.getItem(this.storageKey);
    return typeof e2 < "u" ? li$1(e2) : void 0;
  }
  async getRelayerMessagesWithoutClientAck() {
    const e2 = await this.core.storage.getItem(this.storageKeyWithoutClientAck);
    return typeof e2 < "u" ? li$1(e2) : void 0;
  }
  async persist() {
    await this.setRelayerMessages(this.messages), await this.setRelayerMessagesWithoutClientAck(this.messagesWithoutClientAck);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
};
var Fn$1 = Object.defineProperty, Mn = Object.defineProperties, Kn$1 = Object.getOwnPropertyDescriptors, Ei$1 = Object.getOwnPropertySymbols, Bn = Object.prototype.hasOwnProperty, Vn = Object.prototype.propertyIsEnumerable, qe$2 = (r2, e2, t2) => e2 in r2 ? Fn$1(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, Ie$1 = (r2, e2) => {
  for (var t2 in e2 || (e2 = {})) Bn.call(e2, t2) && qe$2(r2, t2, e2[t2]);
  if (Ei$1) for (var t2 of Ei$1(e2)) Vn.call(e2, t2) && qe$2(r2, t2, e2[t2]);
  return r2;
}, Ge$2 = (r2, e2) => Mn(r2, Kn$1(e2)), V$4 = (r2, e2, t2) => qe$2(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
class qn extends m$1 {
  constructor(e2, t2) {
    super(e2, t2), this.relayer = e2, this.logger = t2, V$4(this, "events", new eventsExports.EventEmitter()), V$4(this, "name", At$1), V$4(this, "queue", /* @__PURE__ */ new Map()), V$4(this, "publishTimeout", cjsExports.toMiliseconds(cjsExports.ONE_MINUTE)), V$4(this, "initialPublishTimeout", cjsExports.toMiliseconds(cjsExports.ONE_SECOND * 15)), V$4(this, "needsTransportRestart", false), V$4(this, "publish", async (i2, s2, n3) => {
      var o2;
      this.logger.debug("Publishing Payload"), this.logger.trace({ type: "method", method: "publish", params: { topic: i2, message: s2, opts: n3 } });
      const a2 = n3?.ttl || je$1, c2 = Zc(n3), h3 = n3?.prompt || false, l2 = n3?.tag || 0, d3 = n3?.id || getBigIntRpcId().toString(), g2 = { topic: i2, message: s2, opts: { ttl: a2, relay: c2, prompt: h3, tag: l2, id: d3, attestation: n3?.attestation, tvf: n3?.tvf } }, _2 = `Failed to publish payload, please try again. id:${d3} tag:${l2}`;
      try {
        const u2 = new Promise(async (b2) => {
          const x2 = ({ id: D2 }) => {
            g2.opts.id === D2 && (this.removeRequestFromQueue(D2), this.relayer.events.removeListener(C$2.publish, x2), b2(g2));
          };
          this.relayer.events.on(C$2.publish, x2);
          const I3 = yi$1(new Promise((D2, j2) => {
            this.rpcPublish({ topic: i2, message: s2, ttl: a2, prompt: h3, tag: l2, id: d3, attestation: n3?.attestation, tvf: n3?.tvf }).then(D2).catch((T2) => {
              this.logger.warn(T2, T2?.message), j2(T2);
            });
          }), this.initialPublishTimeout, `Failed initial publish, retrying.... id:${d3} tag:${l2}`);
          try {
            await I3, this.events.removeListener(C$2.publish, x2);
          } catch (D2) {
            this.queue.set(d3, Ge$2(Ie$1({}, g2), { attempt: 1 })), this.logger.warn(D2, D2?.message);
          }
        });
        this.logger.trace({ type: "method", method: "publish", params: { id: d3, topic: i2, message: s2, opts: n3 } }), await yi$1(u2, this.publishTimeout, _2);
      } catch (u2) {
        if (this.logger.debug("Failed to Publish Payload"), this.logger.error(u2), (o2 = n3?.internal) != null && o2.throwOnFailedPublish) throw u2;
      } finally {
        this.queue.delete(d3);
      }
    }), V$4(this, "on", (i2, s2) => {
      this.events.on(i2, s2);
    }), V$4(this, "once", (i2, s2) => {
      this.events.once(i2, s2);
    }), V$4(this, "off", (i2, s2) => {
      this.events.off(i2, s2);
    }), V$4(this, "removeListener", (i2, s2) => {
      this.events.removeListener(i2, s2);
    }), this.relayer = e2, this.logger = E$4(t2, this.name), this.registerEventListeners();
  }
  get context() {
    return y$6(this.logger);
  }
  async rpcPublish(e2) {
    var t2, i2, s2, n3;
    const { topic: o2, message: a2, ttl: c2 = je$1, prompt: h3, tag: l2, id: d3, attestation: g2, tvf: _2 } = e2, u2 = { method: Yc(Zc().protocol).publish, params: Ie$1({ topic: o2, message: a2, ttl: c2, prompt: h3, tag: l2, attestation: g2 }, _2), id: d3 };
    Et$3((t2 = u2.params) == null ? void 0 : t2.prompt) && ((i2 = u2.params) == null || delete i2.prompt), Et$3((s2 = u2.params) == null ? void 0 : s2.tag) && ((n3 = u2.params) == null || delete n3.tag), this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "message", direction: "outgoing", request: u2 });
    const b2 = await this.relayer.request(u2);
    return this.relayer.events.emit(C$2.publish, e2), this.logger.debug("Successfully Published Payload"), b2;
  }
  removeRequestFromQueue(e2) {
    this.queue.delete(e2);
  }
  checkQueue() {
    this.queue.forEach(async (e2, t2) => {
      const i2 = e2.attempt + 1;
      this.queue.set(t2, Ge$2(Ie$1({}, e2), { attempt: i2 }));
      const { topic: s2, message: n3, opts: o2, attestation: a2 } = e2;
      this.logger.warn({}, `Publisher: queue->publishing: ${e2.opts.id}, tag: ${e2.opts.tag}, attempt: ${i2}`), await this.rpcPublish(Ge$2(Ie$1({}, e2), { topic: s2, message: n3, ttl: o2.ttl, prompt: o2.prompt, tag: o2.tag, id: o2.id, attestation: a2, tvf: o2.tvf })), this.logger.warn({}, `Publisher: queue->published: ${e2.opts.id}`);
    });
  }
  registerEventListeners() {
    this.relayer.core.heartbeat.on(r$3.pulse, () => {
      if (this.needsTransportRestart) {
        this.needsTransportRestart = false, this.relayer.events.emit(C$2.connection_stalled);
        return;
      }
      this.checkQueue();
    }), this.relayer.on(C$2.message_ack, (e2) => {
      this.removeRequestFromQueue(e2.id.toString());
    });
  }
}
var Gn$1 = Object.defineProperty, Wn$1 = (r2, e2, t2) => e2 in r2 ? Gn$1(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, ne$2 = (r2, e2, t2) => Wn$1(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
class Hn {
  constructor() {
    ne$2(this, "map", /* @__PURE__ */ new Map()), ne$2(this, "set", (e2, t2) => {
      const i2 = this.get(e2);
      this.exists(e2, t2) || this.map.set(e2, [...i2, t2]);
    }), ne$2(this, "get", (e2) => this.map.get(e2) || []), ne$2(this, "exists", (e2, t2) => this.get(e2).includes(t2)), ne$2(this, "delete", (e2, t2) => {
      if (typeof t2 > "u") {
        this.map.delete(e2);
        return;
      }
      if (!this.map.has(e2)) return;
      const i2 = this.get(e2);
      if (!this.exists(e2, t2)) return;
      const s2 = i2.filter((n3) => n3 !== t2);
      if (!s2.length) {
        this.map.delete(e2);
        return;
      }
      this.map.set(e2, s2);
    }), ne$2(this, "clear", () => {
      this.map.clear();
    });
  }
  get topics() {
    return Array.from(this.map.keys());
  }
}
var Yn$1 = Object.defineProperty, Jn$1 = Object.defineProperties, Xn$1 = Object.getOwnPropertyDescriptors, Ii$1 = Object.getOwnPropertySymbols, Zn$1 = Object.prototype.hasOwnProperty, Qn$1 = Object.prototype.propertyIsEnumerable, We$2 = (r2, e2, t2) => e2 in r2 ? Yn$1(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, ge$2 = (r2, e2) => {
  for (var t2 in e2 || (e2 = {})) Zn$1.call(e2, t2) && We$2(r2, t2, e2[t2]);
  if (Ii$1) for (var t2 of Ii$1(e2)) Qn$1.call(e2, t2) && We$2(r2, t2, e2[t2]);
  return r2;
}, He$2 = (r2, e2) => Jn$1(r2, Xn$1(e2)), f$2 = (r2, e2, t2) => We$2(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let Ti$1 = class Ti extends P$2 {
  constructor(e2, t2) {
    super(e2, t2), this.relayer = e2, this.logger = t2, f$2(this, "subscriptions", /* @__PURE__ */ new Map()), f$2(this, "topicMap", new Hn()), f$2(this, "events", new eventsExports.EventEmitter()), f$2(this, "name", Ut$1), f$2(this, "version", Ft$2), f$2(this, "pending", /* @__PURE__ */ new Map()), f$2(this, "cached", []), f$2(this, "initialized", false), f$2(this, "storagePrefix", B$2), f$2(this, "subscribeTimeout", cjsExports.toMiliseconds(cjsExports.ONE_MINUTE)), f$2(this, "initialSubscribeTimeout", cjsExports.toMiliseconds(cjsExports.ONE_SECOND * 15)), f$2(this, "clientId"), f$2(this, "batchSubscribeTopicsLimit", 500), f$2(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), this.registerEventListeners(), await this.restore()), this.initialized = true;
    }), f$2(this, "subscribe", async (i2, s2) => {
      this.isInitialized(), this.logger.debug("Subscribing Topic"), this.logger.trace({ type: "method", method: "subscribe", params: { topic: i2, opts: s2 } });
      try {
        const n3 = Zc(s2), o2 = { topic: i2, relay: n3, transportType: s2?.transportType };
        this.pending.set(i2, o2);
        const a2 = await this.rpcSubscribe(i2, n3, s2);
        return typeof a2 == "string" && (this.onSubscribe(a2, o2), this.logger.debug("Successfully Subscribed Topic"), this.logger.trace({ type: "method", method: "subscribe", params: { topic: i2, opts: s2 } })), a2;
      } catch (n3) {
        throw this.logger.debug("Failed to Subscribe Topic"), this.logger.error(n3), n3;
      }
    }), f$2(this, "unsubscribe", async (i2, s2) => {
      this.isInitialized(), typeof s2?.id < "u" ? await this.unsubscribeById(i2, s2.id, s2) : await this.unsubscribeByTopic(i2, s2);
    }), f$2(this, "isSubscribed", (i2) => new Promise((s2) => {
      s2(this.topicMap.topics.includes(i2));
    })), f$2(this, "isKnownTopic", (i2) => new Promise((s2) => {
      s2(this.topicMap.topics.includes(i2) || this.pending.has(i2) || this.cached.some((n3) => n3.topic === i2));
    })), f$2(this, "on", (i2, s2) => {
      this.events.on(i2, s2);
    }), f$2(this, "once", (i2, s2) => {
      this.events.once(i2, s2);
    }), f$2(this, "off", (i2, s2) => {
      this.events.off(i2, s2);
    }), f$2(this, "removeListener", (i2, s2) => {
      this.events.removeListener(i2, s2);
    }), f$2(this, "start", async () => {
      await this.onConnect();
    }), f$2(this, "stop", async () => {
      await this.onDisconnect();
    }), f$2(this, "restart", async () => {
      await this.restore(), await this.onRestart();
    }), f$2(this, "checkPending", async () => {
      if (this.pending.size === 0 && (!this.initialized || !this.relayer.connected)) return;
      const i2 = [];
      this.pending.forEach((s2) => {
        i2.push(s2);
      }), await this.batchSubscribe(i2);
    }), f$2(this, "registerEventListeners", () => {
      this.relayer.core.heartbeat.on(r$3.pulse, async () => {
        await this.checkPending();
      }), this.events.on($$3.created, async (i2) => {
        const s2 = $$3.created;
        this.logger.info(`Emitting ${s2}`), this.logger.debug({ type: "event", event: s2, data: i2 }), await this.persist();
      }), this.events.on($$3.deleted, async (i2) => {
        const s2 = $$3.deleted;
        this.logger.info(`Emitting ${s2}`), this.logger.debug({ type: "event", event: s2, data: i2 }), await this.persist();
      });
    }), this.relayer = e2, this.logger = E$4(t2, this.name), this.clientId = "";
  }
  get context() {
    return y$6(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.relayer.core.customStoragePrefix + "//" + this.name;
  }
  get length() {
    return this.subscriptions.size;
  }
  get ids() {
    return Array.from(this.subscriptions.keys());
  }
  get values() {
    return Array.from(this.subscriptions.values());
  }
  get topics() {
    return this.topicMap.topics;
  }
  get hasAnyTopics() {
    return this.topicMap.topics.length > 0 || this.pending.size > 0 || this.cached.length > 0 || this.subscriptions.size > 0;
  }
  hasSubscription(e2, t2) {
    let i2 = false;
    try {
      i2 = this.getSubscription(e2).topic === t2;
    } catch {
    }
    return i2;
  }
  reset() {
    this.cached = [], this.initialized = true;
  }
  onDisable() {
    this.values.length > 0 && (this.cached = this.values), this.subscriptions.clear(), this.topicMap.clear();
  }
  async unsubscribeByTopic(e2, t2) {
    const i2 = this.topicMap.get(e2);
    await Promise.all(i2.map(async (s2) => await this.unsubscribeById(e2, s2, t2)));
  }
  async unsubscribeById(e2, t2, i2) {
    this.logger.debug("Unsubscribing Topic"), this.logger.trace({ type: "method", method: "unsubscribe", params: { topic: e2, id: t2, opts: i2 } });
    try {
      const s2 = Zc(i2);
      await this.restartToComplete({ topic: e2, id: t2, relay: s2 }), await this.rpcUnsubscribe(e2, t2, s2);
      const n3 = Nt$2("USER_DISCONNECTED", `${this.name}, ${e2}`);
      await this.onUnsubscribe(e2, t2, n3), this.logger.debug("Successfully Unsubscribed Topic"), this.logger.trace({ type: "method", method: "unsubscribe", params: { topic: e2, id: t2, opts: i2 } });
    } catch (s2) {
      throw this.logger.debug("Failed to Unsubscribe Topic"), this.logger.error(s2), s2;
    }
  }
  async rpcSubscribe(e2, t2, i2) {
    var s2;
    (!i2 || i2?.transportType === Q$1.relay) && await this.restartToComplete({ topic: e2, id: e2, relay: t2 });
    const n3 = { method: Yc(t2.protocol).subscribe, params: { topic: e2 } };
    this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: n3 });
    const o2 = (s2 = i2?.internal) == null ? void 0 : s2.throwOnFailedPublish;
    try {
      const a2 = await this.getSubscriptionId(e2);
      if (i2?.transportType === Q$1.link_mode) return setTimeout(() => {
        (this.relayer.connected || this.relayer.connecting) && this.relayer.request(n3).catch((l2) => this.logger.warn(l2));
      }, cjsExports.toMiliseconds(cjsExports.ONE_SECOND)), a2;
      const c2 = new Promise(async (l2) => {
        const d3 = (g2) => {
          g2.topic === e2 && (this.events.removeListener($$3.created, d3), l2(g2.id));
        };
        this.events.on($$3.created, d3);
        try {
          const g2 = await yi$1(new Promise((_2, u2) => {
            this.relayer.request(n3).catch((b2) => {
              this.logger.warn(b2, b2?.message), u2(b2);
            }).then(_2);
          }), this.initialSubscribeTimeout, `Subscribing to ${e2} failed, please try again`);
          this.events.removeListener($$3.created, d3), l2(g2);
        } catch {
        }
      }), h3 = await yi$1(c2, this.subscribeTimeout, `Subscribing to ${e2} failed, please try again`);
      if (!h3 && o2) throw new Error(`Subscribing to ${e2} failed, please try again`);
      return h3 ? a2 : null;
    } catch (a2) {
      if (this.logger.debug("Outgoing Relay Subscribe Payload stalled"), this.relayer.events.emit(C$2.connection_stalled), o2) throw a2;
    }
    return null;
  }
  async rpcBatchSubscribe(e2) {
    if (!e2.length) return;
    const t2 = e2[0].relay, i2 = { method: Yc(t2.protocol).batchSubscribe, params: { topics: e2.map((s2) => s2.topic) } };
    this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: i2 });
    try {
      await await yi$1(new Promise((s2) => {
        this.relayer.request(i2).catch((n3) => this.logger.warn(n3)).then(s2);
      }), this.subscribeTimeout, "rpcBatchSubscribe failed, please try again");
    } catch {
      this.relayer.events.emit(C$2.connection_stalled);
    }
  }
  async rpcBatchFetchMessages(e2) {
    if (!e2.length) return;
    const t2 = e2[0].relay, i2 = { method: Yc(t2.protocol).batchFetchMessages, params: { topics: e2.map((n3) => n3.topic) } };
    this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: i2 });
    let s2;
    try {
      s2 = await await yi$1(new Promise((n3, o2) => {
        this.relayer.request(i2).catch((a2) => {
          this.logger.warn(a2), o2(a2);
        }).then(n3);
      }), this.subscribeTimeout, "rpcBatchFetchMessages failed, please try again");
    } catch {
      this.relayer.events.emit(C$2.connection_stalled);
    }
    return s2;
  }
  rpcUnsubscribe(e2, t2, i2) {
    const s2 = { method: Yc(i2.protocol).unsubscribe, params: { topic: e2, id: t2 } };
    return this.logger.debug("Outgoing Relay Payload"), this.logger.trace({ type: "payload", direction: "outgoing", request: s2 }), this.relayer.request(s2);
  }
  onSubscribe(e2, t2) {
    this.setSubscription(e2, He$2(ge$2({}, t2), { id: e2 })), this.pending.delete(t2.topic);
  }
  onBatchSubscribe(e2) {
    e2.length && e2.forEach((t2) => {
      this.setSubscription(t2.id, ge$2({}, t2)), this.pending.delete(t2.topic);
    });
  }
  async onUnsubscribe(e2, t2, i2) {
    this.events.removeAllListeners(t2), this.hasSubscription(t2, e2) && this.deleteSubscription(t2, i2), await this.relayer.messages.del(e2);
  }
  async setRelayerSubscriptions(e2) {
    await this.relayer.core.storage.setItem(this.storageKey, e2);
  }
  async getRelayerSubscriptions() {
    return await this.relayer.core.storage.getItem(this.storageKey);
  }
  setSubscription(e2, t2) {
    this.logger.debug("Setting subscription"), this.logger.trace({ type: "method", method: "setSubscription", id: e2, subscription: t2 }), this.addSubscription(e2, t2);
  }
  addSubscription(e2, t2) {
    this.subscriptions.set(e2, ge$2({}, t2)), this.topicMap.set(t2.topic, e2), this.events.emit($$3.created, t2);
  }
  getSubscription(e2) {
    this.logger.debug("Getting subscription"), this.logger.trace({ type: "method", method: "getSubscription", id: e2 });
    const t2 = this.subscriptions.get(e2);
    if (!t2) {
      const { message: i2 } = ht$3("NO_MATCHING_KEY", `${this.name}: ${e2}`);
      throw new Error(i2);
    }
    return t2;
  }
  deleteSubscription(e2, t2) {
    this.logger.debug("Deleting subscription"), this.logger.trace({ type: "method", method: "deleteSubscription", id: e2, reason: t2 });
    const i2 = this.getSubscription(e2);
    this.subscriptions.delete(e2), this.topicMap.delete(i2.topic, e2), this.events.emit($$3.deleted, He$2(ge$2({}, i2), { reason: t2 }));
  }
  async persist() {
    await this.setRelayerSubscriptions(this.values), this.events.emit($$3.sync);
  }
  async onRestart() {
    if (this.cached.length) {
      const e2 = [...this.cached], t2 = Math.ceil(this.cached.length / this.batchSubscribeTopicsLimit);
      for (let i2 = 0; i2 < t2; i2++) {
        const s2 = e2.splice(0, this.batchSubscribeTopicsLimit);
        await this.batchSubscribe(s2);
      }
    }
    this.events.emit($$3.resubscribed);
  }
  async restore() {
    try {
      const e2 = await this.getRelayerSubscriptions();
      if (typeof e2 > "u" || !e2.length) return;
      if (this.subscriptions.size) {
        const { message: t2 } = ht$3("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t2), this.logger.error(`${this.name}: ${JSON.stringify(this.values)}`), new Error(t2);
      }
      this.cached = e2, this.logger.debug(`Successfully Restored subscriptions for ${this.name}`), this.logger.trace({ type: "method", method: "restore", subscriptions: this.values });
    } catch (e2) {
      this.logger.debug(`Failed to Restore subscriptions for ${this.name}`), this.logger.error(e2);
    }
  }
  async batchSubscribe(e2) {
    e2.length && (await this.rpcBatchSubscribe(e2), this.onBatchSubscribe(await Promise.all(e2.map(async (t2) => He$2(ge$2({}, t2), { id: await this.getSubscriptionId(t2.topic) })))));
  }
  async batchFetchMessages(e2) {
    if (!e2.length) return;
    this.logger.trace(`Fetching batch messages for ${e2.length} subscriptions`);
    const t2 = await this.rpcBatchFetchMessages(e2);
    t2 && t2.messages && (await Ni$1(cjsExports.toMiliseconds(cjsExports.ONE_SECOND)), await this.relayer.handleBatchMessageEvents(t2.messages));
  }
  async onConnect() {
    await this.restart(), this.reset();
  }
  onDisconnect() {
    this.onDisable();
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
  async restartToComplete(e2) {
    !this.relayer.connected && !this.relayer.connecting && (this.cached.push(e2), await this.relayer.transportOpen());
  }
  async getClientId() {
    return this.clientId || (this.clientId = await this.relayer.core.crypto.getClientId()), this.clientId;
  }
  async getSubscriptionId(e2) {
    return kc$1(e2 + await this.getClientId());
  }
};
var eo = Object.defineProperty, Ci$1 = Object.getOwnPropertySymbols, to$1 = Object.prototype.hasOwnProperty, io = Object.prototype.propertyIsEnumerable, Ye$2 = (r2, e2, t2) => e2 in r2 ? eo(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, Pi$1 = (r2, e2) => {
  for (var t2 in e2 || (e2 = {})) to$1.call(e2, t2) && Ye$2(r2, t2, e2[t2]);
  if (Ci$1) for (var t2 of Ci$1(e2)) io.call(e2, t2) && Ye$2(r2, t2, e2[t2]);
  return r2;
}, y$3 = (r2, e2, t2) => Ye$2(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let Si$1 = class Si extends d$3 {
  constructor(e2) {
    super(e2), y$3(this, "protocol", "wc"), y$3(this, "version", 2), y$3(this, "core"), y$3(this, "logger"), y$3(this, "events", new eventsExports.EventEmitter()), y$3(this, "provider"), y$3(this, "messages"), y$3(this, "subscriber"), y$3(this, "publisher"), y$3(this, "name", $t$1), y$3(this, "transportExplicitlyClosed", false), y$3(this, "initialized", false), y$3(this, "connectionAttemptInProgress", false), y$3(this, "relayUrl"), y$3(this, "projectId"), y$3(this, "packageName"), y$3(this, "bundleId"), y$3(this, "hasExperiencedNetworkDisruption", false), y$3(this, "pingTimeout"), y$3(this, "heartBeatTimeout", cjsExports.toMiliseconds(cjsExports.THIRTY_SECONDS + cjsExports.FIVE_SECONDS)), y$3(this, "reconnectTimeout"), y$3(this, "connectPromise"), y$3(this, "reconnectInProgress", false), y$3(this, "requestsInFlight", []), y$3(this, "connectTimeout", cjsExports.toMiliseconds(cjsExports.ONE_SECOND * 15)), y$3(this, "request", async (t2) => {
      var i2, s2;
      this.logger.debug("Publishing Request Payload");
      const n3 = t2.id || getBigIntRpcId().toString();
      await this.toEstablishConnection();
      try {
        this.logger.trace({ id: n3, method: t2.method, topic: (i2 = t2.params) == null ? void 0 : i2.topic }, "relayer.request - publishing...");
        const o2 = `${n3}:${((s2 = t2.params) == null ? void 0 : s2.tag) || ""}`;
        this.requestsInFlight.push(o2);
        const a2 = await this.provider.request(t2);
        return this.requestsInFlight = this.requestsInFlight.filter((c2) => c2 !== o2), a2;
      } catch (o2) {
        throw this.logger.debug(`Failed to Publish Request: ${n3}`), o2;
      }
    }), y$3(this, "resetPingTimeout", () => {
      _e$4() && (clearTimeout(this.pingTimeout), this.pingTimeout = setTimeout(() => {
        var t2, i2, s2, n3;
        try {
          this.logger.debug({}, "pingTimeout: Connection stalled, terminating..."), (n3 = (s2 = (i2 = (t2 = this.provider) == null ? void 0 : t2.connection) == null ? void 0 : i2.socket) == null ? void 0 : s2.terminate) == null || n3.call(s2);
        } catch (o2) {
          this.logger.warn(o2, o2?.message);
        }
      }, this.heartBeatTimeout));
    }), y$3(this, "onPayloadHandler", (t2) => {
      this.onProviderPayload(t2), this.resetPingTimeout();
    }), y$3(this, "onConnectHandler", () => {
      this.logger.warn({}, "Relayer connected 🛜"), this.startPingTimeout(), this.events.emit(C$2.connect);
    }), y$3(this, "onDisconnectHandler", () => {
      this.logger.warn({}, "Relayer disconnected 🛑"), this.requestsInFlight = [], this.onProviderDisconnect();
    }), y$3(this, "onProviderErrorHandler", (t2) => {
      this.logger.fatal(`Fatal socket error: ${t2.message}`), this.events.emit(C$2.error, t2), this.logger.fatal("Fatal socket error received, closing transport"), this.transportClose();
    }), y$3(this, "registerProviderListeners", () => {
      this.provider.on(L$2.payload, this.onPayloadHandler), this.provider.on(L$2.connect, this.onConnectHandler), this.provider.on(L$2.disconnect, this.onDisconnectHandler), this.provider.on(L$2.error, this.onProviderErrorHandler);
    }), this.core = e2.core, this.logger = typeof e2.logger < "u" && typeof e2.logger != "string" ? E$4(e2.logger, this.name) : Ot$3(k$4({ level: e2.logger || Nt$1 })), this.messages = new _i$1(this.logger, e2.core), this.subscriber = new Ti$1(this, this.logger), this.publisher = new qn(this, this.logger), this.relayUrl = e2?.relayUrl || Ue$2, this.projectId = e2.projectId, ei$1() ? this.packageName = ri$1() : ni$1() && (this.bundleId = ri$1()), this.provider = {};
  }
  async init() {
    if (this.logger.trace("Initialized"), this.registerEventListeners(), await Promise.all([this.messages.init(), this.subscriber.init()]), this.initialized = true, this.subscriber.hasAnyTopics) try {
      await this.transportOpen();
    } catch (e2) {
      this.logger.warn(e2, e2?.message);
    }
  }
  get context() {
    return y$6(this.logger);
  }
  get connected() {
    var e2, t2, i2;
    return ((i2 = (t2 = (e2 = this.provider) == null ? void 0 : e2.connection) == null ? void 0 : t2.socket) == null ? void 0 : i2.readyState) === 1 || false;
  }
  get connecting() {
    var e2, t2, i2;
    return ((i2 = (t2 = (e2 = this.provider) == null ? void 0 : e2.connection) == null ? void 0 : t2.socket) == null ? void 0 : i2.readyState) === 0 || this.connectPromise !== void 0 || false;
  }
  async publish(e2, t2, i2) {
    this.isInitialized(), await this.publisher.publish(e2, t2, i2), await this.recordMessageEvent({ topic: e2, message: t2, publishedAt: Date.now(), transportType: Q$1.relay }, le$2.outbound);
  }
  async subscribe(e2, t2) {
    var i2, s2, n3;
    this.isInitialized(), (!(t2 != null && t2.transportType) || t2?.transportType === "relay") && await this.toEstablishConnection();
    const o2 = typeof ((i2 = t2?.internal) == null ? void 0 : i2.throwOnFailedPublish) > "u" ? true : (s2 = t2?.internal) == null ? void 0 : s2.throwOnFailedPublish;
    let a2 = ((n3 = this.subscriber.topicMap.get(e2)) == null ? void 0 : n3[0]) || "", c2;
    const h3 = (l2) => {
      l2.topic === e2 && (this.subscriber.off($$3.created, h3), c2());
    };
    return await Promise.all([new Promise((l2) => {
      c2 = l2, this.subscriber.on($$3.created, h3);
    }), new Promise(async (l2, d3) => {
      a2 = await this.subscriber.subscribe(e2, Pi$1({ internal: { throwOnFailedPublish: o2 } }, t2)).catch((g2) => {
        o2 && d3(g2);
      }) || a2, l2();
    })]), a2;
  }
  async unsubscribe(e2, t2) {
    this.isInitialized(), await this.subscriber.unsubscribe(e2, t2);
  }
  on(e2, t2) {
    this.events.on(e2, t2);
  }
  once(e2, t2) {
    this.events.once(e2, t2);
  }
  off(e2, t2) {
    this.events.off(e2, t2);
  }
  removeListener(e2, t2) {
    this.events.removeListener(e2, t2);
  }
  async transportDisconnect() {
    this.provider.disconnect && (this.hasExperiencedNetworkDisruption || this.connected) ? await yi$1(this.provider.disconnect(), 2e3, "provider.disconnect()").catch(() => this.onProviderDisconnect()) : this.onProviderDisconnect();
  }
  async transportClose() {
    this.transportExplicitlyClosed = true, await this.transportDisconnect();
  }
  async transportOpen(e2) {
    if (!this.subscriber.hasAnyTopics) {
      this.logger.warn("Starting WS connection skipped because the client has no topics to work with.");
      return;
    }
    if (this.connectPromise ? (this.logger.debug({}, "Waiting for existing connection attempt to resolve..."), await this.connectPromise, this.logger.debug({}, "Existing connection attempt resolved")) : (this.connectPromise = new Promise(async (t2, i2) => {
      await this.connect(e2).then(t2).catch(i2).finally(() => {
        this.connectPromise = void 0;
      });
    }), await this.connectPromise), !this.connected) throw new Error(`Couldn't establish socket connection to the relay server: ${this.relayUrl}`);
  }
  async restartTransport(e2) {
    this.logger.debug({}, "Restarting transport..."), !this.connectionAttemptInProgress && (this.relayUrl = e2 || this.relayUrl, await this.confirmOnlineStateOrThrow(), await this.transportClose(), await this.transportOpen());
  }
  async confirmOnlineStateOrThrow() {
    if (!await Na()) throw new Error("No internet connection detected. Please restart your network and try again.");
  }
  async handleBatchMessageEvents(e2) {
    if (e2?.length === 0) {
      this.logger.trace("Batch message events is empty. Ignoring...");
      return;
    }
    const t2 = e2.sort((i2, s2) => i2.publishedAt - s2.publishedAt);
    this.logger.debug(`Batch of ${t2.length} message events sorted`);
    for (const i2 of t2) try {
      await this.onMessageEvent(i2);
    } catch (s2) {
      this.logger.warn(s2, "Error while processing batch message event: " + s2?.message);
    }
    this.logger.trace(`Batch of ${t2.length} message events processed`);
  }
  async onLinkMessageEvent(e2, t2) {
    const { topic: i2 } = e2;
    if (!t2.sessionExists) {
      const s2 = Ei$2(cjsExports.FIVE_MINUTES), n3 = { topic: i2, expiry: s2, relay: { protocol: "irn" }, active: false };
      await this.core.pairing.pairings.set(i2, n3);
    }
    this.events.emit(C$2.message, e2), await this.recordMessageEvent(e2, le$2.inbound);
  }
  async connect(e2) {
    await this.confirmOnlineStateOrThrow(), e2 && e2 !== this.relayUrl && (this.relayUrl = e2, await this.transportDisconnect()), this.connectionAttemptInProgress = true, this.transportExplicitlyClosed = false;
    let t2 = 1;
    for (; t2 < 6; ) {
      try {
        if (this.transportExplicitlyClosed) break;
        this.logger.debug({}, `Connecting to ${this.relayUrl}, attempt: ${t2}...`), await this.createProvider(), await new Promise(async (i2, s2) => {
          const n3 = () => {
            s2(new Error("Connection interrupted while trying to subscribe"));
          };
          this.provider.once(L$2.disconnect, n3), await yi$1(new Promise((o2, a2) => {
            this.provider.connect().then(o2).catch(a2);
          }), this.connectTimeout, `Socket stalled when trying to connect to ${this.relayUrl}`).catch((o2) => {
            s2(o2);
          }).finally(() => {
            this.provider.off(L$2.disconnect, n3), clearTimeout(this.reconnectTimeout);
          }), await new Promise(async (o2, a2) => {
            const c2 = () => {
              a2(new Error("Connection interrupted while trying to subscribe"));
            };
            this.provider.once(L$2.disconnect, c2), await this.subscriber.start().then(o2).catch(a2).finally(() => {
              this.provider.off(L$2.disconnect, c2);
            });
          }), this.hasExperiencedNetworkDisruption = false, i2();
        });
      } catch (i2) {
        await this.subscriber.stop();
        const s2 = i2;
        this.logger.warn({}, s2.message), this.hasExperiencedNetworkDisruption = true;
      } finally {
        this.connectionAttemptInProgress = false;
      }
      if (this.connected) {
        this.logger.debug({}, `Connected to ${this.relayUrl} successfully on attempt: ${t2}`);
        break;
      }
      await new Promise((i2) => setTimeout(i2, cjsExports.toMiliseconds(t2 * 1))), t2++;
    }
  }
  startPingTimeout() {
    var e2, t2, i2, s2, n3;
    if (_e$4()) try {
      (t2 = (e2 = this.provider) == null ? void 0 : e2.connection) != null && t2.socket && ((n3 = (s2 = (i2 = this.provider) == null ? void 0 : i2.connection) == null ? void 0 : s2.socket) == null || n3.on("ping", () => {
        this.resetPingTimeout();
      })), this.resetPingTimeout();
    } catch (o2) {
      this.logger.warn(o2, o2?.message);
    }
  }
  async createProvider() {
    this.provider.connection && this.unregisterProviderListeners();
    const e2 = await this.core.crypto.signJWT(this.relayUrl);
    this.provider = new o$4(new f$4(si$1({ sdkVersion: _e$3, protocol: this.protocol, version: this.version, relayUrl: this.relayUrl, projectId: this.projectId, auth: e2, useOnCloseEvent: true, bundleId: this.bundleId, packageName: this.packageName }))), this.registerProviderListeners();
  }
  async recordMessageEvent(e2, t2) {
    const { topic: i2, message: s2 } = e2;
    await this.messages.set(i2, s2, t2);
  }
  async shouldIgnoreMessageEvent(e2) {
    const { topic: t2, message: i2 } = e2;
    if (!i2 || i2.length === 0) return this.logger.warn(`Ignoring invalid/empty message: ${i2}`), true;
    if (!await this.subscriber.isKnownTopic(t2)) return this.logger.warn(`Ignoring message for unknown topic ${t2}`), true;
    const s2 = this.messages.has(t2, i2);
    return s2 && this.logger.warn(`Ignoring duplicate message: ${i2}`), s2;
  }
  async onProviderPayload(e2) {
    if (this.logger.debug("Incoming Relay Payload"), this.logger.trace({ type: "payload", direction: "incoming", payload: e2 }), isJsonRpcRequest(e2)) {
      if (!e2.method.endsWith(zt$1)) return;
      const t2 = e2.params, { topic: i2, message: s2, publishedAt: n3, attestation: o2 } = t2.data, a2 = { topic: i2, message: s2, publishedAt: n3, transportType: Q$1.relay, attestation: o2 };
      this.logger.debug("Emitting Relayer Payload"), this.logger.trace(Pi$1({ type: "event", event: t2.id }, a2)), this.events.emit(t2.id, a2), await this.acknowledgePayload(e2), await this.onMessageEvent(a2);
    } else isJsonRpcResponse(e2) && this.events.emit(C$2.message_ack, e2);
  }
  async onMessageEvent(e2) {
    await this.shouldIgnoreMessageEvent(e2) || (await this.recordMessageEvent(e2, le$2.inbound), this.events.emit(C$2.message, e2));
  }
  async acknowledgePayload(e2) {
    const t2 = formatJsonRpcResult(e2.id, true);
    await this.provider.connection.send(t2);
  }
  unregisterProviderListeners() {
    this.provider.off(L$2.payload, this.onPayloadHandler), this.provider.off(L$2.connect, this.onConnectHandler), this.provider.off(L$2.disconnect, this.onDisconnectHandler), this.provider.off(L$2.error, this.onProviderErrorHandler), clearTimeout(this.pingTimeout);
  }
  async registerEventListeners() {
    let e2 = await Na();
    Ua(async (t2) => {
      e2 !== t2 && (e2 = t2, t2 ? await this.transportOpen().catch((i2) => this.logger.error(i2, i2?.message)) : (this.hasExperiencedNetworkDisruption = true, await this.transportDisconnect(), this.transportExplicitlyClosed = false));
    }), this.core.heartbeat.on(r$3.pulse, async () => {
      if (!this.transportExplicitlyClosed && !this.connected && Ta()) try {
        await this.confirmOnlineStateOrThrow(), await this.transportOpen();
      } catch (t2) {
        this.logger.warn(t2, t2?.message);
      }
    });
  }
  async onProviderDisconnect() {
    clearTimeout(this.pingTimeout), this.events.emit(C$2.disconnect), this.connectionAttemptInProgress = false, !this.reconnectInProgress && (this.reconnectInProgress = true, await this.subscriber.stop(), this.subscriber.hasAnyTopics && (this.transportExplicitlyClosed || (this.reconnectTimeout = setTimeout(async () => {
      await this.transportOpen().catch((e2) => this.logger.error(e2, e2?.message)), this.reconnectTimeout = void 0, this.reconnectInProgress = false;
    }, cjsExports.toMiliseconds(Lt$2)))));
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
  async toEstablishConnection() {
    if (await this.confirmOnlineStateOrThrow(), !this.connected) {
      if (this.connectPromise) {
        await this.connectPromise;
        return;
      }
      await this.connect();
    }
  }
};
function so() {
}
function Oi$1(r2) {
  if (!r2 || typeof r2 != "object") return false;
  const e2 = Object.getPrototypeOf(r2);
  return e2 === null || e2 === Object.prototype || Object.getPrototypeOf(e2) === null ? Object.prototype.toString.call(r2) === "[object Object]" : false;
}
function Ri$1(r2) {
  return Object.getOwnPropertySymbols(r2).filter((e2) => Object.prototype.propertyIsEnumerable.call(r2, e2));
}
function Ai$1(r2) {
  return r2 == null ? r2 === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(r2);
}
const ro = "[object RegExp]", no = "[object String]", oo = "[object Number]", ao = "[object Boolean]", xi$1 = "[object Arguments]", co = "[object Symbol]", ho$1 = "[object Date]", lo$1 = "[object Map]", uo = "[object Set]", go$1 = "[object Array]", po$1 = "[object Function]", yo$1 = "[object ArrayBuffer]", Je$2 = "[object Object]", bo$1 = "[object Error]", mo$1 = "[object DataView]", fo$1 = "[object Uint8Array]", Do = "[object Uint8ClampedArray]", vo$1 = "[object Uint16Array]", wo$1 = "[object Uint32Array]", _o = "[object BigUint64Array]", Eo$1 = "[object Int8Array]", Io$1 = "[object Int16Array]", To = "[object Int32Array]", Co = "[object BigInt64Array]", Po = "[object Float32Array]", So$1 = "[object Float64Array]";
function Oo$1(r2, e2) {
  return r2 === e2 || Number.isNaN(r2) && Number.isNaN(e2);
}
function Ro(r2, e2, t2) {
  return pe$2(r2, e2, void 0, void 0, void 0, void 0, t2);
}
function pe$2(r2, e2, t2, i2, s2, n3, o2) {
  const a2 = o2(r2, e2, t2, i2, s2, n3);
  if (a2 !== void 0) return a2;
  if (typeof r2 == typeof e2) switch (typeof r2) {
    case "bigint":
    case "string":
    case "boolean":
    case "symbol":
    case "undefined":
      return r2 === e2;
    case "number":
      return r2 === e2 || Object.is(r2, e2);
    case "function":
      return r2 === e2;
    case "object":
      return ye$2(r2, e2, n3, o2);
  }
  return ye$2(r2, e2, n3, o2);
}
function ye$2(r2, e2, t2, i2) {
  if (Object.is(r2, e2)) return true;
  let s2 = Ai$1(r2), n3 = Ai$1(e2);
  if (s2 === xi$1 && (s2 = Je$2), n3 === xi$1 && (n3 = Je$2), s2 !== n3) return false;
  switch (s2) {
    case no:
      return r2.toString() === e2.toString();
    case oo: {
      const c2 = r2.valueOf(), h3 = e2.valueOf();
      return Oo$1(c2, h3);
    }
    case ao:
    case ho$1:
    case co:
      return Object.is(r2.valueOf(), e2.valueOf());
    case ro:
      return r2.source === e2.source && r2.flags === e2.flags;
    case po$1:
      return r2 === e2;
  }
  t2 = t2 ?? /* @__PURE__ */ new Map();
  const o2 = t2.get(r2), a2 = t2.get(e2);
  if (o2 != null && a2 != null) return o2 === e2;
  t2.set(r2, e2), t2.set(e2, r2);
  try {
    switch (s2) {
      case lo$1: {
        if (r2.size !== e2.size) return false;
        for (const [c2, h3] of r2.entries()) if (!e2.has(c2) || !pe$2(h3, e2.get(c2), c2, r2, e2, t2, i2)) return false;
        return true;
      }
      case uo: {
        if (r2.size !== e2.size) return false;
        const c2 = Array.from(r2.values()), h3 = Array.from(e2.values());
        for (let l2 = 0; l2 < c2.length; l2++) {
          const d3 = c2[l2], g2 = h3.findIndex((_2) => pe$2(d3, _2, void 0, r2, e2, t2, i2));
          if (g2 === -1) return false;
          h3.splice(g2, 1);
        }
        return true;
      }
      case go$1:
      case fo$1:
      case Do:
      case vo$1:
      case wo$1:
      case _o:
      case Eo$1:
      case Io$1:
      case To:
      case Co:
      case Po:
      case So$1: {
        if (typeof Buffer < "u" && Buffer.isBuffer(r2) !== Buffer.isBuffer(e2) || r2.length !== e2.length) return false;
        for (let c2 = 0; c2 < r2.length; c2++) if (!pe$2(r2[c2], e2[c2], c2, r2, e2, t2, i2)) return false;
        return true;
      }
      case yo$1:
        return r2.byteLength !== e2.byteLength ? false : ye$2(new Uint8Array(r2), new Uint8Array(e2), t2, i2);
      case mo$1:
        return r2.byteLength !== e2.byteLength || r2.byteOffset !== e2.byteOffset ? false : ye$2(new Uint8Array(r2), new Uint8Array(e2), t2, i2);
      case bo$1:
        return r2.name === e2.name && r2.message === e2.message;
      case Je$2: {
        if (!(ye$2(r2.constructor, e2.constructor, t2, i2) || Oi$1(r2) && Oi$1(e2))) return false;
        const h3 = [...Object.keys(r2), ...Ri$1(r2)], l2 = [...Object.keys(e2), ...Ri$1(e2)];
        if (h3.length !== l2.length) return false;
        for (let d3 = 0; d3 < h3.length; d3++) {
          const g2 = h3[d3], _2 = r2[g2];
          if (!Object.hasOwn(e2, g2)) return false;
          const u2 = e2[g2];
          if (!pe$2(_2, u2, g2, r2, e2, t2, i2)) return false;
        }
        return true;
      }
      default:
        return false;
    }
  } finally {
    t2.delete(r2), t2.delete(e2);
  }
}
function Ao$1(r2, e2) {
  return Ro(r2, e2, so);
}
var xo$1 = Object.defineProperty, Ni = Object.getOwnPropertySymbols, No$1 = Object.prototype.hasOwnProperty, $o = Object.prototype.propertyIsEnumerable, Xe$2 = (r2, e2, t2) => e2 in r2 ? xo$1(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, $i$1 = (r2, e2) => {
  for (var t2 in e2 || (e2 = {})) No$1.call(e2, t2) && Xe$2(r2, t2, e2[t2]);
  if (Ni) for (var t2 of Ni(e2)) $o.call(e2, t2) && Xe$2(r2, t2, e2[t2]);
  return r2;
}, z$1 = (r2, e2, t2) => Xe$2(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let zi$1 = class zi extends f$3 {
  constructor(e2, t2, i2, s2 = B$2, n3 = void 0) {
    super(e2, t2, i2, s2), this.core = e2, this.logger = t2, this.name = i2, z$1(this, "map", /* @__PURE__ */ new Map()), z$1(this, "version", kt$2), z$1(this, "cached", []), z$1(this, "initialized", false), z$1(this, "getKey"), z$1(this, "storagePrefix", B$2), z$1(this, "recentlyDeleted", []), z$1(this, "recentlyDeletedLimit", 200), z$1(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), await this.restore(), this.cached.forEach((o2) => {
        this.getKey && o2 !== null && !Et$3(o2) ? this.map.set(this.getKey(o2), o2) : la(o2) ? this.map.set(o2.id, o2) : da(o2) && this.map.set(o2.topic, o2);
      }), this.cached = [], this.initialized = true);
    }), z$1(this, "set", async (o2, a2) => {
      this.isInitialized(), this.map.has(o2) ? await this.update(o2, a2) : (this.logger.debug("Setting value"), this.logger.trace({ type: "method", method: "set", key: o2, value: a2 }), this.map.set(o2, a2), await this.persist());
    }), z$1(this, "get", (o2) => (this.isInitialized(), this.logger.debug("Getting value"), this.logger.trace({ type: "method", method: "get", key: o2 }), this.getData(o2))), z$1(this, "getAll", (o2) => (this.isInitialized(), o2 ? this.values.filter((a2) => Object.keys(o2).every((c2) => Ao$1(a2[c2], o2[c2]))) : this.values)), z$1(this, "update", async (o2, a2) => {
      this.isInitialized(), this.logger.debug("Updating value"), this.logger.trace({ type: "method", method: "update", key: o2, update: a2 });
      const c2 = $i$1($i$1({}, this.getData(o2)), a2);
      this.map.set(o2, c2), await this.persist();
    }), z$1(this, "delete", async (o2, a2) => {
      this.isInitialized(), this.map.has(o2) && (this.logger.debug("Deleting value"), this.logger.trace({ type: "method", method: "delete", key: o2, reason: a2 }), this.map.delete(o2), this.addToRecentlyDeleted(o2), await this.persist());
    }), this.logger = E$4(t2, this.name), this.storagePrefix = s2, this.getKey = n3;
  }
  get context() {
    return y$6(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get length() {
    return this.map.size;
  }
  get keys() {
    return Array.from(this.map.keys());
  }
  get values() {
    return Array.from(this.map.values());
  }
  addToRecentlyDeleted(e2) {
    this.recentlyDeleted.push(e2), this.recentlyDeleted.length >= this.recentlyDeletedLimit && this.recentlyDeleted.splice(0, this.recentlyDeletedLimit / 2);
  }
  async setDataStore(e2) {
    await this.core.storage.setItem(this.storageKey, e2);
  }
  async getDataStore() {
    return await this.core.storage.getItem(this.storageKey);
  }
  getData(e2) {
    const t2 = this.map.get(e2);
    if (!t2) {
      if (this.recentlyDeleted.includes(e2)) {
        const { message: s2 } = ht$3("MISSING_OR_INVALID", `Record was recently deleted - ${this.name}: ${e2}`);
        throw this.logger.error(s2), new Error(s2);
      }
      const { message: i2 } = ht$3("NO_MATCHING_KEY", `${this.name}: ${e2}`);
      throw this.logger.error(i2), new Error(i2);
    }
    return t2;
  }
  async persist() {
    await this.setDataStore(this.values);
  }
  async restore() {
    try {
      const e2 = await this.getDataStore();
      if (typeof e2 > "u" || !e2.length) return;
      if (this.map.size) {
        const { message: t2 } = ht$3("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t2), new Error(t2);
      }
      this.cached = e2, this.logger.debug(`Successfully Restored value for ${this.name}`), this.logger.trace({ type: "method", method: "restore", value: this.values });
    } catch (e2) {
      this.logger.debug(`Failed to Restore value for ${this.name}`), this.logger.error(e2);
    }
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
};
var zo = Object.defineProperty, Lo = (r2, e2, t2) => e2 in r2 ? zo(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, p$2 = (r2, e2, t2) => Lo(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let Li$1 = class Li {
  constructor(e2, t2) {
    this.core = e2, this.logger = t2, p$2(this, "name", Mt$2), p$2(this, "version", Kt$2), p$2(this, "events", new Nt$3()), p$2(this, "pairings"), p$2(this, "initialized", false), p$2(this, "storagePrefix", B$2), p$2(this, "ignoredPayloadTypes", [Ft$3]), p$2(this, "registeredMethods", []), p$2(this, "init", async () => {
      this.initialized || (await this.pairings.init(), await this.cleanup(), this.registerRelayerEvents(), this.registerExpirerEvents(), this.initialized = true, this.logger.trace("Initialized"));
    }), p$2(this, "register", ({ methods: i2 }) => {
      this.isInitialized(), this.registeredMethods = [.../* @__PURE__ */ new Set([...this.registeredMethods, ...i2])];
    }), p$2(this, "create", async (i2) => {
      this.isInitialized();
      const s2 = jc(), n3 = await this.core.crypto.setSymKey(s2), o2 = Ei$2(cjsExports.FIVE_MINUTES), a2 = { protocol: xt$2 }, c2 = { topic: n3, expiry: o2, relay: a2, active: false, methods: i2?.methods }, h3 = Wc({ protocol: this.core.protocol, version: this.core.version, topic: n3, symKey: s2, relay: a2, expiryTimestamp: o2, methods: i2?.methods });
      return this.events.emit(re$2.create, c2), this.core.expirer.set(n3, o2), await this.pairings.set(n3, c2), await this.core.relayer.subscribe(n3, { transportType: i2?.transportType }), { topic: n3, uri: h3 };
    }), p$2(this, "pair", async (i2) => {
      this.isInitialized();
      const s2 = this.core.eventClient.createEvent({ properties: { topic: i2?.uri, trace: [G$1.pairing_started] } });
      this.isValidPair(i2, s2);
      const { topic: n3, symKey: o2, relay: a2, expiryTimestamp: c2, methods: h3 } = Gc(i2.uri);
      s2.props.properties.topic = n3, s2.addTrace(G$1.pairing_uri_validation_success), s2.addTrace(G$1.pairing_uri_not_expired);
      let l2;
      if (this.pairings.keys.includes(n3)) {
        if (l2 = this.pairings.get(n3), s2.addTrace(G$1.existing_pairing), l2.active) throw s2.setError(Y$2.active_pairing_already_exists), new Error(`Pairing already exists: ${n3}. Please try again with a new connection URI.`);
        s2.addTrace(G$1.pairing_not_expired);
      }
      const d3 = c2 || Ei$2(cjsExports.FIVE_MINUTES), g2 = { topic: n3, relay: a2, expiry: d3, active: false, methods: h3 };
      this.core.expirer.set(n3, d3), await this.pairings.set(n3, g2), s2.addTrace(G$1.store_new_pairing), i2.activatePairing && await this.activate({ topic: n3 }), this.events.emit(re$2.create, g2), s2.addTrace(G$1.emit_inactive_pairing), this.core.crypto.keychain.has(n3) || await this.core.crypto.setSymKey(o2, n3), s2.addTrace(G$1.subscribing_pairing_topic);
      try {
        await this.core.relayer.confirmOnlineStateOrThrow();
      } catch {
        s2.setError(Y$2.no_internet_connection);
      }
      try {
        await this.core.relayer.subscribe(n3, { relay: a2 });
      } catch (_2) {
        throw s2.setError(Y$2.subscribe_pairing_topic_failure), _2;
      }
      return s2.addTrace(G$1.subscribe_pairing_topic_success), g2;
    }), p$2(this, "activate", async ({ topic: i2 }) => {
      this.isInitialized();
      const s2 = Ei$2(cjsExports.FIVE_MINUTES);
      this.core.expirer.set(i2, s2), await this.pairings.update(i2, { active: true, expiry: s2 });
    }), p$2(this, "ping", async (i2) => {
      this.isInitialized(), await this.isValidPing(i2), this.logger.warn("ping() is deprecated and will be removed in the next major release.");
      const { topic: s2 } = i2;
      if (this.pairings.keys.includes(s2)) {
        const n3 = await this.sendRequest(s2, "wc_pairingPing", {}), { done: o2, resolve: a2, reject: c2 } = gi$2();
        this.events.once(xi$2("pairing_ping", n3), ({ error: h3 }) => {
          h3 ? c2(h3) : a2();
        }), await o2();
      }
    }), p$2(this, "updateExpiry", async ({ topic: i2, expiry: s2 }) => {
      this.isInitialized(), await this.pairings.update(i2, { expiry: s2 });
    }), p$2(this, "updateMetadata", async ({ topic: i2, metadata: s2 }) => {
      this.isInitialized(), await this.pairings.update(i2, { peerMetadata: s2 });
    }), p$2(this, "getPairings", () => (this.isInitialized(), this.pairings.values)), p$2(this, "disconnect", async (i2) => {
      this.isInitialized(), await this.isValidDisconnect(i2);
      const { topic: s2 } = i2;
      this.pairings.keys.includes(s2) && (await this.sendRequest(s2, "wc_pairingDelete", Nt$2("USER_DISCONNECTED")), await this.deletePairing(s2));
    }), p$2(this, "formatUriFromPairing", (i2) => {
      this.isInitialized();
      const { topic: s2, relay: n3, expiry: o2, methods: a2 } = i2, c2 = this.core.crypto.keychain.get(s2);
      return Wc({ protocol: this.core.protocol, version: this.core.version, topic: s2, symKey: c2, relay: n3, expiryTimestamp: o2, methods: a2 });
    }), p$2(this, "sendRequest", async (i2, s2, n3) => {
      const o2 = formatJsonRpcRequest(s2, n3), a2 = await this.core.crypto.encode(i2, o2), c2 = se$2[s2].req;
      return this.core.history.set(i2, o2), this.core.relayer.publish(i2, a2, c2), o2.id;
    }), p$2(this, "sendResult", async (i2, s2, n3) => {
      const o2 = formatJsonRpcResult(i2, n3), a2 = await this.core.crypto.encode(s2, o2), c2 = (await this.core.history.get(s2, i2)).request.method, h3 = se$2[c2].res;
      await this.core.relayer.publish(s2, a2, h3), await this.core.history.resolve(o2);
    }), p$2(this, "sendError", async (i2, s2, n3) => {
      const o2 = formatJsonRpcError(i2, n3), a2 = await this.core.crypto.encode(s2, o2), c2 = (await this.core.history.get(s2, i2)).request.method, h3 = se$2[c2] ? se$2[c2].res : se$2.unregistered_method.res;
      await this.core.relayer.publish(s2, a2, h3), await this.core.history.resolve(o2);
    }), p$2(this, "deletePairing", async (i2, s2) => {
      await this.core.relayer.unsubscribe(i2), await Promise.all([this.pairings.delete(i2, Nt$2("USER_DISCONNECTED")), this.core.crypto.deleteSymKey(i2), s2 ? Promise.resolve() : this.core.expirer.del(i2)]);
    }), p$2(this, "cleanup", async () => {
      const i2 = this.pairings.getAll().filter((s2) => vi$2(s2.expiry));
      await Promise.all(i2.map((s2) => this.deletePairing(s2.topic)));
    }), p$2(this, "onRelayEventRequest", async (i2) => {
      const { topic: s2, payload: n3 } = i2;
      switch (n3.method) {
        case "wc_pairingPing":
          return await this.onPairingPingRequest(s2, n3);
        case "wc_pairingDelete":
          return await this.onPairingDeleteRequest(s2, n3);
        default:
          return await this.onUnknownRpcMethodRequest(s2, n3);
      }
    }), p$2(this, "onRelayEventResponse", async (i2) => {
      const { topic: s2, payload: n3 } = i2, o2 = (await this.core.history.get(s2, n3.id)).request.method;
      switch (o2) {
        case "wc_pairingPing":
          return this.onPairingPingResponse(s2, n3);
        default:
          return this.onUnknownRpcMethodResponse(o2);
      }
    }), p$2(this, "onPairingPingRequest", async (i2, s2) => {
      const { id: n3 } = s2;
      try {
        this.isValidPing({ topic: i2 }), await this.sendResult(n3, i2, true), this.events.emit(re$2.ping, { id: n3, topic: i2 });
      } catch (o2) {
        await this.sendError(n3, i2, o2), this.logger.error(o2);
      }
    }), p$2(this, "onPairingPingResponse", (i2, s2) => {
      const { id: n3 } = s2;
      setTimeout(() => {
        isJsonRpcResult(s2) ? this.events.emit(xi$2("pairing_ping", n3), {}) : isJsonRpcError(s2) && this.events.emit(xi$2("pairing_ping", n3), { error: s2.error });
      }, 500);
    }), p$2(this, "onPairingDeleteRequest", async (i2, s2) => {
      const { id: n3 } = s2;
      try {
        this.isValidDisconnect({ topic: i2 }), await this.deletePairing(i2), this.events.emit(re$2.delete, { id: n3, topic: i2 });
      } catch (o2) {
        await this.sendError(n3, i2, o2), this.logger.error(o2);
      }
    }), p$2(this, "onUnknownRpcMethodRequest", async (i2, s2) => {
      const { id: n3, method: o2 } = s2;
      try {
        if (this.registeredMethods.includes(o2)) return;
        const a2 = Nt$2("WC_METHOD_UNSUPPORTED", o2);
        await this.sendError(n3, i2, a2), this.logger.error(a2);
      } catch (a2) {
        await this.sendError(n3, i2, a2), this.logger.error(a2);
      }
    }), p$2(this, "onUnknownRpcMethodResponse", (i2) => {
      this.registeredMethods.includes(i2) || this.logger.error(Nt$2("WC_METHOD_UNSUPPORTED", i2));
    }), p$2(this, "isValidPair", (i2, s2) => {
      var n3;
      if (!ma$1(i2)) {
        const { message: a2 } = ht$3("MISSING_OR_INVALID", `pair() params: ${i2}`);
        throw s2.setError(Y$2.malformed_pairing_uri), new Error(a2);
      }
      if (!fa(i2.uri)) {
        const { message: a2 } = ht$3("MISSING_OR_INVALID", `pair() uri: ${i2.uri}`);
        throw s2.setError(Y$2.malformed_pairing_uri), new Error(a2);
      }
      const o2 = Gc(i2?.uri);
      if (!((n3 = o2?.relay) != null && n3.protocol)) {
        const { message: a2 } = ht$3("MISSING_OR_INVALID", "pair() uri#relay-protocol");
        throw s2.setError(Y$2.malformed_pairing_uri), new Error(a2);
      }
      if (!(o2 != null && o2.symKey)) {
        const { message: a2 } = ht$3("MISSING_OR_INVALID", "pair() uri#symKey");
        throw s2.setError(Y$2.malformed_pairing_uri), new Error(a2);
      }
      if (o2 != null && o2.expiryTimestamp && cjsExports.toMiliseconds(o2?.expiryTimestamp) < Date.now()) {
        s2.setError(Y$2.pairing_expired);
        const { message: a2 } = ht$3("EXPIRED", "pair() URI has expired. Please try again with a new connection URI.");
        throw new Error(a2);
      }
    }), p$2(this, "isValidPing", async (i2) => {
      if (!ma$1(i2)) {
        const { message: n3 } = ht$3("MISSING_OR_INVALID", `ping() params: ${i2}`);
        throw new Error(n3);
      }
      const { topic: s2 } = i2;
      await this.isValidPairingTopic(s2);
    }), p$2(this, "isValidDisconnect", async (i2) => {
      if (!ma$1(i2)) {
        const { message: n3 } = ht$3("MISSING_OR_INVALID", `disconnect() params: ${i2}`);
        throw new Error(n3);
      }
      const { topic: s2 } = i2;
      await this.isValidPairingTopic(s2);
    }), p$2(this, "isValidPairingTopic", async (i2) => {
      if (!nt$2(i2)) {
        const { message: s2 } = ht$3("MISSING_OR_INVALID", `pairing topic should be a string: ${i2}`);
        throw new Error(s2);
      }
      if (!this.pairings.keys.includes(i2)) {
        const { message: s2 } = ht$3("NO_MATCHING_KEY", `pairing topic doesn't exist: ${i2}`);
        throw new Error(s2);
      }
      if (vi$2(this.pairings.get(i2).expiry)) {
        await this.deletePairing(i2);
        const { message: s2 } = ht$3("EXPIRED", `pairing topic: ${i2}`);
        throw new Error(s2);
      }
    }), this.core = e2, this.logger = E$4(t2, this.name), this.pairings = new zi$1(this.core, this.logger, this.name, this.storagePrefix);
  }
  get context() {
    return y$6(this.logger);
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
  registerRelayerEvents() {
    this.core.relayer.on(C$2.message, async (e2) => {
      const { topic: t2, message: i2, transportType: s2 } = e2;
      if (this.pairings.keys.includes(t2) && s2 !== Q$1.link_mode && !this.ignoredPayloadTypes.includes(this.core.crypto.getPayloadType(i2))) try {
        const n3 = await this.core.crypto.decode(t2, i2);
        isJsonRpcRequest(n3) ? (this.core.history.set(t2, n3), await this.onRelayEventRequest({ topic: t2, payload: n3 })) : isJsonRpcResponse(n3) && (await this.core.history.resolve(n3), await this.onRelayEventResponse({ topic: t2, payload: n3 }), this.core.history.delete(t2, n3.id)), await this.core.relayer.messages.ack(t2, i2);
      } catch (n3) {
        this.logger.error(n3);
      }
    });
  }
  registerExpirerEvents() {
    this.core.expirer.on(M$2.expired, async (e2) => {
      const { topic: t2 } = bi$2(e2.target);
      t2 && this.pairings.keys.includes(t2) && (await this.deletePairing(t2, true), this.events.emit(re$2.expire, { topic: t2 }));
    });
  }
};
var ko = Object.defineProperty, jo = (r2, e2, t2) => e2 in r2 ? ko(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, O$1 = (r2, e2, t2) => jo(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let ki$1 = class ki extends I$2 {
  constructor(e2, t2) {
    super(e2, t2), this.core = e2, this.logger = t2, O$1(this, "records", /* @__PURE__ */ new Map()), O$1(this, "events", new eventsExports.EventEmitter()), O$1(this, "name", Bt$1), O$1(this, "version", Vt$2), O$1(this, "cached", []), O$1(this, "initialized", false), O$1(this, "storagePrefix", B$2), O$1(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), await this.restore(), this.cached.forEach((i2) => this.records.set(i2.id, i2)), this.cached = [], this.registerEventListeners(), this.initialized = true);
    }), O$1(this, "set", (i2, s2, n3) => {
      if (this.isInitialized(), this.logger.debug("Setting JSON-RPC request history record"), this.logger.trace({ type: "method", method: "set", topic: i2, request: s2, chainId: n3 }), this.records.has(s2.id)) return;
      const o2 = { id: s2.id, topic: i2, request: { method: s2.method, params: s2.params || null }, chainId: n3, expiry: Ei$2(cjsExports.THIRTY_DAYS) };
      this.records.set(o2.id, o2), this.persist(), this.events.emit(F$2.created, o2);
    }), O$1(this, "resolve", async (i2) => {
      if (this.isInitialized(), this.logger.debug("Updating JSON-RPC response history record"), this.logger.trace({ type: "method", method: "update", response: i2 }), !this.records.has(i2.id)) return;
      const s2 = await this.getRecord(i2.id);
      typeof s2.response > "u" && (s2.response = isJsonRpcError(i2) ? { error: i2.error } : { result: i2.result }, this.records.set(s2.id, s2), this.persist(), this.events.emit(F$2.updated, s2));
    }), O$1(this, "get", async (i2, s2) => (this.isInitialized(), this.logger.debug("Getting record"), this.logger.trace({ type: "method", method: "get", topic: i2, id: s2 }), await this.getRecord(s2))), O$1(this, "delete", (i2, s2) => {
      this.isInitialized(), this.logger.debug("Deleting record"), this.logger.trace({ type: "method", method: "delete", id: s2 }), this.values.forEach((n3) => {
        if (n3.topic === i2) {
          if (typeof s2 < "u" && n3.id !== s2) return;
          this.records.delete(n3.id), this.events.emit(F$2.deleted, n3);
        }
      }), this.persist();
    }), O$1(this, "exists", async (i2, s2) => (this.isInitialized(), this.records.has(s2) ? (await this.getRecord(s2)).topic === i2 : false)), O$1(this, "on", (i2, s2) => {
      this.events.on(i2, s2);
    }), O$1(this, "once", (i2, s2) => {
      this.events.once(i2, s2);
    }), O$1(this, "off", (i2, s2) => {
      this.events.off(i2, s2);
    }), O$1(this, "removeListener", (i2, s2) => {
      this.events.removeListener(i2, s2);
    }), this.logger = E$4(t2, this.name);
  }
  get context() {
    return y$6(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get size() {
    return this.records.size;
  }
  get keys() {
    return Array.from(this.records.keys());
  }
  get values() {
    return Array.from(this.records.values());
  }
  get pending() {
    const e2 = [];
    return this.values.forEach((t2) => {
      if (typeof t2.response < "u") return;
      const i2 = { topic: t2.topic, request: formatJsonRpcRequest(t2.request.method, t2.request.params, t2.id), chainId: t2.chainId };
      return e2.push(i2);
    }), e2;
  }
  async setJsonRpcRecords(e2) {
    await this.core.storage.setItem(this.storageKey, e2);
  }
  async getJsonRpcRecords() {
    return await this.core.storage.getItem(this.storageKey);
  }
  getRecord(e2) {
    this.isInitialized();
    const t2 = this.records.get(e2);
    if (!t2) {
      const { message: i2 } = ht$3("NO_MATCHING_KEY", `${this.name}: ${e2}`);
      throw new Error(i2);
    }
    return t2;
  }
  async persist() {
    await this.setJsonRpcRecords(this.values), this.events.emit(F$2.sync);
  }
  async restore() {
    try {
      const e2 = await this.getJsonRpcRecords();
      if (typeof e2 > "u" || !e2.length) return;
      if (this.records.size) {
        const { message: t2 } = ht$3("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t2), new Error(t2);
      }
      this.cached = e2, this.logger.debug(`Successfully Restored records for ${this.name}`), this.logger.trace({ type: "method", method: "restore", records: this.values });
    } catch (e2) {
      this.logger.debug(`Failed to Restore records for ${this.name}`), this.logger.error(e2);
    }
  }
  registerEventListeners() {
    this.events.on(F$2.created, (e2) => {
      const t2 = F$2.created;
      this.logger.info(`Emitting ${t2}`), this.logger.debug({ type: "event", event: t2, record: e2 });
    }), this.events.on(F$2.updated, (e2) => {
      const t2 = F$2.updated;
      this.logger.info(`Emitting ${t2}`), this.logger.debug({ type: "event", event: t2, record: e2 });
    }), this.events.on(F$2.deleted, (e2) => {
      const t2 = F$2.deleted;
      this.logger.info(`Emitting ${t2}`), this.logger.debug({ type: "event", event: t2, record: e2 });
    }), this.core.heartbeat.on(r$3.pulse, () => {
      this.cleanup();
    });
  }
  cleanup() {
    try {
      this.isInitialized();
      let e2 = false;
      this.records.forEach((t2) => {
        cjsExports.toMiliseconds(t2.expiry || 0) - Date.now() <= 0 && (this.logger.info(`Deleting expired history log: ${t2.id}`), this.records.delete(t2.id), this.events.emit(F$2.deleted, t2, false), e2 = true);
      }), e2 && this.persist();
    } catch (e2) {
      this.logger.warn(e2);
    }
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
};
var Uo$1 = Object.defineProperty, Fo = (r2, e2, t2) => e2 in r2 ? Uo$1(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, A$2 = (r2, e2, t2) => Fo(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let ji$1 = class ji extends S$4 {
  constructor(e2, t2) {
    super(e2, t2), this.core = e2, this.logger = t2, A$2(this, "expirations", /* @__PURE__ */ new Map()), A$2(this, "events", new eventsExports.EventEmitter()), A$2(this, "name", qt$2), A$2(this, "version", Gt$1), A$2(this, "cached", []), A$2(this, "initialized", false), A$2(this, "storagePrefix", B$2), A$2(this, "init", async () => {
      this.initialized || (this.logger.trace("Initialized"), await this.restore(), this.cached.forEach((i2) => this.expirations.set(i2.target, i2)), this.cached = [], this.registerEventListeners(), this.initialized = true);
    }), A$2(this, "has", (i2) => {
      try {
        const s2 = this.formatTarget(i2);
        return typeof this.getExpiration(s2) < "u";
      } catch {
        return false;
      }
    }), A$2(this, "set", (i2, s2) => {
      this.isInitialized();
      const n3 = this.formatTarget(i2), o2 = { target: n3, expiry: s2 };
      this.expirations.set(n3, o2), this.checkExpiry(n3, o2), this.events.emit(M$2.created, { target: n3, expiration: o2 });
    }), A$2(this, "get", (i2) => {
      this.isInitialized();
      const s2 = this.formatTarget(i2);
      return this.getExpiration(s2);
    }), A$2(this, "del", (i2) => {
      if (this.isInitialized(), this.has(i2)) {
        const s2 = this.formatTarget(i2), n3 = this.getExpiration(s2);
        this.expirations.delete(s2), this.events.emit(M$2.deleted, { target: s2, expiration: n3 });
      }
    }), A$2(this, "on", (i2, s2) => {
      this.events.on(i2, s2);
    }), A$2(this, "once", (i2, s2) => {
      this.events.once(i2, s2);
    }), A$2(this, "off", (i2, s2) => {
      this.events.off(i2, s2);
    }), A$2(this, "removeListener", (i2, s2) => {
      this.events.removeListener(i2, s2);
    }), this.logger = E$4(t2, this.name);
  }
  get context() {
    return y$6(this.logger);
  }
  get storageKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//" + this.name;
  }
  get length() {
    return this.expirations.size;
  }
  get keys() {
    return Array.from(this.expirations.keys());
  }
  get values() {
    return Array.from(this.expirations.values());
  }
  formatTarget(e2) {
    if (typeof e2 == "string") return mi$1(e2);
    if (typeof e2 == "number") return wi$1(e2);
    const { message: t2 } = ht$3("UNKNOWN_TYPE", `Target type: ${typeof e2}`);
    throw new Error(t2);
  }
  async setExpirations(e2) {
    await this.core.storage.setItem(this.storageKey, e2);
  }
  async getExpirations() {
    return await this.core.storage.getItem(this.storageKey);
  }
  async persist() {
    await this.setExpirations(this.values), this.events.emit(M$2.sync);
  }
  async restore() {
    try {
      const e2 = await this.getExpirations();
      if (typeof e2 > "u" || !e2.length) return;
      if (this.expirations.size) {
        const { message: t2 } = ht$3("RESTORE_WILL_OVERRIDE", this.name);
        throw this.logger.error(t2), new Error(t2);
      }
      this.cached = e2, this.logger.debug(`Successfully Restored expirations for ${this.name}`), this.logger.trace({ type: "method", method: "restore", expirations: this.values });
    } catch (e2) {
      this.logger.debug(`Failed to Restore expirations for ${this.name}`), this.logger.error(e2);
    }
  }
  getExpiration(e2) {
    const t2 = this.expirations.get(e2);
    if (!t2) {
      const { message: i2 } = ht$3("NO_MATCHING_KEY", `${this.name}: ${e2}`);
      throw this.logger.warn(i2), new Error(i2);
    }
    return t2;
  }
  checkExpiry(e2, t2) {
    const { expiry: i2 } = t2;
    cjsExports.toMiliseconds(i2) - Date.now() <= 0 && this.expire(e2, t2);
  }
  expire(e2, t2) {
    this.expirations.delete(e2), this.events.emit(M$2.expired, { target: e2, expiration: t2 });
  }
  checkExpirations() {
    this.core.relayer.connected && this.expirations.forEach((e2, t2) => this.checkExpiry(t2, e2));
  }
  registerEventListeners() {
    this.core.heartbeat.on(r$3.pulse, () => this.checkExpirations()), this.events.on(M$2.created, (e2) => {
      const t2 = M$2.created;
      this.logger.info(`Emitting ${t2}`), this.logger.debug({ type: "event", event: t2, data: e2 }), this.persist();
    }), this.events.on(M$2.expired, (e2) => {
      const t2 = M$2.expired;
      this.logger.info(`Emitting ${t2}`), this.logger.debug({ type: "event", event: t2, data: e2 }), this.persist();
    }), this.events.on(M$2.deleted, (e2) => {
      const t2 = M$2.deleted;
      this.logger.info(`Emitting ${t2}`), this.logger.debug({ type: "event", event: t2, data: e2 }), this.persist();
    });
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: e2 } = ht$3("NOT_INITIALIZED", this.name);
      throw new Error(e2);
    }
  }
};
var Mo = Object.defineProperty, Ko = (r2, e2, t2) => e2 in r2 ? Mo(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, w$1 = (r2, e2, t2) => Ko(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let Ui$1 = class Ui extends M$3 {
  constructor(e2, t2, i2) {
    super(e2, t2, i2), this.core = e2, this.logger = t2, this.store = i2, w$1(this, "name", Wt$2), w$1(this, "abortController"), w$1(this, "isDevEnv"), w$1(this, "verifyUrlV3", Yt$1), w$1(this, "storagePrefix", B$2), w$1(this, "version", Le$2), w$1(this, "publicKey"), w$1(this, "fetchPromise"), w$1(this, "init", async () => {
      var s2;
      this.isDevEnv || (this.publicKey = await this.store.getItem(this.storeKey), this.publicKey && cjsExports.toMiliseconds((s2 = this.publicKey) == null ? void 0 : s2.expiresAt) < Date.now() && (this.logger.debug("verify v2 public key expired"), await this.removePublicKey()));
    }), w$1(this, "register", async (s2) => {
      if (!Tt$3() || this.isDevEnv) return;
      const n3 = window.location.origin, { id: o2, decryptedId: a2 } = s2, c2 = `${this.verifyUrlV3}/attestation?projectId=${this.core.projectId}&origin=${n3}&id=${o2}&decryptedId=${a2}`;
      try {
        const h3 = cjsExports$1.getDocument(), l2 = this.startAbortTimer(cjsExports.ONE_SECOND * 5), d3 = await new Promise((g2, _2) => {
          const u2 = () => {
            window.removeEventListener("message", x2), h3.body.removeChild(b2), _2("attestation aborted");
          };
          this.abortController.signal.addEventListener("abort", u2);
          const b2 = h3.createElement("iframe");
          b2.src = c2, b2.style.display = "none", b2.addEventListener("error", u2, { signal: this.abortController.signal });
          const x2 = (I3) => {
            if (I3.data && typeof I3.data == "string") try {
              const D2 = JSON.parse(I3.data);
              if (D2.type === "verify_attestation") {
                if (sn$3(D2.attestation).payload.id !== o2) return;
                clearInterval(l2), h3.body.removeChild(b2), this.abortController.signal.removeEventListener("abort", u2), window.removeEventListener("message", x2), g2(D2.attestation === null ? "" : D2.attestation);
              }
            } catch (D2) {
              this.logger.warn(D2);
            }
          };
          h3.body.appendChild(b2), window.addEventListener("message", x2, { signal: this.abortController.signal });
        });
        return this.logger.debug("jwt attestation", d3), d3;
      } catch (h3) {
        this.logger.warn(h3);
      }
      return "";
    }), w$1(this, "resolve", async (s2) => {
      if (this.isDevEnv) return "";
      const { attestationId: n3, hash: o2, encryptedId: a2 } = s2;
      if (n3 === "") {
        this.logger.debug("resolve: attestationId is empty, skipping");
        return;
      }
      if (n3) {
        if (sn$3(n3).payload.id !== a2) return;
        const h3 = await this.isValidJwtAttestation(n3);
        if (h3) {
          if (!h3.isVerified) {
            this.logger.warn("resolve: jwt attestation: origin url not verified");
            return;
          }
          return h3;
        }
      }
      if (!o2) return;
      const c2 = this.getVerifyUrl(s2?.verifyUrl);
      return this.fetchAttestation(o2, c2);
    }), w$1(this, "fetchAttestation", async (s2, n3) => {
      this.logger.debug(`resolving attestation: ${s2} from url: ${n3}`);
      const o2 = this.startAbortTimer(cjsExports.ONE_SECOND * 5), a2 = await fetch(`${n3}/attestation/${s2}?v2Supported=true`, { signal: this.abortController.signal });
      return clearTimeout(o2), a2.status === 200 ? await a2.json() : void 0;
    }), w$1(this, "getVerifyUrl", (s2) => {
      let n3 = s2 || ue$2;
      return Jt$2.includes(n3) || (this.logger.info(`verify url: ${n3}, not included in trusted list, assigning default: ${ue$2}`), n3 = ue$2), n3;
    }), w$1(this, "fetchPublicKey", async () => {
      try {
        this.logger.debug(`fetching public key from: ${this.verifyUrlV3}`);
        const s2 = this.startAbortTimer(cjsExports.FIVE_SECONDS), n3 = await fetch(`${this.verifyUrlV3}/public-key`, { signal: this.abortController.signal });
        return clearTimeout(s2), await n3.json();
      } catch (s2) {
        this.logger.warn(s2);
      }
    }), w$1(this, "persistPublicKey", async (s2) => {
      this.logger.debug("persisting public key to local storage", s2), await this.store.setItem(this.storeKey, s2), this.publicKey = s2;
    }), w$1(this, "removePublicKey", async () => {
      this.logger.debug("removing verify v2 public key from storage"), await this.store.removeItem(this.storeKey), this.publicKey = void 0;
    }), w$1(this, "isValidJwtAttestation", async (s2) => {
      const n3 = await this.getPublicKey();
      try {
        if (n3) return this.validateAttestation(s2, n3);
      } catch (a2) {
        this.logger.error(a2), this.logger.warn("error validating attestation");
      }
      const o2 = await this.fetchAndPersistPublicKey();
      try {
        if (o2) return this.validateAttestation(s2, o2);
      } catch (a2) {
        this.logger.error(a2), this.logger.warn("error validating attestation");
      }
    }), w$1(this, "getPublicKey", async () => this.publicKey ? this.publicKey : await this.fetchAndPersistPublicKey()), w$1(this, "fetchAndPersistPublicKey", async () => {
      if (this.fetchPromise) return await this.fetchPromise, this.publicKey;
      this.fetchPromise = new Promise(async (n3) => {
        const o2 = await this.fetchPublicKey();
        o2 && (await this.persistPublicKey(o2), n3(o2));
      });
      const s2 = await this.fetchPromise;
      return this.fetchPromise = void 0, s2;
    }), w$1(this, "validateAttestation", (s2, n3) => {
      const o2 = zc(s2, n3.publicKey), a2 = { hasExpired: cjsExports.toMiliseconds(o2.exp) < Date.now(), payload: o2 };
      if (a2.hasExpired) throw this.logger.warn("resolve: jwt attestation expired"), new Error("JWT attestation expired");
      return { origin: a2.payload.origin, isScam: a2.payload.isScam, isVerified: a2.payload.isVerified };
    }), this.logger = E$4(t2, this.name), this.abortController = new AbortController(), this.isDevEnv = Ii$2(), this.init();
  }
  get storeKey() {
    return this.storagePrefix + this.version + this.core.customStoragePrefix + "//verify:public:key";
  }
  get context() {
    return y$6(this.logger);
  }
  startAbortTimer(e2) {
    return this.abortController = new AbortController(), setTimeout(() => this.abortController.abort(), cjsExports.toMiliseconds(e2));
  }
};
var Bo$1 = Object.defineProperty, Vo = (r2, e2, t2) => e2 in r2 ? Bo$1(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, Fi$1 = (r2, e2, t2) => Vo(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let Mi$1 = class Mi extends O$2 {
  constructor(e2, t2) {
    super(e2, t2), this.projectId = e2, this.logger = t2, Fi$1(this, "context", Xt$2), Fi$1(this, "registerDeviceToken", async (i2) => {
      const { clientId: s2, token: n3, notificationType: o2, enableEncrypted: a2 = false } = i2, c2 = `${Zt$1}/${this.projectId}/clients`;
      await fetch(c2, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: s2, type: o2, token: n3, always_raw: a2 }) });
    }), this.logger = E$4(t2, this.context);
  }
};
var qo = Object.defineProperty, Ki$1 = Object.getOwnPropertySymbols, Go$1 = Object.prototype.hasOwnProperty, Wo$1 = Object.prototype.propertyIsEnumerable, Ze$2 = (r2, e2, t2) => e2 in r2 ? qo(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, be$2 = (r2, e2) => {
  for (var t2 in e2 || (e2 = {})) Go$1.call(e2, t2) && Ze$2(r2, t2, e2[t2]);
  if (Ki$1) for (var t2 of Ki$1(e2)) Wo$1.call(e2, t2) && Ze$2(r2, t2, e2[t2]);
  return r2;
}, E$3 = (r2, e2, t2) => Ze$2(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
class Bi extends R$2 {
  constructor(e2, t2, i2 = true) {
    super(e2, t2, i2), this.core = e2, this.logger = t2, E$3(this, "context", ei), E$3(this, "storagePrefix", B$2), E$3(this, "storageVersion", Qt$2), E$3(this, "events", /* @__PURE__ */ new Map()), E$3(this, "shouldPersist", false), E$3(this, "init", async () => {
      if (!Ii$2()) try {
        const s2 = { eventId: Bi$1(), timestamp: Date.now(), domain: this.getAppDomain(), props: { event: "INIT", type: "", properties: { client_id: await this.core.crypto.getClientId(), user_agent: Mn$1(this.core.relayer.protocol, this.core.relayer.version, _e$3) } } };
        await this.sendEvent([s2]);
      } catch (s2) {
        this.logger.warn(s2);
      }
    }), E$3(this, "createEvent", (s2) => {
      const { event: n3 = "ERROR", type: o2 = "", properties: { topic: a2, trace: c2 } } = s2, h3 = Bi$1(), l2 = this.core.projectId || "", d3 = Date.now(), g2 = be$2({ eventId: h3, timestamp: d3, props: { event: n3, type: o2, properties: { topic: a2, trace: c2 } }, bundleId: l2, domain: this.getAppDomain() }, this.setMethods(h3));
      return this.telemetryEnabled && (this.events.set(h3, g2), this.shouldPersist = true), g2;
    }), E$3(this, "getEvent", (s2) => {
      const { eventId: n3, topic: o2 } = s2;
      if (n3) return this.events.get(n3);
      const a2 = Array.from(this.events.values()).find((c2) => c2.props.properties.topic === o2);
      if (a2) return be$2(be$2({}, a2), this.setMethods(a2.eventId));
    }), E$3(this, "deleteEvent", (s2) => {
      const { eventId: n3 } = s2;
      this.events.delete(n3), this.shouldPersist = true;
    }), E$3(this, "setEventListeners", () => {
      this.core.heartbeat.on(r$3.pulse, async () => {
        this.shouldPersist && await this.persist(), this.events.forEach((s2) => {
          cjsExports.fromMiliseconds(Date.now()) - cjsExports.fromMiliseconds(s2.timestamp) > ti && (this.events.delete(s2.eventId), this.shouldPersist = true);
        });
      });
    }), E$3(this, "setMethods", (s2) => ({ addTrace: (n3) => this.addTrace(s2, n3), setError: (n3) => this.setError(s2, n3) })), E$3(this, "addTrace", (s2, n3) => {
      const o2 = this.events.get(s2);
      o2 && (o2.props.properties.trace.push(n3), this.events.set(s2, o2), this.shouldPersist = true);
    }), E$3(this, "setError", (s2, n3) => {
      const o2 = this.events.get(s2);
      o2 && (o2.props.type = n3, o2.timestamp = Date.now(), this.events.set(s2, o2), this.shouldPersist = true);
    }), E$3(this, "persist", async () => {
      await this.core.storage.setItem(this.storageKey, Array.from(this.events.values())), this.shouldPersist = false;
    }), E$3(this, "restore", async () => {
      try {
        const s2 = await this.core.storage.getItem(this.storageKey) || [];
        if (!s2.length) return;
        s2.forEach((n3) => {
          this.events.set(n3.eventId, be$2(be$2({}, n3), this.setMethods(n3.eventId)));
        });
      } catch (s2) {
        this.logger.warn(s2);
      }
    }), E$3(this, "submit", async () => {
      if (!this.telemetryEnabled || this.events.size === 0) return;
      const s2 = [];
      for (const [n3, o2] of this.events) o2.props.type && s2.push(o2);
      if (s2.length !== 0) try {
        if ((await this.sendEvent(s2)).ok) for (const n3 of s2) this.events.delete(n3.eventId), this.shouldPersist = true;
      } catch (n3) {
        this.logger.warn(n3);
      }
    }), E$3(this, "sendEvent", async (s2) => {
      const n3 = this.getAppDomain() ? "" : "&sp=desktop";
      return await fetch(`${ii}?projectId=${this.core.projectId}&st=events_sdk&sv=js-${_e$3}${n3}`, { method: "POST", body: JSON.stringify(s2) });
    }), E$3(this, "getAppDomain", () => Pn$2().url), this.logger = E$4(t2, this.context), this.telemetryEnabled = i2, i2 ? this.restore().then(async () => {
      await this.submit(), this.setEventListeners();
    }) : this.persist();
  }
  get storageKey() {
    return this.storagePrefix + this.storageVersion + this.core.customStoragePrefix + "//" + this.context;
  }
}
var Ho = Object.defineProperty, Vi$1 = Object.getOwnPropertySymbols, Yo$1 = Object.prototype.hasOwnProperty, Jo$1 = Object.prototype.propertyIsEnumerable, Qe$2 = (r2, e2, t2) => e2 in r2 ? Ho(r2, e2, { enumerable: true, configurable: true, writable: true, value: t2 }) : r2[e2] = t2, qi$1 = (r2, e2) => {
  for (var t2 in e2 || (e2 = {})) Yo$1.call(e2, t2) && Qe$2(r2, t2, e2[t2]);
  if (Vi$1) for (var t2 of Vi$1(e2)) Jo$1.call(e2, t2) && Qe$2(r2, t2, e2[t2]);
  return r2;
}, v$2 = (r2, e2, t2) => Qe$2(r2, typeof e2 != "symbol" ? e2 + "" : e2, t2);
let Te$1 = class Te extends h$3 {
  constructor(e2) {
    var t2;
    super(e2), v$2(this, "protocol", ze$2), v$2(this, "version", Le$2), v$2(this, "name", he$2), v$2(this, "relayUrl"), v$2(this, "projectId"), v$2(this, "customStoragePrefix"), v$2(this, "events", new eventsExports.EventEmitter()), v$2(this, "logger"), v$2(this, "heartbeat"), v$2(this, "relayer"), v$2(this, "crypto"), v$2(this, "storage"), v$2(this, "history"), v$2(this, "expirer"), v$2(this, "pairing"), v$2(this, "verify"), v$2(this, "echoClient"), v$2(this, "linkModeSupportedApps"), v$2(this, "eventClient"), v$2(this, "initialized", false), v$2(this, "logChunkController"), v$2(this, "on", (a2, c2) => this.events.on(a2, c2)), v$2(this, "once", (a2, c2) => this.events.once(a2, c2)), v$2(this, "off", (a2, c2) => this.events.off(a2, c2)), v$2(this, "removeListener", (a2, c2) => this.events.removeListener(a2, c2)), v$2(this, "dispatchEnvelope", ({ topic: a2, message: c2, sessionExists: h3 }) => {
      if (!a2 || !c2) return;
      const l2 = { topic: a2, message: c2, publishedAt: Date.now(), transportType: Q$1.link_mode };
      this.relayer.onLinkMessageEvent(l2, { sessionExists: h3 });
    });
    const i2 = this.getGlobalCore(e2?.customStoragePrefix);
    if (i2) try {
      return this.customStoragePrefix = i2.customStoragePrefix, this.logger = i2.logger, this.heartbeat = i2.heartbeat, this.crypto = i2.crypto, this.history = i2.history, this.expirer = i2.expirer, this.storage = i2.storage, this.relayer = i2.relayer, this.pairing = i2.pairing, this.verify = i2.verify, this.echoClient = i2.echoClient, this.linkModeSupportedApps = i2.linkModeSupportedApps, this.eventClient = i2.eventClient, this.initialized = i2.initialized, this.logChunkController = i2.logChunkController, i2;
    } catch (a2) {
      console.warn("Failed to copy global core", a2);
    }
    this.projectId = e2?.projectId, this.relayUrl = e2?.relayUrl || Ue$2, this.customStoragePrefix = e2 != null && e2.customStoragePrefix ? `:${e2.customStoragePrefix}` : "";
    const s2 = k$4({ level: typeof e2?.logger == "string" && e2.logger ? e2.logger : Et$2.logger, name: he$2 }), { logger: n3, chunkLoggerController: o2 } = A$3({ opts: s2, maxSizeInBytes: e2?.maxLogBlobSizeInBytes, loggerOverride: e2?.logger });
    this.logChunkController = o2, (t2 = this.logChunkController) != null && t2.downloadLogsBlobInBrowser && (window.downloadLogsBlobInBrowser = async () => {
      var a2, c2;
      (a2 = this.logChunkController) != null && a2.downloadLogsBlobInBrowser && ((c2 = this.logChunkController) == null || c2.downloadLogsBlobInBrowser({ clientId: await this.crypto.getClientId() }));
    }), this.logger = E$4(n3, this.name), this.heartbeat = new i$5(), this.crypto = new vi$1(this, this.logger, e2?.keychain), this.history = new ki$1(this, this.logger), this.expirer = new ji$1(this, this.logger), this.storage = e2 != null && e2.storage ? e2.storage : new h$5(qi$1(qi$1({}, It$2), e2?.storageOptions)), this.relayer = new Si$1({ core: this, logger: this.logger, relayUrl: this.relayUrl, projectId: this.projectId }), this.pairing = new Li$1(this, this.logger), this.verify = new Ui$1(this, this.logger, this.storage), this.echoClient = new Mi$1(this.projectId || "", this.logger), this.linkModeSupportedApps = [], this.eventClient = new Bi(this, this.logger, e2?.telemetryEnabled), this.setGlobalCore(this);
  }
  static async init(e2) {
    const t2 = new Te(e2);
    await t2.initialize();
    const i2 = await t2.crypto.getClientId();
    return await t2.storage.setItem(jt$2, i2), t2;
  }
  get context() {
    return y$6(this.logger);
  }
  async start() {
    this.initialized || await this.initialize();
  }
  async getLogsBlob() {
    var e2;
    return (e2 = this.logChunkController) == null ? void 0 : e2.logsToBlob({ clientId: await this.crypto.getClientId() });
  }
  async addLinkModeSupportedApp(e2) {
    this.linkModeSupportedApps.includes(e2) || (this.linkModeSupportedApps.push(e2), await this.storage.setItem(Fe$2, this.linkModeSupportedApps));
  }
  async initialize() {
    this.logger.trace("Initialized");
    try {
      await this.crypto.init(), await this.history.init(), await this.expirer.init(), await this.relayer.init(), await this.heartbeat.init(), await this.pairing.init(), this.linkModeSupportedApps = await this.storage.getItem(Fe$2) || [], this.initialized = true, this.logger.info("Core Initialization Success");
    } catch (e2) {
      throw this.logger.warn(`Core Initialization Failure at epoch ${Date.now()}`, e2), this.logger.error(e2.message), e2;
    }
  }
  getGlobalCore(e2 = "") {
    try {
      if (this.isGlobalCoreDisabled()) return;
      const t2 = `_walletConnectCore_${e2}`, i2 = `${t2}_count`;
      return globalThis[i2] = (globalThis[i2] || 0) + 1, globalThis[i2] > 1 && console.warn(`WalletConnect Core is already initialized. This is probably a mistake and can lead to unexpected behavior. Init() was called ${globalThis[i2]} times.`), globalThis[t2];
    } catch (t2) {
      console.warn("Failed to get global WalletConnect core", t2);
      return;
    }
  }
  setGlobalCore(e2) {
    var t2;
    try {
      if (this.isGlobalCoreDisabled()) return;
      const i2 = `_walletConnectCore_${((t2 = e2.opts) == null ? void 0 : t2.customStoragePrefix) || ""}`;
      globalThis[i2] = e2;
    } catch (i2) {
      console.warn("Failed to set global WalletConnect core", i2);
    }
  }
  isGlobalCoreDisabled() {
    try {
      return typeof process < "u" && process.env.DISABLE_GLOBAL_CORE === "true";
    } catch {
      return true;
    }
  }
};
const Xo$1 = Te$1;
const SIWXUtil = {
  getSIWX() {
    return OptionsController.state.siwx;
  },
  async initializeIfEnabled() {
    const siwx = OptionsController.state.siwx;
    const caipAddress = ChainController.getActiveCaipAddress();
    if (!(siwx && caipAddress)) {
      return;
    }
    const [namespace, chainId, address] = caipAddress.split(":");
    if (!ChainController.checkIfSupportedNetwork(namespace)) {
      return;
    }
    try {
      const sessions = await siwx.getSessions(`${namespace}:${chainId}`, address);
      if (sessions.length) {
        return;
      }
      await ModalController.open({
        view: "SIWXSignMessage"
      });
    } catch (error) {
      console.error("SIWXUtil:initializeIfEnabled", error);
      EventsController.sendEvent({
        type: "track",
        event: "SIWX_AUTH_ERROR",
        properties: this.getSIWXEventProperties()
      });
      await ConnectionController._getClient()?.disconnect().catch(console.error);
      RouterController.reset("Connect");
      SnackController.showError("A problem occurred while trying initialize authentication");
    }
  },
  async requestSignMessage() {
    const siwx = OptionsController.state.siwx;
    const address = CoreHelperUtil.getPlainAddress(ChainController.getActiveCaipAddress());
    const network = ChainController.getActiveCaipNetwork();
    const client = ConnectionController._getClient();
    if (!siwx) {
      throw new Error("SIWX is not enabled");
    }
    if (!address) {
      throw new Error("No ActiveCaipAddress found");
    }
    if (!network) {
      throw new Error("No ActiveCaipNetwork or client found");
    }
    if (!client) {
      throw new Error("No ConnectionController client found");
    }
    try {
      const siwxMessage = await siwx.createMessage({
        chainId: network.caipNetworkId,
        accountAddress: address
      });
      const message = siwxMessage.toString();
      const connectorId = ConnectorController.getConnectorId(network.chainNamespace);
      if (connectorId === ConstantsUtil$3.CONNECTOR_ID.AUTH) {
        RouterController.pushTransactionStack({});
      }
      const signature = await client.signMessage(message);
      await siwx.addSession({
        data: siwxMessage,
        message,
        signature
      });
      ModalController.close();
      EventsController.sendEvent({
        type: "track",
        event: "SIWX_AUTH_SUCCESS",
        properties: this.getSIWXEventProperties()
      });
    } catch (error) {
      const properties = this.getSIWXEventProperties();
      if (!ModalController.state.open || RouterController.state.view === "ApproveTransaction") {
        await ModalController.open({
          view: "SIWXSignMessage"
        });
      }
      if (properties.isSmartAccount) {
        SnackController.showError("This application might not support Smart Accounts");
      } else {
        SnackController.showError("Signature declined");
      }
      EventsController.sendEvent({
        type: "track",
        event: "SIWX_AUTH_ERROR",
        properties
      });
      console.error("SWIXUtil:requestSignMessage", error);
    }
  },
  async cancelSignMessage() {
    try {
      const siwx = this.getSIWX();
      const isRequired = siwx?.getRequired?.();
      if (isRequired) {
        await ConnectionController.disconnect();
      } else {
        ModalController.close();
      }
      RouterController.reset("Connect");
      EventsController.sendEvent({
        event: "CLICK_CANCEL_SIWX",
        type: "track",
        properties: this.getSIWXEventProperties()
      });
    } catch (error) {
      console.error("SIWXUtil:cancelSignMessage", error);
    }
  },
  async getSessions() {
    const siwx = OptionsController.state.siwx;
    const address = CoreHelperUtil.getPlainAddress(ChainController.getActiveCaipAddress());
    const network = ChainController.getActiveCaipNetwork();
    if (!(siwx && address && network)) {
      return [];
    }
    return siwx.getSessions(network.caipNetworkId, address);
  },
  async isSIWXCloseDisabled() {
    const siwx = this.getSIWX();
    if (siwx) {
      const isApproveSignScreen = RouterController.state.view === "ApproveTransaction";
      const isSiwxSignMessage = RouterController.state.view === "SIWXSignMessage";
      if (isApproveSignScreen || isSiwxSignMessage) {
        return siwx.getRequired?.() && (await this.getSessions()).length === 0;
      }
    }
    return false;
  },
  async universalProviderAuthenticate({ universalProvider, chains, methods }) {
    const siwx = SIWXUtil.getSIWX();
    const namespaces = new Set(chains.map((chain) => chain.split(":")[0]));
    if (!siwx || namespaces.size !== 1 || !namespaces.has("eip155")) {
      return false;
    }
    const siwxMessage = await siwx.createMessage({
      chainId: ChainController.getActiveCaipNetwork()?.caipNetworkId || "",
      accountAddress: ""
    });
    const result = await universalProvider.authenticate({
      nonce: siwxMessage.nonce,
      domain: siwxMessage.domain,
      uri: siwxMessage.uri,
      exp: siwxMessage.expirationTime,
      iat: siwxMessage.issuedAt,
      nbf: siwxMessage.notBefore,
      requestId: siwxMessage.requestId,
      version: siwxMessage.version,
      resources: siwxMessage.resources,
      statement: siwxMessage.statement,
      chainId: siwxMessage.chainId,
      methods,
      // The first chainId is what is used for universal provider to build the message
      chains: [siwxMessage.chainId, ...chains.filter((chain) => chain !== siwxMessage.chainId)]
    });
    SnackController.showLoading("Authenticating...", { autoClose: false });
    AccountController.setConnectedWalletInfo({
      ...result.session.peer.metadata,
      name: result.session.peer.metadata.name,
      icon: result.session.peer.metadata.icons?.[0],
      type: "WALLET_CONNECT"
    }, Array.from(namespaces)[0]);
    if (result?.auths?.length) {
      const sessions = result.auths.map((cacao) => {
        const message = universalProvider.client.formatAuthMessage({
          request: cacao.p,
          iss: cacao.p.iss
        });
        return {
          data: {
            ...cacao.p,
            accountAddress: cacao.p.iss.split(":").slice(-1).join(""),
            chainId: cacao.p.iss.split(":").slice(2, 4).join(":"),
            uri: cacao.p.aud,
            version: cacao.p.version || siwxMessage.version,
            expirationTime: cacao.p.exp,
            issuedAt: cacao.p.iat,
            notBefore: cacao.p.nbf
          },
          message,
          signature: cacao.s.s,
          cacao
        };
      });
      try {
        await siwx.setSessions(sessions);
        EventsController.sendEvent({
          type: "track",
          event: "SIWX_AUTH_SUCCESS",
          properties: SIWXUtil.getSIWXEventProperties()
        });
      } catch (error) {
        console.error("SIWX:universalProviderAuth - failed to set sessions", error);
        EventsController.sendEvent({
          type: "track",
          event: "SIWX_AUTH_ERROR",
          properties: SIWXUtil.getSIWXEventProperties()
        });
        await universalProvider.disconnect().catch(console.error);
        throw error;
      } finally {
        SnackController.hide();
      }
    }
    return true;
  },
  getSIWXEventProperties() {
    const activeChainNamespace = ChainController.state.activeChain;
    return {
      network: ChainController.state.activeCaipNetwork?.caipNetworkId || "",
      isSmartAccount: AccountController.state.preferredAccountTypes?.[activeChainNamespace] === W3mFrameRpcConstants.ACCOUNT_TYPES.SMART_ACCOUNT
    };
  },
  async clearSessions() {
    const siwx = this.getSIWX();
    if (siwx) {
      await siwx.setSessions([]);
    }
  }
};
var T = Object.defineProperty, k$2 = (e2, s2, r2) => s2 in e2 ? T(e2, s2, { enumerable: true, configurable: true, writable: true, value: r2 }) : e2[s2] = r2, i$4 = (e2, s2, r2) => k$2(e2, typeof s2 != "symbol" ? s2 + "" : s2, r2);
let J$1 = class J {
  constructor(s2) {
    this.opts = s2, i$4(this, "protocol", "wc"), i$4(this, "version", 2);
  }
};
let V$3 = class V {
  constructor(s2) {
    this.client = s2;
  }
};
function isHex(value, { strict = true } = {}) {
  if (!value)
    return false;
  if (typeof value !== "string")
    return false;
  return strict ? /^0x[0-9a-fA-F]*$/.test(value) : value.startsWith("0x");
}
function size(value) {
  if (isHex(value, { strict: false }))
    return Math.ceil((value.length - 2) / 2);
  return value.length;
}
const version = "2.23.2";
let errorConfig = {
  getDocsUrl: ({ docsBaseUrl, docsPath = "", docsSlug }) => docsPath ? `${docsBaseUrl ?? "https://viem.sh"}${docsPath}${docsSlug ? `#${docsSlug}` : ""}` : void 0,
  version: `viem@${version}`
};
class BaseError extends Error {
  constructor(shortMessage, args = {}) {
    const details = (() => {
      if (args.cause instanceof BaseError)
        return args.cause.details;
      if (args.cause?.message)
        return args.cause.message;
      return args.details;
    })();
    const docsPath = (() => {
      if (args.cause instanceof BaseError)
        return args.cause.docsPath || args.docsPath;
      return args.docsPath;
    })();
    const docsUrl = errorConfig.getDocsUrl?.({ ...args, docsPath });
    const message = [
      shortMessage || "An error occurred.",
      "",
      ...args.metaMessages ? [...args.metaMessages, ""] : [],
      ...docsUrl ? [`Docs: ${docsUrl}`] : [],
      ...details ? [`Details: ${details}`] : [],
      ...errorConfig.version ? [`Version: ${errorConfig.version}`] : []
    ].join("\n");
    super(message, args.cause ? { cause: args.cause } : void 0);
    Object.defineProperty(this, "details", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "docsPath", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "metaMessages", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "shortMessage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "version", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "name", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "BaseError"
    });
    this.details = details;
    this.docsPath = docsPath;
    this.metaMessages = args.metaMessages;
    this.name = args.name ?? this.name;
    this.shortMessage = shortMessage;
    this.version = version;
  }
  walk(fn2) {
    return walk(this, fn2);
  }
}
function walk(err, fn2) {
  if (fn2?.(err))
    return err;
  if (err && typeof err === "object" && "cause" in err && err.cause !== void 0)
    return walk(err.cause, fn2);
  return fn2 ? null : err;
}
class SizeExceedsPaddingSizeError extends BaseError {
  constructor({ size: size2, targetSize, type }) {
    super(`${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} size (${size2}) exceeds padding size (${targetSize}).`, { name: "SizeExceedsPaddingSizeError" });
  }
}
function pad(hexOrBytes, { dir, size: size2 = 32 } = {}) {
  if (typeof hexOrBytes === "string")
    return padHex(hexOrBytes, { dir, size: size2 });
  return padBytes(hexOrBytes, { dir, size: size2 });
}
function padHex(hex_, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return hex_;
  const hex = hex_.replace("0x", "");
  if (hex.length > size2 * 2)
    throw new SizeExceedsPaddingSizeError({
      size: Math.ceil(hex.length / 2),
      targetSize: size2,
      type: "hex"
    });
  return `0x${hex[dir === "right" ? "padEnd" : "padStart"](size2 * 2, "0")}`;
}
function padBytes(bytes, { dir, size: size2 = 32 } = {}) {
  if (size2 === null)
    return bytes;
  if (bytes.length > size2)
    throw new SizeExceedsPaddingSizeError({
      size: bytes.length,
      targetSize: size2,
      type: "bytes"
    });
  const paddedBytes = new Uint8Array(size2);
  for (let i2 = 0; i2 < size2; i2++) {
    const padEnd = dir === "right";
    paddedBytes[padEnd ? i2 : size2 - i2 - 1] = bytes[padEnd ? i2 : bytes.length - i2 - 1];
  }
  return paddedBytes;
}
class IntegerOutOfRangeError extends BaseError {
  constructor({ max, min, signed, size: size2, value }) {
    super(`Number "${value}" is not in safe ${size2 ? `${size2 * 8}-bit ${signed ? "signed" : "unsigned"} ` : ""}integer range ${max ? `(${min} to ${max})` : `(above ${min})`}`, { name: "IntegerOutOfRangeError" });
  }
}
class SizeOverflowError extends BaseError {
  constructor({ givenSize, maxSize }) {
    super(`Size cannot exceed ${maxSize} bytes. Given size: ${givenSize} bytes.`, { name: "SizeOverflowError" });
  }
}
function assertSize(hexOrBytes, { size: size$1 }) {
  if (size(hexOrBytes) > size$1)
    throw new SizeOverflowError({
      givenSize: size(hexOrBytes),
      maxSize: size$1
    });
}
function hexToBigInt(hex, opts = {}) {
  const { signed } = opts;
  if (opts.size)
    assertSize(hex, { size: opts.size });
  const value = BigInt(hex);
  if (!signed)
    return value;
  const size2 = (hex.length - 2) / 2;
  const max = (1n << BigInt(size2) * 8n - 1n) - 1n;
  if (value <= max)
    return value;
  return value - BigInt(`0x${"f".padStart(size2 * 2, "f")}`) - 1n;
}
function hexToNumber(hex, opts = {}) {
  return Number(hexToBigInt(hex, opts));
}
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_v, i2) => i2.toString(16).padStart(2, "0"));
function toHex(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToHex(value, opts);
  if (typeof value === "string") {
    return stringToHex(value, opts);
  }
  if (typeof value === "boolean")
    return boolToHex(value, opts);
  return bytesToHex(value, opts);
}
function boolToHex(value, opts = {}) {
  const hex = `0x${Number(value)}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { size: opts.size });
  }
  return hex;
}
function bytesToHex(value, opts = {}) {
  let string2 = "";
  for (let i2 = 0; i2 < value.length; i2++) {
    string2 += hexes[value[i2]];
  }
  const hex = `0x${string2}`;
  if (typeof opts.size === "number") {
    assertSize(hex, { size: opts.size });
    return pad(hex, { dir: "right", size: opts.size });
  }
  return hex;
}
function numberToHex(value_, opts = {}) {
  const { signed, size: size2 } = opts;
  const value = BigInt(value_);
  let maxValue;
  if (size2) {
    if (signed)
      maxValue = (1n << BigInt(size2) * 8n - 1n) - 1n;
    else
      maxValue = 2n ** (BigInt(size2) * 8n) - 1n;
  } else if (typeof value_ === "number") {
    maxValue = BigInt(Number.MAX_SAFE_INTEGER);
  }
  const minValue = typeof maxValue === "bigint" && signed ? -maxValue - 1n : 0;
  if (maxValue && value > maxValue || value < minValue) {
    const suffix = typeof value_ === "bigint" ? "n" : "";
    throw new IntegerOutOfRangeError({
      max: maxValue ? `${maxValue}${suffix}` : void 0,
      min: `${minValue}${suffix}`,
      signed,
      size: size2,
      value: `${value_}${suffix}`
    });
  }
  const hex = `0x${(signed && value < 0 ? (1n << BigInt(size2 * 8)) + BigInt(value) : value).toString(16)}`;
  if (size2)
    return pad(hex, { size: size2 });
  return hex;
}
const encoder$1 = /* @__PURE__ */ new TextEncoder();
function stringToHex(value_, opts = {}) {
  const value = encoder$1.encode(value_);
  return bytesToHex(value, opts);
}
const encoder = /* @__PURE__ */ new TextEncoder();
function toBytes(value, opts = {}) {
  if (typeof value === "number" || typeof value === "bigint")
    return numberToBytes(value, opts);
  if (typeof value === "boolean")
    return boolToBytes(value, opts);
  if (isHex(value))
    return hexToBytes(value, opts);
  return stringToBytes(value, opts);
}
function boolToBytes(value, opts = {}) {
  const bytes = new Uint8Array(1);
  bytes[0] = Number(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { size: opts.size });
  }
  return bytes;
}
const charCodeMap = {
  zero: 48,
  nine: 57,
  A: 65,
  F: 70,
  a: 97,
  f: 102
};
function charCodeToBase16(char) {
  if (char >= charCodeMap.zero && char <= charCodeMap.nine)
    return char - charCodeMap.zero;
  if (char >= charCodeMap.A && char <= charCodeMap.F)
    return char - (charCodeMap.A - 10);
  if (char >= charCodeMap.a && char <= charCodeMap.f)
    return char - (charCodeMap.a - 10);
  return void 0;
}
function hexToBytes(hex_, opts = {}) {
  let hex = hex_;
  if (opts.size) {
    assertSize(hex, { size: opts.size });
    hex = pad(hex, { dir: "right", size: opts.size });
  }
  let hexString = hex.slice(2);
  if (hexString.length % 2)
    hexString = `0${hexString}`;
  const length = hexString.length / 2;
  const bytes = new Uint8Array(length);
  for (let index = 0, j2 = 0; index < length; index++) {
    const nibbleLeft = charCodeToBase16(hexString.charCodeAt(j2++));
    const nibbleRight = charCodeToBase16(hexString.charCodeAt(j2++));
    if (nibbleLeft === void 0 || nibbleRight === void 0) {
      throw new BaseError(`Invalid byte sequence ("${hexString[j2 - 2]}${hexString[j2 - 1]}" in "${hexString}").`);
    }
    bytes[index] = nibbleLeft * 16 + nibbleRight;
  }
  return bytes;
}
function numberToBytes(value, opts) {
  const hex = numberToHex(value, opts);
  return hexToBytes(hex);
}
function stringToBytes(value, opts = {}) {
  const bytes = encoder.encode(value);
  if (typeof opts.size === "number") {
    assertSize(bytes, { size: opts.size });
    return pad(bytes, { dir: "right", size: opts.size });
  }
  return bytes;
}
function keccak256(value, to_) {
  const to2 = to_ || "hex";
  const bytes = keccak_256(isHex(value, { strict: false }) ? toBytes(value) : value);
  if (to2 === "bytes")
    return bytes;
  return toHex(bytes);
}
class LruMap extends Map {
  constructor(size2) {
    super();
    Object.defineProperty(this, "maxSize", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.maxSize = size2;
  }
  get(key) {
    const value = super.get(key);
    if (super.has(key) && value !== void 0) {
      this.delete(key);
      super.set(key, value);
    }
    return value;
  }
  set(key, value) {
    super.set(key, value);
    if (this.maxSize && this.size > this.maxSize) {
      const firstKey = this.keys().next().value;
      if (firstKey)
        this.delete(firstKey);
    }
    return this;
  }
}
const checksumAddressCache = /* @__PURE__ */ new LruMap(8192);
function checksumAddress(address_, chainId) {
  if (checksumAddressCache.has(`${address_}.${chainId}`))
    return checksumAddressCache.get(`${address_}.${chainId}`);
  const hexAddress = address_.substring(2).toLowerCase();
  const hash = keccak256(stringToBytes(hexAddress), "bytes");
  const address = hexAddress.split("");
  for (let i2 = 0; i2 < 40; i2 += 2) {
    if (hash[i2 >> 1] >> 4 >= 8 && address[i2]) {
      address[i2] = address[i2].toUpperCase();
    }
    if ((hash[i2 >> 1] & 15) >= 8 && address[i2 + 1]) {
      address[i2 + 1] = address[i2 + 1].toUpperCase();
    }
  }
  const result = `0x${address.join("")}`;
  checksumAddressCache.set(`${address_}.${chainId}`, result);
  return result;
}
function publicKeyToAddress(publicKey) {
  const address = keccak256(`0x${publicKey.substring(4)}`).substring(26);
  return checksumAddress(`0x${address}`);
}
async function recoverPublicKey({ hash, signature }) {
  const hashHex = isHex(hash) ? hash : toHex(hash);
  const { secp256k1 } = await import("./secp256k1-DANRLG0j.js");
  const signature_ = (() => {
    if (typeof signature === "object" && "r" in signature && "s" in signature) {
      const { r: r2, s: s2, v: v2, yParity } = signature;
      const yParityOrV2 = Number(yParity ?? v2);
      const recoveryBit2 = toRecoveryBit(yParityOrV2);
      return new secp256k1.Signature(hexToBigInt(r2), hexToBigInt(s2)).addRecoveryBit(recoveryBit2);
    }
    const signatureHex = isHex(signature) ? signature : toHex(signature);
    const yParityOrV = hexToNumber(`0x${signatureHex.slice(130)}`);
    const recoveryBit = toRecoveryBit(yParityOrV);
    return secp256k1.Signature.fromCompact(signatureHex.substring(2, 130)).addRecoveryBit(recoveryBit);
  })();
  const publicKey = signature_.recoverPublicKey(hashHex.substring(2)).toHex(false);
  return `0x${publicKey}`;
}
function toRecoveryBit(yParityOrV) {
  if (yParityOrV === 0 || yParityOrV === 1)
    return yParityOrV;
  if (yParityOrV === 27)
    return 0;
  if (yParityOrV === 28)
    return 1;
  throw new Error("Invalid yParityOrV value");
}
async function recoverAddress({ hash, signature }) {
  return publicKeyToAddress(await recoverPublicKey({ hash, signature }));
}
const ae$2 = ":";
function Ne$1(t2) {
  const [e2, n3] = t2.split(ae$2);
  return { namespace: e2, reference: n3 };
}
function ue$1(t2, e2) {
  return t2.includes(":") ? [t2] : e2.chains || [];
}
var Zo = Object.defineProperty, Yo = Object.defineProperties, Go = Object.getOwnPropertyDescriptors, Tn = Object.getOwnPropertySymbols, Wo = Object.prototype.hasOwnProperty, Xo = Object.prototype.propertyIsEnumerable, Rn = (t2, e2, n3) => e2 in t2 ? Zo(t2, e2, { enumerable: true, configurable: true, writable: true, value: n3 }) : t2[e2] = n3, _n = (t2, e2) => {
  for (var n3 in e2 || (e2 = {})) Wo.call(e2, n3) && Rn(t2, n3, e2[n3]);
  if (Tn) for (var n3 of Tn(e2)) Xo.call(e2, n3) && Rn(t2, n3, e2[n3]);
  return t2;
}, Jo = (t2, e2) => Yo(t2, Go(e2));
const $n = "ReactNative", Y$1 = { reactNative: "react-native", node: "node", browser: "browser", unknown: "unknown" };
function _e$2() {
  return typeof process < "u" && typeof process.versions < "u" && typeof process.versions.node < "u";
}
function pt$2() {
  return !cjsExports$1.getDocument() && !!cjsExports$1.getNavigator() && navigator.product === $n;
}
function Tt$1() {
  return !_e$2() && !!cjsExports$1.getNavigator() && !!cjsExports$1.getDocument();
}
function xt$1() {
  return pt$2() ? Y$1.reactNative : _e$2() ? Y$1.node : Tt$1() ? Y$1.browser : Y$1.unknown;
}
function oi(t2) {
  var e2, n3;
  const r2 = Pn();
  try {
    return t2 != null && t2.url && r2.url && new URL(t2.url).host !== new URL(r2.url).host && (console.warn(`The configured WalletConnect 'metadata.url':${t2.url} differs from the actual page url:${r2.url}. This is probably unintended and can lead to issues.`), t2.url = r2.url), (e2 = t2?.icons) != null && e2.length && t2.icons.length > 0 && (t2.icons = t2.icons.filter((o2) => o2 !== "")), Jo(_n(_n({}, r2), t2), { url: t2?.url || r2.url, name: t2?.name || r2.name, description: t2?.description || r2.description, icons: (n3 = t2?.icons) != null && n3.length && t2.icons.length > 0 ? t2.icons : r2.icons });
  } catch (o2) {
    return console.warn("Error populating app metadata", o2), t2 || r2;
  }
}
function Pn() {
  return cjsExports$2.getWindowMetadata() || { name: "", description: "", url: "", icons: [""] };
}
function gt$2(t2, e2) {
  return t2.filter((n3) => e2.includes(n3)).length === t2.length;
}
function gi(t2 = cjsExports.FIVE_MINUTES, e2) {
  const n3 = cjsExports.toMiliseconds(t2 || cjsExports.FIVE_MINUTES);
  let r2, o2, i2, s2;
  return { resolve: (c2) => {
    i2 && r2 && (clearTimeout(i2), r2(c2), s2 = Promise.resolve(c2));
  }, reject: (c2) => {
    i2 && o2 && (clearTimeout(i2), o2(c2));
  }, done: () => new Promise((c2, a2) => {
    if (s2) return c2(s2);
    i2 = setTimeout(() => {
      const u2 = new Error(e2);
      s2 = Promise.reject(u2), a2(u2);
    }, n3), r2 = c2, o2 = a2;
  }) };
}
function bi(t2) {
  const [e2, n3] = t2.split(":"), r2 = { id: void 0, topic: void 0 };
  if (e2 === "topic" && typeof n3 == "string") r2.topic = n3;
  else if (e2 === "id" && Number.isInteger(Number(n3))) r2.id = Number(n3);
  else throw new Error(`Invalid target, expected id:number or topic:string, got ${e2}:${n3}`);
  return r2;
}
function Ei(t2, e2) {
  return cjsExports.fromMiliseconds(Date.now() + cjsExports.toMiliseconds(t2));
}
function vi2(t2) {
  return Date.now() >= cjsExports.toMiliseconds(t2);
}
function xi(t2, e2) {
  return `${t2}${e2 ? `:${e2}` : ""}`;
}
function ot$1(t2 = [], e2 = []) {
  return [.../* @__PURE__ */ new Set([...t2, ...e2])];
}
async function Si2({ id: t2, topic: e2, wcDeepLink: n3 }) {
  var r2;
  try {
    if (!n3) return;
    const o2 = typeof n3 == "string" ? JSON.parse(n3) : n3, i2 = o2?.href;
    if (typeof i2 != "string") return;
    const s2 = Kn(i2, t2, e2), c2 = xt$1();
    if (c2 === Y$1.browser) {
      if (!((r2 = cjsExports$1.getDocument()) != null && r2.hasFocus())) {
        console.warn("Document does not have focus, skipping deeplink.");
        return;
      }
      Fn(s2);
    } else c2 === Y$1.reactNative && typeof (global == null ? void 0 : global.Linking) < "u" && await global.Linking.openURL(s2);
  } catch (o2) {
    console.error(o2);
  }
}
function Kn(t2, e2, n3) {
  const r2 = `requestId=${e2}&sessionTopic=${n3}`;
  t2.endsWith("/") && (t2 = t2.slice(0, -1));
  let o2 = `${t2}`;
  if (t2.startsWith("https://t.me")) {
    const i2 = t2.includes("?") ? "&startapp=" : "?startapp=";
    o2 = `${o2}${i2}${Yn(r2, true)}`;
  } else o2 = `${o2}/wc?${r2}`;
  return o2;
}
function Fn(t2) {
  let e2 = "_self";
  Zn() ? e2 = "_top" : (zn() || t2.startsWith("https://") || t2.startsWith("http://")) && (e2 = "_blank"), window.open(t2, e2, "noreferrer noopener");
}
async function Oi(t2, e2) {
  let n3 = "";
  try {
    if (Tt$1() && (n3 = localStorage.getItem(e2), n3)) return n3;
    n3 = await t2.getItem(e2);
  } catch (r2) {
    console.error(r2);
  }
  return n3;
}
function Ai(t2, e2) {
  if (!t2.includes(e2)) return null;
  const n3 = t2.split(/([&,?,=])/), r2 = n3.indexOf(e2);
  return n3[r2 + 2];
}
function Ii() {
  return typeof process < "u" && process.env.IS_VITEST === "true";
}
function zn() {
  return typeof window < "u" && (!!window.TelegramWebviewProxy || !!window.Telegram || !!window.TelegramWebviewProxyProto);
}
function Zn() {
  try {
    return window.self !== window.top;
  } catch {
    return false;
  }
}
function Yn(t2, e2 = false) {
  const n3 = Buffer.from(t2).toString("base64");
  return e2 ? n3.replace(/[=]/g, "") : n3;
}
function Wt$1(t2) {
  if (!Number.isSafeInteger(t2) || t2 < 0) throw new Error("positive integer expected, got " + t2);
}
function Ui2(t2) {
  return t2 instanceof Uint8Array || ArrayBuffer.isView(t2) && t2.constructor.name === "Uint8Array";
}
function Xt$1(t2, ...e2) {
  if (!Ui2(t2)) throw new Error("Uint8Array expected");
  if (e2.length > 0 && !e2.includes(t2.length)) throw new Error("Uint8Array expected of length " + e2 + ", got length=" + t2.length);
}
function Ce$1(t2) {
  if (typeof t2 != "function" || typeof t2.create != "function") throw new Error("Hash should be wrapped by utils.wrapConstructor");
  Wt$1(t2.outputLen), Wt$1(t2.blockLen);
}
function Rt$1(t2, e2 = true) {
  if (t2.destroyed) throw new Error("Hash instance has been destroyed");
  if (e2 && t2.finished) throw new Error("Hash#digest() has already been called");
}
function Gn(t2, e2) {
  Xt$1(t2);
  const n3 = e2.outputLen;
  if (t2.length < n3) throw new Error("digestInto() expects output buffer of length at least " + n3);
}
const le$1 = BigInt(2 ** 32 - 1), Wn = BigInt(32);
function Ti2(t2, e2 = false) {
  return e2 ? { h: Number(t2 & le$1), l: Number(t2 >> Wn & le$1) } : { h: Number(t2 >> Wn & le$1) | 0, l: Number(t2 & le$1) | 0 };
}
function Ri(t2, e2 = false) {
  let n3 = new Uint32Array(t2.length), r2 = new Uint32Array(t2.length);
  for (let o2 = 0; o2 < t2.length; o2++) {
    const { h: i2, l: s2 } = Ti2(t2[o2], e2);
    [n3[o2], r2[o2]] = [i2, s2];
  }
  return [n3, r2];
}
const _i2 = (t2, e2, n3) => t2 << n3 | e2 >>> 32 - n3, $i = (t2, e2, n3) => e2 << n3 | t2 >>> 32 - n3, Li2 = (t2, e2, n3) => e2 << n3 - 32 | t2 >>> 64 - n3, ji2 = (t2, e2, n3) => t2 << n3 - 32 | e2 >>> 64 - n3, _t$2 = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
function Ci(t2) {
  return new Uint32Array(t2.buffer, t2.byteOffset, Math.floor(t2.byteLength / 4));
}
function Pe$1(t2) {
  return new DataView(t2.buffer, t2.byteOffset, t2.byteLength);
}
function ct$1(t2, e2) {
  return t2 << 32 - e2 | t2 >>> e2;
}
const Xn = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function Pi(t2) {
  return t2 << 24 & 4278190080 | t2 << 8 & 16711680 | t2 >>> 8 & 65280 | t2 >>> 24 & 255;
}
function Jn(t2) {
  for (let e2 = 0; e2 < t2.length; e2++) t2[e2] = Pi(t2[e2]);
}
function ki2(t2) {
  if (typeof t2 != "string") throw new Error("utf8ToBytes expected string, got " + typeof t2);
  return new Uint8Array(new TextEncoder().encode(t2));
}
function $t(t2) {
  return typeof t2 == "string" && (t2 = ki2(t2)), Xt$1(t2), t2;
}
function Vi(...t2) {
  let e2 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) {
    const o2 = t2[r2];
    Xt$1(o2), e2 += o2.length;
  }
  const n3 = new Uint8Array(e2);
  for (let r2 = 0, o2 = 0; r2 < t2.length; r2++) {
    const i2 = t2[r2];
    n3.set(i2, o2), o2 += i2.length;
  }
  return n3;
}
let ke$2 = class ke2 {
  clone() {
    return this._cloneInto();
  }
};
function Qn(t2) {
  const e2 = (r2) => t2().update($t(r2)).digest(), n3 = t2();
  return e2.outputLen = n3.outputLen, e2.blockLen = n3.blockLen, e2.create = () => t2(), e2;
}
function Lt$1(t2 = 32) {
  if (_t$2 && typeof _t$2.getRandomValues == "function") return _t$2.getRandomValues(new Uint8Array(t2));
  if (_t$2 && typeof _t$2.randomBytes == "function") return _t$2.randomBytes(t2);
  throw new Error("crypto.getRandomValues must be defined");
}
const tr = [], er = [], nr = [], Mi2 = BigInt(0), Jt$1 = BigInt(1), Di2 = BigInt(2), Hi = BigInt(7), qi = BigInt(256), Ki = BigInt(113);
for (let t2 = 0, e2 = Jt$1, n3 = 1, r2 = 0; t2 < 24; t2++) {
  [n3, r2] = [r2, (2 * n3 + 3 * r2) % 5], tr.push(2 * (5 * r2 + n3)), er.push((t2 + 1) * (t2 + 2) / 2 % 64);
  let o2 = Mi2;
  for (let i2 = 0; i2 < 7; i2++) e2 = (e2 << Jt$1 ^ (e2 >> Hi) * Ki) % qi, e2 & Di2 && (o2 ^= Jt$1 << (Jt$1 << BigInt(i2)) - Jt$1);
  nr.push(o2);
}
const [Fi, zi2] = Ri(nr, true), rr = (t2, e2, n3) => n3 > 32 ? Li2(t2, e2, n3) : _i2(t2, e2, n3), or = (t2, e2, n3) => n3 > 32 ? ji2(t2, e2, n3) : $i(t2, e2, n3);
function Zi(t2, e2 = 24) {
  const n3 = new Uint32Array(10);
  for (let r2 = 24 - e2; r2 < 24; r2++) {
    for (let s2 = 0; s2 < 10; s2++) n3[s2] = t2[s2] ^ t2[s2 + 10] ^ t2[s2 + 20] ^ t2[s2 + 30] ^ t2[s2 + 40];
    for (let s2 = 0; s2 < 10; s2 += 2) {
      const c2 = (s2 + 8) % 10, a2 = (s2 + 2) % 10, u2 = n3[a2], l2 = n3[a2 + 1], f3 = rr(u2, l2, 1) ^ n3[c2], h3 = or(u2, l2, 1) ^ n3[c2 + 1];
      for (let y4 = 0; y4 < 50; y4 += 10) t2[s2 + y4] ^= f3, t2[s2 + y4 + 1] ^= h3;
    }
    let o2 = t2[2], i2 = t2[3];
    for (let s2 = 0; s2 < 24; s2++) {
      const c2 = er[s2], a2 = rr(o2, i2, c2), u2 = or(o2, i2, c2), l2 = tr[s2];
      o2 = t2[l2], i2 = t2[l2 + 1], t2[l2] = a2, t2[l2 + 1] = u2;
    }
    for (let s2 = 0; s2 < 50; s2 += 10) {
      for (let c2 = 0; c2 < 10; c2++) n3[c2] = t2[s2 + c2];
      for (let c2 = 0; c2 < 10; c2++) t2[s2 + c2] ^= ~n3[(c2 + 2) % 10] & n3[(c2 + 4) % 10];
    }
    t2[0] ^= Fi[r2], t2[1] ^= zi2[r2];
  }
  n3.fill(0);
}
class En2 extends ke$2 {
  constructor(e2, n3, r2, o2 = false, i2 = 24) {
    if (super(), this.blockLen = e2, this.suffix = n3, this.outputLen = r2, this.enableXOF = o2, this.rounds = i2, this.pos = 0, this.posOut = 0, this.finished = false, this.destroyed = false, Wt$1(r2), 0 >= this.blockLen || this.blockLen >= 200) throw new Error("Sha3 supports only keccak-f1600 function");
    this.state = new Uint8Array(200), this.state32 = Ci(this.state);
  }
  keccak() {
    Xn || Jn(this.state32), Zi(this.state32, this.rounds), Xn || Jn(this.state32), this.posOut = 0, this.pos = 0;
  }
  update(e2) {
    Rt$1(this);
    const { blockLen: n3, state: r2 } = this;
    e2 = $t(e2);
    const o2 = e2.length;
    for (let i2 = 0; i2 < o2; ) {
      const s2 = Math.min(n3 - this.pos, o2 - i2);
      for (let c2 = 0; c2 < s2; c2++) r2[this.pos++] ^= e2[i2++];
      this.pos === n3 && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    const { state: e2, suffix: n3, pos: r2, blockLen: o2 } = this;
    e2[r2] ^= n3, (n3 & 128) !== 0 && r2 === o2 - 1 && this.keccak(), e2[o2 - 1] ^= 128, this.keccak();
  }
  writeInto(e2) {
    Rt$1(this, false), Xt$1(e2), this.finish();
    const n3 = this.state, { blockLen: r2 } = this;
    for (let o2 = 0, i2 = e2.length; o2 < i2; ) {
      this.posOut >= r2 && this.keccak();
      const s2 = Math.min(r2 - this.posOut, i2 - o2);
      e2.set(n3.subarray(this.posOut, this.posOut + s2), o2), this.posOut += s2, o2 += s2;
    }
    return e2;
  }
  xofInto(e2) {
    if (!this.enableXOF) throw new Error("XOF is not possible for this instance");
    return this.writeInto(e2);
  }
  xof(e2) {
    return Wt$1(e2), this.xofInto(new Uint8Array(e2));
  }
  digestInto(e2) {
    if (Gn(e2, this), this.finished) throw new Error("digest() was already called");
    return this.writeInto(e2), this.destroy(), e2;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true, this.state.fill(0);
  }
  _cloneInto(e2) {
    const { blockLen: n3, suffix: r2, outputLen: o2, rounds: i2, enableXOF: s2 } = this;
    return e2 || (e2 = new En2(n3, r2, o2, s2, i2)), e2.state32.set(this.state32), e2.pos = this.pos, e2.posOut = this.posOut, e2.finished = this.finished, e2.rounds = i2, e2.suffix = r2, e2.outputLen = o2, e2.enableXOF = s2, e2.destroyed = this.destroyed, e2;
  }
}
const Yi = (t2, e2, n3) => Qn(() => new En2(e2, t2, n3)), Gi = Yi(1, 136, 256 / 8), Wi = "https://rpc.walletconnect.org/v1";
function Ve$1(t2) {
  const e2 = `Ethereum Signed Message:
${t2.length}`, n3 = new TextEncoder().encode(e2 + t2);
  return "0x" + Buffer.from(Gi(n3)).toString("hex");
}
async function ir(t2, e2, n3, r2, o2, i2) {
  switch (n3.t) {
    case "eip191":
      return await sr(t2, e2, n3.s);
    case "eip1271":
      return await cr(t2, e2, n3.s, r2, o2, i2);
    default:
      throw new Error(`verifySignature failed: Attempted to verify CacaoSignature with unknown type: ${n3.t}`);
  }
}
async function sr(t2, e2, n3) {
  return (await recoverAddress({ hash: Ve$1(e2), signature: n3 })).toLowerCase() === t2.toLowerCase();
}
async function cr(t2, e2, n3, r2, o2, i2) {
  const s2 = Ne$1(r2);
  if (!s2.namespace || !s2.reference) throw new Error(`isValidEip1271Signature failed: chainId must be in CAIP-2 format, received: ${r2}`);
  try {
    const c2 = "0x1626ba7e", a2 = "0000000000000000000000000000000000000000000000000000000000000040", u2 = "0000000000000000000000000000000000000000000000000000000000000041", l2 = n3.substring(2), f3 = Ve$1(e2).substring(2), h3 = c2 + f3 + a2 + u2 + l2, y4 = await fetch(`${i2 || Wi}/?chainId=${r2}&projectId=${o2}`, { method: "POST", body: JSON.stringify({ id: Xi(), jsonrpc: "2.0", method: "eth_call", params: [{ to: t2, data: h3 }, "latest"] }) }), { result: E2 } = await y4.json();
    return E2 ? E2.slice(0, c2.length).toLowerCase() === c2.toLowerCase() : false;
  } catch (c2) {
    return console.error("isValidEip1271Signature: ", c2), false;
  }
}
function Xi() {
  return Date.now() + Math.floor(Math.random() * 1e3);
}
function Ji(t2) {
  const e2 = atob(t2), n3 = new Uint8Array(e2.length);
  for (let s2 = 0; s2 < e2.length; s2++) n3[s2] = e2.charCodeAt(s2);
  const r2 = n3[0];
  if (r2 === 0) throw new Error("No signatures found");
  const o2 = 1 + r2 * 64;
  if (n3.length < o2) throw new Error("Transaction data too short for claimed signature count");
  if (n3.length < 100) throw new Error("Transaction too short");
  const i2 = Buffer.from(t2, "base64").slice(1, 65);
  return bs58.encode(i2);
}
var Qi = Object.defineProperty, ts$1 = Object.defineProperties, es = Object.getOwnPropertyDescriptors, ar = Object.getOwnPropertySymbols, ns = Object.prototype.hasOwnProperty, rs = Object.prototype.propertyIsEnumerable, ur2 = (t2, e2, n3) => e2 in t2 ? Qi(t2, e2, { enumerable: true, configurable: true, writable: true, value: n3 }) : t2[e2] = n3, Me$2 = (t2, e2) => {
  for (var n3 in e2 || (e2 = {})) ns.call(e2, n3) && ur2(t2, n3, e2[n3]);
  if (ar) for (var n3 of ar(e2)) rs.call(e2, n3) && ur2(t2, n3, e2[n3]);
  return t2;
}, fr = (t2, e2) => ts$1(t2, es(e2));
const os = "did:pkh:", de$1 = (t2) => t2?.split(":"), lr2 = (t2) => {
  const e2 = t2 && de$1(t2);
  if (e2) return t2.includes(os) ? e2[3] : e2[1];
}, dr2 = (t2) => {
  const e2 = t2 && de$1(t2);
  if (e2) return e2[2] + ":" + e2[3];
}, De$2 = (t2) => {
  const e2 = t2 && de$1(t2);
  if (e2) return e2.pop();
};
async function is(t2) {
  const { cacao: e2, projectId: n3 } = t2, { s: r2, p: o2 } = e2, i2 = hr2(o2, o2.iss), s2 = De$2(o2.iss);
  return await ir(s2, i2, r2, dr2(o2.iss), n3);
}
const hr2 = (t2, e2) => {
  const n3 = `${t2.domain} wants you to sign in with your Ethereum account:`, r2 = De$2(e2);
  if (!t2.aud && !t2.uri) throw new Error("Either `aud` or `uri` is required to construct the message");
  let o2 = t2.statement || void 0;
  const i2 = `URI: ${t2.aud || t2.uri}`, s2 = `Version: ${t2.version}`, c2 = `Chain ID: ${lr2(e2)}`, a2 = `Nonce: ${t2.nonce}`, u2 = `Issued At: ${t2.iat}`, l2 = t2.exp ? `Expiration Time: ${t2.exp}` : void 0, f3 = t2.nbf ? `Not Before: ${t2.nbf}` : void 0, h3 = t2.requestId ? `Request ID: ${t2.requestId}` : void 0, y4 = t2.resources ? `Resources:${t2.resources.map((p2) => `
- ${p2}`).join("")}` : void 0, E2 = pe$1(t2.resources);
  if (E2) {
    const p2 = yt$2(E2);
    o2 = Ke$2(o2, p2);
  }
  return [n3, r2, "", o2, "", i2, s2, c2, a2, u2, l2, f3, h3, y4].filter((p2) => p2 != null).join(`
`);
};
function mr(t2) {
  return Buffer.from(JSON.stringify(t2)).toString("base64");
}
function wr(t2) {
  return JSON.parse(Buffer.from(t2, "base64").toString("utf-8"));
}
function at$1(t2) {
  if (!t2) throw new Error("No recap provided, value is undefined");
  if (!t2.att) throw new Error("No `att` property found");
  const e2 = Object.keys(t2.att);
  if (!(e2 != null && e2.length)) throw new Error("No resources found in `att` property");
  e2.forEach((n3) => {
    const r2 = t2.att[n3];
    if (Array.isArray(r2)) throw new Error(`Resource must be an object: ${n3}`);
    if (typeof r2 != "object") throw new Error(`Resource must be an object: ${n3}`);
    if (!Object.keys(r2).length) throw new Error(`Resource object is empty: ${n3}`);
    Object.keys(r2).forEach((o2) => {
      const i2 = r2[o2];
      if (!Array.isArray(i2)) throw new Error(`Ability limits ${o2} must be an array of objects, found: ${i2}`);
      if (!i2.length) throw new Error(`Value of ${o2} is empty array, must be an array with objects`);
      i2.forEach((s2) => {
        if (typeof s2 != "object") throw new Error(`Ability limits (${o2}) must be an array of objects, found: ${s2}`);
      });
    });
  });
}
function br(t2, e2, n3, r2 = {}) {
  return n3?.sort((o2, i2) => o2.localeCompare(i2)), { att: { [t2]: He$1(e2, n3, r2) } };
}
function He$1(t2, e2, n3 = {}) {
  e2 = e2?.sort((o2, i2) => o2.localeCompare(i2));
  const r2 = e2.map((o2) => ({ [`${t2}/${o2}`]: [n3] }));
  return Object.assign({}, ...r2);
}
function he$1(t2) {
  return at$1(t2), `urn:recap:${mr(t2).replace(/=/g, "")}`;
}
function yt$2(t2) {
  const e2 = wr(t2.replace("urn:recap:", ""));
  return at$1(e2), e2;
}
function fs(t2, e2, n3) {
  const r2 = br(t2, e2, n3);
  return he$1(r2);
}
function qe$1(t2) {
  return t2 && t2.includes("urn:recap:");
}
function ls(t2, e2) {
  const n3 = yt$2(t2), r2 = yt$2(e2), o2 = vr(n3, r2);
  return he$1(o2);
}
function vr(t2, e2) {
  at$1(t2), at$1(e2);
  const n3 = Object.keys(t2.att).concat(Object.keys(e2.att)).sort((o2, i2) => o2.localeCompare(i2)), r2 = { att: {} };
  return n3.forEach((o2) => {
    var i2, s2;
    Object.keys(((i2 = t2.att) == null ? void 0 : i2[o2]) || {}).concat(Object.keys(((s2 = e2.att) == null ? void 0 : s2[o2]) || {})).sort((c2, a2) => c2.localeCompare(a2)).forEach((c2) => {
      var a2, u2;
      r2.att[o2] = fr(Me$2({}, r2.att[o2]), { [c2]: ((a2 = t2.att[o2]) == null ? void 0 : a2[c2]) || ((u2 = e2.att[o2]) == null ? void 0 : u2[c2]) });
    });
  }), r2;
}
function Ke$2(t2 = "", e2) {
  at$1(e2);
  const n3 = "I further authorize the stated URI to perform the following actions on my behalf: ";
  if (t2.includes(n3)) return t2;
  const r2 = [];
  let o2 = 0;
  Object.keys(e2.att).forEach((c2) => {
    const a2 = Object.keys(e2.att[c2]).map((f3) => ({ ability: f3.split("/")[0], action: f3.split("/")[1] }));
    a2.sort((f3, h3) => f3.action.localeCompare(h3.action));
    const u2 = {};
    a2.forEach((f3) => {
      u2[f3.ability] || (u2[f3.ability] = []), u2[f3.ability].push(f3.action);
    });
    const l2 = Object.keys(u2).map((f3) => (o2++, `(${o2}) '${f3}': '${u2[f3].join("', '")}' for '${c2}'.`));
    r2.push(l2.join(", ").replace(".,", "."));
  });
  const i2 = r2.join(" "), s2 = `${n3}${i2}`;
  return `${t2 ? t2 + " " : ""}${s2}`;
}
function ds(t2) {
  var e2;
  const n3 = yt$2(t2);
  at$1(n3);
  const r2 = (e2 = n3.att) == null ? void 0 : e2.eip155;
  return r2 ? Object.keys(r2).map((o2) => o2.split("/")[1]) : [];
}
function hs(t2) {
  const e2 = yt$2(t2);
  at$1(e2);
  const n3 = [];
  return Object.values(e2.att).forEach((r2) => {
    Object.values(r2).forEach((o2) => {
      var i2;
      (i2 = o2?.[0]) != null && i2.chains && n3.push(o2[0].chains);
    });
  }), [...new Set(n3.flat())];
}
function pe$1(t2) {
  if (!t2) return;
  const e2 = t2?.[t2.length - 1];
  return qe$1(e2) ? e2 : void 0;
}
function Fe$1(t2) {
  if (!Number.isSafeInteger(t2) || t2 < 0) throw new Error("positive integer expected, got " + t2);
}
function Sr(t2) {
  return t2 instanceof Uint8Array || ArrayBuffer.isView(t2) && t2.constructor.name === "Uint8Array";
}
function tt(t2, ...e2) {
  if (!Sr(t2)) throw new Error("Uint8Array expected");
  if (e2.length > 0 && !e2.includes(t2.length)) throw new Error("Uint8Array expected of length " + e2 + ", got length=" + t2.length);
}
function Or(t2, e2 = true) {
  if (t2.destroyed) throw new Error("Hash instance has been destroyed");
  if (e2 && t2.finished) throw new Error("Hash#digest() has already been called");
}
function ps(t2, e2) {
  tt(t2);
  const n3 = e2.outputLen;
  if (t2.length < n3) throw new Error("digestInto() expects output buffer of length at least " + n3);
}
function Ar(t2) {
  if (typeof t2 != "boolean") throw new Error(`boolean expected, not ${t2}`);
}
const mt$2 = (t2) => new Uint32Array(t2.buffer, t2.byteOffset, Math.floor(t2.byteLength / 4)), gs = (t2) => new DataView(t2.buffer, t2.byteOffset, t2.byteLength), ys = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
if (!ys) throw new Error("Non little-endian hardware is not supported");
function ms(t2) {
  if (typeof t2 != "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t2));
}
function ze$1(t2) {
  if (typeof t2 == "string") t2 = ms(t2);
  else if (Sr(t2)) t2 = Ze$1(t2);
  else throw new Error("Uint8Array expected, got " + typeof t2);
  return t2;
}
function ws(t2, e2) {
  if (e2 == null || typeof e2 != "object") throw new Error("options must be defined");
  return Object.assign(t2, e2);
}
function bs$1(t2, e2) {
  if (t2.length !== e2.length) return false;
  let n3 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) n3 |= t2[r2] ^ e2[r2];
  return n3 === 0;
}
const Es = (t2, e2) => {
  function n3(r2, ...o2) {
    if (tt(r2), t2.nonceLength !== void 0) {
      const l2 = o2[0];
      if (!l2) throw new Error("nonce / iv required");
      t2.varSizeNonce ? tt(l2) : tt(l2, t2.nonceLength);
    }
    const i2 = t2.tagLength;
    i2 && o2[1] !== void 0 && tt(o2[1]);
    const s2 = e2(r2, ...o2), c2 = (l2, f3) => {
      if (f3 !== void 0) {
        if (l2 !== 2) throw new Error("cipher output not supported");
        tt(f3);
      }
    };
    let a2 = false;
    return { encrypt(l2, f3) {
      if (a2) throw new Error("cannot encrypt() twice with same key + nonce");
      return a2 = true, tt(l2), c2(s2.encrypt.length, f3), s2.encrypt(l2, f3);
    }, decrypt(l2, f3) {
      if (tt(l2), i2 && l2.length < i2) throw new Error("invalid ciphertext length: smaller than tagLength=" + i2);
      return c2(s2.decrypt.length, f3), s2.decrypt(l2, f3);
    } };
  }
  return Object.assign(n3, t2), n3;
};
function Br(t2, e2, n3 = true) {
  if (e2 === void 0) return new Uint8Array(t2);
  if (e2.length !== t2) throw new Error("invalid output length, expected " + t2 + ", got: " + e2.length);
  if (n3 && !vs$1(e2)) throw new Error("invalid output, must be aligned");
  return e2;
}
function Ir(t2, e2, n3, r2) {
  if (typeof t2.setBigUint64 == "function") return t2.setBigUint64(e2, n3, r2);
  const o2 = BigInt(32), i2 = BigInt(4294967295), s2 = Number(n3 >> o2 & i2), c2 = Number(n3 & i2), a2 = 4, u2 = 0;
  t2.setUint32(e2 + a2, s2, r2), t2.setUint32(e2 + u2, c2, r2);
}
function vs$1(t2) {
  return t2.byteOffset % 4 === 0;
}
function Ze$1(t2) {
  return Uint8Array.from(t2);
}
function jt$1(...t2) {
  for (let e2 = 0; e2 < t2.length; e2++) t2[e2].fill(0);
}
const Nr = (t2) => Uint8Array.from(t2.split("").map((e2) => e2.charCodeAt(0))), xs$1 = Nr("expand 16-byte k"), Ss = Nr("expand 32-byte k"), Os$1 = mt$2(xs$1), As$1 = mt$2(Ss);
function V$2(t2, e2) {
  return t2 << e2 | t2 >>> 32 - e2;
}
function Ye$1(t2) {
  return t2.byteOffset % 4 === 0;
}
const ge$1 = 64, Bs = 16, Ur = 2 ** 32 - 1, Tr = new Uint32Array();
function Is$1(t2, e2, n3, r2, o2, i2, s2, c2) {
  const a2 = o2.length, u2 = new Uint8Array(ge$1), l2 = mt$2(u2), f3 = Ye$1(o2) && Ye$1(i2), h3 = f3 ? mt$2(o2) : Tr, y4 = f3 ? mt$2(i2) : Tr;
  for (let E2 = 0; E2 < a2; s2++) {
    if (t2(e2, n3, r2, l2, s2, c2), s2 >= Ur) throw new Error("arx: counter overflow");
    const p2 = Math.min(ge$1, a2 - E2);
    if (f3 && p2 === ge$1) {
      const d3 = E2 / 4;
      if (E2 % 4 !== 0) throw new Error("arx: invalid block position");
      for (let v2 = 0, m3; v2 < Bs; v2++) m3 = d3 + v2, y4[m3] = h3[m3] ^ l2[v2];
      E2 += ge$1;
      continue;
    }
    for (let d3 = 0, v2; d3 < p2; d3++) v2 = E2 + d3, i2[v2] = o2[v2] ^ u2[d3];
    E2 += p2;
  }
}
function Ns$1(t2, e2) {
  const { allowShortKeys: n3, extendNonceFn: r2, counterLength: o2, counterRight: i2, rounds: s2 } = ws({ allowShortKeys: false, counterLength: 8, counterRight: false, rounds: 20 }, e2);
  if (typeof t2 != "function") throw new Error("core must be a function");
  return Fe$1(o2), Fe$1(s2), Ar(i2), Ar(n3), (c2, a2, u2, l2, f3 = 0) => {
    tt(c2), tt(a2), tt(u2);
    const h3 = u2.length;
    if (l2 === void 0 && (l2 = new Uint8Array(h3)), tt(l2), Fe$1(f3), f3 < 0 || f3 >= Ur) throw new Error("arx: counter overflow");
    if (l2.length < h3) throw new Error(`arx: output (${l2.length}) is shorter than data (${h3})`);
    const y4 = [];
    let E2 = c2.length, p2, d3;
    if (E2 === 32) y4.push(p2 = Ze$1(c2)), d3 = As$1;
    else if (E2 === 16 && n3) p2 = new Uint8Array(32), p2.set(c2), p2.set(c2, 16), d3 = Os$1, y4.push(p2);
    else throw new Error(`arx: invalid 32-byte key, got length=${E2}`);
    Ye$1(a2) || y4.push(a2 = Ze$1(a2));
    const v2 = mt$2(p2);
    if (r2) {
      if (a2.length !== 24) throw new Error("arx: extended nonce must be 24 bytes");
      r2(d3, v2, mt$2(a2.subarray(0, 16)), v2), a2 = a2.subarray(16);
    }
    const m3 = 16 - o2;
    if (m3 !== a2.length) throw new Error(`arx: nonce must be ${m3} or 16 bytes`);
    if (m3 !== 12) {
      const N2 = new Uint8Array(12);
      N2.set(a2, i2 ? 0 : 12 - a2.length), a2 = N2, y4.push(a2);
    }
    const O3 = mt$2(a2);
    return Is$1(t2, d3, v2, O3, u2, l2, f3, s2), jt$1(...y4), l2;
  };
}
const F$1 = (t2, e2) => t2[e2++] & 255 | (t2[e2++] & 255) << 8;
class Us2 {
  constructor(e2) {
    this.blockLen = 16, this.outputLen = 16, this.buffer = new Uint8Array(16), this.r = new Uint16Array(10), this.h = new Uint16Array(10), this.pad = new Uint16Array(8), this.pos = 0, this.finished = false, e2 = ze$1(e2), tt(e2, 32);
    const n3 = F$1(e2, 0), r2 = F$1(e2, 2), o2 = F$1(e2, 4), i2 = F$1(e2, 6), s2 = F$1(e2, 8), c2 = F$1(e2, 10), a2 = F$1(e2, 12), u2 = F$1(e2, 14);
    this.r[0] = n3 & 8191, this.r[1] = (n3 >>> 13 | r2 << 3) & 8191, this.r[2] = (r2 >>> 10 | o2 << 6) & 7939, this.r[3] = (o2 >>> 7 | i2 << 9) & 8191, this.r[4] = (i2 >>> 4 | s2 << 12) & 255, this.r[5] = s2 >>> 1 & 8190, this.r[6] = (s2 >>> 14 | c2 << 2) & 8191, this.r[7] = (c2 >>> 11 | a2 << 5) & 8065, this.r[8] = (a2 >>> 8 | u2 << 8) & 8191, this.r[9] = u2 >>> 5 & 127;
    for (let l2 = 0; l2 < 8; l2++) this.pad[l2] = F$1(e2, 16 + 2 * l2);
  }
  process(e2, n3, r2 = false) {
    const o2 = r2 ? 0 : 2048, { h: i2, r: s2 } = this, c2 = s2[0], a2 = s2[1], u2 = s2[2], l2 = s2[3], f3 = s2[4], h3 = s2[5], y4 = s2[6], E2 = s2[7], p2 = s2[8], d3 = s2[9], v2 = F$1(e2, n3 + 0), m3 = F$1(e2, n3 + 2), O3 = F$1(e2, n3 + 4), N2 = F$1(e2, n3 + 6), $2 = F$1(e2, n3 + 8), B3 = F$1(e2, n3 + 10), A2 = F$1(e2, n3 + 12), T2 = F$1(e2, n3 + 14);
    let S3 = i2[0] + (v2 & 8191), L2 = i2[1] + ((v2 >>> 13 | m3 << 3) & 8191), U2 = i2[2] + ((m3 >>> 10 | O3 << 6) & 8191), _2 = i2[3] + ((O3 >>> 7 | N2 << 9) & 8191), j2 = i2[4] + ((N2 >>> 4 | $2 << 12) & 8191), g2 = i2[5] + ($2 >>> 1 & 8191), w2 = i2[6] + (($2 >>> 14 | B3 << 2) & 8191), b2 = i2[7] + ((B3 >>> 11 | A2 << 5) & 8191), I3 = i2[8] + ((A2 >>> 8 | T2 << 8) & 8191), R3 = i2[9] + (T2 >>> 5 | o2), x2 = 0, C2 = x2 + S3 * c2 + L2 * (5 * d3) + U2 * (5 * p2) + _2 * (5 * E2) + j2 * (5 * y4);
    x2 = C2 >>> 13, C2 &= 8191, C2 += g2 * (5 * h3) + w2 * (5 * f3) + b2 * (5 * l2) + I3 * (5 * u2) + R3 * (5 * a2), x2 += C2 >>> 13, C2 &= 8191;
    let P3 = x2 + S3 * a2 + L2 * c2 + U2 * (5 * d3) + _2 * (5 * p2) + j2 * (5 * E2);
    x2 = P3 >>> 13, P3 &= 8191, P3 += g2 * (5 * y4) + w2 * (5 * h3) + b2 * (5 * f3) + I3 * (5 * l2) + R3 * (5 * u2), x2 += P3 >>> 13, P3 &= 8191;
    let k2 = x2 + S3 * u2 + L2 * a2 + U2 * c2 + _2 * (5 * d3) + j2 * (5 * p2);
    x2 = k2 >>> 13, k2 &= 8191, k2 += g2 * (5 * E2) + w2 * (5 * y4) + b2 * (5 * h3) + I3 * (5 * f3) + R3 * (5 * l2), x2 += k2 >>> 13, k2 &= 8191;
    let M3 = x2 + S3 * l2 + L2 * u2 + U2 * a2 + _2 * c2 + j2 * (5 * d3);
    x2 = M3 >>> 13, M3 &= 8191, M3 += g2 * (5 * p2) + w2 * (5 * E2) + b2 * (5 * y4) + I3 * (5 * h3) + R3 * (5 * f3), x2 += M3 >>> 13, M3 &= 8191;
    let D2 = x2 + S3 * f3 + L2 * l2 + U2 * u2 + _2 * a2 + j2 * c2;
    x2 = D2 >>> 13, D2 &= 8191, D2 += g2 * (5 * d3) + w2 * (5 * p2) + b2 * (5 * E2) + I3 * (5 * y4) + R3 * (5 * h3), x2 += D2 >>> 13, D2 &= 8191;
    let z2 = x2 + S3 * h3 + L2 * f3 + U2 * l2 + _2 * u2 + j2 * a2;
    x2 = z2 >>> 13, z2 &= 8191, z2 += g2 * c2 + w2 * (5 * d3) + b2 * (5 * p2) + I3 * (5 * E2) + R3 * (5 * y4), x2 += z2 >>> 13, z2 &= 8191;
    let Z2 = x2 + S3 * y4 + L2 * h3 + U2 * f3 + _2 * l2 + j2 * u2;
    x2 = Z2 >>> 13, Z2 &= 8191, Z2 += g2 * a2 + w2 * c2 + b2 * (5 * d3) + I3 * (5 * p2) + R3 * (5 * E2), x2 += Z2 >>> 13, Z2 &= 8191;
    let st2 = x2 + S3 * E2 + L2 * y4 + U2 * h3 + _2 * f3 + j2 * l2;
    x2 = st2 >>> 13, st2 &= 8191, st2 += g2 * u2 + w2 * a2 + b2 * c2 + I3 * (5 * d3) + R3 * (5 * p2), x2 += st2 >>> 13, st2 &= 8191;
    let W2 = x2 + S3 * p2 + L2 * E2 + U2 * y4 + _2 * h3 + j2 * f3;
    x2 = W2 >>> 13, W2 &= 8191, W2 += g2 * l2 + w2 * u2 + b2 * a2 + I3 * c2 + R3 * (5 * d3), x2 += W2 >>> 13, W2 &= 8191;
    let J3 = x2 + S3 * d3 + L2 * p2 + U2 * E2 + _2 * y4 + j2 * h3;
    x2 = J3 >>> 13, J3 &= 8191, J3 += g2 * f3 + w2 * l2 + b2 * u2 + I3 * a2 + R3 * c2, x2 += J3 >>> 13, J3 &= 8191, x2 = (x2 << 2) + x2 | 0, x2 = x2 + C2 | 0, C2 = x2 & 8191, x2 = x2 >>> 13, P3 += x2, i2[0] = C2, i2[1] = P3, i2[2] = k2, i2[3] = M3, i2[4] = D2, i2[5] = z2, i2[6] = Z2, i2[7] = st2, i2[8] = W2, i2[9] = J3;
  }
  finalize() {
    const { h: e2, pad: n3 } = this, r2 = new Uint16Array(10);
    let o2 = e2[1] >>> 13;
    e2[1] &= 8191;
    for (let c2 = 2; c2 < 10; c2++) e2[c2] += o2, o2 = e2[c2] >>> 13, e2[c2] &= 8191;
    e2[0] += o2 * 5, o2 = e2[0] >>> 13, e2[0] &= 8191, e2[1] += o2, o2 = e2[1] >>> 13, e2[1] &= 8191, e2[2] += o2, r2[0] = e2[0] + 5, o2 = r2[0] >>> 13, r2[0] &= 8191;
    for (let c2 = 1; c2 < 10; c2++) r2[c2] = e2[c2] + o2, o2 = r2[c2] >>> 13, r2[c2] &= 8191;
    r2[9] -= 8192;
    let i2 = (o2 ^ 1) - 1;
    for (let c2 = 0; c2 < 10; c2++) r2[c2] &= i2;
    i2 = ~i2;
    for (let c2 = 0; c2 < 10; c2++) e2[c2] = e2[c2] & i2 | r2[c2];
    e2[0] = (e2[0] | e2[1] << 13) & 65535, e2[1] = (e2[1] >>> 3 | e2[2] << 10) & 65535, e2[2] = (e2[2] >>> 6 | e2[3] << 7) & 65535, e2[3] = (e2[3] >>> 9 | e2[4] << 4) & 65535, e2[4] = (e2[4] >>> 12 | e2[5] << 1 | e2[6] << 14) & 65535, e2[5] = (e2[6] >>> 2 | e2[7] << 11) & 65535, e2[6] = (e2[7] >>> 5 | e2[8] << 8) & 65535, e2[7] = (e2[8] >>> 8 | e2[9] << 5) & 65535;
    let s2 = e2[0] + n3[0];
    e2[0] = s2 & 65535;
    for (let c2 = 1; c2 < 8; c2++) s2 = (e2[c2] + n3[c2] | 0) + (s2 >>> 16) | 0, e2[c2] = s2 & 65535;
    jt$1(r2);
  }
  update(e2) {
    Or(this);
    const { buffer: n3, blockLen: r2 } = this;
    e2 = ze$1(e2);
    const o2 = e2.length;
    for (let i2 = 0; i2 < o2; ) {
      const s2 = Math.min(r2 - this.pos, o2 - i2);
      if (s2 === r2) {
        for (; r2 <= o2 - i2; i2 += r2) this.process(e2, i2);
        continue;
      }
      n3.set(e2.subarray(i2, i2 + s2), this.pos), this.pos += s2, i2 += s2, this.pos === r2 && (this.process(n3, 0, false), this.pos = 0);
    }
    return this;
  }
  destroy() {
    jt$1(this.h, this.r, this.buffer, this.pad);
  }
  digestInto(e2) {
    Or(this), ps(e2, this), this.finished = true;
    const { buffer: n3, h: r2 } = this;
    let { pos: o2 } = this;
    if (o2) {
      for (n3[o2++] = 1; o2 < 16; o2++) n3[o2] = 0;
      this.process(n3, 0, true);
    }
    this.finalize();
    let i2 = 0;
    for (let s2 = 0; s2 < 8; s2++) e2[i2++] = r2[s2] >>> 0, e2[i2++] = r2[s2] >>> 8;
    return e2;
  }
  digest() {
    const { buffer: e2, outputLen: n3 } = this;
    this.digestInto(e2);
    const r2 = e2.slice(0, n3);
    return this.destroy(), r2;
  }
}
function Ts$1(t2) {
  const e2 = (r2, o2) => t2(o2).update(ze$1(r2)).digest(), n3 = t2(new Uint8Array(32));
  return e2.outputLen = n3.outputLen, e2.blockLen = n3.blockLen, e2.create = (r2) => t2(r2), e2;
}
const Rs = Ts$1((t2) => new Us2(t2));
function _s(t2, e2, n3, r2, o2, i2 = 20) {
  let s2 = t2[0], c2 = t2[1], a2 = t2[2], u2 = t2[3], l2 = e2[0], f3 = e2[1], h3 = e2[2], y4 = e2[3], E2 = e2[4], p2 = e2[5], d3 = e2[6], v2 = e2[7], m3 = o2, O3 = n3[0], N2 = n3[1], $2 = n3[2], B3 = s2, A2 = c2, T2 = a2, S3 = u2, L2 = l2, U2 = f3, _2 = h3, j2 = y4, g2 = E2, w2 = p2, b2 = d3, I3 = v2, R3 = m3, x2 = O3, C2 = N2, P3 = $2;
  for (let M3 = 0; M3 < i2; M3 += 2) B3 = B3 + L2 | 0, R3 = V$2(R3 ^ B3, 16), g2 = g2 + R3 | 0, L2 = V$2(L2 ^ g2, 12), B3 = B3 + L2 | 0, R3 = V$2(R3 ^ B3, 8), g2 = g2 + R3 | 0, L2 = V$2(L2 ^ g2, 7), A2 = A2 + U2 | 0, x2 = V$2(x2 ^ A2, 16), w2 = w2 + x2 | 0, U2 = V$2(U2 ^ w2, 12), A2 = A2 + U2 | 0, x2 = V$2(x2 ^ A2, 8), w2 = w2 + x2 | 0, U2 = V$2(U2 ^ w2, 7), T2 = T2 + _2 | 0, C2 = V$2(C2 ^ T2, 16), b2 = b2 + C2 | 0, _2 = V$2(_2 ^ b2, 12), T2 = T2 + _2 | 0, C2 = V$2(C2 ^ T2, 8), b2 = b2 + C2 | 0, _2 = V$2(_2 ^ b2, 7), S3 = S3 + j2 | 0, P3 = V$2(P3 ^ S3, 16), I3 = I3 + P3 | 0, j2 = V$2(j2 ^ I3, 12), S3 = S3 + j2 | 0, P3 = V$2(P3 ^ S3, 8), I3 = I3 + P3 | 0, j2 = V$2(j2 ^ I3, 7), B3 = B3 + U2 | 0, P3 = V$2(P3 ^ B3, 16), b2 = b2 + P3 | 0, U2 = V$2(U2 ^ b2, 12), B3 = B3 + U2 | 0, P3 = V$2(P3 ^ B3, 8), b2 = b2 + P3 | 0, U2 = V$2(U2 ^ b2, 7), A2 = A2 + _2 | 0, R3 = V$2(R3 ^ A2, 16), I3 = I3 + R3 | 0, _2 = V$2(_2 ^ I3, 12), A2 = A2 + _2 | 0, R3 = V$2(R3 ^ A2, 8), I3 = I3 + R3 | 0, _2 = V$2(_2 ^ I3, 7), T2 = T2 + j2 | 0, x2 = V$2(x2 ^ T2, 16), g2 = g2 + x2 | 0, j2 = V$2(j2 ^ g2, 12), T2 = T2 + j2 | 0, x2 = V$2(x2 ^ T2, 8), g2 = g2 + x2 | 0, j2 = V$2(j2 ^ g2, 7), S3 = S3 + L2 | 0, C2 = V$2(C2 ^ S3, 16), w2 = w2 + C2 | 0, L2 = V$2(L2 ^ w2, 12), S3 = S3 + L2 | 0, C2 = V$2(C2 ^ S3, 8), w2 = w2 + C2 | 0, L2 = V$2(L2 ^ w2, 7);
  let k2 = 0;
  r2[k2++] = s2 + B3 | 0, r2[k2++] = c2 + A2 | 0, r2[k2++] = a2 + T2 | 0, r2[k2++] = u2 + S3 | 0, r2[k2++] = l2 + L2 | 0, r2[k2++] = f3 + U2 | 0, r2[k2++] = h3 + _2 | 0, r2[k2++] = y4 + j2 | 0, r2[k2++] = E2 + g2 | 0, r2[k2++] = p2 + w2 | 0, r2[k2++] = d3 + b2 | 0, r2[k2++] = v2 + I3 | 0, r2[k2++] = m3 + R3 | 0, r2[k2++] = O3 + x2 | 0, r2[k2++] = N2 + C2 | 0, r2[k2++] = $2 + P3 | 0;
}
const $s = Ns$1(_s, { counterRight: false, counterLength: 4, allowShortKeys: false }), Ls$1 = new Uint8Array(16), Rr = (t2, e2) => {
  t2.update(e2);
  const n3 = e2.length % 16;
  n3 && t2.update(Ls$1.subarray(n3));
}, js = new Uint8Array(32);
function _r(t2, e2, n3, r2, o2) {
  const i2 = t2(e2, n3, js), s2 = Rs.create(i2);
  o2 && Rr(s2, o2), Rr(s2, r2);
  const c2 = new Uint8Array(16), a2 = gs(c2);
  Ir(a2, 0, BigInt(o2 ? o2.length : 0), true), Ir(a2, 8, BigInt(r2.length), true), s2.update(c2);
  const u2 = s2.digest();
  return jt$1(i2, c2), u2;
}
const Cs$1 = (t2) => (e2, n3, r2) => ({ encrypt(i2, s2) {
  const c2 = i2.length;
  s2 = Br(c2 + 16, s2, false), s2.set(i2);
  const a2 = s2.subarray(0, -16);
  t2(e2, n3, a2, a2, 1);
  const u2 = _r(t2, e2, n3, a2, r2);
  return s2.set(u2, c2), jt$1(u2), s2;
}, decrypt(i2, s2) {
  s2 = Br(i2.length - 16, s2, false);
  const c2 = i2.subarray(0, -16), a2 = i2.subarray(-16), u2 = _r(t2, e2, n3, c2, r2);
  if (!bs$1(a2, u2)) throw new Error("invalid tag");
  return s2.set(i2.subarray(0, -16)), t2(e2, n3, s2, s2, 1), jt$1(u2), s2;
} });
Es({ blockSize: 64, nonceLength: 12, tagLength: 16 }, Cs$1($s));
class Lr2 extends ke$2 {
  constructor(e2, n3) {
    super(), this.finished = false, this.destroyed = false, Ce$1(e2);
    const r2 = $t(n3);
    if (this.iHash = e2.create(), typeof this.iHash.update != "function") throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const o2 = this.blockLen, i2 = new Uint8Array(o2);
    i2.set(r2.length > o2 ? e2.create().update(r2).digest() : r2);
    for (let s2 = 0; s2 < i2.length; s2++) i2[s2] ^= 54;
    this.iHash.update(i2), this.oHash = e2.create();
    for (let s2 = 0; s2 < i2.length; s2++) i2[s2] ^= 106;
    this.oHash.update(i2), i2.fill(0);
  }
  update(e2) {
    return Rt$1(this), this.iHash.update(e2), this;
  }
  digestInto(e2) {
    Rt$1(this), Xt$1(e2, this.outputLen), this.finished = true, this.iHash.digestInto(e2), this.oHash.update(e2), this.oHash.digestInto(e2), this.destroy();
  }
  digest() {
    const e2 = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e2), e2;
  }
  _cloneInto(e2) {
    e2 || (e2 = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n3, iHash: r2, finished: o2, destroyed: i2, blockLen: s2, outputLen: c2 } = this;
    return e2 = e2, e2.finished = o2, e2.destroyed = i2, e2.blockLen = s2, e2.outputLen = c2, e2.oHash = n3._cloneInto(e2.oHash), e2.iHash = r2._cloneInto(e2.iHash), e2;
  }
  destroy() {
    this.destroyed = true, this.oHash.destroy(), this.iHash.destroy();
  }
}
const ye$1 = (t2, e2, n3) => new Lr2(t2, e2).update(n3).digest();
ye$1.create = (t2, e2) => new Lr2(t2, e2);
function Ms$1(t2, e2, n3, r2) {
  if (typeof t2.setBigUint64 == "function") return t2.setBigUint64(e2, n3, r2);
  const o2 = BigInt(32), i2 = BigInt(4294967295), s2 = Number(n3 >> o2 & i2), c2 = Number(n3 & i2), a2 = r2 ? 4 : 0, u2 = r2 ? 0 : 4;
  t2.setUint32(e2 + a2, s2, r2), t2.setUint32(e2 + u2, c2, r2);
}
function Ds$1(t2, e2, n3) {
  return t2 & e2 ^ ~t2 & n3;
}
function Hs(t2, e2, n3) {
  return t2 & e2 ^ t2 & n3 ^ e2 & n3;
}
let qs$1 = class qs2 extends ke$2 {
  constructor(e2, n3, r2, o2) {
    super(), this.blockLen = e2, this.outputLen = n3, this.padOffset = r2, this.isLE = o2, this.finished = false, this.length = 0, this.pos = 0, this.destroyed = false, this.buffer = new Uint8Array(e2), this.view = Pe$1(this.buffer);
  }
  update(e2) {
    Rt$1(this);
    const { view: n3, buffer: r2, blockLen: o2 } = this;
    e2 = $t(e2);
    const i2 = e2.length;
    for (let s2 = 0; s2 < i2; ) {
      const c2 = Math.min(o2 - this.pos, i2 - s2);
      if (c2 === o2) {
        const a2 = Pe$1(e2);
        for (; o2 <= i2 - s2; s2 += o2) this.process(a2, s2);
        continue;
      }
      r2.set(e2.subarray(s2, s2 + c2), this.pos), this.pos += c2, s2 += c2, this.pos === o2 && (this.process(n3, 0), this.pos = 0);
    }
    return this.length += e2.length, this.roundClean(), this;
  }
  digestInto(e2) {
    Rt$1(this), Gn(e2, this), this.finished = true;
    const { buffer: n3, view: r2, blockLen: o2, isLE: i2 } = this;
    let { pos: s2 } = this;
    n3[s2++] = 128, this.buffer.subarray(s2).fill(0), this.padOffset > o2 - s2 && (this.process(r2, 0), s2 = 0);
    for (let f3 = s2; f3 < o2; f3++) n3[f3] = 0;
    Ms$1(r2, o2 - 8, BigInt(this.length * 8), i2), this.process(r2, 0);
    const c2 = Pe$1(e2), a2 = this.outputLen;
    if (a2 % 4) throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u2 = a2 / 4, l2 = this.get();
    if (u2 > l2.length) throw new Error("_sha2: outputLen bigger than state");
    for (let f3 = 0; f3 < u2; f3++) c2.setUint32(4 * f3, l2[f3], i2);
  }
  digest() {
    const { buffer: e2, outputLen: n3 } = this;
    this.digestInto(e2);
    const r2 = e2.slice(0, n3);
    return this.destroy(), r2;
  }
  _cloneInto(e2) {
    e2 || (e2 = new this.constructor()), e2.set(...this.get());
    const { blockLen: n3, buffer: r2, length: o2, finished: i2, destroyed: s2, pos: c2 } = this;
    return e2.length = o2, e2.pos = c2, e2.finished = i2, e2.destroyed = s2, o2 % n3 && e2.buffer.set(r2), e2;
  }
};
const Ks = new Uint32Array([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]), wt$2 = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]), bt$1 = new Uint32Array(64);
class Fs2 extends qs$1 {
  constructor() {
    super(64, 32, 8, false), this.A = wt$2[0] | 0, this.B = wt$2[1] | 0, this.C = wt$2[2] | 0, this.D = wt$2[3] | 0, this.E = wt$2[4] | 0, this.F = wt$2[5] | 0, this.G = wt$2[6] | 0, this.H = wt$2[7] | 0;
  }
  get() {
    const { A: e2, B: n3, C: r2, D: o2, E: i2, F: s2, G: c2, H: a2 } = this;
    return [e2, n3, r2, o2, i2, s2, c2, a2];
  }
  set(e2, n3, r2, o2, i2, s2, c2, a2) {
    this.A = e2 | 0, this.B = n3 | 0, this.C = r2 | 0, this.D = o2 | 0, this.E = i2 | 0, this.F = s2 | 0, this.G = c2 | 0, this.H = a2 | 0;
  }
  process(e2, n3) {
    for (let f3 = 0; f3 < 16; f3++, n3 += 4) bt$1[f3] = e2.getUint32(n3, false);
    for (let f3 = 16; f3 < 64; f3++) {
      const h3 = bt$1[f3 - 15], y4 = bt$1[f3 - 2], E2 = ct$1(h3, 7) ^ ct$1(h3, 18) ^ h3 >>> 3, p2 = ct$1(y4, 17) ^ ct$1(y4, 19) ^ y4 >>> 10;
      bt$1[f3] = p2 + bt$1[f3 - 7] + E2 + bt$1[f3 - 16] | 0;
    }
    let { A: r2, B: o2, C: i2, D: s2, E: c2, F: a2, G: u2, H: l2 } = this;
    for (let f3 = 0; f3 < 64; f3++) {
      const h3 = ct$1(c2, 6) ^ ct$1(c2, 11) ^ ct$1(c2, 25), y4 = l2 + h3 + Ds$1(c2, a2, u2) + Ks[f3] + bt$1[f3] | 0, p2 = (ct$1(r2, 2) ^ ct$1(r2, 13) ^ ct$1(r2, 22)) + Hs(r2, o2, i2) | 0;
      l2 = u2, u2 = a2, a2 = c2, c2 = s2 + y4 | 0, s2 = i2, i2 = o2, o2 = r2, r2 = y4 + p2 | 0;
    }
    r2 = r2 + this.A | 0, o2 = o2 + this.B | 0, i2 = i2 + this.C | 0, s2 = s2 + this.D | 0, c2 = c2 + this.E | 0, a2 = a2 + this.F | 0, u2 = u2 + this.G | 0, l2 = l2 + this.H | 0, this.set(r2, o2, i2, s2, c2, a2, u2, l2);
  }
  roundClean() {
    bt$1.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
}
const Qt$1 = Qn(() => new Fs2());
const me$2 = BigInt(0), we$2 = BigInt(1), zs = BigInt(2);
function St$2(t2) {
  return t2 instanceof Uint8Array || ArrayBuffer.isView(t2) && t2.constructor.name === "Uint8Array";
}
function te$1(t2) {
  if (!St$2(t2)) throw new Error("Uint8Array expected");
}
function Ct(t2, e2) {
  if (typeof e2 != "boolean") throw new Error(t2 + " boolean expected, got " + e2);
}
const Zs = Array.from({ length: 256 }, (t2, e2) => e2.toString(16).padStart(2, "0"));
function Pt$1(t2) {
  te$1(t2);
  let e2 = "";
  for (let n3 = 0; n3 < t2.length; n3++) e2 += Zs[t2[n3]];
  return e2;
}
function kt$1(t2) {
  const e2 = t2.toString(16);
  return e2.length & 1 ? "0" + e2 : e2;
}
function We$1(t2) {
  if (typeof t2 != "string") throw new Error("hex string expected, got " + typeof t2);
  return t2 === "" ? me$2 : BigInt("0x" + t2);
}
const ut$2 = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Cr(t2) {
  if (t2 >= ut$2._0 && t2 <= ut$2._9) return t2 - ut$2._0;
  if (t2 >= ut$2.A && t2 <= ut$2.F) return t2 - (ut$2.A - 10);
  if (t2 >= ut$2.a && t2 <= ut$2.f) return t2 - (ut$2.a - 10);
}
function Vt$1(t2) {
  if (typeof t2 != "string") throw new Error("hex string expected, got " + typeof t2);
  const e2 = t2.length, n3 = e2 / 2;
  if (e2 % 2) throw new Error("hex string expected, got unpadded hex of length " + e2);
  const r2 = new Uint8Array(n3);
  for (let o2 = 0, i2 = 0; o2 < n3; o2++, i2 += 2) {
    const s2 = Cr(t2.charCodeAt(i2)), c2 = Cr(t2.charCodeAt(i2 + 1));
    if (s2 === void 0 || c2 === void 0) {
      const a2 = t2[i2] + t2[i2 + 1];
      throw new Error('hex string expected, got non-hex character "' + a2 + '" at index ' + i2);
    }
    r2[o2] = s2 * 16 + c2;
  }
  return r2;
}
function Ot(t2) {
  return We$1(Pt$1(t2));
}
function ee$1(t2) {
  return te$1(t2), We$1(Pt$1(Uint8Array.from(t2).reverse()));
}
function Mt$1(t2, e2) {
  return Vt$1(t2.toString(16).padStart(e2 * 2, "0"));
}
function be$1(t2, e2) {
  return Mt$1(t2, e2).reverse();
}
function Ys(t2) {
  return Vt$1(kt$1(t2));
}
function et$1(t2, e2, n3) {
  let r2;
  if (typeof e2 == "string") try {
    r2 = Vt$1(e2);
  } catch (i2) {
    throw new Error(t2 + " must be hex string or Uint8Array, cause: " + i2);
  }
  else if (St$2(e2)) r2 = Uint8Array.from(e2);
  else throw new Error(t2 + " must be hex string or Uint8Array");
  const o2 = r2.length;
  if (typeof n3 == "number" && o2 !== n3) throw new Error(t2 + " of length " + n3 + " expected, got " + o2);
  return r2;
}
function ne$1(...t2) {
  let e2 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) {
    const o2 = t2[r2];
    te$1(o2), e2 += o2.length;
  }
  const n3 = new Uint8Array(e2);
  for (let r2 = 0, o2 = 0; r2 < t2.length; r2++) {
    const i2 = t2[r2];
    n3.set(i2, o2), o2 += i2.length;
  }
  return n3;
}
function Gs(t2, e2) {
  if (t2.length !== e2.length) return false;
  let n3 = 0;
  for (let r2 = 0; r2 < t2.length; r2++) n3 |= t2[r2] ^ e2[r2];
  return n3 === 0;
}
function Ws(t2) {
  if (typeof t2 != "string") throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t2));
}
const Xe$1 = (t2) => typeof t2 == "bigint" && me$2 <= t2;
function Ee$2(t2, e2, n3) {
  return Xe$1(t2) && Xe$1(e2) && Xe$1(n3) && e2 <= t2 && t2 < n3;
}
function ft$2(t2, e2, n3, r2) {
  if (!Ee$2(e2, n3, r2)) throw new Error("expected valid " + t2 + ": " + n3 + " <= n < " + r2 + ", got " + e2);
}
function Pr(t2) {
  let e2;
  for (e2 = 0; t2 > me$2; t2 >>= we$2, e2 += 1) ;
  return e2;
}
function Xs(t2, e2) {
  return t2 >> BigInt(e2) & we$2;
}
function Js(t2, e2, n3) {
  return t2 | (n3 ? we$2 : me$2) << BigInt(e2);
}
const Je$1 = (t2) => (zs << BigInt(t2 - 1)) - we$2, Qe$1 = (t2) => new Uint8Array(t2), kr = (t2) => Uint8Array.from(t2);
function Vr(t2, e2, n3) {
  if (typeof t2 != "number" || t2 < 2) throw new Error("hashLen must be a number");
  if (typeof e2 != "number" || e2 < 2) throw new Error("qByteLen must be a number");
  if (typeof n3 != "function") throw new Error("hmacFn must be a function");
  let r2 = Qe$1(t2), o2 = Qe$1(t2), i2 = 0;
  const s2 = () => {
    r2.fill(1), o2.fill(0), i2 = 0;
  }, c2 = (...f3) => n3(o2, r2, ...f3), a2 = (f3 = Qe$1()) => {
    o2 = c2(kr([0]), f3), r2 = c2(), f3.length !== 0 && (o2 = c2(kr([1]), f3), r2 = c2());
  }, u2 = () => {
    if (i2++ >= 1e3) throw new Error("drbg: tried 1000 values");
    let f3 = 0;
    const h3 = [];
    for (; f3 < e2; ) {
      r2 = c2();
      const y4 = r2.slice();
      h3.push(y4), f3 += r2.length;
    }
    return ne$1(...h3);
  };
  return (f3, h3) => {
    s2(), a2(f3);
    let y4;
    for (; !(y4 = h3(u2())); ) a2();
    return s2(), y4;
  };
}
const Qs = { bigint: (t2) => typeof t2 == "bigint", function: (t2) => typeof t2 == "function", boolean: (t2) => typeof t2 == "boolean", string: (t2) => typeof t2 == "string", stringOrUint8Array: (t2) => typeof t2 == "string" || St$2(t2), isSafeInteger: (t2) => Number.isSafeInteger(t2), array: (t2) => Array.isArray(t2), field: (t2, e2) => e2.Fp.isValid(t2), hash: (t2) => typeof t2 == "function" && Number.isSafeInteger(t2.outputLen) };
function Dt$1(t2, e2, n3 = {}) {
  const r2 = (o2, i2, s2) => {
    const c2 = Qs[i2];
    if (typeof c2 != "function") throw new Error("invalid validator function");
    const a2 = t2[o2];
    if (!(s2 && a2 === void 0) && !c2(a2, t2)) throw new Error("param " + String(o2) + " is invalid. Expected " + i2 + ", got " + a2);
  };
  for (const [o2, i2] of Object.entries(e2)) r2(o2, i2, false);
  for (const [o2, i2] of Object.entries(n3)) r2(o2, i2, true);
  return t2;
}
const tc = () => {
  throw new Error("not implemented");
};
function tn(t2) {
  const e2 = /* @__PURE__ */ new WeakMap();
  return (n3, ...r2) => {
    const o2 = e2.get(n3);
    if (o2 !== void 0) return o2;
    const i2 = t2(n3, ...r2);
    return e2.set(n3, i2), i2;
  };
}
var ec = Object.freeze({ __proto__: null, isBytes: St$2, abytes: te$1, abool: Ct, bytesToHex: Pt$1, numberToHexUnpadded: kt$1, hexToNumber: We$1, hexToBytes: Vt$1, bytesToNumberBE: Ot, bytesToNumberLE: ee$1, numberToBytesBE: Mt$1, numberToBytesLE: be$1, numberToVarBytesBE: Ys, ensureBytes: et$1, concatBytes: ne$1, equalBytes: Gs, utf8ToBytes: Ws, inRange: Ee$2, aInRange: ft$2, bitLen: Pr, bitGet: Xs, bitSet: Js, bitMask: Je$1, createHmacDrbg: Vr, validateObject: Dt$1, notImplemented: tc, memoized: tn });
const q$1 = BigInt(0), H$2 = BigInt(1), At = BigInt(2), nc = BigInt(3), en = BigInt(4), Mr = BigInt(5), Dr = BigInt(8);
function X$1(t2, e2) {
  const n3 = t2 % e2;
  return n3 >= q$1 ? n3 : e2 + n3;
}
function Hr(t2, e2, n3) {
  if (e2 < q$1) throw new Error("invalid exponent, negatives unsupported");
  if (n3 <= q$1) throw new Error("invalid modulus");
  if (n3 === H$2) return q$1;
  let r2 = H$2;
  for (; e2 > q$1; ) e2 & H$2 && (r2 = r2 * t2 % n3), t2 = t2 * t2 % n3, e2 >>= H$2;
  return r2;
}
function it$1(t2, e2, n3) {
  let r2 = t2;
  for (; e2-- > q$1; ) r2 *= r2, r2 %= n3;
  return r2;
}
function nn(t2, e2) {
  if (t2 === q$1) throw new Error("invert: expected non-zero number");
  if (e2 <= q$1) throw new Error("invert: expected positive modulus, got " + e2);
  let n3 = X$1(t2, e2), r2 = e2, o2 = q$1, i2 = H$2;
  for (; n3 !== q$1; ) {
    const c2 = r2 / n3, a2 = r2 % n3, u2 = o2 - i2 * c2;
    r2 = n3, n3 = a2, o2 = i2, i2 = u2;
  }
  if (r2 !== H$2) throw new Error("invert: does not exist");
  return X$1(o2, e2);
}
function rc(t2) {
  const e2 = (t2 - H$2) / At;
  let n3, r2, o2;
  for (n3 = t2 - H$2, r2 = 0; n3 % At === q$1; n3 /= At, r2++) ;
  for (o2 = At; o2 < t2 && Hr(o2, e2, t2) !== t2 - H$2; o2++) if (o2 > 1e3) throw new Error("Cannot find square root: likely non-prime P");
  if (r2 === 1) {
    const s2 = (t2 + H$2) / en;
    return function(a2, u2) {
      const l2 = a2.pow(u2, s2);
      if (!a2.eql(a2.sqr(l2), u2)) throw new Error("Cannot find square root");
      return l2;
    };
  }
  const i2 = (n3 + H$2) / At;
  return function(c2, a2) {
    if (c2.pow(a2, e2) === c2.neg(c2.ONE)) throw new Error("Cannot find square root");
    let u2 = r2, l2 = c2.pow(c2.mul(c2.ONE, o2), n3), f3 = c2.pow(a2, i2), h3 = c2.pow(a2, n3);
    for (; !c2.eql(h3, c2.ONE); ) {
      if (c2.eql(h3, c2.ZERO)) return c2.ZERO;
      let y4 = 1;
      for (let p2 = c2.sqr(h3); y4 < u2 && !c2.eql(p2, c2.ONE); y4++) p2 = c2.sqr(p2);
      const E2 = c2.pow(l2, H$2 << BigInt(u2 - y4 - 1));
      l2 = c2.sqr(E2), f3 = c2.mul(f3, E2), h3 = c2.mul(h3, l2), u2 = y4;
    }
    return f3;
  };
}
function oc(t2) {
  if (t2 % en === nc) {
    const e2 = (t2 + H$2) / en;
    return function(r2, o2) {
      const i2 = r2.pow(o2, e2);
      if (!r2.eql(r2.sqr(i2), o2)) throw new Error("Cannot find square root");
      return i2;
    };
  }
  if (t2 % Dr === Mr) {
    const e2 = (t2 - Mr) / Dr;
    return function(r2, o2) {
      const i2 = r2.mul(o2, At), s2 = r2.pow(i2, e2), c2 = r2.mul(o2, s2), a2 = r2.mul(r2.mul(c2, At), s2), u2 = r2.mul(c2, r2.sub(a2, r2.ONE));
      if (!r2.eql(r2.sqr(u2), o2)) throw new Error("Cannot find square root");
      return u2;
    };
  }
  return rc(t2);
}
const ic = ["create", "isValid", "is0", "neg", "inv", "sqrt", "sqr", "eql", "add", "sub", "mul", "pow", "div", "addN", "subN", "mulN", "sqrN"];
function sc(t2) {
  const e2 = { ORDER: "bigint", MASK: "bigint", BYTES: "isSafeInteger", BITS: "isSafeInteger" }, n3 = ic.reduce((r2, o2) => (r2[o2] = "function", r2), e2);
  return Dt$1(t2, n3);
}
function cc(t2, e2, n3) {
  if (n3 < q$1) throw new Error("invalid exponent, negatives unsupported");
  if (n3 === q$1) return t2.ONE;
  if (n3 === H$2) return e2;
  let r2 = t2.ONE, o2 = e2;
  for (; n3 > q$1; ) n3 & H$2 && (r2 = t2.mul(r2, o2)), o2 = t2.sqr(o2), n3 >>= H$2;
  return r2;
}
function ac(t2, e2) {
  const n3 = new Array(e2.length), r2 = e2.reduce((i2, s2, c2) => t2.is0(s2) ? i2 : (n3[c2] = i2, t2.mul(i2, s2)), t2.ONE), o2 = t2.inv(r2);
  return e2.reduceRight((i2, s2, c2) => t2.is0(s2) ? i2 : (n3[c2] = t2.mul(i2, n3[c2]), t2.mul(i2, s2)), o2), n3;
}
function qr(t2, e2) {
  const n3 = e2 !== void 0 ? e2 : t2.toString(2).length, r2 = Math.ceil(n3 / 8);
  return { nBitLength: n3, nByteLength: r2 };
}
function Kr(t2, e2, n3 = false, r2 = {}) {
  if (t2 <= q$1) throw new Error("invalid field: expected ORDER > 0, got " + t2);
  const { nBitLength: o2, nByteLength: i2 } = qr(t2, e2);
  if (i2 > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s2;
  const c2 = Object.freeze({ ORDER: t2, isLE: n3, BITS: o2, BYTES: i2, MASK: Je$1(o2), ZERO: q$1, ONE: H$2, create: (a2) => X$1(a2, t2), isValid: (a2) => {
    if (typeof a2 != "bigint") throw new Error("invalid field element: expected bigint, got " + typeof a2);
    return q$1 <= a2 && a2 < t2;
  }, is0: (a2) => a2 === q$1, isOdd: (a2) => (a2 & H$2) === H$2, neg: (a2) => X$1(-a2, t2), eql: (a2, u2) => a2 === u2, sqr: (a2) => X$1(a2 * a2, t2), add: (a2, u2) => X$1(a2 + u2, t2), sub: (a2, u2) => X$1(a2 - u2, t2), mul: (a2, u2) => X$1(a2 * u2, t2), pow: (a2, u2) => cc(c2, a2, u2), div: (a2, u2) => X$1(a2 * nn(u2, t2), t2), sqrN: (a2) => a2 * a2, addN: (a2, u2) => a2 + u2, subN: (a2, u2) => a2 - u2, mulN: (a2, u2) => a2 * u2, inv: (a2) => nn(a2, t2), sqrt: r2.sqrt || ((a2) => (s2 || (s2 = oc(t2)), s2(c2, a2))), invertBatch: (a2) => ac(c2, a2), cmov: (a2, u2, l2) => l2 ? u2 : a2, toBytes: (a2) => n3 ? be$1(a2, i2) : Mt$1(a2, i2), fromBytes: (a2) => {
    if (a2.length !== i2) throw new Error("Field.fromBytes: expected " + i2 + " bytes, got " + a2.length);
    return n3 ? ee$1(a2) : Ot(a2);
  } });
  return Object.freeze(c2);
}
function Fr(t2) {
  if (typeof t2 != "bigint") throw new Error("field order must be bigint");
  const e2 = t2.toString(2).length;
  return Math.ceil(e2 / 8);
}
function zr(t2) {
  const e2 = Fr(t2);
  return e2 + Math.ceil(e2 / 2);
}
function uc(t2, e2, n3 = false) {
  const r2 = t2.length, o2 = Fr(e2), i2 = zr(e2);
  if (r2 < 16 || r2 < i2 || r2 > 1024) throw new Error("expected " + i2 + "-1024 bytes of input, got " + r2);
  const s2 = n3 ? ee$1(t2) : Ot(t2), c2 = X$1(s2, e2 - H$2) + H$2;
  return n3 ? be$1(c2, o2) : Mt$1(c2, o2);
}
const Zr = BigInt(0), ve$1 = BigInt(1);
function rn(t2, e2) {
  const n3 = e2.negate();
  return t2 ? n3 : e2;
}
function Yr(t2, e2) {
  if (!Number.isSafeInteger(t2) || t2 <= 0 || t2 > e2) throw new Error("invalid window size, expected [1.." + e2 + "], got W=" + t2);
}
function on(t2, e2) {
  Yr(t2, e2);
  const n3 = Math.ceil(e2 / t2) + 1, r2 = 2 ** (t2 - 1);
  return { windows: n3, windowSize: r2 };
}
function fc(t2, e2) {
  if (!Array.isArray(t2)) throw new Error("array expected");
  t2.forEach((n3, r2) => {
    if (!(n3 instanceof e2)) throw new Error("invalid point at index " + r2);
  });
}
function lc(t2, e2) {
  if (!Array.isArray(t2)) throw new Error("array of scalars expected");
  t2.forEach((n3, r2) => {
    if (!e2.isValid(n3)) throw new Error("invalid scalar at index " + r2);
  });
}
const sn = /* @__PURE__ */ new WeakMap(), Gr = /* @__PURE__ */ new WeakMap();
function cn(t2) {
  return Gr.get(t2) || 1;
}
function dc(t2, e2) {
  return { constTimeNegate: rn, hasPrecomputes(n3) {
    return cn(n3) !== 1;
  }, unsafeLadder(n3, r2, o2 = t2.ZERO) {
    let i2 = n3;
    for (; r2 > Zr; ) r2 & ve$1 && (o2 = o2.add(i2)), i2 = i2.double(), r2 >>= ve$1;
    return o2;
  }, precomputeWindow(n3, r2) {
    const { windows: o2, windowSize: i2 } = on(r2, e2), s2 = [];
    let c2 = n3, a2 = c2;
    for (let u2 = 0; u2 < o2; u2++) {
      a2 = c2, s2.push(a2);
      for (let l2 = 1; l2 < i2; l2++) a2 = a2.add(c2), s2.push(a2);
      c2 = a2.double();
    }
    return s2;
  }, wNAF(n3, r2, o2) {
    const { windows: i2, windowSize: s2 } = on(n3, e2);
    let c2 = t2.ZERO, a2 = t2.BASE;
    const u2 = BigInt(2 ** n3 - 1), l2 = 2 ** n3, f3 = BigInt(n3);
    for (let h3 = 0; h3 < i2; h3++) {
      const y4 = h3 * s2;
      let E2 = Number(o2 & u2);
      o2 >>= f3, E2 > s2 && (E2 -= l2, o2 += ve$1);
      const p2 = y4, d3 = y4 + Math.abs(E2) - 1, v2 = h3 % 2 !== 0, m3 = E2 < 0;
      E2 === 0 ? a2 = a2.add(rn(v2, r2[p2])) : c2 = c2.add(rn(m3, r2[d3]));
    }
    return { p: c2, f: a2 };
  }, wNAFUnsafe(n3, r2, o2, i2 = t2.ZERO) {
    const { windows: s2, windowSize: c2 } = on(n3, e2), a2 = BigInt(2 ** n3 - 1), u2 = 2 ** n3, l2 = BigInt(n3);
    for (let f3 = 0; f3 < s2; f3++) {
      const h3 = f3 * c2;
      if (o2 === Zr) break;
      let y4 = Number(o2 & a2);
      if (o2 >>= l2, y4 > c2 && (y4 -= u2, o2 += ve$1), y4 === 0) continue;
      let E2 = r2[h3 + Math.abs(y4) - 1];
      y4 < 0 && (E2 = E2.negate()), i2 = i2.add(E2);
    }
    return i2;
  }, getPrecomputes(n3, r2, o2) {
    let i2 = sn.get(r2);
    return i2 || (i2 = this.precomputeWindow(r2, n3), n3 !== 1 && sn.set(r2, o2(i2))), i2;
  }, wNAFCached(n3, r2, o2) {
    const i2 = cn(n3);
    return this.wNAF(i2, this.getPrecomputes(i2, n3, o2), r2);
  }, wNAFCachedUnsafe(n3, r2, o2, i2) {
    const s2 = cn(n3);
    return s2 === 1 ? this.unsafeLadder(n3, r2, i2) : this.wNAFUnsafe(s2, this.getPrecomputes(s2, n3, o2), r2, i2);
  }, setWindowSize(n3, r2) {
    Yr(r2, e2), Gr.set(n3, r2), sn.delete(n3);
  } };
}
function hc(t2, e2, n3, r2) {
  if (fc(n3, t2), lc(r2, e2), n3.length !== r2.length) throw new Error("arrays of points and scalars must have equal length");
  const o2 = t2.ZERO, i2 = Pr(BigInt(n3.length)), s2 = i2 > 12 ? i2 - 3 : i2 > 4 ? i2 - 2 : i2 ? 2 : 1, c2 = (1 << s2) - 1, a2 = new Array(c2 + 1).fill(o2), u2 = Math.floor((e2.BITS - 1) / s2) * s2;
  let l2 = o2;
  for (let f3 = u2; f3 >= 0; f3 -= s2) {
    a2.fill(o2);
    for (let y4 = 0; y4 < r2.length; y4++) {
      const E2 = r2[y4], p2 = Number(E2 >> BigInt(f3) & BigInt(c2));
      a2[p2] = a2[p2].add(n3[y4]);
    }
    let h3 = o2;
    for (let y4 = a2.length - 1, E2 = o2; y4 > 0; y4--) E2 = E2.add(a2[y4]), h3 = h3.add(E2);
    if (l2 = l2.add(h3), f3 !== 0) for (let y4 = 0; y4 < s2; y4++) l2 = l2.double();
  }
  return l2;
}
function Wr(t2) {
  return sc(t2.Fp), Dt$1(t2, { n: "bigint", h: "bigint", Gx: "field", Gy: "field" }, { nBitLength: "isSafeInteger", nByteLength: "isSafeInteger" }), Object.freeze({ ...qr(t2.n, t2.nBitLength), ...t2, p: t2.Fp.ORDER });
}
BigInt(0), BigInt(1), BigInt(2), BigInt(8);
const Ht = BigInt(0), an = BigInt(1);
function pc(t2) {
  return Dt$1(t2, { a: "bigint" }, { montgomeryBits: "isSafeInteger", nByteLength: "isSafeInteger", adjustScalarBytes: "function", domain: "function", powPminus2: "function", Gu: "bigint" }), Object.freeze({ ...t2 });
}
function gc(t2) {
  const e2 = pc(t2), { P: n3 } = e2, r2 = (m3) => X$1(m3, n3), o2 = e2.montgomeryBits, i2 = Math.ceil(o2 / 8), s2 = e2.nByteLength, c2 = e2.adjustScalarBytes || ((m3) => m3), a2 = e2.powPminus2 || ((m3) => Hr(m3, n3 - BigInt(2), n3));
  function u2(m3, O3, N2) {
    const $2 = r2(m3 * (O3 - N2));
    return O3 = r2(O3 - $2), N2 = r2(N2 + $2), [O3, N2];
  }
  const l2 = (e2.a - BigInt(2)) / BigInt(4);
  function f3(m3, O3) {
    ft$2("u", m3, Ht, n3), ft$2("scalar", O3, Ht, n3);
    const N2 = O3, $2 = m3;
    let B3 = an, A2 = Ht, T2 = m3, S3 = an, L2 = Ht, U2;
    for (let j2 = BigInt(o2 - 1); j2 >= Ht; j2--) {
      const g2 = N2 >> j2 & an;
      L2 ^= g2, U2 = u2(L2, B3, T2), B3 = U2[0], T2 = U2[1], U2 = u2(L2, A2, S3), A2 = U2[0], S3 = U2[1], L2 = g2;
      const w2 = B3 + A2, b2 = r2(w2 * w2), I3 = B3 - A2, R3 = r2(I3 * I3), x2 = b2 - R3, C2 = T2 + S3, P3 = T2 - S3, k2 = r2(P3 * w2), M3 = r2(C2 * I3), D2 = k2 + M3, z2 = k2 - M3;
      T2 = r2(D2 * D2), S3 = r2($2 * r2(z2 * z2)), B3 = r2(b2 * R3), A2 = r2(x2 * (b2 + r2(l2 * x2)));
    }
    U2 = u2(L2, B3, T2), B3 = U2[0], T2 = U2[1], U2 = u2(L2, A2, S3), A2 = U2[0], S3 = U2[1];
    const _2 = a2(A2);
    return r2(B3 * _2);
  }
  function h3(m3) {
    return be$1(r2(m3), i2);
  }
  function y4(m3) {
    const O3 = et$1("u coordinate", m3, i2);
    return s2 === 32 && (O3[31] &= 127), ee$1(O3);
  }
  function E2(m3) {
    const O3 = et$1("scalar", m3), N2 = O3.length;
    if (N2 !== i2 && N2 !== s2) {
      let $2 = "" + i2 + " or " + s2;
      throw new Error("invalid scalar, expected " + $2 + " bytes, got " + N2);
    }
    return ee$1(c2(O3));
  }
  function p2(m3, O3) {
    const N2 = y4(O3), $2 = E2(m3), B3 = f3(N2, $2);
    if (B3 === Ht) throw new Error("invalid private or public key received");
    return h3(B3);
  }
  const d3 = h3(e2.Gu);
  function v2(m3) {
    return p2(m3, d3);
  }
  return { scalarMult: p2, scalarMultBase: v2, getSharedSecret: (m3, O3) => p2(m3, O3), getPublicKey: (m3) => v2(m3), utils: { randomPrivateKey: () => e2.randomBytes(e2.nByteLength) }, GuBytes: d3 };
}
const un = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819949");
BigInt(0);
const yc = BigInt(1), Xr = BigInt(2), mc = BigInt(3), wc = BigInt(5);
BigInt(8);
function bc(t2) {
  const e2 = BigInt(10), n3 = BigInt(20), r2 = BigInt(40), o2 = BigInt(80), i2 = un, c2 = t2 * t2 % i2 * t2 % i2, a2 = it$1(c2, Xr, i2) * c2 % i2, u2 = it$1(a2, yc, i2) * t2 % i2, l2 = it$1(u2, wc, i2) * u2 % i2, f3 = it$1(l2, e2, i2) * l2 % i2, h3 = it$1(f3, n3, i2) * f3 % i2, y4 = it$1(h3, r2, i2) * h3 % i2, E2 = it$1(y4, o2, i2) * y4 % i2, p2 = it$1(E2, o2, i2) * y4 % i2, d3 = it$1(p2, e2, i2) * l2 % i2;
  return { pow_p_5_8: it$1(d3, Xr, i2) * t2 % i2, b2: c2 };
}
function Ec(t2) {
  return t2[0] &= 248, t2[31] &= 127, t2[31] |= 64, t2;
}
gc({ P: un, a: BigInt(486662), montgomeryBits: 255, nByteLength: 32, Gu: BigInt(9), powPminus2: (t2) => {
  const e2 = un, { pow_p_5_8: n3, b2: r2 } = bc(t2);
  return X$1(it$1(n3, mc, e2) * r2, e2);
}, adjustScalarBytes: Ec, randomBytes: Lt$1 });
function Jr(t2) {
  t2.lowS !== void 0 && Ct("lowS", t2.lowS), t2.prehash !== void 0 && Ct("prehash", t2.prehash);
}
function vc(t2) {
  const e2 = Wr(t2);
  Dt$1(e2, { a: "field", b: "field" }, { allowedPrivateKeyLengths: "array", wrapPrivateKey: "boolean", isTorsionFree: "function", clearCofactor: "function", allowInfinityPoint: "boolean", fromBytes: "function", toBytes: "function" });
  const { endo: n3, Fp: r2, a: o2 } = e2;
  if (n3) {
    if (!r2.eql(o2, r2.ZERO)) throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    if (typeof n3 != "object" || typeof n3.beta != "bigint" || typeof n3.splitScalar != "function") throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
  }
  return Object.freeze({ ...e2 });
}
const { bytesToNumberBE: xc, hexToBytes: Sc } = ec;
class Oc2 extends Error {
  constructor(e2 = "") {
    super(e2);
  }
}
const lt$1 = { Err: Oc2, _tlv: { encode: (t2, e2) => {
  const { Err: n3 } = lt$1;
  if (t2 < 0 || t2 > 256) throw new n3("tlv.encode: wrong tag");
  if (e2.length & 1) throw new n3("tlv.encode: unpadded data");
  const r2 = e2.length / 2, o2 = kt$1(r2);
  if (o2.length / 2 & 128) throw new n3("tlv.encode: long form length too big");
  const i2 = r2 > 127 ? kt$1(o2.length / 2 | 128) : "";
  return kt$1(t2) + i2 + o2 + e2;
}, decode(t2, e2) {
  const { Err: n3 } = lt$1;
  let r2 = 0;
  if (t2 < 0 || t2 > 256) throw new n3("tlv.encode: wrong tag");
  if (e2.length < 2 || e2[r2++] !== t2) throw new n3("tlv.decode: wrong tlv");
  const o2 = e2[r2++], i2 = !!(o2 & 128);
  let s2 = 0;
  if (!i2) s2 = o2;
  else {
    const a2 = o2 & 127;
    if (!a2) throw new n3("tlv.decode(long): indefinite length not supported");
    if (a2 > 4) throw new n3("tlv.decode(long): byte length is too big");
    const u2 = e2.subarray(r2, r2 + a2);
    if (u2.length !== a2) throw new n3("tlv.decode: length bytes not complete");
    if (u2[0] === 0) throw new n3("tlv.decode(long): zero leftmost byte");
    for (const l2 of u2) s2 = s2 << 8 | l2;
    if (r2 += a2, s2 < 128) throw new n3("tlv.decode(long): not minimal encoding");
  }
  const c2 = e2.subarray(r2, r2 + s2);
  if (c2.length !== s2) throw new n3("tlv.decode: wrong value length");
  return { v: c2, l: e2.subarray(r2 + s2) };
} }, _int: { encode(t2) {
  const { Err: e2 } = lt$1;
  if (t2 < dt$2) throw new e2("integer: negative integers are not allowed");
  let n3 = kt$1(t2);
  if (Number.parseInt(n3[0], 16) & 8 && (n3 = "00" + n3), n3.length & 1) throw new e2("unexpected DER parsing assertion: unpadded hex");
  return n3;
}, decode(t2) {
  const { Err: e2 } = lt$1;
  if (t2[0] & 128) throw new e2("invalid signature integer: negative");
  if (t2[0] === 0 && !(t2[1] & 128)) throw new e2("invalid signature integer: unnecessary leading zero");
  return xc(t2);
} }, toSig(t2) {
  const { Err: e2, _int: n3, _tlv: r2 } = lt$1, o2 = typeof t2 == "string" ? Sc(t2) : t2;
  te$1(o2);
  const { v: i2, l: s2 } = r2.decode(48, o2);
  if (s2.length) throw new e2("invalid signature: left bytes after parsing");
  const { v: c2, l: a2 } = r2.decode(2, i2), { v: u2, l: l2 } = r2.decode(2, a2);
  if (l2.length) throw new e2("invalid signature: left bytes after parsing");
  return { r: n3.decode(c2), s: n3.decode(u2) };
}, hexFromSig(t2) {
  const { _tlv: e2, _int: n3 } = lt$1, r2 = e2.encode(2, n3.encode(t2.r)), o2 = e2.encode(2, n3.encode(t2.s)), i2 = r2 + o2;
  return e2.encode(48, i2);
} }, dt$2 = BigInt(0), K$1 = BigInt(1);
BigInt(2);
const Qr = BigInt(3);
BigInt(4);
function Ac(t2) {
  const e2 = vc(t2), { Fp: n3 } = e2, r2 = Kr(e2.n, e2.nBitLength), o2 = e2.toBytes || ((p2, d3, v2) => {
    const m3 = d3.toAffine();
    return ne$1(Uint8Array.from([4]), n3.toBytes(m3.x), n3.toBytes(m3.y));
  }), i2 = e2.fromBytes || ((p2) => {
    const d3 = p2.subarray(1), v2 = n3.fromBytes(d3.subarray(0, n3.BYTES)), m3 = n3.fromBytes(d3.subarray(n3.BYTES, 2 * n3.BYTES));
    return { x: v2, y: m3 };
  });
  function s2(p2) {
    const { a: d3, b: v2 } = e2, m3 = n3.sqr(p2), O3 = n3.mul(m3, p2);
    return n3.add(n3.add(O3, n3.mul(p2, d3)), v2);
  }
  if (!n3.eql(n3.sqr(e2.Gy), s2(e2.Gx))) throw new Error("bad generator point: equation left != right");
  function c2(p2) {
    return Ee$2(p2, K$1, e2.n);
  }
  function a2(p2) {
    const { allowedPrivateKeyLengths: d3, nByteLength: v2, wrapPrivateKey: m3, n: O3 } = e2;
    if (d3 && typeof p2 != "bigint") {
      if (St$2(p2) && (p2 = Pt$1(p2)), typeof p2 != "string" || !d3.includes(p2.length)) throw new Error("invalid private key");
      p2 = p2.padStart(v2 * 2, "0");
    }
    let N2;
    try {
      N2 = typeof p2 == "bigint" ? p2 : Ot(et$1("private key", p2, v2));
    } catch {
      throw new Error("invalid private key, expected hex or " + v2 + " bytes, got " + typeof p2);
    }
    return m3 && (N2 = X$1(N2, O3)), ft$2("private key", N2, K$1, O3), N2;
  }
  function u2(p2) {
    if (!(p2 instanceof h3)) throw new Error("ProjectivePoint expected");
  }
  const l2 = tn((p2, d3) => {
    const { px: v2, py: m3, pz: O3 } = p2;
    if (n3.eql(O3, n3.ONE)) return { x: v2, y: m3 };
    const N2 = p2.is0();
    d3 == null && (d3 = N2 ? n3.ONE : n3.inv(O3));
    const $2 = n3.mul(v2, d3), B3 = n3.mul(m3, d3), A2 = n3.mul(O3, d3);
    if (N2) return { x: n3.ZERO, y: n3.ZERO };
    if (!n3.eql(A2, n3.ONE)) throw new Error("invZ was invalid");
    return { x: $2, y: B3 };
  }), f3 = tn((p2) => {
    if (p2.is0()) {
      if (e2.allowInfinityPoint && !n3.is0(p2.py)) return;
      throw new Error("bad point: ZERO");
    }
    const { x: d3, y: v2 } = p2.toAffine();
    if (!n3.isValid(d3) || !n3.isValid(v2)) throw new Error("bad point: x or y not FE");
    const m3 = n3.sqr(v2), O3 = s2(d3);
    if (!n3.eql(m3, O3)) throw new Error("bad point: equation left != right");
    if (!p2.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  class h3 {
    constructor(d3, v2, m3) {
      if (this.px = d3, this.py = v2, this.pz = m3, d3 == null || !n3.isValid(d3)) throw new Error("x required");
      if (v2 == null || !n3.isValid(v2)) throw new Error("y required");
      if (m3 == null || !n3.isValid(m3)) throw new Error("z required");
      Object.freeze(this);
    }
    static fromAffine(d3) {
      const { x: v2, y: m3 } = d3 || {};
      if (!d3 || !n3.isValid(v2) || !n3.isValid(m3)) throw new Error("invalid affine point");
      if (d3 instanceof h3) throw new Error("projective point not allowed");
      const O3 = (N2) => n3.eql(N2, n3.ZERO);
      return O3(v2) && O3(m3) ? h3.ZERO : new h3(v2, m3, n3.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    static normalizeZ(d3) {
      const v2 = n3.invertBatch(d3.map((m3) => m3.pz));
      return d3.map((m3, O3) => m3.toAffine(v2[O3])).map(h3.fromAffine);
    }
    static fromHex(d3) {
      const v2 = h3.fromAffine(i2(et$1("pointHex", d3)));
      return v2.assertValidity(), v2;
    }
    static fromPrivateKey(d3) {
      return h3.BASE.multiply(a2(d3));
    }
    static msm(d3, v2) {
      return hc(h3, r2, d3, v2);
    }
    _setWindowSize(d3) {
      E2.setWindowSize(this, d3);
    }
    assertValidity() {
      f3(this);
    }
    hasEvenY() {
      const { y: d3 } = this.toAffine();
      if (n3.isOdd) return !n3.isOdd(d3);
      throw new Error("Field doesn't support isOdd");
    }
    equals(d3) {
      u2(d3);
      const { px: v2, py: m3, pz: O3 } = this, { px: N2, py: $2, pz: B3 } = d3, A2 = n3.eql(n3.mul(v2, B3), n3.mul(N2, O3)), T2 = n3.eql(n3.mul(m3, B3), n3.mul($2, O3));
      return A2 && T2;
    }
    negate() {
      return new h3(this.px, n3.neg(this.py), this.pz);
    }
    double() {
      const { a: d3, b: v2 } = e2, m3 = n3.mul(v2, Qr), { px: O3, py: N2, pz: $2 } = this;
      let B3 = n3.ZERO, A2 = n3.ZERO, T2 = n3.ZERO, S3 = n3.mul(O3, O3), L2 = n3.mul(N2, N2), U2 = n3.mul($2, $2), _2 = n3.mul(O3, N2);
      return _2 = n3.add(_2, _2), T2 = n3.mul(O3, $2), T2 = n3.add(T2, T2), B3 = n3.mul(d3, T2), A2 = n3.mul(m3, U2), A2 = n3.add(B3, A2), B3 = n3.sub(L2, A2), A2 = n3.add(L2, A2), A2 = n3.mul(B3, A2), B3 = n3.mul(_2, B3), T2 = n3.mul(m3, T2), U2 = n3.mul(d3, U2), _2 = n3.sub(S3, U2), _2 = n3.mul(d3, _2), _2 = n3.add(_2, T2), T2 = n3.add(S3, S3), S3 = n3.add(T2, S3), S3 = n3.add(S3, U2), S3 = n3.mul(S3, _2), A2 = n3.add(A2, S3), U2 = n3.mul(N2, $2), U2 = n3.add(U2, U2), S3 = n3.mul(U2, _2), B3 = n3.sub(B3, S3), T2 = n3.mul(U2, L2), T2 = n3.add(T2, T2), T2 = n3.add(T2, T2), new h3(B3, A2, T2);
    }
    add(d3) {
      u2(d3);
      const { px: v2, py: m3, pz: O3 } = this, { px: N2, py: $2, pz: B3 } = d3;
      let A2 = n3.ZERO, T2 = n3.ZERO, S3 = n3.ZERO;
      const L2 = e2.a, U2 = n3.mul(e2.b, Qr);
      let _2 = n3.mul(v2, N2), j2 = n3.mul(m3, $2), g2 = n3.mul(O3, B3), w2 = n3.add(v2, m3), b2 = n3.add(N2, $2);
      w2 = n3.mul(w2, b2), b2 = n3.add(_2, j2), w2 = n3.sub(w2, b2), b2 = n3.add(v2, O3);
      let I3 = n3.add(N2, B3);
      return b2 = n3.mul(b2, I3), I3 = n3.add(_2, g2), b2 = n3.sub(b2, I3), I3 = n3.add(m3, O3), A2 = n3.add($2, B3), I3 = n3.mul(I3, A2), A2 = n3.add(j2, g2), I3 = n3.sub(I3, A2), S3 = n3.mul(L2, b2), A2 = n3.mul(U2, g2), S3 = n3.add(A2, S3), A2 = n3.sub(j2, S3), S3 = n3.add(j2, S3), T2 = n3.mul(A2, S3), j2 = n3.add(_2, _2), j2 = n3.add(j2, _2), g2 = n3.mul(L2, g2), b2 = n3.mul(U2, b2), j2 = n3.add(j2, g2), g2 = n3.sub(_2, g2), g2 = n3.mul(L2, g2), b2 = n3.add(b2, g2), _2 = n3.mul(j2, b2), T2 = n3.add(T2, _2), _2 = n3.mul(I3, b2), A2 = n3.mul(w2, A2), A2 = n3.sub(A2, _2), _2 = n3.mul(w2, j2), S3 = n3.mul(I3, S3), S3 = n3.add(S3, _2), new h3(A2, T2, S3);
    }
    subtract(d3) {
      return this.add(d3.negate());
    }
    is0() {
      return this.equals(h3.ZERO);
    }
    wNAF(d3) {
      return E2.wNAFCached(this, d3, h3.normalizeZ);
    }
    multiplyUnsafe(d3) {
      const { endo: v2, n: m3 } = e2;
      ft$2("scalar", d3, dt$2, m3);
      const O3 = h3.ZERO;
      if (d3 === dt$2) return O3;
      if (this.is0() || d3 === K$1) return this;
      if (!v2 || E2.hasPrecomputes(this)) return E2.wNAFCachedUnsafe(this, d3, h3.normalizeZ);
      let { k1neg: N2, k1: $2, k2neg: B3, k2: A2 } = v2.splitScalar(d3), T2 = O3, S3 = O3, L2 = this;
      for (; $2 > dt$2 || A2 > dt$2; ) $2 & K$1 && (T2 = T2.add(L2)), A2 & K$1 && (S3 = S3.add(L2)), L2 = L2.double(), $2 >>= K$1, A2 >>= K$1;
      return N2 && (T2 = T2.negate()), B3 && (S3 = S3.negate()), S3 = new h3(n3.mul(S3.px, v2.beta), S3.py, S3.pz), T2.add(S3);
    }
    multiply(d3) {
      const { endo: v2, n: m3 } = e2;
      ft$2("scalar", d3, K$1, m3);
      let O3, N2;
      if (v2) {
        const { k1neg: $2, k1: B3, k2neg: A2, k2: T2 } = v2.splitScalar(d3);
        let { p: S3, f: L2 } = this.wNAF(B3), { p: U2, f: _2 } = this.wNAF(T2);
        S3 = E2.constTimeNegate($2, S3), U2 = E2.constTimeNegate(A2, U2), U2 = new h3(n3.mul(U2.px, v2.beta), U2.py, U2.pz), O3 = S3.add(U2), N2 = L2.add(_2);
      } else {
        const { p: $2, f: B3 } = this.wNAF(d3);
        O3 = $2, N2 = B3;
      }
      return h3.normalizeZ([O3, N2])[0];
    }
    multiplyAndAddUnsafe(d3, v2, m3) {
      const O3 = h3.BASE, N2 = (B3, A2) => A2 === dt$2 || A2 === K$1 || !B3.equals(O3) ? B3.multiplyUnsafe(A2) : B3.multiply(A2), $2 = N2(this, v2).add(N2(d3, m3));
      return $2.is0() ? void 0 : $2;
    }
    toAffine(d3) {
      return l2(this, d3);
    }
    isTorsionFree() {
      const { h: d3, isTorsionFree: v2 } = e2;
      if (d3 === K$1) return true;
      if (v2) return v2(h3, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: d3, clearCofactor: v2 } = e2;
      return d3 === K$1 ? this : v2 ? v2(h3, this) : this.multiplyUnsafe(e2.h);
    }
    toRawBytes(d3 = true) {
      return Ct("isCompressed", d3), this.assertValidity(), o2(h3, this, d3);
    }
    toHex(d3 = true) {
      return Ct("isCompressed", d3), Pt$1(this.toRawBytes(d3));
    }
  }
  h3.BASE = new h3(e2.Gx, e2.Gy, n3.ONE), h3.ZERO = new h3(n3.ZERO, n3.ONE, n3.ZERO);
  const y4 = e2.nBitLength, E2 = dc(h3, e2.endo ? Math.ceil(y4 / 2) : y4);
  return { CURVE: e2, ProjectivePoint: h3, normPrivateKeyToScalar: a2, weierstrassEquation: s2, isWithinCurveOrder: c2 };
}
function Bc(t2) {
  const e2 = Wr(t2);
  return Dt$1(e2, { hash: "hash", hmac: "function", randomBytes: "function" }, { bits2int: "function", bits2int_modN: "function", lowS: "boolean" }), Object.freeze({ lowS: true, ...e2 });
}
function Ic(t2) {
  const e2 = Bc(t2), { Fp: n3, n: r2 } = e2, o2 = n3.BYTES + 1, i2 = 2 * n3.BYTES + 1;
  function s2(g2) {
    return X$1(g2, r2);
  }
  function c2(g2) {
    return nn(g2, r2);
  }
  const { ProjectivePoint: a2, normPrivateKeyToScalar: u2, weierstrassEquation: l2, isWithinCurveOrder: f3 } = Ac({ ...e2, toBytes(g2, w2, b2) {
    const I3 = w2.toAffine(), R3 = n3.toBytes(I3.x), x2 = ne$1;
    return Ct("isCompressed", b2), b2 ? x2(Uint8Array.from([w2.hasEvenY() ? 2 : 3]), R3) : x2(Uint8Array.from([4]), R3, n3.toBytes(I3.y));
  }, fromBytes(g2) {
    const w2 = g2.length, b2 = g2[0], I3 = g2.subarray(1);
    if (w2 === o2 && (b2 === 2 || b2 === 3)) {
      const R3 = Ot(I3);
      if (!Ee$2(R3, K$1, n3.ORDER)) throw new Error("Point is not on curve");
      const x2 = l2(R3);
      let C2;
      try {
        C2 = n3.sqrt(x2);
      } catch (M3) {
        const D2 = M3 instanceof Error ? ": " + M3.message : "";
        throw new Error("Point is not on curve" + D2);
      }
      const P3 = (C2 & K$1) === K$1;
      return (b2 & 1) === 1 !== P3 && (C2 = n3.neg(C2)), { x: R3, y: C2 };
    } else if (w2 === i2 && b2 === 4) {
      const R3 = n3.fromBytes(I3.subarray(0, n3.BYTES)), x2 = n3.fromBytes(I3.subarray(n3.BYTES, 2 * n3.BYTES));
      return { x: R3, y: x2 };
    } else {
      const R3 = o2, x2 = i2;
      throw new Error("invalid Point, expected length of " + R3 + ", or uncompressed " + x2 + ", got " + w2);
    }
  } }), h3 = (g2) => Pt$1(Mt$1(g2, e2.nByteLength));
  function y4(g2) {
    const w2 = r2 >> K$1;
    return g2 > w2;
  }
  function E2(g2) {
    return y4(g2) ? s2(-g2) : g2;
  }
  const p2 = (g2, w2, b2) => Ot(g2.slice(w2, b2));
  class d3 {
    constructor(w2, b2, I3) {
      this.r = w2, this.s = b2, this.recovery = I3, this.assertValidity();
    }
    static fromCompact(w2) {
      const b2 = e2.nByteLength;
      return w2 = et$1("compactSignature", w2, b2 * 2), new d3(p2(w2, 0, b2), p2(w2, b2, 2 * b2));
    }
    static fromDER(w2) {
      const { r: b2, s: I3 } = lt$1.toSig(et$1("DER", w2));
      return new d3(b2, I3);
    }
    assertValidity() {
      ft$2("r", this.r, K$1, r2), ft$2("s", this.s, K$1, r2);
    }
    addRecoveryBit(w2) {
      return new d3(this.r, this.s, w2);
    }
    recoverPublicKey(w2) {
      const { r: b2, s: I3, recovery: R3 } = this, x2 = B3(et$1("msgHash", w2));
      if (R3 == null || ![0, 1, 2, 3].includes(R3)) throw new Error("recovery id invalid");
      const C2 = R3 === 2 || R3 === 3 ? b2 + e2.n : b2;
      if (C2 >= n3.ORDER) throw new Error("recovery id 2 or 3 invalid");
      const P3 = (R3 & 1) === 0 ? "02" : "03", k2 = a2.fromHex(P3 + h3(C2)), M3 = c2(C2), D2 = s2(-x2 * M3), z2 = s2(I3 * M3), Z2 = a2.BASE.multiplyAndAddUnsafe(k2, D2, z2);
      if (!Z2) throw new Error("point at infinify");
      return Z2.assertValidity(), Z2;
    }
    hasHighS() {
      return y4(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new d3(this.r, s2(-this.s), this.recovery) : this;
    }
    toDERRawBytes() {
      return Vt$1(this.toDERHex());
    }
    toDERHex() {
      return lt$1.hexFromSig({ r: this.r, s: this.s });
    }
    toCompactRawBytes() {
      return Vt$1(this.toCompactHex());
    }
    toCompactHex() {
      return h3(this.r) + h3(this.s);
    }
  }
  const v2 = { isValidPrivateKey(g2) {
    try {
      return u2(g2), true;
    } catch {
      return false;
    }
  }, normPrivateKeyToScalar: u2, randomPrivateKey: () => {
    const g2 = zr(e2.n);
    return uc(e2.randomBytes(g2), e2.n);
  }, precompute(g2 = 8, w2 = a2.BASE) {
    return w2._setWindowSize(g2), w2.multiply(BigInt(3)), w2;
  } };
  function m3(g2, w2 = true) {
    return a2.fromPrivateKey(g2).toRawBytes(w2);
  }
  function O3(g2) {
    const w2 = St$2(g2), b2 = typeof g2 == "string", I3 = (w2 || b2) && g2.length;
    return w2 ? I3 === o2 || I3 === i2 : b2 ? I3 === 2 * o2 || I3 === 2 * i2 : g2 instanceof a2;
  }
  function N2(g2, w2, b2 = true) {
    if (O3(g2)) throw new Error("first arg must be private key");
    if (!O3(w2)) throw new Error("second arg must be public key");
    return a2.fromHex(w2).multiply(u2(g2)).toRawBytes(b2);
  }
  const $2 = e2.bits2int || function(g2) {
    if (g2.length > 8192) throw new Error("input is too large");
    const w2 = Ot(g2), b2 = g2.length * 8 - e2.nBitLength;
    return b2 > 0 ? w2 >> BigInt(b2) : w2;
  }, B3 = e2.bits2int_modN || function(g2) {
    return s2($2(g2));
  }, A2 = Je$1(e2.nBitLength);
  function T2(g2) {
    return ft$2("num < 2^" + e2.nBitLength, g2, dt$2, A2), Mt$1(g2, e2.nByteLength);
  }
  function S3(g2, w2, b2 = L2) {
    if (["recovered", "canonical"].some((W2) => W2 in b2)) throw new Error("sign() legacy options not supported");
    const { hash: I3, randomBytes: R3 } = e2;
    let { lowS: x2, prehash: C2, extraEntropy: P3 } = b2;
    x2 == null && (x2 = true), g2 = et$1("msgHash", g2), Jr(b2), C2 && (g2 = et$1("prehashed msgHash", I3(g2)));
    const k2 = B3(g2), M3 = u2(w2), D2 = [T2(M3), T2(k2)];
    if (P3 != null && P3 !== false) {
      const W2 = P3 === true ? R3(n3.BYTES) : P3;
      D2.push(et$1("extraEntropy", W2));
    }
    const z2 = ne$1(...D2), Z2 = k2;
    function st2(W2) {
      const J3 = $2(W2);
      if (!f3(J3)) return;
      const Be2 = c2(J3), zt2 = a2.BASE.multiply(J3).toAffine(), vt2 = s2(zt2.x);
      if (vt2 === dt$2) return;
      const Zt2 = s2(Be2 * s2(Z2 + vt2 * M3));
      if (Zt2 === dt$2) return;
      let Ut2 = (zt2.x === vt2 ? 0 : 2) | Number(zt2.y & K$1), vn2 = Zt2;
      return x2 && y4(Zt2) && (vn2 = E2(Zt2), Ut2 ^= 1), new d3(vt2, vn2, Ut2);
    }
    return { seed: z2, k2sig: st2 };
  }
  const L2 = { lowS: e2.lowS, prehash: false }, U2 = { lowS: e2.lowS, prehash: false };
  function _2(g2, w2, b2 = L2) {
    const { seed: I3, k2sig: R3 } = S3(g2, w2, b2), x2 = e2;
    return Vr(x2.hash.outputLen, x2.nByteLength, x2.hmac)(I3, R3);
  }
  a2.BASE._setWindowSize(8);
  function j2(g2, w2, b2, I3 = U2) {
    const R3 = g2;
    w2 = et$1("msgHash", w2), b2 = et$1("publicKey", b2);
    const { lowS: x2, prehash: C2, format: P3 } = I3;
    if (Jr(I3), "strict" in I3) throw new Error("options.strict was renamed to lowS");
    if (P3 !== void 0 && P3 !== "compact" && P3 !== "der") throw new Error("format must be compact or der");
    const k2 = typeof R3 == "string" || St$2(R3), M3 = !k2 && !P3 && typeof R3 == "object" && R3 !== null && typeof R3.r == "bigint" && typeof R3.s == "bigint";
    if (!k2 && !M3) throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let D2, z2;
    try {
      if (M3 && (D2 = new d3(R3.r, R3.s)), k2) {
        try {
          P3 !== "compact" && (D2 = d3.fromDER(R3));
        } catch (Ut2) {
          if (!(Ut2 instanceof lt$1.Err)) throw Ut2;
        }
        !D2 && P3 !== "der" && (D2 = d3.fromCompact(R3));
      }
      z2 = a2.fromHex(b2);
    } catch {
      return false;
    }
    if (!D2 || x2 && D2.hasHighS()) return false;
    C2 && (w2 = e2.hash(w2));
    const { r: Z2, s: st2 } = D2, W2 = B3(w2), J3 = c2(st2), Be2 = s2(W2 * J3), zt2 = s2(Z2 * J3), vt2 = a2.BASE.multiplyAndAddUnsafe(z2, Be2, zt2)?.toAffine();
    return vt2 ? s2(vt2.x) === Z2 : false;
  }
  return { CURVE: e2, getPublicKey: m3, getSharedSecret: N2, sign: _2, verify: j2, ProjectivePoint: a2, Signature: d3, utils: v2 };
}
function Nc(t2) {
  return { hash: t2, hmac: (e2, ...n3) => ye$1(t2, e2, Vi(...n3)), randomBytes: Lt$1 };
}
function Uc(t2, e2) {
  const n3 = (r2) => Ic({ ...t2, ...Nc(r2) });
  return { ...n3(e2), create: n3 };
}
const to = Kr(BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff")), Tc = to.create(BigInt("-3")), Rc = BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b");
Uc({ a: Tc, b: Rc, Fp: to, n: BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"), Gx: BigInt("0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"), Gy: BigInt("0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5"), h: BigInt(1), lowS: false }, Qt$1);
const G = "base16", qt$1 = "base64pad", xe$1 = "base64url", Kt$1 = "utf8", Ft$1 = 1, re$1 = 2;
function Pc(t2) {
  const e2 = Qt$1(fromString(t2, G));
  return toString(e2, G);
}
function kc(t2) {
  const e2 = Qt$1(fromString(t2, Kt$1));
  return toString(e2, G);
}
function Xc(t2, e2, n3) {
  return `${t2}?wc_ev=${n3}&topic=${e2}`;
}
var Jc = Object.defineProperty, Qc = Object.defineProperties, ta = Object.getOwnPropertyDescriptors, fo = Object.getOwnPropertySymbols, ea = Object.prototype.hasOwnProperty, na = Object.prototype.propertyIsEnumerable, lo = (t2, e2, n3) => e2 in t2 ? Jc(t2, e2, { enumerable: true, configurable: true, writable: true, value: n3 }) : t2[e2] = n3, ra = (t2, e2) => {
  for (var n3 in e2 || (e2 = {})) ea.call(e2, n3) && lo(t2, n3, e2[n3]);
  if (fo) for (var n3 of fo(e2)) na.call(e2, n3) && lo(t2, n3, e2[n3]);
  return t2;
}, oa = (t2, e2) => Qc(t2, ta(e2));
function It$1(t2) {
  const e2 = [];
  return t2.forEach((n3) => {
    const [r2, o2] = n3.split(":");
    e2.push(`${r2}:${o2}`);
  }), e2;
}
function ho(t2) {
  const e2 = [];
  return Object.values(t2).forEach((n3) => {
    e2.push(...It$1(n3.accounts));
  }), e2;
}
function po(t2, e2) {
  const n3 = [];
  return Object.values(t2).forEach((r2) => {
    It$1(r2.accounts).includes(e2) && n3.push(...r2.methods);
  }), n3;
}
function go(t2, e2) {
  const n3 = [];
  return Object.values(t2).forEach((r2) => {
    It$1(r2.accounts).includes(e2) && n3.push(...r2.events);
  }), n3;
}
function yn(t2) {
  return t2.includes(":");
}
function yo(t2) {
  return yn(t2) ? t2.split(":")[0] : t2;
}
function ie$1(t2) {
  var e2, n3, r2;
  const o2 = {};
  if (!Oe$1(t2)) return o2;
  for (const [i2, s2] of Object.entries(t2)) {
    const c2 = yn(i2) ? [i2] : s2.chains, a2 = s2.methods || [], u2 = s2.events || [], l2 = yo(i2);
    o2[l2] = oa(ra({}, o2[l2]), { chains: ot$1(c2, (e2 = o2[l2]) == null ? void 0 : e2.chains), methods: ot$1(a2, (n3 = o2[l2]) == null ? void 0 : n3.methods), events: ot$1(u2, (r2 = o2[l2]) == null ? void 0 : r2.events) });
  }
  return o2;
}
function mo(t2) {
  const e2 = {};
  return t2?.forEach((n3) => {
    var r2;
    const [o2, i2] = n3.split(":");
    e2[o2] || (e2[o2] = { accounts: [], chains: [], events: [], methods: [] }), e2[o2].accounts.push(n3), (r2 = e2[o2].chains) == null || r2.push(`${o2}:${i2}`);
  }), e2;
}
function ca(t2, e2) {
  e2 = e2.map((r2) => r2.replace("did:pkh:", ""));
  const n3 = mo(e2);
  for (const [r2, o2] of Object.entries(n3)) o2.methods ? o2.methods = ot$1(o2.methods, t2) : o2.methods = t2, o2.events = ["chainChanged", "accountsChanged"];
  return n3;
}
function aa(t2, e2) {
  var n3, r2, o2, i2, s2, c2;
  const a2 = ie$1(t2), u2 = ie$1(e2), l2 = {}, f3 = Object.keys(a2).concat(Object.keys(u2));
  for (const h3 of f3) l2[h3] = { chains: ot$1((n3 = a2[h3]) == null ? void 0 : n3.chains, (r2 = u2[h3]) == null ? void 0 : r2.chains), methods: ot$1((o2 = a2[h3]) == null ? void 0 : o2.methods, (i2 = u2[h3]) == null ? void 0 : i2.methods), events: ot$1((s2 = a2[h3]) == null ? void 0 : s2.events, (c2 = u2[h3]) == null ? void 0 : c2.events) };
  return l2;
}
const wo = { INVALID_METHOD: { message: "Invalid method.", code: 1001 }, INVALID_EVENT: { message: "Invalid event.", code: 1002 }, INVALID_UPDATE_REQUEST: { message: "Invalid update request.", code: 1003 }, INVALID_EXTEND_REQUEST: { message: "Invalid extend request.", code: 1004 }, INVALID_SESSION_SETTLE_REQUEST: { message: "Invalid session settle request.", code: 1005 }, UNAUTHORIZED_METHOD: { message: "Unauthorized method.", code: 3001 }, UNAUTHORIZED_EVENT: { message: "Unauthorized event.", code: 3002 }, UNAUTHORIZED_UPDATE_REQUEST: { message: "Unauthorized update request.", code: 3003 }, UNAUTHORIZED_EXTEND_REQUEST: { message: "Unauthorized extend request.", code: 3004 }, USER_REJECTED: { message: "User rejected.", code: 5e3 }, USER_REJECTED_CHAINS: { message: "User rejected chains.", code: 5001 }, USER_REJECTED_METHODS: { message: "User rejected methods.", code: 5002 }, USER_REJECTED_EVENTS: { message: "User rejected events.", code: 5003 }, UNSUPPORTED_CHAINS: { message: "Unsupported chains.", code: 5100 }, UNSUPPORTED_METHODS: { message: "Unsupported methods.", code: 5101 }, UNSUPPORTED_EVENTS: { message: "Unsupported events.", code: 5102 }, UNSUPPORTED_ACCOUNTS: { message: "Unsupported accounts.", code: 5103 }, UNSUPPORTED_NAMESPACE_KEY: { message: "Unsupported namespace key.", code: 5104 }, USER_DISCONNECTED: { message: "User disconnected.", code: 6e3 }, SESSION_SETTLEMENT_FAILED: { message: "Session settlement failed.", code: 7e3 }, WC_METHOD_UNSUPPORTED: { message: "Unsupported wc_ method.", code: 10001 } }, bo = { NOT_INITIALIZED: { message: "Not initialized.", code: 1 }, NO_MATCHING_KEY: { message: "No matching key.", code: 2 }, RESTORE_WILL_OVERRIDE: { message: "Restore will override.", code: 3 }, RESUBSCRIBED: { message: "Resubscribed.", code: 4 }, MISSING_OR_INVALID: { message: "Missing or invalid.", code: 5 }, EXPIRED: { message: "Expired.", code: 6 }, UNKNOWN_TYPE: { message: "Unknown type.", code: 7 }, MISMATCHED_TOPIC: { message: "Mismatched topic.", code: 8 }, NON_CONFORMING_NAMESPACES: { message: "Non conforming namespaces.", code: 9 } };
function ht$2(t2, e2) {
  const { message: n3, code: r2 } = bo[t2];
  return { message: e2 ? `${n3} ${e2}` : n3, code: r2 };
}
function Nt(t2, e2) {
  const { message: n3, code: r2 } = wo[t2];
  return { message: e2 ? `${n3} ${e2}` : n3, code: r2 };
}
function se$1(t2, e2) {
  return Array.isArray(t2) ? true : false;
}
function Oe$1(t2) {
  return Object.getPrototypeOf(t2) === Object.prototype && Object.keys(t2).length;
}
function Et$1(t2) {
  return typeof t2 > "u";
}
function nt$1(t2, e2) {
  return e2 && Et$1(t2) ? true : typeof t2 == "string" && !!t2.trim().length;
}
function Ae$1(t2, e2) {
  return e2 && Et$1(t2) ? true : typeof t2 == "number" && !isNaN(t2);
}
function ua(t2, e2) {
  const { requiredNamespaces: n3 } = e2, r2 = Object.keys(t2.namespaces), o2 = Object.keys(n3);
  let i2 = true;
  return gt$2(o2, r2) ? (r2.forEach((s2) => {
    const { accounts: c2, methods: a2, events: u2 } = t2.namespaces[s2], l2 = It$1(c2), f3 = n3[s2];
    (!gt$2(ue$1(s2, f3), l2) || !gt$2(f3.methods, a2) || !gt$2(f3.events, u2)) && (i2 = false);
  }), i2) : false;
}
function ce$2(t2) {
  return nt$1(t2, false) && t2.includes(":") ? t2.split(":").length === 2 : false;
}
function Eo(t2) {
  if (nt$1(t2, false) && t2.includes(":")) {
    const e2 = t2.split(":");
    if (e2.length === 3) {
      const n3 = e2[0] + ":" + e2[1];
      return !!e2[2] && ce$2(n3);
    }
  }
  return false;
}
function ha(t2, e2) {
  let n3 = null;
  return nt$1(t2?.publicKey, false) || (n3 = ht$2("MISSING_OR_INVALID", `${e2} controller public key should be a string`)), n3;
}
function mn2(t2) {
  let e2 = true;
  return se$1(t2) ? t2.length && (e2 = t2.every((n3) => nt$1(n3, false))) : e2 = false, e2;
}
function vo(t2, e2, n3) {
  let r2 = null;
  return se$1(e2) && e2.length ? e2.forEach((o2) => {
    r2 || ce$2(o2) || (r2 = Nt("UNSUPPORTED_CHAINS", `${n3}, chain ${o2} should be a string and conform to "namespace:chainId" format`));
  }) : ce$2(t2) || (r2 = Nt("UNSUPPORTED_CHAINS", `${n3}, chains must be defined as "namespace:chainId" e.g. "eip155:1": {...} in the namespace key OR as an array of CAIP-2 chainIds e.g. eip155: { chains: ["eip155:1", "eip155:5"] }`)), r2;
}
function xo(t2, e2, n3) {
  let r2 = null;
  return Object.entries(t2).forEach(([o2, i2]) => {
    if (r2) return;
    const s2 = vo(o2, ue$1(o2, i2), `${e2} ${n3}`);
    s2 && (r2 = s2);
  }), r2;
}
function So(t2, e2) {
  let n3 = null;
  return se$1(t2) ? t2.forEach((r2) => {
    n3 || Eo(r2) || (n3 = Nt("UNSUPPORTED_ACCOUNTS", `${e2}, account ${r2} should be a string and conform to "namespace:chainId:address" format`));
  }) : n3 = Nt("UNSUPPORTED_ACCOUNTS", `${e2}, accounts should be an array of strings conforming to "namespace:chainId:address" format`), n3;
}
function Oo(t2, e2) {
  let n3 = null;
  return Object.values(t2).forEach((r2) => {
    if (n3) return;
    const o2 = So(r2?.accounts, `${e2} namespace`);
    o2 && (n3 = o2);
  }), n3;
}
function Ao(t2, e2) {
  let n3 = null;
  return mn2(t2?.methods) ? mn2(t2?.events) || (n3 = Nt("UNSUPPORTED_EVENTS", `${e2}, events should be an array of strings or empty array for no events`)) : n3 = Nt("UNSUPPORTED_METHODS", `${e2}, methods should be an array of strings or empty array for no methods`), n3;
}
function wn(t2, e2) {
  let n3 = null;
  return Object.values(t2).forEach((r2) => {
    if (n3) return;
    const o2 = Ao(r2, `${e2}, namespace`);
    o2 && (n3 = o2);
  }), n3;
}
function pa(t2, e2, n3) {
  let r2 = null;
  if (t2 && Oe$1(t2)) {
    const o2 = wn(t2, e2);
    o2 && (r2 = o2);
    const i2 = xo(t2, e2, n3);
    i2 && (r2 = i2);
  } else r2 = ht$2("MISSING_OR_INVALID", `${e2}, ${n3} should be an object with data`);
  return r2;
}
function Bo(t2, e2) {
  let n3 = null;
  if (t2 && Oe$1(t2)) {
    const r2 = wn(t2, e2);
    r2 && (n3 = r2);
    const o2 = Oo(t2, e2);
    o2 && (n3 = o2);
  } else n3 = ht$2("MISSING_OR_INVALID", `${e2}, namespaces should be an object with data`);
  return n3;
}
function Io(t2) {
  return nt$1(t2.protocol, true);
}
function ga(t2, e2) {
  let n3 = false;
  return !t2 ? n3 = true : t2 && se$1(t2) && t2.length && t2.forEach((r2) => {
    n3 = Io(r2);
  }), n3;
}
function ya(t2) {
  return typeof t2 == "number";
}
function ma(t2) {
  return typeof t2 < "u" && typeof t2 !== null;
}
function wa(t2) {
  return !(!t2 || typeof t2 != "object" || !t2.code || !Ae$1(t2.code, false) || !t2.message || !nt$1(t2.message, false));
}
function ba(t2) {
  return !(Et$1(t2) || !nt$1(t2.method, false));
}
function Ea(t2) {
  return !(Et$1(t2) || Et$1(t2.result) && Et$1(t2.error) || !Ae$1(t2.id, false) || !nt$1(t2.jsonrpc, false));
}
function va(t2) {
  return !(Et$1(t2) || !nt$1(t2.name, false));
}
function xa(t2, e2) {
  return !(!ce$2(e2) || !ho(t2).includes(e2));
}
function Sa(t2, e2, n3) {
  return nt$1(n3, false) ? po(t2, e2).includes(n3) : false;
}
function Oa(t2, e2, n3) {
  return nt$1(n3, false) ? go(t2, e2).includes(n3) : false;
}
function No(t2, e2, n3) {
  let r2 = null;
  const o2 = Aa(t2), i2 = Ba(e2), s2 = Object.keys(o2), c2 = Object.keys(i2), a2 = Uo(Object.keys(t2)), u2 = Uo(Object.keys(e2)), l2 = a2.filter((f3) => !u2.includes(f3));
  return l2.length && (r2 = ht$2("NON_CONFORMING_NAMESPACES", `${n3} namespaces keys don't satisfy requiredNamespaces.
      Required: ${l2.toString()}
      Received: ${Object.keys(e2).toString()}`)), gt$2(s2, c2) || (r2 = ht$2("NON_CONFORMING_NAMESPACES", `${n3} namespaces chains don't satisfy required namespaces.
      Required: ${s2.toString()}
      Approved: ${c2.toString()}`)), Object.keys(e2).forEach((f3) => {
    if (!f3.includes(":") || r2) return;
    const h3 = It$1(e2[f3].accounts);
    h3.includes(f3) || (r2 = ht$2("NON_CONFORMING_NAMESPACES", `${n3} namespaces accounts don't satisfy namespace accounts for ${f3}
        Required: ${f3}
        Approved: ${h3.toString()}`));
  }), s2.forEach((f3) => {
    r2 || (gt$2(o2[f3].methods, i2[f3].methods) ? gt$2(o2[f3].events, i2[f3].events) || (r2 = ht$2("NON_CONFORMING_NAMESPACES", `${n3} namespaces events don't satisfy namespace events for ${f3}`)) : r2 = ht$2("NON_CONFORMING_NAMESPACES", `${n3} namespaces methods don't satisfy namespace methods for ${f3}`));
  }), r2;
}
function Aa(t2) {
  const e2 = {};
  return Object.keys(t2).forEach((n3) => {
    var r2;
    n3.includes(":") ? e2[n3] = t2[n3] : (r2 = t2[n3].chains) == null || r2.forEach((o2) => {
      e2[o2] = { methods: t2[n3].methods, events: t2[n3].events };
    });
  }), e2;
}
function Uo(t2) {
  return [...new Set(t2.map((e2) => e2.includes(":") ? e2.split(":")[0] : e2))];
}
function Ba(t2) {
  const e2 = {};
  return Object.keys(t2).forEach((n3) => {
    if (n3.includes(":")) e2[n3] = t2[n3];
    else {
      const r2 = It$1(t2[n3].accounts);
      r2?.forEach((o2) => {
        e2[o2] = { accounts: t2[n3].accounts.filter((i2) => i2.includes(`${o2}:`)), methods: t2[n3].methods, events: t2[n3].events };
      });
    }
  }), e2;
}
function Ia(t2, e2) {
  return Ae$1(t2, false) && t2 <= e2.max && t2 >= e2.min;
}
const bn = {};
class Ra {
  static get(e2) {
    return bn[e2];
  }
  static set(e2, n3) {
    bn[e2] = n3;
  }
  static delete(e2) {
    delete bn[e2];
  }
}
const De$1 = "wc", Le$1 = 2, ke$1 = "client", we$1 = `${De$1}@${Le$1}:${ke$1}:`, me$1 = { name: ke$1, logger: "error" }, Me$1 = "WALLETCONNECT_DEEPLINK_CHOICE", pt$1 = "proposal", $e$1 = "Proposal expired", ht$1 = "session", J2 = cjsExports.SEVEN_DAYS, dt$1 = "engine", N$2 = { wc_sessionPropose: { req: { ttl: cjsExports.FIVE_MINUTES, prompt: true, tag: 1100 }, res: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1101 }, reject: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1120 }, autoReject: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1121 } }, wc_sessionSettle: { req: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1102 }, res: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1103 } }, wc_sessionUpdate: { req: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1104 }, res: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1105 } }, wc_sessionExtend: { req: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1106 }, res: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1107 } }, wc_sessionRequest: { req: { ttl: cjsExports.FIVE_MINUTES, prompt: true, tag: 1108 }, res: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1109 } }, wc_sessionEvent: { req: { ttl: cjsExports.FIVE_MINUTES, prompt: true, tag: 1110 }, res: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1111 } }, wc_sessionDelete: { req: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1112 }, res: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1113 } }, wc_sessionPing: { req: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1114 }, res: { ttl: cjsExports.ONE_DAY, prompt: false, tag: 1115 } }, wc_sessionAuthenticate: { req: { ttl: cjsExports.ONE_HOUR, prompt: true, tag: 1116 }, res: { ttl: cjsExports.ONE_HOUR, prompt: false, tag: 1117 }, reject: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1118 }, autoReject: { ttl: cjsExports.FIVE_MINUTES, prompt: false, tag: 1119 } } }, _e$1 = { min: cjsExports.FIVE_MINUTES, max: cjsExports.SEVEN_DAYS }, $$2 = { idle: "IDLE", active: "ACTIVE" }, Ke$1 = { eth_sendTransaction: { key: "" }, eth_sendRawTransaction: { key: "" }, wallet_sendCalls: { key: "" }, solana_signTransaction: { key: "signature" }, solana_signAllTransactions: { key: "transactions" }, solana_signAndSendTransaction: { key: "signature" } }, ut$1 = "request", gt$1 = ["wc_sessionPropose", "wc_sessionRequest", "wc_authRequest", "wc_sessionAuthenticate"], yt$1 = "wc", wt$1 = "auth", mt$1 = "authKeys", _t$1 = "pairingTopics", Et = "requests", ae$1 = `${yt$1}@${1.5}:${wt$1}:`, ce$1 = `${ae$1}:PUB_KEY`;
var vs = Object.defineProperty, Is = Object.defineProperties, Ts = Object.getOwnPropertyDescriptors, ft$1 = Object.getOwnPropertySymbols, qs3 = Object.prototype.hasOwnProperty, Ps = Object.prototype.propertyIsEnumerable, Ue$1 = (S3, n3, e2) => n3 in S3 ? vs(S3, n3, { enumerable: true, configurable: true, writable: true, value: e2 }) : S3[n3] = e2, v$1 = (S3, n3) => {
  for (var e2 in n3 || (n3 = {})) qs3.call(n3, e2) && Ue$1(S3, e2, n3[e2]);
  if (ft$1) for (var e2 of ft$1(n3)) Ps.call(n3, e2) && Ue$1(S3, e2, n3[e2]);
  return S3;
}, b$3 = (S3, n3) => Is(S3, Ts(n3)), c$3 = (S3, n3, e2) => Ue$1(S3, typeof n3 != "symbol" ? n3 + "" : n3, e2);
class Ns extends V$3 {
  constructor(n3) {
    super(n3), c$3(this, "name", dt$1), c$3(this, "events", new Nt$3()), c$3(this, "initialized", false), c$3(this, "requestQueue", { state: $$2.idle, queue: [] }), c$3(this, "sessionRequestQueue", { state: $$2.idle, queue: [] }), c$3(this, "requestQueueDelay", cjsExports.ONE_SECOND), c$3(this, "expectedPairingMethodMap", /* @__PURE__ */ new Map()), c$3(this, "recentlyDeletedMap", /* @__PURE__ */ new Map()), c$3(this, "recentlyDeletedLimit", 200), c$3(this, "relayMessageCache", []), c$3(this, "pendingSessions", /* @__PURE__ */ new Map()), c$3(this, "init", async () => {
      this.initialized || (await this.cleanup(), this.registerRelayerEvents(), this.registerExpirerEvents(), this.registerPairingEvents(), await this.registerLinkModeListeners(), this.client.core.pairing.register({ methods: Object.keys(N$2) }), this.initialized = true, setTimeout(async () => {
        await this.processPendingMessageEvents(), this.sessionRequestQueue.queue = this.getPendingSessionRequests(), this.processSessionRequestQueue();
      }, cjsExports.toMiliseconds(this.requestQueueDelay)));
    }), c$3(this, "connect", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      const t2 = b$3(v$1({}, e2), { requiredNamespaces: e2.requiredNamespaces || {}, optionalNamespaces: e2.optionalNamespaces || {} });
      await this.isValidConnect(t2), t2.optionalNamespaces = aa(t2.requiredNamespaces, t2.optionalNamespaces), t2.requiredNamespaces = {};
      const { pairingTopic: s2, requiredNamespaces: i2, optionalNamespaces: r2, sessionProperties: o2, scopedProperties: a2, relays: l2 } = t2;
      let p2 = s2, h3, u2 = false;
      try {
        if (p2) {
          const T2 = this.client.core.pairing.pairings.get(p2);
          this.client.logger.warn("connect() with existing pairing topic is deprecated and will be removed in the next major release."), u2 = T2.active;
        }
      } catch (T2) {
        throw this.client.logger.error(`connect() -> pairing.get(${p2}) failed`), T2;
      }
      if (!p2 || !u2) {
        const { topic: T2, uri: K2 } = await this.client.core.pairing.create();
        p2 = T2, h3 = K2;
      }
      if (!p2) {
        const { message: T2 } = ht$2("NO_MATCHING_KEY", `connect() pairing topic: ${p2}`);
        throw new Error(T2);
      }
      const d3 = await this.client.core.crypto.generateKeyPair(), w2 = N$2.wc_sessionPropose.req.ttl || cjsExports.FIVE_MINUTES, m3 = Ei(w2), f3 = b$3(v$1(v$1({ requiredNamespaces: i2, optionalNamespaces: r2, relays: l2 ?? [{ protocol: xt$2 }], proposer: { publicKey: d3, metadata: this.client.metadata }, expiryTimestamp: m3, pairingTopic: p2 }, o2 && { sessionProperties: o2 }), a2 && { scopedProperties: a2 }), { id: payloadId() }), _2 = xi("session_connect", f3.id), { reject: g2, resolve: A2, done: D2 } = gi(w2, $e$1), I3 = ({ id: T2 }) => {
        T2 === f3.id && (this.client.events.off("proposal_expire", I3), this.pendingSessions.delete(f3.id), this.events.emit(_2, { error: { message: $e$1, code: 0 } }));
      };
      return this.client.events.on("proposal_expire", I3), this.events.once(_2, ({ error: T2, session: K2 }) => {
        this.client.events.off("proposal_expire", I3), T2 ? g2(T2) : K2 && A2(K2);
      }), await this.sendRequest({ topic: p2, method: "wc_sessionPropose", params: f3, throwOnFailedPublish: true, clientRpcId: f3.id }), await this.setProposal(f3.id, f3), { uri: h3, approval: D2 };
    }), c$3(this, "pair", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        return await this.client.core.pairing.pair(e2);
      } catch (t2) {
        throw this.client.logger.error("pair() failed"), t2;
      }
    }), c$3(this, "approve", async (e2) => {
      var t2, s2, i2;
      const r2 = this.client.core.eventClient.createEvent({ properties: { topic: (t2 = e2?.id) == null ? void 0 : t2.toString(), trace: [er$1.session_approve_started] } });
      try {
        this.isInitialized(), await this.confirmOnlineStateOrThrow();
      } catch (q2) {
        throw r2.setError(tr$1.no_internet_connection), q2;
      }
      try {
        await this.isValidProposalId(e2?.id);
      } catch (q2) {
        throw this.client.logger.error(`approve() -> proposal.get(${e2?.id}) failed`), r2.setError(tr$1.proposal_not_found), q2;
      }
      try {
        await this.isValidApprove(e2);
      } catch (q2) {
        throw this.client.logger.error("approve() -> isValidApprove() failed"), r2.setError(tr$1.session_approve_namespace_validation_failure), q2;
      }
      const { id: o2, relayProtocol: a2, namespaces: l2, sessionProperties: p2, scopedProperties: h3, sessionConfig: u2 } = e2, d3 = this.client.proposal.get(o2);
      this.client.core.eventClient.deleteEvent({ eventId: r2.eventId });
      const { pairingTopic: w2, proposer: m3, requiredNamespaces: f3, optionalNamespaces: _2 } = d3;
      let g2 = (s2 = this.client.core.eventClient) == null ? void 0 : s2.getEvent({ topic: w2 });
      g2 || (g2 = (i2 = this.client.core.eventClient) == null ? void 0 : i2.createEvent({ type: er$1.session_approve_started, properties: { topic: w2, trace: [er$1.session_approve_started, er$1.session_namespaces_validation_success] } }));
      const A2 = await this.client.core.crypto.generateKeyPair(), D2 = m3.publicKey, I3 = await this.client.core.crypto.generateSharedKey(A2, D2), T2 = v$1(v$1(v$1({ relay: { protocol: a2 ?? "irn" }, namespaces: l2, controller: { publicKey: A2, metadata: this.client.metadata }, expiry: Ei(J2) }, p2 && { sessionProperties: p2 }), h3 && { scopedProperties: h3 }), u2 && { sessionConfig: u2 }), K2 = Q$1.relay;
      g2.addTrace(er$1.subscribing_session_topic);
      try {
        await this.client.core.relayer.subscribe(I3, { transportType: K2 });
      } catch (q2) {
        throw g2.setError(tr$1.subscribe_session_topic_failure), q2;
      }
      g2.addTrace(er$1.subscribe_session_topic_success);
      const fe2 = b$3(v$1({}, T2), { topic: I3, requiredNamespaces: f3, optionalNamespaces: _2, pairingTopic: w2, acknowledged: false, self: T2.controller, peer: { publicKey: m3.publicKey, metadata: m3.metadata }, controller: A2, transportType: Q$1.relay });
      await this.client.session.set(I3, fe2), g2.addTrace(er$1.store_session);
      try {
        g2.addTrace(er$1.publishing_session_settle), await this.sendRequest({ topic: I3, method: "wc_sessionSettle", params: T2, throwOnFailedPublish: true }).catch((q2) => {
          throw g2?.setError(tr$1.session_settle_publish_failure), q2;
        }), g2.addTrace(er$1.session_settle_publish_success), g2.addTrace(er$1.publishing_session_approve), await this.sendResult({ id: o2, topic: w2, result: { relay: { protocol: a2 ?? "irn" }, responderPublicKey: A2 }, throwOnFailedPublish: true }).catch((q2) => {
          throw g2?.setError(tr$1.session_approve_publish_failure), q2;
        }), g2.addTrace(er$1.session_approve_publish_success);
      } catch (q2) {
        throw this.client.logger.error(q2), this.client.session.delete(I3, Nt("USER_DISCONNECTED")), await this.client.core.relayer.unsubscribe(I3), q2;
      }
      return this.client.core.eventClient.deleteEvent({ eventId: g2.eventId }), await this.client.core.pairing.updateMetadata({ topic: w2, metadata: m3.metadata }), await this.client.proposal.delete(o2, Nt("USER_DISCONNECTED")), await this.client.core.pairing.activate({ topic: w2 }), await this.setExpiry(I3, Ei(J2)), { topic: I3, acknowledged: () => Promise.resolve(this.client.session.get(I3)) };
    }), c$3(this, "reject", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidReject(e2);
      } catch (r2) {
        throw this.client.logger.error("reject() -> isValidReject() failed"), r2;
      }
      const { id: t2, reason: s2 } = e2;
      let i2;
      try {
        i2 = this.client.proposal.get(t2).pairingTopic;
      } catch (r2) {
        throw this.client.logger.error(`reject() -> proposal.get(${t2}) failed`), r2;
      }
      i2 && (await this.sendError({ id: t2, topic: i2, error: s2, rpcOpts: N$2.wc_sessionPropose.reject }), await this.client.proposal.delete(t2, Nt("USER_DISCONNECTED")));
    }), c$3(this, "update", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidUpdate(e2);
      } catch (h3) {
        throw this.client.logger.error("update() -> isValidUpdate() failed"), h3;
      }
      const { topic: t2, namespaces: s2 } = e2, { done: i2, resolve: r2, reject: o2 } = gi(), a2 = payloadId(), l2 = getBigIntRpcId().toString(), p2 = this.client.session.get(t2).namespaces;
      return this.events.once(xi("session_update", a2), ({ error: h3 }) => {
        h3 ? o2(h3) : r2();
      }), await this.client.session.update(t2, { namespaces: s2 }), await this.sendRequest({ topic: t2, method: "wc_sessionUpdate", params: { namespaces: s2 }, throwOnFailedPublish: true, clientRpcId: a2, relayRpcId: l2 }).catch((h3) => {
        this.client.logger.error(h3), this.client.session.update(t2, { namespaces: p2 }), o2(h3);
      }), { acknowledged: i2 };
    }), c$3(this, "extend", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidExtend(e2);
      } catch (a2) {
        throw this.client.logger.error("extend() -> isValidExtend() failed"), a2;
      }
      const { topic: t2 } = e2, s2 = payloadId(), { done: i2, resolve: r2, reject: o2 } = gi();
      return this.events.once(xi("session_extend", s2), ({ error: a2 }) => {
        a2 ? o2(a2) : r2();
      }), await this.setExpiry(t2, Ei(J2)), this.sendRequest({ topic: t2, method: "wc_sessionExtend", params: {}, clientRpcId: s2, throwOnFailedPublish: true }).catch((a2) => {
        o2(a2);
      }), { acknowledged: i2 };
    }), c$3(this, "request", async (e2) => {
      this.isInitialized();
      try {
        await this.isValidRequest(e2);
      } catch (_2) {
        throw this.client.logger.error("request() -> isValidRequest() failed"), _2;
      }
      const { chainId: t2, request: s2, topic: i2, expiry: r2 = N$2.wc_sessionRequest.req.ttl } = e2, o2 = this.client.session.get(i2);
      o2?.transportType === Q$1.relay && await this.confirmOnlineStateOrThrow();
      const a2 = payloadId(), l2 = getBigIntRpcId().toString(), { done: p2, resolve: h3, reject: u2 } = gi(r2, "Request expired. Please try again.");
      this.events.once(xi("session_request", a2), ({ error: _2, result: g2 }) => {
        _2 ? u2(_2) : h3(g2);
      });
      const d3 = "wc_sessionRequest", w2 = this.getAppLinkIfEnabled(o2.peer.metadata, o2.transportType);
      if (w2) return await this.sendRequest({ clientRpcId: a2, relayRpcId: l2, topic: i2, method: d3, params: { request: b$3(v$1({}, s2), { expiryTimestamp: Ei(r2) }), chainId: t2 }, expiry: r2, throwOnFailedPublish: true, appLink: w2 }).catch((_2) => u2(_2)), this.client.events.emit("session_request_sent", { topic: i2, request: s2, chainId: t2, id: a2 }), await p2();
      const m3 = { request: b$3(v$1({}, s2), { expiryTimestamp: Ei(r2) }), chainId: t2 }, f3 = this.shouldSetTVF(d3, m3);
      return await Promise.all([new Promise(async (_2) => {
        await this.sendRequest(v$1({ clientRpcId: a2, relayRpcId: l2, topic: i2, method: d3, params: m3, expiry: r2, throwOnFailedPublish: true }, f3 && { tvf: this.getTVFParams(a2, m3) })).catch((g2) => u2(g2)), this.client.events.emit("session_request_sent", { topic: i2, request: s2, chainId: t2, id: a2 }), _2();
      }), new Promise(async (_2) => {
        var g2;
        if (!((g2 = o2.sessionConfig) != null && g2.disableDeepLink)) {
          const A2 = await Oi(this.client.core.storage, Me$1);
          await Si2({ id: a2, topic: i2, wcDeepLink: A2 });
        }
        _2();
      }), p2()]).then((_2) => _2[2]);
    }), c$3(this, "respond", async (e2) => {
      this.isInitialized(), await this.isValidRespond(e2);
      const { topic: t2, response: s2 } = e2, { id: i2 } = s2, r2 = this.client.session.get(t2);
      r2.transportType === Q$1.relay && await this.confirmOnlineStateOrThrow();
      const o2 = this.getAppLinkIfEnabled(r2.peer.metadata, r2.transportType);
      isJsonRpcResult(s2) ? await this.sendResult({ id: i2, topic: t2, result: s2.result, throwOnFailedPublish: true, appLink: o2 }) : isJsonRpcError(s2) && await this.sendError({ id: i2, topic: t2, error: s2.error, appLink: o2 }), this.cleanupAfterResponse(e2);
    }), c$3(this, "ping", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidPing(e2);
      } catch (s2) {
        throw this.client.logger.error("ping() -> isValidPing() failed"), s2;
      }
      const { topic: t2 } = e2;
      if (this.client.session.keys.includes(t2)) {
        const s2 = payloadId(), i2 = getBigIntRpcId().toString(), { done: r2, resolve: o2, reject: a2 } = gi();
        this.events.once(xi("session_ping", s2), ({ error: l2 }) => {
          l2 ? a2(l2) : o2();
        }), await Promise.all([this.sendRequest({ topic: t2, method: "wc_sessionPing", params: {}, throwOnFailedPublish: true, clientRpcId: s2, relayRpcId: i2 }), r2()]);
      } else this.client.core.pairing.pairings.keys.includes(t2) && (this.client.logger.warn("ping() on pairing topic is deprecated and will be removed in the next major release."), await this.client.core.pairing.ping({ topic: t2 }));
    }), c$3(this, "emit", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow(), await this.isValidEmit(e2);
      const { topic: t2, event: s2, chainId: i2 } = e2, r2 = getBigIntRpcId().toString(), o2 = payloadId();
      await this.sendRequest({ topic: t2, method: "wc_sessionEvent", params: { event: s2, chainId: i2 }, throwOnFailedPublish: true, relayRpcId: r2, clientRpcId: o2 });
    }), c$3(this, "disconnect", async (e2) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow(), await this.isValidDisconnect(e2);
      const { topic: t2 } = e2;
      if (this.client.session.keys.includes(t2)) await this.sendRequest({ topic: t2, method: "wc_sessionDelete", params: Nt("USER_DISCONNECTED"), throwOnFailedPublish: true }), await this.deleteSession({ topic: t2, emitEvent: false });
      else if (this.client.core.pairing.pairings.keys.includes(t2)) await this.client.core.pairing.disconnect({ topic: t2 });
      else {
        const { message: s2 } = ht$2("MISMATCHED_TOPIC", `Session or pairing topic not found: ${t2}`);
        throw new Error(s2);
      }
    }), c$3(this, "find", (e2) => (this.isInitialized(), this.client.session.getAll().filter((t2) => ua(t2, e2)))), c$3(this, "getPendingSessionRequests", () => this.client.pendingRequest.getAll()), c$3(this, "authenticate", async (e2, t2) => {
      var s2;
      this.isInitialized(), this.isValidAuthenticate(e2);
      const i2 = t2 && this.client.core.linkModeSupportedApps.includes(t2) && ((s2 = this.client.metadata.redirect) == null ? void 0 : s2.linkMode), r2 = i2 ? Q$1.link_mode : Q$1.relay;
      r2 === Q$1.relay && await this.confirmOnlineStateOrThrow();
      const { chains: o2, statement: a2 = "", uri: l2, domain: p2, nonce: h3, type: u2, exp: d3, nbf: w2, methods: m3 = [], expiry: f3 } = e2, _2 = [...e2.resources || []], { topic: g2, uri: A2 } = await this.client.core.pairing.create({ methods: ["wc_sessionAuthenticate"], transportType: r2 });
      this.client.logger.info({ message: "Generated new pairing", pairing: { topic: g2, uri: A2 } });
      const D2 = await this.client.core.crypto.generateKeyPair(), I3 = Pc(D2);
      if (await Promise.all([this.client.auth.authKeys.set(ce$1, { responseTopic: I3, publicKey: D2 }), this.client.auth.pairingTopics.set(I3, { topic: I3, pairingTopic: g2 })]), await this.client.core.relayer.subscribe(I3, { transportType: r2 }), this.client.logger.info(`sending request to new pairing topic: ${g2}`), m3.length > 0) {
        const { namespace: x2 } = Ne$1(o2[0]);
        let L2 = fs(x2, "request", m3);
        pe$1(_2) && (L2 = ls(L2, _2.pop())), _2.push(L2);
      }
      const T2 = f3 && f3 > N$2.wc_sessionAuthenticate.req.ttl ? f3 : N$2.wc_sessionAuthenticate.req.ttl, K2 = { authPayload: { type: u2 ?? "caip122", chains: o2, statement: a2, aud: l2, domain: p2, version: "1", nonce: h3, iat: (/* @__PURE__ */ new Date()).toISOString(), exp: d3, nbf: w2, resources: _2 }, requester: { publicKey: D2, metadata: this.client.metadata }, expiryTimestamp: Ei(T2) }, fe2 = { eip155: { chains: o2, methods: [.../* @__PURE__ */ new Set(["personal_sign", ...m3])], events: ["chainChanged", "accountsChanged"] } }, q2 = { requiredNamespaces: {}, optionalNamespaces: fe2, relays: [{ protocol: "irn" }], pairingTopic: g2, proposer: { publicKey: D2, metadata: this.client.metadata }, expiryTimestamp: Ei(N$2.wc_sessionPropose.req.ttl), id: payloadId() }, { done: Rt2, resolve: je2, reject: Se2 } = gi(T2, "Request expired"), te2 = payloadId(), le2 = xi("session_connect", q2.id), Re2 = xi("session_request", te2), pe2 = async ({ error: x2, session: L2 }) => {
        this.events.off(Re2, ve2), x2 ? Se2(x2) : L2 && je2({ session: L2 });
      }, ve2 = async (x2) => {
        var L2, Fe2, Qe2;
        if (await this.deletePendingAuthRequest(te2, { message: "fulfilled", code: 0 }), x2.error) {
          const ie2 = Nt("WC_METHOD_UNSUPPORTED", "wc_sessionAuthenticate");
          return x2.error.code === ie2.code ? void 0 : (this.events.off(le2, pe2), Se2(x2.error.message));
        }
        await this.deleteProposal(q2.id), this.events.off(le2, pe2);
        const { cacaos: He2, responder: Q2 } = x2.result, Te3 = [], ze2 = [];
        for (const ie2 of He2) {
          await is({ cacao: ie2, projectId: this.client.core.projectId }) || (this.client.logger.error(ie2, "Signature verification failed"), Se2(Nt("SESSION_SETTLEMENT_FAILED", "Signature verification failed")));
          const { p: qe2 } = ie2, Pe2 = pe$1(qe2.resources), Ye2 = [dr2(qe2.iss)], vt2 = De$2(qe2.iss);
          if (Pe2) {
            const Ne2 = ds(Pe2), It2 = hs(Pe2);
            Te3.push(...Ne2), Ye2.push(...It2);
          }
          for (const Ne2 of Ye2) ze2.push(`${Ne2}:${vt2}`);
        }
        const se2 = await this.client.core.crypto.generateSharedKey(D2, Q2.publicKey);
        let he2;
        Te3.length > 0 && (he2 = { topic: se2, acknowledged: true, self: { publicKey: D2, metadata: this.client.metadata }, peer: Q2, controller: Q2.publicKey, expiry: Ei(J2), requiredNamespaces: {}, optionalNamespaces: {}, relay: { protocol: "irn" }, pairingTopic: g2, namespaces: ca([...new Set(Te3)], [...new Set(ze2)]), transportType: r2 }, await this.client.core.relayer.subscribe(se2, { transportType: r2 }), await this.client.session.set(se2, he2), g2 && await this.client.core.pairing.updateMetadata({ topic: g2, metadata: Q2.metadata }), he2 = this.client.session.get(se2)), (L2 = this.client.metadata.redirect) != null && L2.linkMode && (Fe2 = Q2.metadata.redirect) != null && Fe2.linkMode && (Qe2 = Q2.metadata.redirect) != null && Qe2.universal && t2 && (this.client.core.addLinkModeSupportedApp(Q2.metadata.redirect.universal), this.client.session.update(se2, { transportType: Q$1.link_mode })), je2({ auths: He2, session: he2 });
      };
      this.events.once(le2, pe2), this.events.once(Re2, ve2);
      let Ie2;
      try {
        if (i2) {
          const x2 = formatJsonRpcRequest("wc_sessionAuthenticate", K2, te2);
          this.client.core.history.set(g2, x2);
          const L2 = await this.client.core.crypto.encode("", x2, { type: re$1, encoding: xe$1 });
          Ie2 = Xc(t2, g2, L2);
        } else await Promise.all([this.sendRequest({ topic: g2, method: "wc_sessionAuthenticate", params: K2, expiry: e2.expiry, throwOnFailedPublish: true, clientRpcId: te2 }), this.sendRequest({ topic: g2, method: "wc_sessionPropose", params: q2, expiry: N$2.wc_sessionPropose.req.ttl, throwOnFailedPublish: true, clientRpcId: q2.id })]);
      } catch (x2) {
        throw this.events.off(le2, pe2), this.events.off(Re2, ve2), x2;
      }
      return await this.setProposal(q2.id, q2), await this.setAuthRequest(te2, { request: b$3(v$1({}, K2), { verifyContext: {} }), pairingTopic: g2, transportType: r2 }), { uri: Ie2 ?? A2, response: Rt2 };
    }), c$3(this, "approveSessionAuthenticate", async (e2) => {
      const { id: t2, auths: s2 } = e2, i2 = this.client.core.eventClient.createEvent({ properties: { topic: t2.toString(), trace: [ir$1.authenticated_session_approve_started] } });
      try {
        this.isInitialized();
      } catch (f3) {
        throw i2.setError(sr$1.no_internet_connection), f3;
      }
      const r2 = this.getPendingAuthRequest(t2);
      if (!r2) throw i2.setError(sr$1.authenticated_session_pending_request_not_found), new Error(`Could not find pending auth request with id ${t2}`);
      const o2 = r2.transportType || Q$1.relay;
      o2 === Q$1.relay && await this.confirmOnlineStateOrThrow();
      const a2 = r2.requester.publicKey, l2 = await this.client.core.crypto.generateKeyPair(), p2 = Pc(a2), h3 = { type: Ft$1, receiverPublicKey: a2, senderPublicKey: l2 }, u2 = [], d3 = [];
      for (const f3 of s2) {
        if (!await is({ cacao: f3, projectId: this.client.core.projectId })) {
          i2.setError(sr$1.invalid_cacao);
          const I3 = Nt("SESSION_SETTLEMENT_FAILED", "Signature verification failed");
          throw await this.sendError({ id: t2, topic: p2, error: I3, encodeOpts: h3 }), new Error(I3.message);
        }
        i2.addTrace(ir$1.cacaos_verified);
        const { p: _2 } = f3, g2 = pe$1(_2.resources), A2 = [dr2(_2.iss)], D2 = De$2(_2.iss);
        if (g2) {
          const I3 = ds(g2), T2 = hs(g2);
          u2.push(...I3), A2.push(...T2);
        }
        for (const I3 of A2) d3.push(`${I3}:${D2}`);
      }
      const w2 = await this.client.core.crypto.generateSharedKey(l2, a2);
      i2.addTrace(ir$1.create_authenticated_session_topic);
      let m3;
      if (u2?.length > 0) {
        m3 = { topic: w2, acknowledged: true, self: { publicKey: l2, metadata: this.client.metadata }, peer: { publicKey: a2, metadata: r2.requester.metadata }, controller: a2, expiry: Ei(J2), authentication: s2, requiredNamespaces: {}, optionalNamespaces: {}, relay: { protocol: "irn" }, pairingTopic: r2.pairingTopic, namespaces: ca([...new Set(u2)], [...new Set(d3)]), transportType: o2 }, i2.addTrace(ir$1.subscribing_authenticated_session_topic);
        try {
          await this.client.core.relayer.subscribe(w2, { transportType: o2 });
        } catch (f3) {
          throw i2.setError(sr$1.subscribe_authenticated_session_topic_failure), f3;
        }
        i2.addTrace(ir$1.subscribe_authenticated_session_topic_success), await this.client.session.set(w2, m3), i2.addTrace(ir$1.store_authenticated_session), await this.client.core.pairing.updateMetadata({ topic: r2.pairingTopic, metadata: r2.requester.metadata });
      }
      i2.addTrace(ir$1.publishing_authenticated_session_approve);
      try {
        await this.sendResult({ topic: p2, id: t2, result: { cacaos: s2, responder: { publicKey: l2, metadata: this.client.metadata } }, encodeOpts: h3, throwOnFailedPublish: true, appLink: this.getAppLinkIfEnabled(r2.requester.metadata, o2) });
      } catch (f3) {
        throw i2.setError(sr$1.authenticated_session_approve_publish_failure), f3;
      }
      return await this.client.auth.requests.delete(t2, { message: "fulfilled", code: 0 }), await this.client.core.pairing.activate({ topic: r2.pairingTopic }), this.client.core.eventClient.deleteEvent({ eventId: i2.eventId }), { session: m3 };
    }), c$3(this, "rejectSessionAuthenticate", async (e2) => {
      this.isInitialized();
      const { id: t2, reason: s2 } = e2, i2 = this.getPendingAuthRequest(t2);
      if (!i2) throw new Error(`Could not find pending auth request with id ${t2}`);
      i2.transportType === Q$1.relay && await this.confirmOnlineStateOrThrow();
      const r2 = i2.requester.publicKey, o2 = await this.client.core.crypto.generateKeyPair(), a2 = Pc(r2), l2 = { type: Ft$1, receiverPublicKey: r2, senderPublicKey: o2 };
      await this.sendError({ id: t2, topic: a2, error: s2, encodeOpts: l2, rpcOpts: N$2.wc_sessionAuthenticate.reject, appLink: this.getAppLinkIfEnabled(i2.requester.metadata, i2.transportType) }), await this.client.auth.requests.delete(t2, { message: "rejected", code: 0 }), await this.client.proposal.delete(t2, Nt("USER_DISCONNECTED"));
    }), c$3(this, "formatAuthMessage", (e2) => {
      this.isInitialized();
      const { request: t2, iss: s2 } = e2;
      return hr2(t2, s2);
    }), c$3(this, "processRelayMessageCache", () => {
      setTimeout(async () => {
        if (this.relayMessageCache.length !== 0) for (; this.relayMessageCache.length > 0; ) try {
          const e2 = this.relayMessageCache.shift();
          e2 && await this.onRelayMessage(e2);
        } catch (e2) {
          this.client.logger.error(e2);
        }
      }, 50);
    }), c$3(this, "cleanupDuplicatePairings", async (e2) => {
      if (e2.pairingTopic) try {
        const t2 = this.client.core.pairing.pairings.get(e2.pairingTopic), s2 = this.client.core.pairing.pairings.getAll().filter((i2) => {
          var r2, o2;
          return ((r2 = i2.peerMetadata) == null ? void 0 : r2.url) && ((o2 = i2.peerMetadata) == null ? void 0 : o2.url) === e2.peer.metadata.url && i2.topic && i2.topic !== t2.topic;
        });
        if (s2.length === 0) return;
        this.client.logger.info(`Cleaning up ${s2.length} duplicate pairing(s)`), await Promise.all(s2.map((i2) => this.client.core.pairing.disconnect({ topic: i2.topic }))), this.client.logger.info("Duplicate pairings clean up finished");
      } catch (t2) {
        this.client.logger.error(t2);
      }
    }), c$3(this, "deleteSession", async (e2) => {
      var t2;
      const { topic: s2, expirerHasDeleted: i2 = false, emitEvent: r2 = true, id: o2 = 0 } = e2, { self: a2 } = this.client.session.get(s2);
      await this.client.core.relayer.unsubscribe(s2), await this.client.session.delete(s2, Nt("USER_DISCONNECTED")), this.addToRecentlyDeleted(s2, "session"), this.client.core.crypto.keychain.has(a2.publicKey) && await this.client.core.crypto.deleteKeyPair(a2.publicKey), this.client.core.crypto.keychain.has(s2) && await this.client.core.crypto.deleteSymKey(s2), i2 || this.client.core.expirer.del(s2), this.client.core.storage.removeItem(Me$1).catch((l2) => this.client.logger.warn(l2)), this.getPendingSessionRequests().forEach((l2) => {
        l2.topic === s2 && this.deletePendingSessionRequest(l2.id, Nt("USER_DISCONNECTED"));
      }), s2 === ((t2 = this.sessionRequestQueue.queue[0]) == null ? void 0 : t2.topic) && (this.sessionRequestQueue.state = $$2.idle), r2 && this.client.events.emit("session_delete", { id: o2, topic: s2 });
    }), c$3(this, "deleteProposal", async (e2, t2) => {
      if (t2) try {
        const s2 = this.client.proposal.get(e2), i2 = this.client.core.eventClient.getEvent({ topic: s2.pairingTopic });
        i2?.setError(tr$1.proposal_expired);
      } catch {
      }
      await Promise.all([this.client.proposal.delete(e2, Nt("USER_DISCONNECTED")), t2 ? Promise.resolve() : this.client.core.expirer.del(e2)]), this.addToRecentlyDeleted(e2, "proposal");
    }), c$3(this, "deletePendingSessionRequest", async (e2, t2, s2 = false) => {
      await Promise.all([this.client.pendingRequest.delete(e2, t2), s2 ? Promise.resolve() : this.client.core.expirer.del(e2)]), this.addToRecentlyDeleted(e2, "request"), this.sessionRequestQueue.queue = this.sessionRequestQueue.queue.filter((i2) => i2.id !== e2), s2 && (this.sessionRequestQueue.state = $$2.idle, this.client.events.emit("session_request_expire", { id: e2 }));
    }), c$3(this, "deletePendingAuthRequest", async (e2, t2, s2 = false) => {
      await Promise.all([this.client.auth.requests.delete(e2, t2), s2 ? Promise.resolve() : this.client.core.expirer.del(e2)]);
    }), c$3(this, "setExpiry", async (e2, t2) => {
      this.client.session.keys.includes(e2) && (this.client.core.expirer.set(e2, t2), await this.client.session.update(e2, { expiry: t2 }));
    }), c$3(this, "setProposal", async (e2, t2) => {
      this.client.core.expirer.set(e2, Ei(N$2.wc_sessionPropose.req.ttl)), await this.client.proposal.set(e2, t2);
    }), c$3(this, "setAuthRequest", async (e2, t2) => {
      const { request: s2, pairingTopic: i2, transportType: r2 = Q$1.relay } = t2;
      this.client.core.expirer.set(e2, s2.expiryTimestamp), await this.client.auth.requests.set(e2, { authPayload: s2.authPayload, requester: s2.requester, expiryTimestamp: s2.expiryTimestamp, id: e2, pairingTopic: i2, verifyContext: s2.verifyContext, transportType: r2 });
    }), c$3(this, "setPendingSessionRequest", async (e2) => {
      const { id: t2, topic: s2, params: i2, verifyContext: r2 } = e2, o2 = i2.request.expiryTimestamp || Ei(N$2.wc_sessionRequest.req.ttl);
      this.client.core.expirer.set(t2, o2), await this.client.pendingRequest.set(t2, { id: t2, topic: s2, params: i2, verifyContext: r2 });
    }), c$3(this, "sendRequest", async (e2) => {
      const { topic: t2, method: s2, params: i2, expiry: r2, relayRpcId: o2, clientRpcId: a2, throwOnFailedPublish: l2, appLink: p2, tvf: h3 } = e2, u2 = formatJsonRpcRequest(s2, i2, a2);
      let d3;
      const w2 = !!p2;
      try {
        const _2 = w2 ? xe$1 : qt$1;
        d3 = await this.client.core.crypto.encode(t2, u2, { encoding: _2 });
      } catch (_2) {
        throw await this.cleanup(), this.client.logger.error(`sendRequest() -> core.crypto.encode() for topic ${t2} failed`), _2;
      }
      let m3;
      if (gt$1.includes(s2)) {
        const _2 = kc(JSON.stringify(u2)), g2 = kc(d3);
        m3 = await this.client.core.verify.register({ id: g2, decryptedId: _2 });
      }
      const f3 = N$2[s2].req;
      if (f3.attestation = m3, r2 && (f3.ttl = r2), o2 && (f3.id = o2), this.client.core.history.set(t2, u2), w2) {
        const _2 = Xc(p2, t2, d3);
        await global.Linking.openURL(_2, this.client.name);
      } else {
        const _2 = N$2[s2].req;
        r2 && (_2.ttl = r2), o2 && (_2.id = o2), _2.tvf = b$3(v$1({}, h3), { correlationId: u2.id }), l2 ? (_2.internal = b$3(v$1({}, _2.internal), { throwOnFailedPublish: true }), await this.client.core.relayer.publish(t2, d3, _2)) : this.client.core.relayer.publish(t2, d3, _2).catch((g2) => this.client.logger.error(g2));
      }
      return u2.id;
    }), c$3(this, "sendResult", async (e2) => {
      const { id: t2, topic: s2, result: i2, throwOnFailedPublish: r2, encodeOpts: o2, appLink: a2 } = e2, l2 = formatJsonRpcResult(t2, i2);
      let p2;
      const h3 = a2 && typeof (global == null ? void 0 : global.Linking) < "u";
      try {
        const w2 = h3 ? xe$1 : qt$1;
        p2 = await this.client.core.crypto.encode(s2, l2, b$3(v$1({}, o2 || {}), { encoding: w2 }));
      } catch (w2) {
        throw await this.cleanup(), this.client.logger.error(`sendResult() -> core.crypto.encode() for topic ${s2} failed`), w2;
      }
      let u2, d3;
      try {
        u2 = await this.client.core.history.get(s2, t2);
        const w2 = u2.request;
        try {
          this.shouldSetTVF(w2.method, w2.params) && (d3 = this.getTVFParams(t2, w2.params, i2));
        } catch (m3) {
          this.client.logger.warn("sendResult() -> getTVFParams() failed", m3);
        }
      } catch (w2) {
        throw this.client.logger.error(`sendResult() -> history.get(${s2}, ${t2}) failed`), w2;
      }
      if (h3) {
        const w2 = Xc(a2, s2, p2);
        await global.Linking.openURL(w2, this.client.name);
      } else {
        const w2 = u2.request.method, m3 = N$2[w2].res;
        m3.tvf = b$3(v$1({}, d3), { correlationId: t2 }), r2 ? (m3.internal = b$3(v$1({}, m3.internal), { throwOnFailedPublish: true }), await this.client.core.relayer.publish(s2, p2, m3)) : this.client.core.relayer.publish(s2, p2, m3).catch((f3) => this.client.logger.error(f3));
      }
      await this.client.core.history.resolve(l2);
    }), c$3(this, "sendError", async (e2) => {
      const { id: t2, topic: s2, error: i2, encodeOpts: r2, rpcOpts: o2, appLink: a2 } = e2, l2 = formatJsonRpcError(t2, i2);
      let p2;
      const h3 = a2 && typeof (global == null ? void 0 : global.Linking) < "u";
      try {
        const d3 = h3 ? xe$1 : qt$1;
        p2 = await this.client.core.crypto.encode(s2, l2, b$3(v$1({}, r2 || {}), { encoding: d3 }));
      } catch (d3) {
        throw await this.cleanup(), this.client.logger.error(`sendError() -> core.crypto.encode() for topic ${s2} failed`), d3;
      }
      let u2;
      try {
        u2 = await this.client.core.history.get(s2, t2);
      } catch (d3) {
        throw this.client.logger.error(`sendError() -> history.get(${s2}, ${t2}) failed`), d3;
      }
      if (h3) {
        const d3 = Xc(a2, s2, p2);
        await global.Linking.openURL(d3, this.client.name);
      } else {
        const d3 = u2.request.method, w2 = o2 || N$2[d3].res;
        this.client.core.relayer.publish(s2, p2, w2);
      }
      await this.client.core.history.resolve(l2);
    }), c$3(this, "cleanup", async () => {
      const e2 = [], t2 = [];
      this.client.session.getAll().forEach((s2) => {
        let i2 = false;
        vi2(s2.expiry) && (i2 = true), this.client.core.crypto.keychain.has(s2.topic) || (i2 = true), i2 && e2.push(s2.topic);
      }), this.client.proposal.getAll().forEach((s2) => {
        vi2(s2.expiryTimestamp) && t2.push(s2.id);
      }), await Promise.all([...e2.map((s2) => this.deleteSession({ topic: s2 })), ...t2.map((s2) => this.deleteProposal(s2))]);
    }), c$3(this, "onProviderMessageEvent", async (e2) => {
      !this.initialized || this.relayMessageCache.length > 0 ? this.relayMessageCache.push(e2) : await this.onRelayMessage(e2);
    }), c$3(this, "onRelayEventRequest", async (e2) => {
      this.requestQueue.queue.push(e2), await this.processRequestsQueue();
    }), c$3(this, "processRequestsQueue", async () => {
      if (this.requestQueue.state === $$2.active) {
        this.client.logger.info("Request queue already active, skipping...");
        return;
      }
      for (this.client.logger.info(`Request queue starting with ${this.requestQueue.queue.length} requests`); this.requestQueue.queue.length > 0; ) {
        this.requestQueue.state = $$2.active;
        const e2 = this.requestQueue.queue.shift();
        if (e2) try {
          await this.processRequest(e2);
        } catch (t2) {
          this.client.logger.warn(t2);
        }
      }
      this.requestQueue.state = $$2.idle;
    }), c$3(this, "processRequest", async (e2) => {
      const { topic: t2, payload: s2, attestation: i2, transportType: r2, encryptedId: o2 } = e2, a2 = s2.method;
      if (!this.shouldIgnorePairingRequest({ topic: t2, requestMethod: a2 })) switch (a2) {
        case "wc_sessionPropose":
          return await this.onSessionProposeRequest({ topic: t2, payload: s2, attestation: i2, encryptedId: o2 });
        case "wc_sessionSettle":
          return await this.onSessionSettleRequest(t2, s2);
        case "wc_sessionUpdate":
          return await this.onSessionUpdateRequest(t2, s2);
        case "wc_sessionExtend":
          return await this.onSessionExtendRequest(t2, s2);
        case "wc_sessionPing":
          return await this.onSessionPingRequest(t2, s2);
        case "wc_sessionDelete":
          return await this.onSessionDeleteRequest(t2, s2);
        case "wc_sessionRequest":
          return await this.onSessionRequest({ topic: t2, payload: s2, attestation: i2, encryptedId: o2, transportType: r2 });
        case "wc_sessionEvent":
          return await this.onSessionEventRequest(t2, s2);
        case "wc_sessionAuthenticate":
          return await this.onSessionAuthenticateRequest({ topic: t2, payload: s2, attestation: i2, encryptedId: o2, transportType: r2 });
        default:
          return this.client.logger.info(`Unsupported request method ${a2}`);
      }
    }), c$3(this, "onRelayEventResponse", async (e2) => {
      const { topic: t2, payload: s2, transportType: i2 } = e2, r2 = (await this.client.core.history.get(t2, s2.id)).request.method;
      switch (r2) {
        case "wc_sessionPropose":
          return this.onSessionProposeResponse(t2, s2, i2);
        case "wc_sessionSettle":
          return this.onSessionSettleResponse(t2, s2);
        case "wc_sessionUpdate":
          return this.onSessionUpdateResponse(t2, s2);
        case "wc_sessionExtend":
          return this.onSessionExtendResponse(t2, s2);
        case "wc_sessionPing":
          return this.onSessionPingResponse(t2, s2);
        case "wc_sessionRequest":
          return this.onSessionRequestResponse(t2, s2);
        case "wc_sessionAuthenticate":
          return this.onSessionAuthenticateResponse(t2, s2);
        default:
          return this.client.logger.info(`Unsupported response method ${r2}`);
      }
    }), c$3(this, "onRelayEventUnknownPayload", (e2) => {
      const { topic: t2 } = e2, { message: s2 } = ht$2("MISSING_OR_INVALID", `Decoded payload on topic ${t2} is not identifiable as a JSON-RPC request or a response.`);
      throw new Error(s2);
    }), c$3(this, "shouldIgnorePairingRequest", (e2) => {
      const { topic: t2, requestMethod: s2 } = e2, i2 = this.expectedPairingMethodMap.get(t2);
      return !i2 || i2.includes(s2) ? false : !!(i2.includes("wc_sessionAuthenticate") && this.client.events.listenerCount("session_authenticate") > 0);
    }), c$3(this, "onSessionProposeRequest", async (e2) => {
      const { topic: t2, payload: s2, attestation: i2, encryptedId: r2 } = e2, { params: o2, id: a2 } = s2;
      try {
        const l2 = this.client.core.eventClient.getEvent({ topic: t2 });
        this.client.events.listenerCount("session_proposal") === 0 && (console.warn("No listener for session_proposal event"), l2?.setError(Y$2.proposal_listener_not_found)), this.isValidConnect(v$1({}, s2.params));
        const p2 = o2.expiryTimestamp || Ei(N$2.wc_sessionPropose.req.ttl), h3 = v$1({ id: a2, pairingTopic: t2, expiryTimestamp: p2 }, o2);
        await this.setProposal(a2, h3);
        const u2 = await this.getVerifyContext({ attestationId: i2, hash: kc(JSON.stringify(s2)), encryptedId: r2, metadata: h3.proposer.metadata });
        l2?.addTrace(G$1.emit_session_proposal), this.client.events.emit("session_proposal", { id: a2, params: h3, verifyContext: u2 });
      } catch (l2) {
        await this.sendError({ id: a2, topic: t2, error: l2, rpcOpts: N$2.wc_sessionPropose.autoReject }), this.client.logger.error(l2);
      }
    }), c$3(this, "onSessionProposeResponse", async (e2, t2, s2) => {
      const { id: i2 } = t2;
      if (isJsonRpcResult(t2)) {
        const { result: r2 } = t2;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", result: r2 });
        const o2 = this.client.proposal.get(i2);
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", proposal: o2 });
        const a2 = o2.proposer.publicKey;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", selfPublicKey: a2 });
        const l2 = r2.responderPublicKey;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", peerPublicKey: l2 });
        const p2 = await this.client.core.crypto.generateSharedKey(a2, l2);
        this.pendingSessions.set(i2, { sessionTopic: p2, pairingTopic: e2, proposalId: i2, publicKey: a2 });
        const h3 = await this.client.core.relayer.subscribe(p2, { transportType: s2 });
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", subscriptionId: h3 }), await this.client.core.pairing.activate({ topic: e2 });
      } else if (isJsonRpcError(t2)) {
        await this.client.proposal.delete(i2, Nt("USER_DISCONNECTED"));
        const r2 = xi("session_connect", i2);
        if (this.events.listenerCount(r2) === 0) throw new Error(`emitting ${r2} without any listeners, 954`);
        this.events.emit(r2, { error: t2.error });
      }
    }), c$3(this, "onSessionSettleRequest", async (e2, t2) => {
      const { id: s2, params: i2 } = t2;
      try {
        this.isValidSessionSettleRequest(i2);
        const { relay: r2, controller: o2, expiry: a2, namespaces: l2, sessionProperties: p2, scopedProperties: h3, sessionConfig: u2 } = t2.params, d3 = [...this.pendingSessions.values()].find((f3) => f3.sessionTopic === e2);
        if (!d3) return this.client.logger.error(`Pending session not found for topic ${e2}`);
        const w2 = this.client.proposal.get(d3.proposalId), m3 = b$3(v$1(v$1(v$1({ topic: e2, relay: r2, expiry: a2, namespaces: l2, acknowledged: true, pairingTopic: d3.pairingTopic, requiredNamespaces: w2.requiredNamespaces, optionalNamespaces: w2.optionalNamespaces, controller: o2.publicKey, self: { publicKey: d3.publicKey, metadata: this.client.metadata }, peer: { publicKey: o2.publicKey, metadata: o2.metadata } }, p2 && { sessionProperties: p2 }), h3 && { scopedProperties: h3 }), u2 && { sessionConfig: u2 }), { transportType: Q$1.relay });
        await this.client.session.set(m3.topic, m3), await this.setExpiry(m3.topic, m3.expiry), await this.client.core.pairing.updateMetadata({ topic: d3.pairingTopic, metadata: m3.peer.metadata }), this.client.events.emit("session_connect", { session: m3 }), this.events.emit(xi("session_connect", d3.proposalId), { session: m3 }), this.pendingSessions.delete(d3.proposalId), this.deleteProposal(d3.proposalId, false), this.cleanupDuplicatePairings(m3), await this.sendResult({ id: t2.id, topic: e2, result: true, throwOnFailedPublish: true });
      } catch (r2) {
        await this.sendError({ id: s2, topic: e2, error: r2 }), this.client.logger.error(r2);
      }
    }), c$3(this, "onSessionSettleResponse", async (e2, t2) => {
      const { id: s2 } = t2;
      isJsonRpcResult(t2) ? (await this.client.session.update(e2, { acknowledged: true }), this.events.emit(xi("session_approve", s2), {})) : isJsonRpcError(t2) && (await this.client.session.delete(e2, Nt("USER_DISCONNECTED")), this.events.emit(xi("session_approve", s2), { error: t2.error }));
    }), c$3(this, "onSessionUpdateRequest", async (e2, t2) => {
      const { params: s2, id: i2 } = t2;
      try {
        const r2 = `${e2}_session_update`, o2 = Ra.get(r2);
        if (o2 && this.isRequestOutOfSync(o2, i2)) {
          this.client.logger.warn(`Discarding out of sync request - ${i2}`), this.sendError({ id: i2, topic: e2, error: Nt("INVALID_UPDATE_REQUEST") });
          return;
        }
        this.isValidUpdate(v$1({ topic: e2 }, s2));
        try {
          Ra.set(r2, i2), await this.client.session.update(e2, { namespaces: s2.namespaces }), await this.sendResult({ id: i2, topic: e2, result: true, throwOnFailedPublish: true });
        } catch (a2) {
          throw Ra.delete(r2), a2;
        }
        this.client.events.emit("session_update", { id: i2, topic: e2, params: s2 });
      } catch (r2) {
        await this.sendError({ id: i2, topic: e2, error: r2 }), this.client.logger.error(r2);
      }
    }), c$3(this, "isRequestOutOfSync", (e2, t2) => t2.toString().slice(0, -3) < e2.toString().slice(0, -3)), c$3(this, "onSessionUpdateResponse", (e2, t2) => {
      const { id: s2 } = t2, i2 = xi("session_update", s2);
      if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners`);
      isJsonRpcResult(t2) ? this.events.emit(xi("session_update", s2), {}) : isJsonRpcError(t2) && this.events.emit(xi("session_update", s2), { error: t2.error });
    }), c$3(this, "onSessionExtendRequest", async (e2, t2) => {
      const { id: s2 } = t2;
      try {
        this.isValidExtend({ topic: e2 }), await this.setExpiry(e2, Ei(J2)), await this.sendResult({ id: s2, topic: e2, result: true, throwOnFailedPublish: true }), this.client.events.emit("session_extend", { id: s2, topic: e2 });
      } catch (i2) {
        await this.sendError({ id: s2, topic: e2, error: i2 }), this.client.logger.error(i2);
      }
    }), c$3(this, "onSessionExtendResponse", (e2, t2) => {
      const { id: s2 } = t2, i2 = xi("session_extend", s2);
      if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners`);
      isJsonRpcResult(t2) ? this.events.emit(xi("session_extend", s2), {}) : isJsonRpcError(t2) && this.events.emit(xi("session_extend", s2), { error: t2.error });
    }), c$3(this, "onSessionPingRequest", async (e2, t2) => {
      const { id: s2 } = t2;
      try {
        this.isValidPing({ topic: e2 }), await this.sendResult({ id: s2, topic: e2, result: true, throwOnFailedPublish: true }), this.client.events.emit("session_ping", { id: s2, topic: e2 });
      } catch (i2) {
        await this.sendError({ id: s2, topic: e2, error: i2 }), this.client.logger.error(i2);
      }
    }), c$3(this, "onSessionPingResponse", (e2, t2) => {
      const { id: s2 } = t2, i2 = xi("session_ping", s2);
      setTimeout(() => {
        if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners 2176`);
        isJsonRpcResult(t2) ? this.events.emit(xi("session_ping", s2), {}) : isJsonRpcError(t2) && this.events.emit(xi("session_ping", s2), { error: t2.error });
      }, 500);
    }), c$3(this, "onSessionDeleteRequest", async (e2, t2) => {
      const { id: s2 } = t2;
      try {
        this.isValidDisconnect({ topic: e2, reason: t2.params }), Promise.all([new Promise((i2) => {
          this.client.core.relayer.once(C$2.publish, async () => {
            i2(await this.deleteSession({ topic: e2, id: s2 }));
          });
        }), this.sendResult({ id: s2, topic: e2, result: true, throwOnFailedPublish: true }), this.cleanupPendingSentRequestsForTopic({ topic: e2, error: Nt("USER_DISCONNECTED") })]).catch((i2) => this.client.logger.error(i2));
      } catch (i2) {
        this.client.logger.error(i2);
      }
    }), c$3(this, "onSessionRequest", async (e2) => {
      var t2, s2, i2;
      const { topic: r2, payload: o2, attestation: a2, encryptedId: l2, transportType: p2 } = e2, { id: h3, params: u2 } = o2;
      try {
        await this.isValidRequest(v$1({ topic: r2 }, u2));
        const d3 = this.client.session.get(r2), w2 = await this.getVerifyContext({ attestationId: a2, hash: kc(JSON.stringify(formatJsonRpcRequest("wc_sessionRequest", u2, h3))), encryptedId: l2, metadata: d3.peer.metadata, transportType: p2 }), m3 = { id: h3, topic: r2, params: u2, verifyContext: w2 };
        await this.setPendingSessionRequest(m3), p2 === Q$1.link_mode && (t2 = d3.peer.metadata.redirect) != null && t2.universal && this.client.core.addLinkModeSupportedApp((s2 = d3.peer.metadata.redirect) == null ? void 0 : s2.universal), (i2 = this.client.signConfig) != null && i2.disableRequestQueue ? this.emitSessionRequest(m3) : (this.addSessionRequestToSessionRequestQueue(m3), this.processSessionRequestQueue());
      } catch (d3) {
        await this.sendError({ id: h3, topic: r2, error: d3 }), this.client.logger.error(d3);
      }
    }), c$3(this, "onSessionRequestResponse", (e2, t2) => {
      const { id: s2 } = t2, i2 = xi("session_request", s2);
      if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners`);
      isJsonRpcResult(t2) ? this.events.emit(xi("session_request", s2), { result: t2.result }) : isJsonRpcError(t2) && this.events.emit(xi("session_request", s2), { error: t2.error });
    }), c$3(this, "onSessionEventRequest", async (e2, t2) => {
      const { id: s2, params: i2 } = t2;
      try {
        const r2 = `${e2}_session_event_${i2.event.name}`, o2 = Ra.get(r2);
        if (o2 && this.isRequestOutOfSync(o2, s2)) {
          this.client.logger.info(`Discarding out of sync request - ${s2}`);
          return;
        }
        this.isValidEmit(v$1({ topic: e2 }, i2)), this.client.events.emit("session_event", { id: s2, topic: e2, params: i2 }), Ra.set(r2, s2);
      } catch (r2) {
        await this.sendError({ id: s2, topic: e2, error: r2 }), this.client.logger.error(r2);
      }
    }), c$3(this, "onSessionAuthenticateResponse", (e2, t2) => {
      const { id: s2 } = t2;
      this.client.logger.trace({ type: "method", method: "onSessionAuthenticateResponse", topic: e2, payload: t2 }), isJsonRpcResult(t2) ? this.events.emit(xi("session_request", s2), { result: t2.result }) : isJsonRpcError(t2) && this.events.emit(xi("session_request", s2), { error: t2.error });
    }), c$3(this, "onSessionAuthenticateRequest", async (e2) => {
      var t2;
      const { topic: s2, payload: i2, attestation: r2, encryptedId: o2, transportType: a2 } = e2;
      try {
        const { requester: l2, authPayload: p2, expiryTimestamp: h3 } = i2.params, u2 = await this.getVerifyContext({ attestationId: r2, hash: kc(JSON.stringify(i2)), encryptedId: o2, metadata: l2.metadata, transportType: a2 }), d3 = { requester: l2, pairingTopic: s2, id: i2.id, authPayload: p2, verifyContext: u2, expiryTimestamp: h3 };
        await this.setAuthRequest(i2.id, { request: d3, pairingTopic: s2, transportType: a2 }), a2 === Q$1.link_mode && (t2 = l2.metadata.redirect) != null && t2.universal && this.client.core.addLinkModeSupportedApp(l2.metadata.redirect.universal), this.client.events.emit("session_authenticate", { topic: s2, params: i2.params, id: i2.id, verifyContext: u2 });
      } catch (l2) {
        this.client.logger.error(l2);
        const p2 = i2.params.requester.publicKey, h3 = await this.client.core.crypto.generateKeyPair(), u2 = this.getAppLinkIfEnabled(i2.params.requester.metadata, a2), d3 = { type: Ft$1, receiverPublicKey: p2, senderPublicKey: h3 };
        await this.sendError({ id: i2.id, topic: s2, error: l2, encodeOpts: d3, rpcOpts: N$2.wc_sessionAuthenticate.autoReject, appLink: u2 });
      }
    }), c$3(this, "addSessionRequestToSessionRequestQueue", (e2) => {
      this.sessionRequestQueue.queue.push(e2);
    }), c$3(this, "cleanupAfterResponse", (e2) => {
      this.deletePendingSessionRequest(e2.response.id, { message: "fulfilled", code: 0 }), setTimeout(() => {
        this.sessionRequestQueue.state = $$2.idle, this.processSessionRequestQueue();
      }, cjsExports.toMiliseconds(this.requestQueueDelay));
    }), c$3(this, "cleanupPendingSentRequestsForTopic", ({ topic: e2, error: t2 }) => {
      const s2 = this.client.core.history.pending;
      s2.length > 0 && s2.filter((i2) => i2.topic === e2 && i2.request.method === "wc_sessionRequest").forEach((i2) => {
        const r2 = i2.request.id, o2 = xi("session_request", r2);
        if (this.events.listenerCount(o2) === 0) throw new Error(`emitting ${o2} without any listeners`);
        this.events.emit(xi("session_request", i2.request.id), { error: t2 });
      });
    }), c$3(this, "processSessionRequestQueue", () => {
      if (this.sessionRequestQueue.state === $$2.active) {
        this.client.logger.info("session request queue is already active.");
        return;
      }
      const e2 = this.sessionRequestQueue.queue[0];
      if (!e2) {
        this.client.logger.info("session request queue is empty.");
        return;
      }
      try {
        this.sessionRequestQueue.state = $$2.active, this.emitSessionRequest(e2);
      } catch (t2) {
        this.client.logger.error(t2);
      }
    }), c$3(this, "emitSessionRequest", (e2) => {
      this.client.events.emit("session_request", e2);
    }), c$3(this, "onPairingCreated", (e2) => {
      if (e2.methods && this.expectedPairingMethodMap.set(e2.topic, e2.methods), e2.active) return;
      const t2 = this.client.proposal.getAll().find((s2) => s2.pairingTopic === e2.topic);
      t2 && this.onSessionProposeRequest({ topic: e2.topic, payload: formatJsonRpcRequest("wc_sessionPropose", b$3(v$1({}, t2), { requiredNamespaces: t2.requiredNamespaces, optionalNamespaces: t2.optionalNamespaces, relays: t2.relays, proposer: t2.proposer, sessionProperties: t2.sessionProperties, scopedProperties: t2.scopedProperties }), t2.id) });
    }), c$3(this, "isValidConnect", async (e2) => {
      if (!ma(e2)) {
        const { message: l2 } = ht$2("MISSING_OR_INVALID", `connect() params: ${JSON.stringify(e2)}`);
        throw new Error(l2);
      }
      const { pairingTopic: t2, requiredNamespaces: s2, optionalNamespaces: i2, sessionProperties: r2, scopedProperties: o2, relays: a2 } = e2;
      if (Et$1(t2) || await this.isValidPairingTopic(t2), !ga(a2)) {
        const { message: l2 } = ht$2("MISSING_OR_INVALID", `connect() relays: ${a2}`);
        throw new Error(l2);
      }
      if (!Et$1(s2) && Oe$1(s2) !== 0) {
        const l2 = "requiredNamespaces are deprecated and are automatically assigned to optionalNamespaces";
        ["fatal", "error", "silent"].includes(this.client.logger.level) ? console.warn(l2) : this.client.logger.warn(l2), this.validateNamespaces(s2, "requiredNamespaces");
      }
      if (!Et$1(i2) && Oe$1(i2) !== 0 && this.validateNamespaces(i2, "optionalNamespaces"), Et$1(r2) || this.validateSessionProps(r2, "sessionProperties"), !Et$1(o2)) {
        this.validateSessionProps(o2, "scopedProperties");
        const l2 = Object.keys(s2 || {}).concat(Object.keys(i2 || {}));
        if (!Object.keys(o2).every((p2) => l2.includes(p2))) throw new Error(`Scoped properties must be a subset of required/optional namespaces, received: ${JSON.stringify(o2)}, required/optional namespaces: ${JSON.stringify(l2)}`);
      }
    }), c$3(this, "validateNamespaces", (e2, t2) => {
      const s2 = pa(e2, "connect()", t2);
      if (s2) throw new Error(s2.message);
    }), c$3(this, "isValidApprove", async (e2) => {
      if (!ma(e2)) throw new Error(ht$2("MISSING_OR_INVALID", `approve() params: ${e2}`).message);
      const { id: t2, namespaces: s2, relayProtocol: i2, sessionProperties: r2, scopedProperties: o2 } = e2;
      this.checkRecentlyDeleted(t2), await this.isValidProposalId(t2);
      const a2 = this.client.proposal.get(t2), l2 = Bo(s2, "approve()");
      if (l2) throw new Error(l2.message);
      const p2 = No(a2.requiredNamespaces, s2, "approve()");
      if (p2) throw new Error(p2.message);
      if (!nt$1(i2, true)) {
        const { message: h3 } = ht$2("MISSING_OR_INVALID", `approve() relayProtocol: ${i2}`);
        throw new Error(h3);
      }
      if (Et$1(r2) || this.validateSessionProps(r2, "sessionProperties"), !Et$1(o2)) {
        this.validateSessionProps(o2, "scopedProperties");
        const h3 = new Set(Object.keys(s2));
        if (!Object.keys(o2).every((u2) => h3.has(u2))) throw new Error(`Scoped properties must be a subset of approved namespaces, received: ${JSON.stringify(o2)}, approved namespaces: ${Array.from(h3).join(", ")}`);
      }
    }), c$3(this, "isValidReject", async (e2) => {
      if (!ma(e2)) {
        const { message: i2 } = ht$2("MISSING_OR_INVALID", `reject() params: ${e2}`);
        throw new Error(i2);
      }
      const { id: t2, reason: s2 } = e2;
      if (this.checkRecentlyDeleted(t2), await this.isValidProposalId(t2), !wa(s2)) {
        const { message: i2 } = ht$2("MISSING_OR_INVALID", `reject() reason: ${JSON.stringify(s2)}`);
        throw new Error(i2);
      }
    }), c$3(this, "isValidSessionSettleRequest", (e2) => {
      if (!ma(e2)) {
        const { message: l2 } = ht$2("MISSING_OR_INVALID", `onSessionSettleRequest() params: ${e2}`);
        throw new Error(l2);
      }
      const { relay: t2, controller: s2, namespaces: i2, expiry: r2 } = e2;
      if (!Io(t2)) {
        const { message: l2 } = ht$2("MISSING_OR_INVALID", "onSessionSettleRequest() relay protocol should be a string");
        throw new Error(l2);
      }
      const o2 = ha(s2, "onSessionSettleRequest()");
      if (o2) throw new Error(o2.message);
      const a2 = Bo(i2, "onSessionSettleRequest()");
      if (a2) throw new Error(a2.message);
      if (vi2(r2)) {
        const { message: l2 } = ht$2("EXPIRED", "onSessionSettleRequest()");
        throw new Error(l2);
      }
    }), c$3(this, "isValidUpdate", async (e2) => {
      if (!ma(e2)) {
        const { message: a2 } = ht$2("MISSING_OR_INVALID", `update() params: ${e2}`);
        throw new Error(a2);
      }
      const { topic: t2, namespaces: s2 } = e2;
      this.checkRecentlyDeleted(t2), await this.isValidSessionTopic(t2);
      const i2 = this.client.session.get(t2), r2 = Bo(s2, "update()");
      if (r2) throw new Error(r2.message);
      const o2 = No(i2.requiredNamespaces, s2, "update()");
      if (o2) throw new Error(o2.message);
    }), c$3(this, "isValidExtend", async (e2) => {
      if (!ma(e2)) {
        const { message: s2 } = ht$2("MISSING_OR_INVALID", `extend() params: ${e2}`);
        throw new Error(s2);
      }
      const { topic: t2 } = e2;
      this.checkRecentlyDeleted(t2), await this.isValidSessionTopic(t2);
    }), c$3(this, "isValidRequest", async (e2) => {
      if (!ma(e2)) {
        const { message: a2 } = ht$2("MISSING_OR_INVALID", `request() params: ${e2}`);
        throw new Error(a2);
      }
      const { topic: t2, request: s2, chainId: i2, expiry: r2 } = e2;
      this.checkRecentlyDeleted(t2), await this.isValidSessionTopic(t2);
      const { namespaces: o2 } = this.client.session.get(t2);
      if (!xa(o2, i2)) {
        const { message: a2 } = ht$2("MISSING_OR_INVALID", `request() chainId: ${i2}`);
        throw new Error(a2);
      }
      if (!ba(s2)) {
        const { message: a2 } = ht$2("MISSING_OR_INVALID", `request() ${JSON.stringify(s2)}`);
        throw new Error(a2);
      }
      if (!Sa(o2, i2, s2.method)) {
        const { message: a2 } = ht$2("MISSING_OR_INVALID", `request() method: ${s2.method}`);
        throw new Error(a2);
      }
      if (r2 && !Ia(r2, _e$1)) {
        const { message: a2 } = ht$2("MISSING_OR_INVALID", `request() expiry: ${r2}. Expiry must be a number (in seconds) between ${_e$1.min} and ${_e$1.max}`);
        throw new Error(a2);
      }
    }), c$3(this, "isValidRespond", async (e2) => {
      var t2;
      if (!ma(e2)) {
        const { message: r2 } = ht$2("MISSING_OR_INVALID", `respond() params: ${e2}`);
        throw new Error(r2);
      }
      const { topic: s2, response: i2 } = e2;
      try {
        await this.isValidSessionTopic(s2);
      } catch (r2) {
        throw (t2 = e2?.response) != null && t2.id && this.cleanupAfterResponse(e2), r2;
      }
      if (!Ea(i2)) {
        const { message: r2 } = ht$2("MISSING_OR_INVALID", `respond() response: ${JSON.stringify(i2)}`);
        throw new Error(r2);
      }
    }), c$3(this, "isValidPing", async (e2) => {
      if (!ma(e2)) {
        const { message: s2 } = ht$2("MISSING_OR_INVALID", `ping() params: ${e2}`);
        throw new Error(s2);
      }
      const { topic: t2 } = e2;
      await this.isValidSessionOrPairingTopic(t2);
    }), c$3(this, "isValidEmit", async (e2) => {
      if (!ma(e2)) {
        const { message: o2 } = ht$2("MISSING_OR_INVALID", `emit() params: ${e2}`);
        throw new Error(o2);
      }
      const { topic: t2, event: s2, chainId: i2 } = e2;
      await this.isValidSessionTopic(t2);
      const { namespaces: r2 } = this.client.session.get(t2);
      if (!xa(r2, i2)) {
        const { message: o2 } = ht$2("MISSING_OR_INVALID", `emit() chainId: ${i2}`);
        throw new Error(o2);
      }
      if (!va(s2)) {
        const { message: o2 } = ht$2("MISSING_OR_INVALID", `emit() event: ${JSON.stringify(s2)}`);
        throw new Error(o2);
      }
      if (!Oa(r2, i2, s2.name)) {
        const { message: o2 } = ht$2("MISSING_OR_INVALID", `emit() event: ${JSON.stringify(s2)}`);
        throw new Error(o2);
      }
    }), c$3(this, "isValidDisconnect", async (e2) => {
      if (!ma(e2)) {
        const { message: s2 } = ht$2("MISSING_OR_INVALID", `disconnect() params: ${e2}`);
        throw new Error(s2);
      }
      const { topic: t2 } = e2;
      await this.isValidSessionOrPairingTopic(t2);
    }), c$3(this, "isValidAuthenticate", (e2) => {
      const { chains: t2, uri: s2, domain: i2, nonce: r2 } = e2;
      if (!Array.isArray(t2) || t2.length === 0) throw new Error("chains is required and must be a non-empty array");
      if (!nt$1(s2, false)) throw new Error("uri is required parameter");
      if (!nt$1(i2, false)) throw new Error("domain is required parameter");
      if (!nt$1(r2, false)) throw new Error("nonce is required parameter");
      if ([...new Set(t2.map((a2) => Ne$1(a2).namespace))].length > 1) throw new Error("Multi-namespace requests are not supported. Please request single namespace only.");
      const { namespace: o2 } = Ne$1(t2[0]);
      if (o2 !== "eip155") throw new Error("Only eip155 namespace is supported for authenticated sessions. Please use .connect() for non-eip155 chains.");
    }), c$3(this, "getVerifyContext", async (e2) => {
      const { attestationId: t2, hash: s2, encryptedId: i2, metadata: r2, transportType: o2 } = e2, a2 = { verified: { verifyUrl: r2.verifyUrl || ue$2, validation: "UNKNOWN", origin: r2.url || "" } };
      try {
        if (o2 === Q$1.link_mode) {
          const p2 = this.getAppLinkIfEnabled(r2, o2);
          return a2.verified.validation = p2 && new URL(p2).origin === new URL(r2.url).origin ? "VALID" : "INVALID", a2;
        }
        const l2 = await this.client.core.verify.resolve({ attestationId: t2, hash: s2, encryptedId: i2, verifyUrl: r2.verifyUrl });
        l2 && (a2.verified.origin = l2.origin, a2.verified.isScam = l2.isScam, a2.verified.validation = l2.origin === new URL(r2.url).origin ? "VALID" : "INVALID");
      } catch (l2) {
        this.client.logger.warn(l2);
      }
      return this.client.logger.debug(`Verify context: ${JSON.stringify(a2)}`), a2;
    }), c$3(this, "validateSessionProps", (e2, t2) => {
      Object.values(e2).forEach((s2, i2) => {
        if (s2 == null) {
          const { message: r2 } = ht$2("MISSING_OR_INVALID", `${t2} must contain an existing value for each key. Received: ${s2} for key ${Object.keys(e2)[i2]}`);
          throw new Error(r2);
        }
      });
    }), c$3(this, "getPendingAuthRequest", (e2) => {
      const t2 = this.client.auth.requests.get(e2);
      return typeof t2 == "object" ? t2 : void 0;
    }), c$3(this, "addToRecentlyDeleted", (e2, t2) => {
      if (this.recentlyDeletedMap.set(e2, t2), this.recentlyDeletedMap.size >= this.recentlyDeletedLimit) {
        let s2 = 0;
        const i2 = this.recentlyDeletedLimit / 2;
        for (const r2 of this.recentlyDeletedMap.keys()) {
          if (s2++ >= i2) break;
          this.recentlyDeletedMap.delete(r2);
        }
      }
    }), c$3(this, "checkRecentlyDeleted", (e2) => {
      const t2 = this.recentlyDeletedMap.get(e2);
      if (t2) {
        const { message: s2 } = ht$2("MISSING_OR_INVALID", `Record was recently deleted - ${t2}: ${e2}`);
        throw new Error(s2);
      }
    }), c$3(this, "isLinkModeEnabled", (e2, t2) => {
      var s2, i2, r2, o2, a2, l2, p2, h3, u2;
      return !e2 || t2 !== Q$1.link_mode ? false : ((i2 = (s2 = this.client.metadata) == null ? void 0 : s2.redirect) == null ? void 0 : i2.linkMode) === true && ((o2 = (r2 = this.client.metadata) == null ? void 0 : r2.redirect) == null ? void 0 : o2.universal) !== void 0 && ((l2 = (a2 = this.client.metadata) == null ? void 0 : a2.redirect) == null ? void 0 : l2.universal) !== "" && ((p2 = e2?.redirect) == null ? void 0 : p2.universal) !== void 0 && ((h3 = e2?.redirect) == null ? void 0 : h3.universal) !== "" && ((u2 = e2?.redirect) == null ? void 0 : u2.linkMode) === true && this.client.core.linkModeSupportedApps.includes(e2.redirect.universal) && typeof (global == null ? void 0 : global.Linking) < "u";
    }), c$3(this, "getAppLinkIfEnabled", (e2, t2) => {
      var s2;
      return this.isLinkModeEnabled(e2, t2) ? (s2 = e2?.redirect) == null ? void 0 : s2.universal : void 0;
    }), c$3(this, "handleLinkModeMessage", ({ url: e2 }) => {
      if (!e2 || !e2.includes("wc_ev") || !e2.includes("topic")) return;
      const t2 = Ai(e2, "topic") || "", s2 = decodeURIComponent(Ai(e2, "wc_ev") || ""), i2 = this.client.session.keys.includes(t2);
      i2 && this.client.session.update(t2, { transportType: Q$1.link_mode }), this.client.core.dispatchEnvelope({ topic: t2, message: s2, sessionExists: i2 });
    }), c$3(this, "registerLinkModeListeners", async () => {
      var e2;
      if (Ii() || pt$2() && (e2 = this.client.metadata.redirect) != null && e2.linkMode) {
        const t2 = global == null ? void 0 : global.Linking;
        if (typeof t2 < "u") {
          t2.addEventListener("url", this.handleLinkModeMessage, this.client.name);
          const s2 = await t2.getInitialURL();
          s2 && setTimeout(() => {
            this.handleLinkModeMessage({ url: s2 });
          }, 50);
        }
      }
    }), c$3(this, "shouldSetTVF", (e2, t2) => {
      if (!t2 || e2 !== "wc_sessionRequest") return false;
      const { request: s2 } = t2;
      return Object.keys(Ke$1).includes(s2.method);
    }), c$3(this, "getTVFParams", (e2, t2, s2) => {
      var i2, r2;
      try {
        const o2 = t2.request.method, a2 = this.extractTxHashesFromResult(o2, s2);
        return b$3(v$1({ correlationId: e2, rpcMethods: [o2], chainId: t2.chainId }, this.isValidContractData(t2.request.params) && { contractAddresses: [(r2 = (i2 = t2.request.params) == null ? void 0 : i2[0]) == null ? void 0 : r2.to] }), { txHashes: a2 });
      } catch (o2) {
        this.client.logger.warn("Error getting TVF params", o2);
      }
      return {};
    }), c$3(this, "isValidContractData", (e2) => {
      var t2;
      if (!e2) return false;
      try {
        const s2 = e2?.data || ((t2 = e2?.[0]) == null ? void 0 : t2.data);
        if (!s2.startsWith("0x")) return false;
        const i2 = s2.slice(2);
        return /^[0-9a-fA-F]*$/.test(i2) ? i2.length % 2 === 0 : false;
      } catch {
      }
      return false;
    }), c$3(this, "extractTxHashesFromResult", (e2, t2) => {
      try {
        const s2 = Ke$1[e2];
        if (typeof t2 == "string") return [t2];
        const i2 = t2[s2.key];
        if (se$1(i2)) return e2 === "solana_signAllTransactions" ? i2.map((r2) => Ji(r2)) : i2;
        if (typeof i2 == "string") return [i2];
      } catch (s2) {
        this.client.logger.warn("Error extracting tx hashes from result", s2);
      }
      return [];
    });
  }
  async processPendingMessageEvents() {
    try {
      const n3 = this.client.session.keys, e2 = this.client.core.relayer.messages.getWithoutAck(n3);
      for (const [t2, s2] of Object.entries(e2)) for (const i2 of s2) try {
        await this.onProviderMessageEvent({ topic: t2, message: i2, publishedAt: Date.now() });
      } catch {
        this.client.logger.warn(`Error processing pending message event for topic: ${t2}, message: ${i2}`);
      }
    } catch (n3) {
      this.client.logger.warn("processPendingMessageEvents failed", n3);
    }
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: n3 } = ht$2("NOT_INITIALIZED", this.name);
      throw new Error(n3);
    }
  }
  async confirmOnlineStateOrThrow() {
    await this.client.core.relayer.confirmOnlineStateOrThrow();
  }
  registerRelayerEvents() {
    this.client.core.relayer.on(C$2.message, (n3) => {
      this.onProviderMessageEvent(n3);
    });
  }
  async onRelayMessage(n3) {
    const { topic: e2, message: t2, attestation: s2, transportType: i2 } = n3, { publicKey: r2 } = this.client.auth.authKeys.keys.includes(ce$1) ? this.client.auth.authKeys.get(ce$1) : { publicKey: void 0 };
    try {
      const o2 = await this.client.core.crypto.decode(e2, t2, { receiverPublicKey: r2, encoding: i2 === Q$1.link_mode ? xe$1 : qt$1 });
      isJsonRpcRequest(o2) ? (this.client.core.history.set(e2, o2), await this.onRelayEventRequest({ topic: e2, payload: o2, attestation: s2, transportType: i2, encryptedId: kc(t2) })) : isJsonRpcResponse(o2) ? (await this.client.core.history.resolve(o2), await this.onRelayEventResponse({ topic: e2, payload: o2, transportType: i2 }), this.client.core.history.delete(e2, o2.id)) : await this.onRelayEventUnknownPayload({ topic: e2, payload: o2, transportType: i2 }), await this.client.core.relayer.messages.ack(e2, t2);
    } catch (o2) {
      this.client.logger.error(o2);
    }
  }
  registerExpirerEvents() {
    this.client.core.expirer.on(M$2.expired, async (n3) => {
      const { topic: e2, id: t2 } = bi(n3.target);
      if (t2 && this.client.pendingRequest.keys.includes(t2)) return await this.deletePendingSessionRequest(t2, ht$2("EXPIRED"), true);
      if (t2 && this.client.auth.requests.keys.includes(t2)) return await this.deletePendingAuthRequest(t2, ht$2("EXPIRED"), true);
      e2 ? this.client.session.keys.includes(e2) && (await this.deleteSession({ topic: e2, expirerHasDeleted: true }), this.client.events.emit("session_expire", { topic: e2 })) : t2 && (await this.deleteProposal(t2, true), this.client.events.emit("proposal_expire", { id: t2 }));
    });
  }
  registerPairingEvents() {
    this.client.core.pairing.events.on(re$2.create, (n3) => this.onPairingCreated(n3)), this.client.core.pairing.events.on(re$2.delete, (n3) => {
      this.addToRecentlyDeleted(n3.topic, "pairing");
    });
  }
  isValidPairingTopic(n3) {
    if (!nt$1(n3, false)) {
      const { message: e2 } = ht$2("MISSING_OR_INVALID", `pairing topic should be a string: ${n3}`);
      throw new Error(e2);
    }
    if (!this.client.core.pairing.pairings.keys.includes(n3)) {
      const { message: e2 } = ht$2("NO_MATCHING_KEY", `pairing topic doesn't exist: ${n3}`);
      throw new Error(e2);
    }
    if (vi2(this.client.core.pairing.pairings.get(n3).expiry)) {
      const { message: e2 } = ht$2("EXPIRED", `pairing topic: ${n3}`);
      throw new Error(e2);
    }
  }
  async isValidSessionTopic(n3) {
    if (!nt$1(n3, false)) {
      const { message: e2 } = ht$2("MISSING_OR_INVALID", `session topic should be a string: ${n3}`);
      throw new Error(e2);
    }
    if (this.checkRecentlyDeleted(n3), !this.client.session.keys.includes(n3)) {
      const { message: e2 } = ht$2("NO_MATCHING_KEY", `session topic doesn't exist: ${n3}`);
      throw new Error(e2);
    }
    if (vi2(this.client.session.get(n3).expiry)) {
      await this.deleteSession({ topic: n3 });
      const { message: e2 } = ht$2("EXPIRED", `session topic: ${n3}`);
      throw new Error(e2);
    }
    if (!this.client.core.crypto.keychain.has(n3)) {
      const { message: e2 } = ht$2("MISSING_OR_INVALID", `session topic does not exist in keychain: ${n3}`);
      throw await this.deleteSession({ topic: n3 }), new Error(e2);
    }
  }
  async isValidSessionOrPairingTopic(n3) {
    if (this.checkRecentlyDeleted(n3), this.client.session.keys.includes(n3)) await this.isValidSessionTopic(n3);
    else if (this.client.core.pairing.pairings.keys.includes(n3)) this.isValidPairingTopic(n3);
    else if (nt$1(n3, false)) {
      const { message: e2 } = ht$2("NO_MATCHING_KEY", `session or pairing topic doesn't exist: ${n3}`);
      throw new Error(e2);
    } else {
      const { message: e2 } = ht$2("MISSING_OR_INVALID", `session or pairing topic should be a string: ${n3}`);
      throw new Error(e2);
    }
  }
  async isValidProposalId(n3) {
    if (!ya(n3)) {
      const { message: e2 } = ht$2("MISSING_OR_INVALID", `proposal id should be a number: ${n3}`);
      throw new Error(e2);
    }
    if (!this.client.proposal.keys.includes(n3)) {
      const { message: e2 } = ht$2("NO_MATCHING_KEY", `proposal id doesn't exist: ${n3}`);
      throw new Error(e2);
    }
    if (vi2(this.client.proposal.get(n3).expiryTimestamp)) {
      await this.deleteProposal(n3);
      const { message: e2 } = ht$2("EXPIRED", `proposal id: ${n3}`);
      throw new Error(e2);
    }
  }
}
class Os extends zi$1 {
  constructor(n3, e2) {
    super(n3, e2, pt$1, we$1), this.core = n3, this.logger = e2;
  }
}
let St$1 = class St extends zi$1 {
  constructor(n3, e2) {
    super(n3, e2, ht$1, we$1), this.core = n3, this.logger = e2;
  }
};
class bs extends zi$1 {
  constructor(n3, e2) {
    super(n3, e2, ut$1, we$1, (t2) => t2.id), this.core = n3, this.logger = e2;
  }
}
class As extends zi$1 {
  constructor(n3, e2) {
    super(n3, e2, mt$1, ae$1, () => ce$1), this.core = n3, this.logger = e2;
  }
}
class xs extends zi$1 {
  constructor(n3, e2) {
    super(n3, e2, _t$1, ae$1), this.core = n3, this.logger = e2;
  }
}
class Cs extends zi$1 {
  constructor(n3, e2) {
    super(n3, e2, Et, ae$1, (t2) => t2.id), this.core = n3, this.logger = e2;
  }
}
var Vs = Object.defineProperty, Ds = (S3, n3, e2) => n3 in S3 ? Vs(S3, n3, { enumerable: true, configurable: true, writable: true, value: e2 }) : S3[n3] = e2, Ge$1 = (S3, n3, e2) => Ds(S3, typeof n3 != "symbol" ? n3 + "" : n3, e2);
class Ls {
  constructor(n3, e2) {
    this.core = n3, this.logger = e2, Ge$1(this, "authKeys"), Ge$1(this, "pairingTopics"), Ge$1(this, "requests"), this.authKeys = new As(this.core, this.logger), this.pairingTopics = new xs(this.core, this.logger), this.requests = new Cs(this.core, this.logger);
  }
  async init() {
    await this.authKeys.init(), await this.pairingTopics.init(), await this.requests.init();
  }
}
var ks = Object.defineProperty, Ms = (S3, n3, e2) => n3 in S3 ? ks(S3, n3, { enumerable: true, configurable: true, writable: true, value: e2 }) : S3[n3] = e2, E$2 = (S3, n3, e2) => Ms(S3, typeof n3 != "symbol" ? n3 + "" : n3, e2);
let Ee$1 = class Ee extends J$1 {
  constructor(n3) {
    super(n3), E$2(this, "protocol", De$1), E$2(this, "version", Le$1), E$2(this, "name", me$1.name), E$2(this, "metadata"), E$2(this, "core"), E$2(this, "logger"), E$2(this, "events", new eventsExports.EventEmitter()), E$2(this, "engine"), E$2(this, "session"), E$2(this, "proposal"), E$2(this, "pendingRequest"), E$2(this, "auth"), E$2(this, "signConfig"), E$2(this, "on", (t2, s2) => this.events.on(t2, s2)), E$2(this, "once", (t2, s2) => this.events.once(t2, s2)), E$2(this, "off", (t2, s2) => this.events.off(t2, s2)), E$2(this, "removeListener", (t2, s2) => this.events.removeListener(t2, s2)), E$2(this, "removeAllListeners", (t2) => this.events.removeAllListeners(t2)), E$2(this, "connect", async (t2) => {
      try {
        return await this.engine.connect(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "pair", async (t2) => {
      try {
        return await this.engine.pair(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "approve", async (t2) => {
      try {
        return await this.engine.approve(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "reject", async (t2) => {
      try {
        return await this.engine.reject(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "update", async (t2) => {
      try {
        return await this.engine.update(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "extend", async (t2) => {
      try {
        return await this.engine.extend(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "request", async (t2) => {
      try {
        return await this.engine.request(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "respond", async (t2) => {
      try {
        return await this.engine.respond(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "ping", async (t2) => {
      try {
        return await this.engine.ping(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "emit", async (t2) => {
      try {
        return await this.engine.emit(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "disconnect", async (t2) => {
      try {
        return await this.engine.disconnect(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "find", (t2) => {
      try {
        return this.engine.find(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "getPendingSessionRequests", () => {
      try {
        return this.engine.getPendingSessionRequests();
      } catch (t2) {
        throw this.logger.error(t2.message), t2;
      }
    }), E$2(this, "authenticate", async (t2, s2) => {
      try {
        return await this.engine.authenticate(t2, s2);
      } catch (i2) {
        throw this.logger.error(i2.message), i2;
      }
    }), E$2(this, "formatAuthMessage", (t2) => {
      try {
        return this.engine.formatAuthMessage(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "approveSessionAuthenticate", async (t2) => {
      try {
        return await this.engine.approveSessionAuthenticate(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), E$2(this, "rejectSessionAuthenticate", async (t2) => {
      try {
        return await this.engine.rejectSessionAuthenticate(t2);
      } catch (s2) {
        throw this.logger.error(s2.message), s2;
      }
    }), this.name = n3?.name || me$1.name, this.metadata = oi(n3?.metadata), this.signConfig = n3?.signConfig;
    const e2 = typeof n3?.logger < "u" && typeof n3?.logger != "string" ? n3.logger : Ot$3(k$4({ level: n3?.logger || me$1.logger }));
    this.core = n3?.core || new Xo$1(n3), this.logger = E$4(e2, this.name), this.session = new St$1(this.core, this.logger), this.proposal = new Os(this.core, this.logger), this.pendingRequest = new bs(this.core, this.logger), this.engine = new Ns(this), this.auth = new Ls(this.core, this.logger);
  }
  static async init(n3) {
    const e2 = new Ee(n3);
    return await e2.initialize(), e2;
  }
  get context() {
    return y$6(this.logger);
  }
  get pairing() {
    return this.core.pairing.pairings;
  }
  async initialize() {
    this.logger.trace("Initialized");
    try {
      await this.core.start(), await this.session.init(), await this.proposal.init(), await this.pendingRequest.init(), await this.auth.init(), await this.engine.init(), this.logger.info("SignClient Initialization Success"), setTimeout(() => {
        this.engine.processRelayMessageCache();
      }, cjsExports.toMiliseconds(cjsExports.ONE_SECOND));
    } catch (n3) {
      throw this.logger.info("SignClient Initialization Failure"), this.logger.error(n3.message), n3;
    }
  }
};
const et = "error", St2 = "wss://relay.walletconnect.org", Dt = "wc", qt = "universal_provider", U = `${Dt}@2:${qt}:`, st = "https://rpc.walletconnect.org/v1/", I$1 = "generic", jt = `${st}bundler`, u$2 = { DEFAULT_CHAIN_CHANGED: "default_chain_changed" };
function Rt() {
}
function k$1(s2) {
  return s2 == null || typeof s2 != "object" && typeof s2 != "function";
}
function W(s2) {
  return ArrayBuffer.isView(s2) && !(s2 instanceof DataView);
}
function _t(s2) {
  if (k$1(s2)) return s2;
  if (Array.isArray(s2) || W(s2) || s2 instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && s2 instanceof SharedArrayBuffer) return s2.slice(0);
  const t2 = Object.getPrototypeOf(s2), e2 = t2.constructor;
  if (s2 instanceof Date || s2 instanceof Map || s2 instanceof Set) return new e2(s2);
  if (s2 instanceof RegExp) {
    const i2 = new e2(s2);
    return i2.lastIndex = s2.lastIndex, i2;
  }
  if (s2 instanceof DataView) return new e2(s2.buffer.slice(0));
  if (s2 instanceof Error) {
    const i2 = new e2(s2.message);
    return i2.stack = s2.stack, i2.name = s2.name, i2.cause = s2.cause, i2;
  }
  if (typeof File < "u" && s2 instanceof File) return new e2([s2], s2.name, { type: s2.type, lastModified: s2.lastModified });
  if (typeof s2 == "object") {
    const i2 = Object.create(t2);
    return Object.assign(i2, s2);
  }
  return s2;
}
function it(s2) {
  return typeof s2 == "object" && s2 !== null;
}
function rt(s2) {
  return Object.getOwnPropertySymbols(s2).filter((t2) => Object.prototype.propertyIsEnumerable.call(s2, t2));
}
function nt(s2) {
  return s2 == null ? s2 === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(s2);
}
const Ut = "[object RegExp]", at = "[object String]", ct = "[object Number]", ot = "[object Boolean]", ht = "[object Arguments]", Ft = "[object Symbol]", Lt = "[object Date]", Mt = "[object Map]", xt = "[object Set]", Bt = "[object Array]", Gt = "[object ArrayBuffer]", Jt = "[object Object]", zt = "[object DataView]", kt = "[object Uint8Array]", Wt = "[object Uint8ClampedArray]", Kt = "[object Uint16Array]", Vt = "[object Uint32Array]", Xt = "[object Int8Array]", Yt = "[object Int16Array]", Qt = "[object Int32Array]", Zt = "[object Float32Array]", Tt = "[object Float64Array]";
function te(s2, t2) {
  return $$1(s2, void 0, s2, /* @__PURE__ */ new Map(), t2);
}
function $$1(s2, t2, e2, i2 = /* @__PURE__ */ new Map(), n3 = void 0) {
  const a2 = n3?.(s2, t2, e2, i2);
  if (a2 != null) return a2;
  if (k$1(s2)) return s2;
  if (i2.has(s2)) return i2.get(s2);
  if (Array.isArray(s2)) {
    const r2 = new Array(s2.length);
    i2.set(s2, r2);
    for (let c2 = 0; c2 < s2.length; c2++) r2[c2] = $$1(s2[c2], c2, e2, i2, n3);
    return Object.hasOwn(s2, "index") && (r2.index = s2.index), Object.hasOwn(s2, "input") && (r2.input = s2.input), r2;
  }
  if (s2 instanceof Date) return new Date(s2.getTime());
  if (s2 instanceof RegExp) {
    const r2 = new RegExp(s2.source, s2.flags);
    return r2.lastIndex = s2.lastIndex, r2;
  }
  if (s2 instanceof Map) {
    const r2 = /* @__PURE__ */ new Map();
    i2.set(s2, r2);
    for (const [c2, o2] of s2) r2.set(c2, $$1(o2, c2, e2, i2, n3));
    return r2;
  }
  if (s2 instanceof Set) {
    const r2 = /* @__PURE__ */ new Set();
    i2.set(s2, r2);
    for (const c2 of s2) r2.add($$1(c2, void 0, e2, i2, n3));
    return r2;
  }
  if (typeof Buffer < "u" && Buffer.isBuffer(s2)) return s2.subarray();
  if (W(s2)) {
    const r2 = new (Object.getPrototypeOf(s2)).constructor(s2.length);
    i2.set(s2, r2);
    for (let c2 = 0; c2 < s2.length; c2++) r2[c2] = $$1(s2[c2], c2, e2, i2, n3);
    return r2;
  }
  if (s2 instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && s2 instanceof SharedArrayBuffer) return s2.slice(0);
  if (s2 instanceof DataView) {
    const r2 = new DataView(s2.buffer.slice(0), s2.byteOffset, s2.byteLength);
    return i2.set(s2, r2), y$2(r2, s2, e2, i2, n3), r2;
  }
  if (typeof File < "u" && s2 instanceof File) {
    const r2 = new File([s2], s2.name, { type: s2.type });
    return i2.set(s2, r2), y$2(r2, s2, e2, i2, n3), r2;
  }
  if (s2 instanceof Blob) {
    const r2 = new Blob([s2], { type: s2.type });
    return i2.set(s2, r2), y$2(r2, s2, e2, i2, n3), r2;
  }
  if (s2 instanceof Error) {
    const r2 = new s2.constructor();
    return i2.set(s2, r2), r2.message = s2.message, r2.name = s2.name, r2.stack = s2.stack, r2.cause = s2.cause, y$2(r2, s2, e2, i2, n3), r2;
  }
  if (typeof s2 == "object" && ee(s2)) {
    const r2 = Object.create(Object.getPrototypeOf(s2));
    return i2.set(s2, r2), y$2(r2, s2, e2, i2, n3), r2;
  }
  return s2;
}
function y$2(s2, t2, e2 = s2, i2, n3) {
  const a2 = [...Object.keys(t2), ...rt(t2)];
  for (let r2 = 0; r2 < a2.length; r2++) {
    const c2 = a2[r2], o2 = Object.getOwnPropertyDescriptor(s2, c2);
    (o2 == null || o2.writable) && (s2[c2] = $$1(t2[c2], c2, e2, i2, n3));
  }
}
function ee(s2) {
  switch (nt(s2)) {
    case ht:
    case Bt:
    case Gt:
    case zt:
    case ot:
    case Lt:
    case Zt:
    case Tt:
    case Xt:
    case Yt:
    case Qt:
    case Mt:
    case ct:
    case Jt:
    case Ut:
    case xt:
    case at:
    case Ft:
    case kt:
    case Wt:
    case Kt:
    case Vt:
      return true;
    default:
      return false;
  }
}
function se(s2, t2) {
  return te(s2, (e2, i2, n3, a2) => {
    if (typeof s2 == "object") switch (Object.prototype.toString.call(s2)) {
      case ct:
      case at:
      case ot: {
        const c2 = new s2.constructor(s2?.valueOf());
        return y$2(c2, s2), c2;
      }
      case ht: {
        const c2 = {};
        return y$2(c2, s2), c2.length = s2.length, c2[Symbol.iterator] = s2[Symbol.iterator], c2;
      }
      default:
        return;
    }
  });
}
function pt(s2) {
  return se(s2);
}
function dt(s2) {
  return s2 !== null && typeof s2 == "object" && nt(s2) === "[object Arguments]";
}
function ie(s2) {
  return W(s2);
}
function re(s2) {
  if (typeof s2 != "object" || s2 == null) return false;
  if (Object.getPrototypeOf(s2) === null) return true;
  if (Object.prototype.toString.call(s2) !== "[object Object]") {
    const e2 = s2[Symbol.toStringTag];
    return e2 == null || !Object.getOwnPropertyDescriptor(s2, Symbol.toStringTag)?.writable ? false : s2.toString() === `[object ${e2}]`;
  }
  let t2 = s2;
  for (; Object.getPrototypeOf(t2) !== null; ) t2 = Object.getPrototypeOf(t2);
  return Object.getPrototypeOf(s2) === t2;
}
function ne(s2, ...t2) {
  const e2 = t2.slice(0, -1), i2 = t2[t2.length - 1];
  let n3 = s2;
  for (let a2 = 0; a2 < e2.length; a2++) {
    const r2 = e2[a2];
    n3 = F(n3, r2, i2, /* @__PURE__ */ new Map());
  }
  return n3;
}
function F(s2, t2, e2, i2) {
  if (k$1(s2) && (s2 = Object(s2)), t2 == null || typeof t2 != "object") return s2;
  if (i2.has(t2)) return _t(i2.get(t2));
  if (i2.set(t2, s2), Array.isArray(t2)) {
    t2 = t2.slice();
    for (let a2 = 0; a2 < t2.length; a2++) t2[a2] = t2[a2] ?? void 0;
  }
  const n3 = [...Object.keys(t2), ...rt(t2)];
  for (let a2 = 0; a2 < n3.length; a2++) {
    const r2 = n3[a2];
    let c2 = t2[r2], o2 = s2[r2];
    if (dt(c2) && (c2 = { ...c2 }), dt(o2) && (o2 = { ...o2 }), typeof Buffer < "u" && Buffer.isBuffer(c2) && (c2 = pt(c2)), Array.isArray(c2)) if (typeof o2 == "object" && o2 != null) {
      const w2 = [], v2 = Reflect.ownKeys(o2);
      for (let P3 = 0; P3 < v2.length; P3++) {
        const p2 = v2[P3];
        w2[p2] = o2[p2];
      }
      o2 = w2;
    } else o2 = [];
    const m3 = e2(o2, c2, r2, s2, t2, i2);
    m3 != null ? s2[r2] = m3 : Array.isArray(c2) || it(o2) && it(c2) ? s2[r2] = F(o2, c2, e2, i2) : o2 == null && re(c2) ? s2[r2] = F({}, c2, e2, i2) : o2 == null && ie(c2) ? s2[r2] = pt(c2) : (o2 === void 0 || c2 !== void 0) && (s2[r2] = c2);
  }
  return s2;
}
function ae(s2, ...t2) {
  return ne(s2, ...t2, Rt);
}
var ce = Object.defineProperty, oe = Object.defineProperties, he = Object.getOwnPropertyDescriptors, ut = Object.getOwnPropertySymbols, pe = Object.prototype.hasOwnProperty, de = Object.prototype.propertyIsEnumerable, lt = (s2, t2, e2) => t2 in s2 ? ce(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, L$1 = (s2, t2) => {
  for (var e2 in t2 || (t2 = {})) pe.call(t2, e2) && lt(s2, e2, t2[e2]);
  if (ut) for (var e2 of ut(t2)) de.call(t2, e2) && lt(s2, e2, t2[e2]);
  return s2;
}, ue = (s2, t2) => oe(s2, he(t2));
function d$2(s2, t2, e2) {
  var i2;
  const n3 = Ne$1(s2);
  return ((i2 = t2.rpcMap) == null ? void 0 : i2[n3.reference]) || `${st}?chainId=${n3.namespace}:${n3.reference}&projectId=${e2}`;
}
function b$2(s2) {
  return s2.includes(":") ? s2.split(":")[1] : s2;
}
function ft(s2) {
  return s2.map((t2) => `${t2.split(":")[0]}:${t2.split(":")[1]}`);
}
function le(s2, t2) {
  const e2 = Object.keys(t2.namespaces).filter((n3) => n3.includes(s2));
  if (!e2.length) return [];
  const i2 = [];
  return e2.forEach((n3) => {
    const a2 = t2.namespaces[n3].accounts;
    i2.push(...a2);
  }), i2;
}
function M$1(s2 = {}, t2 = {}) {
  const e2 = mt(s2), i2 = mt(t2);
  return ae(e2, i2);
}
function mt(s2) {
  var t2, e2, i2, n3, a2;
  const r2 = {};
  if (!Oe$1(s2)) return r2;
  for (const [c2, o2] of Object.entries(s2)) {
    const m3 = yn(c2) ? [c2] : o2.chains, w2 = o2.methods || [], v2 = o2.events || [], P3 = o2.rpcMap || {}, p2 = yo(c2);
    r2[p2] = ue(L$1(L$1({}, r2[p2]), o2), { chains: ot$1(m3, (t2 = r2[p2]) == null ? void 0 : t2.chains), methods: ot$1(w2, (e2 = r2[p2]) == null ? void 0 : e2.methods), events: ot$1(v2, (i2 = r2[p2]) == null ? void 0 : i2.events) }), (Oe$1(P3) || Oe$1(((n3 = r2[p2]) == null ? void 0 : n3.rpcMap) || {})) && (r2[p2].rpcMap = L$1(L$1({}, P3), (a2 = r2[p2]) == null ? void 0 : a2.rpcMap));
  }
  return r2;
}
function vt(s2) {
  return s2.includes(":") ? s2.split(":")[2] : s2;
}
function gt(s2) {
  const t2 = {};
  for (const [e2, i2] of Object.entries(s2)) {
    const n3 = i2.methods || [], a2 = i2.events || [], r2 = i2.accounts || [], c2 = yn(e2) ? [e2] : i2.chains ? i2.chains : ft(i2.accounts);
    t2[e2] = { chains: c2, methods: n3, events: a2, accounts: r2 };
  }
  return t2;
}
function K(s2) {
  return typeof s2 == "number" ? s2 : s2.includes("0x") ? parseInt(s2, 16) : (s2 = s2.includes(":") ? s2.split(":")[1] : s2, isNaN(Number(s2)) ? s2 : Number(s2));
}
const Pt = {}, h$2 = (s2) => Pt[s2], V$1 = (s2, t2) => {
  Pt[s2] = t2;
};
var fe = Object.defineProperty, me = (s2, t2, e2) => t2 in s2 ? fe(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, O2 = (s2, t2, e2) => me(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class ve {
  constructor(t2) {
    O2(this, "name", "polkadot"), O2(this, "client"), O2(this, "httpProviders"), O2(this, "events"), O2(this, "namespace"), O2(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(t2, e2), this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${t2}`);
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]) || [] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      const n3 = b$2(e2);
      t2[n3] = this.createHttpProvider(n3, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace, this.client.core.projectId);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var ge = Object.defineProperty, Pe = Object.defineProperties, we = Object.getOwnPropertyDescriptors, wt = Object.getOwnPropertySymbols, ye = Object.prototype.hasOwnProperty, be = Object.prototype.propertyIsEnumerable, X = (s2, t2, e2) => t2 in s2 ? ge(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, yt = (s2, t2) => {
  for (var e2 in t2 || (t2 = {})) ye.call(t2, e2) && X(s2, e2, t2[e2]);
  if (wt) for (var e2 of wt(t2)) be.call(t2, e2) && X(s2, e2, t2[e2]);
  return s2;
}, bt = (s2, t2) => Pe(s2, we(t2)), A$1 = (s2, t2, e2) => X(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class Ie {
  constructor(t2) {
    A$1(this, "name", "eip155"), A$1(this, "client"), A$1(this, "chainId"), A$1(this, "namespace"), A$1(this, "httpProviders"), A$1(this, "events"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.httpProviders = this.createHttpProviders(), this.chainId = parseInt(this.getDefaultChain());
  }
  async request(t2) {
    switch (t2.request.method) {
      case "eth_requestAccounts":
        return this.getAccounts();
      case "eth_accounts":
        return this.getAccounts();
      case "wallet_switchEthereumChain":
        return await this.handleSwitchChain(t2);
      case "eth_chainId":
        return parseInt(this.getDefaultChain());
      case "wallet_getCapabilities":
        return await this.getCapabilities(t2);
      case "wallet_getCallsStatus":
        return await this.getCallStatus(t2);
    }
    return this.namespace.methods.includes(t2.request.method) ? await this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(parseInt(t2), e2), this.chainId = parseInt(t2), this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${t2}`);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId.toString();
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(`${this.name}:${t2}`, this.namespace, this.client.core.projectId);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      const n3 = parseInt(b$2(e2));
      t2[n3] = this.createHttpProvider(n3, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  getHttpProvider() {
    const t2 = this.chainId, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  async handleSwitchChain(t2) {
    var e2, i2;
    let n3 = t2.request.params ? (e2 = t2.request.params[0]) == null ? void 0 : e2.chainId : "0x0";
    n3 = n3.startsWith("0x") ? n3 : `0x${n3}`;
    const a2 = parseInt(n3, 16);
    if (this.isChainApproved(a2)) this.setDefaultChain(`${a2}`);
    else if (this.namespace.methods.includes("wallet_switchEthereumChain")) await this.client.request({ topic: t2.topic, request: { method: t2.request.method, params: [{ chainId: n3 }] }, chainId: (i2 = this.namespace.chains) == null ? void 0 : i2[0] }), this.setDefaultChain(`${a2}`);
    else throw new Error(`Failed to switch to chain 'eip155:${a2}'. The chain is not approved or the wallet does not support 'wallet_switchEthereumChain' method.`);
    return null;
  }
  isChainApproved(t2) {
    return this.namespace.chains.includes(`${this.name}:${t2}`);
  }
  async getCapabilities(t2) {
    var e2, i2, n3, a2, r2;
    const c2 = (i2 = (e2 = t2.request) == null ? void 0 : e2.params) == null ? void 0 : i2[0], o2 = ((a2 = (n3 = t2.request) == null ? void 0 : n3.params) == null ? void 0 : a2[1]) || [], m3 = `${c2}${o2.join(",")}`;
    if (!c2) throw new Error("Missing address parameter in `wallet_getCapabilities` request");
    const w2 = this.client.session.get(t2.topic), v2 = ((r2 = w2?.sessionProperties) == null ? void 0 : r2.capabilities) || {};
    if (v2 != null && v2[m3]) return v2?.[m3];
    const P3 = await this.client.request(t2);
    try {
      await this.client.session.update(t2.topic, { sessionProperties: bt(yt({}, w2.sessionProperties || {}), { capabilities: bt(yt({}, v2 || {}), { [m3]: P3 }) }) });
    } catch (p2) {
      console.warn("Failed to update session with capabilities", p2);
    }
    return P3;
  }
  async getCallStatus(t2) {
    var e2, i2;
    const n3 = this.client.session.get(t2.topic), a2 = (e2 = n3.sessionProperties) == null ? void 0 : e2.bundler_name;
    if (a2) {
      const c2 = this.getBundlerUrl(t2.chainId, a2);
      try {
        return await this.getUserOperationReceipt(c2, t2);
      } catch (o2) {
        console.warn("Failed to fetch call status from bundler", o2, c2);
      }
    }
    const r2 = (i2 = n3.sessionProperties) == null ? void 0 : i2.bundler_url;
    if (r2) try {
      return await this.getUserOperationReceipt(r2, t2);
    } catch (c2) {
      console.warn("Failed to fetch call status from custom bundler", c2, r2);
    }
    if (this.namespace.methods.includes(t2.request.method)) return await this.client.request(t2);
    throw new Error("Fetching call status not approved by the wallet.");
  }
  async getUserOperationReceipt(t2, e2) {
    var i2;
    const n3 = new URL(t2), a2 = await fetch(n3, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formatJsonRpcRequest("eth_getUserOperationReceipt", [(i2 = e2.request.params) == null ? void 0 : i2[0]])) });
    if (!a2.ok) throw new Error(`Failed to fetch user operation receipt - ${a2.status}`);
    return await a2.json();
  }
  getBundlerUrl(t2, e2) {
    return `${jt}?projectId=${this.client.core.projectId}&chainId=${t2}&bundler=${e2}`;
  }
}
var $e = Object.defineProperty, Oe = (s2, t2, e2) => t2 in s2 ? $e(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, C$1 = (s2, t2, e2) => Oe(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class Ae {
  constructor(t2) {
    C$1(this, "name", "solana"), C$1(this, "client"), C$1(this, "httpProviders"), C$1(this, "events"), C$1(this, "namespace"), C$1(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(t2, e2), this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${t2}`);
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      const n3 = b$2(e2);
      t2[n3] = this.createHttpProvider(n3, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace, this.client.core.projectId);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var Ce = Object.defineProperty, He = (s2, t2, e2) => t2 in s2 ? Ce(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, H$1 = (s2, t2, e2) => He(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class Ee2 {
  constructor(t2) {
    H$1(this, "name", "cosmos"), H$1(this, "client"), H$1(this, "httpProviders"), H$1(this, "events"), H$1(this, "namespace"), H$1(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(t2, e2), this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${this.chainId}`);
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      const n3 = b$2(e2);
      t2[n3] = this.createHttpProvider(n3, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace, this.client.core.projectId);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var Ne = Object.defineProperty, Se = (s2, t2, e2) => t2 in s2 ? Ne(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, E$1 = (s2, t2, e2) => Se(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class De {
  constructor(t2) {
    E$1(this, "name", "algorand"), E$1(this, "client"), E$1(this, "httpProviders"), E$1(this, "events"), E$1(this, "namespace"), E$1(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    if (!this.httpProviders[t2]) {
      const i2 = e2 || d$2(`${this.name}:${t2}`, this.namespace, this.client.core.projectId);
      if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
      this.setHttpProvider(t2, i2);
    }
    this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${this.chainId}`);
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      t2[e2] = this.createHttpProvider(e2, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace, this.client.core.projectId);
    return typeof i2 > "u" ? void 0 : new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var qe = Object.defineProperty, je = (s2, t2, e2) => t2 in s2 ? qe(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, N$1 = (s2, t2, e2) => je(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class Re {
  constructor(t2) {
    N$1(this, "name", "cip34"), N$1(this, "client"), N$1(this, "httpProviders"), N$1(this, "events"), N$1(this, "namespace"), N$1(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(t2, e2), this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${this.chainId}`);
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      const i2 = this.getCardanoRPCUrl(e2), n3 = b$2(e2);
      t2[n3] = this.createHttpProvider(n3, i2);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  getCardanoRPCUrl(t2) {
    const e2 = this.namespace.rpcMap;
    if (e2) return e2[t2];
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || this.getCardanoRPCUrl(t2);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var _e = Object.defineProperty, Ue = (s2, t2, e2) => t2 in s2 ? _e(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, S$2 = (s2, t2, e2) => Ue(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class Fe {
  constructor(t2) {
    S$2(this, "name", "elrond"), S$2(this, "client"), S$2(this, "httpProviders"), S$2(this, "events"), S$2(this, "namespace"), S$2(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(t2, e2), this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${t2}`);
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      const n3 = b$2(e2);
      t2[n3] = this.createHttpProvider(n3, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace, this.client.core.projectId);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var Le = Object.defineProperty, Me = (s2, t2, e2) => t2 in s2 ? Le(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, D$1 = (s2, t2, e2) => Me(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class xe {
  constructor(t2) {
    D$1(this, "name", "multiversx"), D$1(this, "client"), D$1(this, "httpProviders"), D$1(this, "events"), D$1(this, "namespace"), D$1(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(t2, e2), this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${t2}`);
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      const n3 = b$2(e2);
      t2[n3] = this.createHttpProvider(n3, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace, this.client.core.projectId);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var Be = Object.defineProperty, Ge = (s2, t2, e2) => t2 in s2 ? Be(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, q = (s2, t2, e2) => Ge(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class Je {
  constructor(t2) {
    q(this, "name", "near"), q(this, "client"), q(this, "httpProviders"), q(this, "events"), q(this, "namespace"), q(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    if (this.chainId = t2, !this.httpProviders[t2]) {
      const i2 = e2 || d$2(`${this.name}:${t2}`, this.namespace);
      if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
      this.setHttpProvider(t2, i2);
    }
    this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${this.chainId}`);
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]) || [] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      var i2;
      t2[e2] = this.createHttpProvider(e2, (i2 = this.namespace.rpcMap) == null ? void 0 : i2[e2]);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace);
    return typeof i2 > "u" ? void 0 : new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var ze = Object.defineProperty, ke3 = (s2, t2, e2) => t2 in s2 ? ze(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, j = (s2, t2, e2) => ke3(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class We {
  constructor(t2) {
    j(this, "name", "tezos"), j(this, "client"), j(this, "httpProviders"), j(this, "events"), j(this, "namespace"), j(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace = Object.assign(this.namespace, t2);
  }
  requestAccounts() {
    return this.getAccounts();
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider().request(t2.request);
  }
  setDefaultChain(t2, e2) {
    if (this.chainId = t2, !this.httpProviders[t2]) {
      const i2 = e2 || d$2(`${this.name}:${t2}`, this.namespace);
      if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
      this.setHttpProvider(t2, i2);
    }
    this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${this.chainId}`);
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]) || [] : [];
  }
  createHttpProviders() {
    const t2 = {};
    return this.namespace.chains.forEach((e2) => {
      t2[e2] = this.createHttpProvider(e2);
    }), t2;
  }
  getHttpProvider() {
    const t2 = `${this.name}:${this.chainId}`, e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace);
    return typeof i2 > "u" ? void 0 : new o$4(new f$5(i2));
  }
}
var Ke = Object.defineProperty, Ve = (s2, t2, e2) => t2 in s2 ? Ke(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, R$1 = (s2, t2, e2) => Ve(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
class Xe {
  constructor(t2) {
    R$1(this, "name", I$1), R$1(this, "client"), R$1(this, "httpProviders"), R$1(this, "events"), R$1(this, "namespace"), R$1(this, "chainId"), this.namespace = t2.namespace, this.events = h$2("events"), this.client = h$2("client"), this.chainId = this.getDefaultChain(), this.httpProviders = this.createHttpProviders();
  }
  updateNamespace(t2) {
    this.namespace.chains = [...new Set((this.namespace.chains || []).concat(t2.chains || []))], this.namespace.accounts = [...new Set((this.namespace.accounts || []).concat(t2.accounts || []))], this.namespace.methods = [...new Set((this.namespace.methods || []).concat(t2.methods || []))], this.namespace.events = [...new Set((this.namespace.events || []).concat(t2.events || []))], this.httpProviders = this.createHttpProviders();
  }
  requestAccounts() {
    return this.getAccounts();
  }
  request(t2) {
    return this.namespace.methods.includes(t2.request.method) ? this.client.request(t2) : this.getHttpProvider(t2.chainId).request(t2.request);
  }
  setDefaultChain(t2, e2) {
    this.httpProviders[t2] || this.setHttpProvider(t2, e2), this.chainId = t2, this.events.emit(u$2.DEFAULT_CHAIN_CHANGED, `${this.name}:${t2}`);
  }
  getDefaultChain() {
    if (this.chainId) return this.chainId;
    if (this.namespace.defaultChain) return this.namespace.defaultChain;
    const t2 = this.namespace.chains[0];
    if (!t2) throw new Error("ChainId not found");
    return t2.split(":")[1];
  }
  getAccounts() {
    const t2 = this.namespace.accounts;
    return t2 ? [...new Set(t2.filter((e2) => e2.split(":")[1] === this.chainId.toString()).map((e2) => e2.split(":")[2]))] : [];
  }
  createHttpProviders() {
    var t2, e2;
    const i2 = {};
    return (e2 = (t2 = this.namespace) == null ? void 0 : t2.accounts) == null || e2.forEach((n3) => {
      const a2 = Ne$1(n3);
      i2[`${a2.namespace}:${a2.reference}`] = this.createHttpProvider(n3);
    }), i2;
  }
  getHttpProvider(t2) {
    const e2 = this.httpProviders[t2];
    if (typeof e2 > "u") throw new Error(`JSON-RPC provider for ${t2} not found`);
    return e2;
  }
  setHttpProvider(t2, e2) {
    const i2 = this.createHttpProvider(t2, e2);
    i2 && (this.httpProviders[t2] = i2);
  }
  createHttpProvider(t2, e2) {
    const i2 = e2 || d$2(t2, this.namespace, this.client.core.projectId);
    if (!i2) throw new Error(`No RPC url provided for chainId: ${t2}`);
    return new o$4(new f$5(i2, h$2("disableProviderPing")));
  }
}
var Ye = Object.defineProperty, Qe = Object.defineProperties, Ze = Object.getOwnPropertyDescriptors, It = Object.getOwnPropertySymbols, Te2 = Object.prototype.hasOwnProperty, ts = Object.prototype.propertyIsEnumerable, Y = (s2, t2, e2) => t2 in s2 ? Ye(s2, t2, { enumerable: true, configurable: true, writable: true, value: e2 }) : s2[t2] = e2, x$1 = (s2, t2) => {
  for (var e2 in t2 || (t2 = {})) Te2.call(t2, e2) && Y(s2, e2, t2[e2]);
  if (It) for (var e2 of It(t2)) ts.call(t2, e2) && Y(s2, e2, t2[e2]);
  return s2;
}, Q = (s2, t2) => Qe(s2, Ze(t2)), l$2 = (s2, t2, e2) => Y(s2, typeof t2 != "symbol" ? t2 + "" : t2, e2);
let B$1 = class B {
  constructor(t2) {
    l$2(this, "client"), l$2(this, "namespaces"), l$2(this, "optionalNamespaces"), l$2(this, "sessionProperties"), l$2(this, "scopedProperties"), l$2(this, "events", new Nt$3()), l$2(this, "rpcProviders", {}), l$2(this, "session"), l$2(this, "providerOpts"), l$2(this, "logger"), l$2(this, "uri"), l$2(this, "disableProviderPing", false), this.providerOpts = t2, this.logger = typeof t2?.logger < "u" && typeof t2?.logger != "string" ? t2.logger : Ot$3(k$4({ level: t2?.logger || et })), this.disableProviderPing = t2?.disableProviderPing || false;
  }
  static async init(t2) {
    const e2 = new B(t2);
    return await e2.initialize(), e2;
  }
  async request(t2, e2, i2) {
    const [n3, a2] = this.validateChain(e2);
    if (!this.session) throw new Error("Please call connect() before request()");
    return await this.getProvider(n3).request({ request: x$1({}, t2), chainId: `${n3}:${a2}`, topic: this.session.topic, expiry: i2 });
  }
  sendAsync(t2, e2, i2, n3) {
    const a2 = (/* @__PURE__ */ new Date()).getTime();
    this.request(t2, i2, n3).then((r2) => e2(null, formatJsonRpcResult(a2, r2))).catch((r2) => e2(r2, void 0));
  }
  async enable() {
    if (!this.client) throw new Error("Sign Client not initialized");
    return this.session || await this.connect({ namespaces: this.namespaces, optionalNamespaces: this.optionalNamespaces, sessionProperties: this.sessionProperties, scopedProperties: this.scopedProperties }), await this.requestAccounts();
  }
  async disconnect() {
    var t2;
    if (!this.session) throw new Error("Please call connect() before enable()");
    await this.client.disconnect({ topic: (t2 = this.session) == null ? void 0 : t2.topic, reason: Nt("USER_DISCONNECTED") }), await this.cleanup();
  }
  async connect(t2) {
    if (!this.client) throw new Error("Sign Client not initialized");
    if (this.setNamespaces(t2), await this.cleanupPendingPairings(), !t2.skipPairing) return await this.pair(t2.pairingTopic);
  }
  async authenticate(t2, e2) {
    if (!this.client) throw new Error("Sign Client not initialized");
    this.setNamespaces(t2), await this.cleanupPendingPairings();
    const { uri: i2, response: n3 } = await this.client.authenticate(t2, e2);
    i2 && (this.uri = i2, this.events.emit("display_uri", i2));
    const a2 = await n3();
    if (this.session = a2.session, this.session) {
      const r2 = gt(this.session.namespaces);
      this.namespaces = M$1(this.namespaces, r2), await this.persist("namespaces", this.namespaces), this.onConnect();
    }
    return a2;
  }
  on(t2, e2) {
    this.events.on(t2, e2);
  }
  once(t2, e2) {
    this.events.once(t2, e2);
  }
  removeListener(t2, e2) {
    this.events.removeListener(t2, e2);
  }
  off(t2, e2) {
    this.events.off(t2, e2);
  }
  get isWalletConnect() {
    return true;
  }
  async pair(t2) {
    const { uri: e2, approval: i2 } = await this.client.connect({ pairingTopic: t2, requiredNamespaces: this.namespaces, optionalNamespaces: this.optionalNamespaces, sessionProperties: this.sessionProperties, scopedProperties: this.scopedProperties });
    e2 && (this.uri = e2, this.events.emit("display_uri", e2));
    const n3 = await i2();
    this.session = n3;
    const a2 = gt(n3.namespaces);
    return this.namespaces = M$1(this.namespaces, a2), await this.persist("namespaces", this.namespaces), await this.persist("optionalNamespaces", this.optionalNamespaces), this.onConnect(), this.session;
  }
  setDefaultChain(t2, e2) {
    try {
      if (!this.session) return;
      const [i2, n3] = this.validateChain(t2), a2 = this.getProvider(i2);
      a2.name === I$1 ? a2.setDefaultChain(`${i2}:${n3}`, e2) : a2.setDefaultChain(n3, e2);
    } catch (i2) {
      if (!/Please call connect/.test(i2.message)) throw i2;
    }
  }
  async cleanupPendingPairings(t2 = {}) {
    this.logger.info("Cleaning up inactive pairings...");
    const e2 = this.client.pairing.getAll();
    if (se$1(e2)) {
      for (const i2 of e2) t2.deletePairings ? this.client.core.expirer.set(i2.topic, 0) : await this.client.core.relayer.subscriber.unsubscribe(i2.topic);
      this.logger.info(`Inactive pairings cleared: ${e2.length}`);
    }
  }
  abortPairingAttempt() {
    this.logger.warn("abortPairingAttempt is deprecated. This is now a no-op.");
  }
  async checkStorage() {
    this.namespaces = await this.getFromStore("namespaces") || {}, this.optionalNamespaces = await this.getFromStore("optionalNamespaces") || {}, this.session && this.createProviders();
  }
  async initialize() {
    this.logger.trace("Initialized"), await this.createClient(), await this.checkStorage(), this.registerEventListeners();
  }
  async createClient() {
    var t2, e2;
    if (this.client = this.providerOpts.client || await Ee$1.init({ core: this.providerOpts.core, logger: this.providerOpts.logger || et, relayUrl: this.providerOpts.relayUrl || St2, projectId: this.providerOpts.projectId, metadata: this.providerOpts.metadata, storageOptions: this.providerOpts.storageOptions, storage: this.providerOpts.storage, name: this.providerOpts.name, customStoragePrefix: this.providerOpts.customStoragePrefix, telemetryEnabled: this.providerOpts.telemetryEnabled }), this.providerOpts.session) try {
      this.session = this.client.session.get(this.providerOpts.session.topic);
    } catch (i2) {
      throw this.logger.error("Failed to get session", i2), new Error(`The provided session: ${(e2 = (t2 = this.providerOpts) == null ? void 0 : t2.session) == null ? void 0 : e2.topic} doesn't exist in the Sign client`);
    }
    else {
      const i2 = this.client.session.getAll();
      this.session = i2[0];
    }
    this.logger.trace("SignClient Initialized");
  }
  createProviders() {
    if (!this.client) throw new Error("Sign Client not initialized");
    if (!this.session) throw new Error("Session not initialized. Please call connect() before enable()");
    const t2 = [...new Set(Object.keys(this.session.namespaces).map((e2) => yo(e2)))];
    V$1("client", this.client), V$1("events", this.events), V$1("disableProviderPing", this.disableProviderPing), t2.forEach((e2) => {
      if (!this.session) return;
      const i2 = le(e2, this.session), n3 = ft(i2), a2 = M$1(this.namespaces, this.optionalNamespaces), r2 = Q(x$1({}, a2[e2]), { accounts: i2, chains: n3 });
      switch (e2) {
        case "eip155":
          this.rpcProviders[e2] = new Ie({ namespace: r2 });
          break;
        case "algorand":
          this.rpcProviders[e2] = new De({ namespace: r2 });
          break;
        case "solana":
          this.rpcProviders[e2] = new Ae({ namespace: r2 });
          break;
        case "cosmos":
          this.rpcProviders[e2] = new Ee2({ namespace: r2 });
          break;
        case "polkadot":
          this.rpcProviders[e2] = new ve({ namespace: r2 });
          break;
        case "cip34":
          this.rpcProviders[e2] = new Re({ namespace: r2 });
          break;
        case "elrond":
          this.rpcProviders[e2] = new Fe({ namespace: r2 });
          break;
        case "multiversx":
          this.rpcProviders[e2] = new xe({ namespace: r2 });
          break;
        case "near":
          this.rpcProviders[e2] = new Je({ namespace: r2 });
          break;
        case "tezos":
          this.rpcProviders[e2] = new We({ namespace: r2 });
          break;
        default:
          this.rpcProviders[I$1] ? this.rpcProviders[I$1].updateNamespace(r2) : this.rpcProviders[I$1] = new Xe({ namespace: r2 });
      }
    });
  }
  registerEventListeners() {
    if (typeof this.client > "u") throw new Error("Sign Client is not initialized");
    this.client.on("session_ping", (t2) => {
      var e2;
      const { topic: i2 } = t2;
      i2 === ((e2 = this.session) == null ? void 0 : e2.topic) && this.events.emit("session_ping", t2);
    }), this.client.on("session_event", (t2) => {
      var e2;
      const { params: i2, topic: n3 } = t2;
      if (n3 !== ((e2 = this.session) == null ? void 0 : e2.topic)) return;
      const { event: a2 } = i2;
      if (a2.name === "accountsChanged") {
        const r2 = a2.data;
        r2 && se$1(r2) && this.events.emit("accountsChanged", r2.map(vt));
      } else if (a2.name === "chainChanged") {
        const r2 = i2.chainId, c2 = i2.event.data, o2 = yo(r2), m3 = K(r2) !== K(c2) ? `${o2}:${K(c2)}` : r2;
        this.onChainChanged(m3);
      } else this.events.emit(a2.name, a2.data);
      this.events.emit("session_event", t2);
    }), this.client.on("session_update", ({ topic: t2, params: e2 }) => {
      var i2, n3;
      if (t2 !== ((i2 = this.session) == null ? void 0 : i2.topic)) return;
      const { namespaces: a2 } = e2, r2 = (n3 = this.client) == null ? void 0 : n3.session.get(t2);
      this.session = Q(x$1({}, r2), { namespaces: a2 }), this.onSessionUpdate(), this.events.emit("session_update", { topic: t2, params: e2 });
    }), this.client.on("session_delete", async (t2) => {
      var e2;
      t2.topic === ((e2 = this.session) == null ? void 0 : e2.topic) && (await this.cleanup(), this.events.emit("session_delete", t2), this.events.emit("disconnect", Q(x$1({}, Nt("USER_DISCONNECTED")), { data: t2.topic })));
    }), this.on(u$2.DEFAULT_CHAIN_CHANGED, (t2) => {
      this.onChainChanged(t2, true);
    });
  }
  getProvider(t2) {
    return this.rpcProviders[t2] || this.rpcProviders[I$1];
  }
  onSessionUpdate() {
    Object.keys(this.rpcProviders).forEach((t2) => {
      var e2;
      this.getProvider(t2).updateNamespace((e2 = this.session) == null ? void 0 : e2.namespaces[t2]);
    });
  }
  setNamespaces(t2) {
    const { namespaces: e2 = {}, optionalNamespaces: i2 = {}, sessionProperties: n3, scopedProperties: a2 } = t2;
    this.optionalNamespaces = M$1(e2, i2), this.sessionProperties = n3, this.scopedProperties = a2;
  }
  validateChain(t2) {
    const [e2, i2] = t2?.split(":") || ["", ""];
    if (!this.namespaces || !Object.keys(this.namespaces).length) return [e2, i2];
    if (e2 && !Object.keys(this.namespaces || {}).map((r2) => yo(r2)).includes(e2)) throw new Error(`Namespace '${e2}' is not configured. Please call connect() first with namespace config.`);
    if (e2 && i2) return [e2, i2];
    const n3 = yo(Object.keys(this.namespaces)[0]), a2 = this.rpcProviders[n3].getDefaultChain();
    return [n3, a2];
  }
  async requestAccounts() {
    const [t2] = this.validateChain();
    return await this.getProvider(t2).requestAccounts();
  }
  async onChainChanged(t2, e2 = false) {
    if (!this.namespaces) return;
    const [i2, n3] = this.validateChain(t2);
    if (!n3) return;
    this.updateNamespaceChain(i2, n3), this.events.emit("chainChanged", n3);
    const a2 = this.getProvider(i2).getDefaultChain();
    e2 || this.getProvider(i2).setDefaultChain(n3), this.emitAccountsChangedOnChainChange({ namespace: i2, previousChainId: a2, newChainId: t2 }), await this.persist("namespaces", this.namespaces);
  }
  emitAccountsChangedOnChainChange({ namespace: t2, previousChainId: e2, newChainId: i2 }) {
    var n3, a2;
    try {
      if (e2 === i2) return;
      const r2 = (a2 = (n3 = this.session) == null ? void 0 : n3.namespaces[t2]) == null ? void 0 : a2.accounts;
      if (!r2) return;
      const c2 = r2.filter((o2) => o2.includes(`${i2}:`)).map(vt);
      if (!se$1(c2)) return;
      this.events.emit("accountsChanged", c2);
    } catch (r2) {
      this.logger.warn("Failed to emit accountsChanged on chain change", r2);
    }
  }
  updateNamespaceChain(t2, e2) {
    if (!this.namespaces) return;
    const i2 = this.namespaces[t2] ? t2 : `${t2}:${e2}`, n3 = { chains: [], methods: [], events: [], defaultChain: e2 };
    this.namespaces[i2] ? this.namespaces[i2] && (this.namespaces[i2].defaultChain = e2) : this.namespaces[i2] = n3;
  }
  onConnect() {
    this.createProviders(), this.events.emit("connect", { session: this.session });
  }
  async cleanup() {
    this.namespaces = void 0, this.optionalNamespaces = void 0, this.sessionProperties = void 0, await this.deleteFromStore("namespaces"), await this.deleteFromStore("optionalNamespaces"), await this.deleteFromStore("sessionProperties"), this.session = void 0, await this.cleanupPendingPairings({ deletePairings: true }), await this.cleanupStorage();
  }
  async persist(t2, e2) {
    var i2;
    const n3 = ((i2 = this.session) == null ? void 0 : i2.topic) || "";
    await this.client.core.storage.setItem(`${U}/${t2}${n3}`, e2);
  }
  async getFromStore(t2) {
    var e2;
    const i2 = ((e2 = this.session) == null ? void 0 : e2.topic) || "";
    return await this.client.core.storage.getItem(`${U}/${t2}${i2}`);
  }
  async deleteFromStore(t2) {
    var e2;
    const i2 = ((e2 = this.session) == null ? void 0 : e2.topic) || "";
    await this.client.core.storage.removeItem(`${U}/${t2}${i2}`);
  }
  async cleanupStorage() {
    var t2;
    try {
      if (((t2 = this.client) == null ? void 0 : t2.session.length) > 0) return;
      const e2 = await this.client.core.storage.getKeys();
      for (const i2 of e2) i2.startsWith(U) && await this.client.core.storage.removeItem(i2);
    } catch (e2) {
      this.logger.warn("Failed to cleanup storage", e2);
    }
  }
};
function checkNamespaceConnectorId(namespace, connectorId) {
  return ConnectorController.getConnectorId(namespace) === connectorId;
}
function getChainsToDisconnect(namespace) {
  const namespaces = Array.from(ChainController.state.chains.keys());
  let chains = [];
  if (namespace) {
    chains.push([namespace, ChainController.state.chains.get(namespace)]);
    if (checkNamespaceConnectorId(namespace, ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT)) {
      namespaces.forEach((ns2) => {
        if (ns2 !== namespace && checkNamespaceConnectorId(ns2, ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT)) {
          chains.push([ns2, ChainController.state.chains.get(ns2)]);
        }
      });
    } else if (checkNamespaceConnectorId(namespace, ConstantsUtil$3.CONNECTOR_ID.AUTH)) {
      namespaces.forEach((ns2) => {
        if (ns2 !== namespace && checkNamespaceConnectorId(ns2, ConstantsUtil$3.CONNECTOR_ID.AUTH)) {
          chains.push([ns2, ChainController.state.chains.get(ns2)]);
        }
      });
    }
  } else {
    chains = Array.from(ChainController.state.chains.entries());
  }
  return chains;
}
const ConstantsUtil$1 = {
  EIP155: "eip155",
  CONNECTOR_TYPE_WALLET_CONNECT: "WALLET_CONNECT",
  CONNECTOR_TYPE_INJECTED: "INJECTED",
  CONNECTOR_TYPE_ANNOUNCED: "ANNOUNCED"
};
const PresetsUtil = {
  NetworkImageIds: {
    1: "ba0ba0cd-17c6-4806-ad93-f9d174f17900",
    42161: "3bff954d-5cb0-47a0-9a23-d20192e74600",
    43114: "30c46e53-e989-45fb-4549-be3bd4eb3b00",
    56: "93564157-2e8e-4ce7-81df-b264dbee9b00",
    250: "06b26297-fe0c-4733-5d6b-ffa5498aac00",
    10: "ab9c186a-c52f-464b-2906-ca59d760a400",
    137: "41d04d42-da3b-4453-8506-668cc0727900",
    5e3: "e86fae9b-b770-4eea-e520-150e12c81100",
    295: "6a97d510-cac8-4e58-c7ce-e8681b044c00",
    11155111: "e909ea0a-f92a-4512-c8fc-748044ea6800",
    84532: "a18a7ecd-e307-4360-4746-283182228e00",
    1301: "4eeea7ef-0014-4649-5d1d-07271a80f600",
    130: "2257980a-3463-48c6-cbac-a42d2a956e00",
    10143: "0a728e83-bacb-46db-7844-948f05434900",
    100: "02b53f6a-e3d4-479e-1cb4-21178987d100",
    9001: "f926ff41-260d-4028-635e-91913fc28e00",
    324: "b310f07f-4ef7-49f3-7073-2a0a39685800",
    314: "5a73b3dd-af74-424e-cae0-0de859ee9400",
    4689: "34e68754-e536-40da-c153-6ef2e7188a00",
    1088: "3897a66d-40b9-4833-162f-a2c90531c900",
    1284: "161038da-44ae-4ec7-1208-0ea569454b00",
    1285: "f1d73bb6-5450-4e18-38f7-fb6484264a00",
    7777777: "845c60df-d429-4991-e687-91ae45791600",
    42220: "ab781bbc-ccc6-418d-d32d-789b15da1f00",
    8453: "7289c336-3981-4081-c5f4-efc26ac64a00",
    1313161554: "3ff73439-a619-4894-9262-4470c773a100",
    2020: "b8101fc0-9c19-4b6f-ec65-f6dfff106e00",
    2021: "b8101fc0-9c19-4b6f-ec65-f6dfff106e00",
    80094: "e329c2c9-59b0-4a02-83e4-212ff3779900",
    2741: "fc2427d1-5af9-4a9c-8da5-6f94627cd900",
    "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "a1b58899-f671-4276-6a5e-56ca5bd59700",
    "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z": "a1b58899-f671-4276-6a5e-56ca5bd59700",
    EtWTRABZaYq6iMfeYKouRu166VU2xqa1: "a1b58899-f671-4276-6a5e-56ca5bd59700",
    "000000000019d6689c085ae165831e93": "0b4838db-0161-4ffe-022d-532bf03dba00",
    "000000000933ea01ad0ee984209779ba": "39354064-d79b-420b-065d-f980c4b78200"
  },
  ConnectorImageIds: {
    [ConstantsUtil$3.CONNECTOR_ID.COINBASE]: "0c2840c3-5b04-4c44-9661-fbd4b49e1800",
    [ConstantsUtil$3.CONNECTOR_ID.COINBASE_SDK]: "0c2840c3-5b04-4c44-9661-fbd4b49e1800",
    [ConstantsUtil$3.CONNECTOR_ID.SAFE]: "461db637-8616-43ce-035a-d89b8a1d5800",
    [ConstantsUtil$3.CONNECTOR_ID.LEDGER]: "54a1aa77-d202-4f8d-0fb2-5d2bb6db0300",
    [ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT]: "ef1a1fcf-7fe8-4d69-bd6d-fda1345b4400",
    [ConstantsUtil$3.CONNECTOR_ID.INJECTED]: "07ba87ed-43aa-4adf-4540-9e6a2b9cae00"
  },
  ConnectorNamesMap: {
    [ConstantsUtil$3.CONNECTOR_ID.INJECTED]: "Browser Wallet",
    [ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT]: "WalletConnect",
    [ConstantsUtil$3.CONNECTOR_ID.COINBASE]: "Coinbase",
    [ConstantsUtil$3.CONNECTOR_ID.COINBASE_SDK]: "Coinbase",
    [ConstantsUtil$3.CONNECTOR_ID.LEDGER]: "Ledger",
    [ConstantsUtil$3.CONNECTOR_ID.SAFE]: "Safe"
  }
};
const HelpersUtil = {
  getCaipTokens(tokens) {
    if (!tokens) {
      return void 0;
    }
    const caipTokens = {};
    Object.entries(tokens).forEach(([id, token]) => {
      caipTokens[`${ConstantsUtil$1.EIP155}:${id}`] = token;
    });
    return caipTokens;
  },
  isLowerCaseMatch(str1, str2) {
    return str1?.toLowerCase() === str2?.toLowerCase();
  }
};
new AbortController();
const ErrorUtil = {
  UniversalProviderErrors: {
    UNAUTHORIZED_DOMAIN_NOT_ALLOWED: {
      message: "Unauthorized: origin not allowed",
      alertErrorKey: "INVALID_APP_CONFIGURATION"
    },
    JWT_VALIDATION_ERROR: {
      message: "JWT validation error: JWT Token is not yet valid",
      alertErrorKey: "JWT_TOKEN_NOT_VALID"
    },
    INVALID_KEY: {
      message: "Unauthorized: invalid key",
      alertErrorKey: "INVALID_PROJECT_ID"
    }
  },
  ALERT_ERRORS: {
    SWITCH_NETWORK_NOT_FOUND: {
      shortMessage: "Network Not Found",
      longMessage: "Network not found - please make sure it is included in 'networks' array in createAppKit function"
    },
    INVALID_APP_CONFIGURATION: {
      shortMessage: "Invalid App Configuration",
      longMessage: () => `Origin ${isSafe() ? window.origin : "unknown"} not found on Allowlist - update configuration on cloud.reown.com`
    },
    IFRAME_LOAD_FAILED: {
      shortMessage: "Network Error - Could not load embedded wallet",
      longMessage: () => "There was an issue loading the embedded wallet. Please try again later."
    },
    IFRAME_REQUEST_TIMEOUT: {
      shortMessage: "Embedded Wallet Request Timed Out",
      longMessage: () => "There was an issue doing the request to the embedded wallet. Please try again later."
    },
    UNVERIFIED_DOMAIN: {
      shortMessage: "Invalid App Configuration",
      longMessage: () => "There was an issue loading the embedded wallet. Please verify that your domain is allowed at cloud.reown.com"
    },
    JWT_TOKEN_NOT_VALID: {
      shortMessage: "Session Expired",
      longMessage: "Invalid session found on UniversalProvider - please check your time settings and connect again"
    },
    INVALID_PROJECT_ID: {
      shortMessage: "Invalid App Configuration",
      longMessage: "Invalid Project ID - update configuration"
    },
    PROJECT_ID_NOT_CONFIGURED: {
      shortMessage: "Project ID Not Configured",
      longMessage: "Project ID Not Configured - update configuration on cloud.reown.com"
    }
  }
};
function isSafe() {
  return typeof window !== "undefined";
}
const LoggerUtil = {
  createLogger(onError, level = "error") {
    const loggerOptions = k$4({
      level
    });
    const { logger } = A$3({
      opts: loggerOptions
    });
    logger.error = (...args) => {
      for (const arg of args) {
        if (arg instanceof Error) {
          onError(arg, ...args);
          return;
        }
      }
      onError(void 0, ...args);
    };
    return logger;
  }
};
const RPC_URL_HOST = "rpc.walletconnect.org";
function getBlockchainApiRpcUrl(caipNetworkId, projectId) {
  const url = new URL("https://rpc.walletconnect.org/v1/");
  url.searchParams.set("chainId", caipNetworkId);
  url.searchParams.set("projectId", projectId);
  return url.toString();
}
const WC_HTTP_RPC_SUPPORTED_CHAINS = [
  "near:mainnet",
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "eip155:1101",
  "eip155:56",
  "eip155:42161",
  "eip155:7777777",
  "eip155:59144",
  "eip155:324",
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  "eip155:5000",
  "solana:4sgjmw1sunhzsxgspuhpqldx6wiyjntz",
  "eip155:80084",
  "eip155:5003",
  "eip155:100",
  "eip155:8453",
  "eip155:42220",
  "eip155:1313161555",
  "eip155:17000",
  "eip155:1",
  "eip155:300",
  "eip155:1313161554",
  "eip155:1329",
  "eip155:84532",
  "eip155:421614",
  "eip155:11155111",
  "eip155:8217",
  "eip155:43114",
  "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
  "eip155:999999999",
  "eip155:11155420",
  "eip155:80002",
  "eip155:97",
  "eip155:43113",
  "eip155:137",
  "eip155:10",
  "eip155:1301",
  "bip122:000000000019d6689c085ae165831e93",
  "bip122:000000000933ea01ad0ee984209779ba"
];
const CaipNetworksUtil = {
  extendRpcUrlWithProjectId(rpcUrl, projectId) {
    let isReownUrl = false;
    try {
      const url = new URL(rpcUrl);
      isReownUrl = url.host === RPC_URL_HOST;
    } catch (e2) {
      isReownUrl = false;
    }
    if (isReownUrl) {
      const url = new URL(rpcUrl);
      if (!url.searchParams.has("projectId")) {
        url.searchParams.set("projectId", projectId);
      }
      return url.toString();
    }
    return rpcUrl;
  },
  isCaipNetwork(network) {
    return "chainNamespace" in network && "caipNetworkId" in network;
  },
  getChainNamespace(network) {
    if (this.isCaipNetwork(network)) {
      return network.chainNamespace;
    }
    return ConstantsUtil$3.CHAIN.EVM;
  },
  getCaipNetworkId(network) {
    if (this.isCaipNetwork(network)) {
      return network.caipNetworkId;
    }
    return `${ConstantsUtil$3.CHAIN.EVM}:${network.id}`;
  },
  getDefaultRpcUrl(caipNetwork, caipNetworkId, projectId) {
    const defaultRpcUrl = caipNetwork.rpcUrls?.default?.http?.[0];
    if (WC_HTTP_RPC_SUPPORTED_CHAINS.includes(caipNetworkId)) {
      return getBlockchainApiRpcUrl(caipNetworkId, projectId);
    }
    return defaultRpcUrl || "";
  },
  extendCaipNetwork(caipNetwork, { customNetworkImageUrls, projectId, customRpcUrls }) {
    const chainNamespace = this.getChainNamespace(caipNetwork);
    const caipNetworkId = this.getCaipNetworkId(caipNetwork);
    const networkDefaultRpcUrl = caipNetwork.rpcUrls.default.http?.[0];
    const reownRpcUrl = this.getDefaultRpcUrl(caipNetwork, caipNetworkId, projectId);
    const chainDefaultRpcUrl = caipNetwork?.rpcUrls?.["chainDefault"]?.http?.[0] || networkDefaultRpcUrl;
    const customRpcUrlsOfNetwork = customRpcUrls?.[caipNetworkId]?.map((i2) => i2.url) || [];
    const rpcUrls = [...customRpcUrlsOfNetwork, reownRpcUrl];
    const rpcUrlsWithoutReown = [...customRpcUrlsOfNetwork];
    if (chainDefaultRpcUrl && !rpcUrlsWithoutReown.includes(chainDefaultRpcUrl)) {
      rpcUrlsWithoutReown.push(chainDefaultRpcUrl);
    }
    return {
      ...caipNetwork,
      chainNamespace,
      caipNetworkId,
      assets: {
        imageId: PresetsUtil.NetworkImageIds[caipNetwork.id],
        imageUrl: customNetworkImageUrls?.[caipNetwork.id]
      },
      rpcUrls: {
        ...caipNetwork.rpcUrls,
        default: {
          http: rpcUrls
        },
        chainDefault: {
          http: rpcUrlsWithoutReown
        }
      }
    };
  },
  extendCaipNetworks(caipNetworks, { customNetworkImageUrls, projectId, customRpcUrls }) {
    return caipNetworks.map((caipNetwork) => CaipNetworksUtil.extendCaipNetwork(caipNetwork, {
      customNetworkImageUrls,
      customRpcUrls,
      projectId
    }));
  },
  getViemTransport(caipNetwork, projectId, customRpcUrls) {
    const transports = [];
    customRpcUrls?.forEach((rpcUrl) => {
      transports.push(http(rpcUrl.url, rpcUrl.config));
    });
    if (WC_HTTP_RPC_SUPPORTED_CHAINS.includes(caipNetwork.caipNetworkId)) {
      transports.push(http(getBlockchainApiRpcUrl(caipNetwork.caipNetworkId, projectId), {
        fetchOptions: {
          headers: {
            "Content-Type": "text/plain"
          }
        }
      }));
    }
    caipNetwork?.rpcUrls?.default?.http?.forEach((rpcUrl) => {
      transports.push(http(rpcUrl));
    });
    return fallback(transports);
  },
  extendWagmiTransports(caipNetwork, projectId, transport) {
    if (WC_HTTP_RPC_SUPPORTED_CHAINS.includes(caipNetwork.caipNetworkId)) {
      const reownRpcUrl = this.getDefaultRpcUrl(caipNetwork, caipNetwork.caipNetworkId, projectId);
      return fallback([transport, http(reownRpcUrl)]);
    }
    return transport;
  },
  getUnsupportedNetwork(caipNetworkId) {
    return {
      id: caipNetworkId.split(":")[1],
      caipNetworkId,
      name: ConstantsUtil$3.UNSUPPORTED_NETWORK_NAME,
      chainNamespace: caipNetworkId.split(":")[0],
      nativeCurrency: {
        name: "",
        decimals: 0,
        symbol: ""
      },
      rpcUrls: {
        default: {
          http: []
        }
      }
    };
  },
  getCaipNetworkFromStorage(defaultCaipNetwork) {
    const caipNetworkIdFromStorage = StorageUtil.getActiveCaipNetworkId();
    const caipNetworks = ChainController.getAllRequestedCaipNetworks();
    const availableNamespaces = Array.from(ChainController.state.chains?.keys() || []);
    const namespace = caipNetworkIdFromStorage?.split(":")[0];
    const isNamespaceAvailable = namespace ? availableNamespaces.includes(namespace) : false;
    const caipNetwork = caipNetworks?.find((cn2) => cn2.caipNetworkId === caipNetworkIdFromStorage);
    const isUnsupportedNetwork = isNamespaceAvailable && !caipNetwork && caipNetworkIdFromStorage;
    if (isUnsupportedNetwork) {
      return this.getUnsupportedNetwork(caipNetworkIdFromStorage);
    }
    if (caipNetwork) {
      return caipNetwork;
    }
    if (defaultCaipNetwork) {
      return defaultCaipNetwork;
    }
    return caipNetworks?.[0];
  }
};
const CLEAN_PROVIDERS_STATE = {
  eip155: void 0,
  solana: void 0,
  polkadot: void 0,
  bip122: void 0,
  cosmos: void 0
};
const state = proxy({
  providers: { ...CLEAN_PROVIDERS_STATE },
  providerIds: { ...CLEAN_PROVIDERS_STATE }
});
const ProviderUtil = {
  state,
  subscribeKey(key, callback) {
    return subscribeKey(state, key, callback);
  },
  subscribe(callback) {
    return subscribe(state, () => {
      callback(state);
    });
  },
  subscribeProviders(callback) {
    return subscribe(state.providers, () => callback(state.providers));
  },
  setProvider(chainNamespace, provider) {
    if (provider) {
      state.providers[chainNamespace] = ref(provider);
    }
  },
  getProvider(chainNamespace) {
    return state.providers[chainNamespace];
  },
  setProviderId(chainNamespace, providerId) {
    if (providerId) {
      state.providerIds[chainNamespace] = providerId;
    }
  },
  getProviderId(chainNamespace) {
    if (!chainNamespace) {
      return void 0;
    }
    return state.providerIds[chainNamespace];
  },
  reset() {
    state.providers = { ...CLEAN_PROVIDERS_STATE };
    state.providerIds = { ...CLEAN_PROVIDERS_STATE };
  },
  resetChain(chainNamespace) {
    state.providers[chainNamespace] = void 0;
    state.providerIds[chainNamespace] = void 0;
  }
};
const ConstantsUtil = {
  SECURE_SITE_ORIGIN: (typeof process !== "undefined" && typeof process.env !== "undefined" ? process.env["NEXT_PUBLIC_SECURE_SITE_ORIGIN"] : void 0) || "https://secure.walletconnect.org",
  VIEW_DIRECTION: {
    Next: "next",
    Prev: "prev"
  },
  DEFAULT_CONNECT_METHOD_ORDER: ["email", "social", "wallet"],
  ANIMATION_DURATIONS: {
    HeaderText: 120,
    ModalHeight: 150,
    ViewTransition: 150
  }
};
const WalletUtil = {
  filterOutDuplicatesByRDNS(wallets) {
    const connectors = OptionsController.state.enableEIP6963 ? ConnectorController.state.connectors : [];
    const recent = StorageUtil.getRecentWallets();
    const connectorRDNSs = connectors.map((connector) => connector.info?.rdns).filter(Boolean);
    const recentRDNSs = recent.map((wallet) => wallet.rdns).filter(Boolean);
    const allRDNSs = connectorRDNSs.concat(recentRDNSs);
    if (allRDNSs.includes("io.metamask.mobile") && CoreHelperUtil.isMobile()) {
      const index = allRDNSs.indexOf("io.metamask.mobile");
      allRDNSs[index] = "io.metamask";
    }
    const filtered = wallets.filter((wallet) => !allRDNSs.includes(String(wallet?.rdns)));
    return filtered;
  },
  filterOutDuplicatesByIds(wallets) {
    const connectors = ConnectorController.state.connectors.filter((connector) => connector.type === "ANNOUNCED" || connector.type === "INJECTED");
    const recent = StorageUtil.getRecentWallets();
    const connectorIds = connectors.map((connector) => connector.explorerId);
    const recentIds = recent.map((wallet) => wallet.id);
    const allIds = connectorIds.concat(recentIds);
    const filtered = wallets.filter((wallet) => !allIds.includes(wallet?.id));
    return filtered;
  },
  filterOutDuplicateWallets(wallets) {
    const uniqueByRDNS = this.filterOutDuplicatesByRDNS(wallets);
    const uniqueWallets = this.filterOutDuplicatesByIds(uniqueByRDNS);
    return uniqueWallets;
  },
  markWalletsAsInstalled(wallets) {
    const { connectors } = ConnectorController.state;
    const { featuredWalletIds } = OptionsController.state;
    const installedWalletRdnsMap = connectors.filter((connector) => connector.type === "ANNOUNCED").reduce((rdnsMap, connector) => {
      if (!connector.info?.rdns) {
        return rdnsMap;
      }
      rdnsMap[connector.info.rdns] = true;
      return rdnsMap;
    }, {});
    const walletsWithInstallationStatus = wallets.map((wallet) => ({
      ...wallet,
      installed: Boolean(wallet.rdns) && Boolean(installedWalletRdnsMap[wallet.rdns ?? ""])
    }));
    const sortedWallets = walletsWithInstallationStatus.sort((walletA, walletB) => {
      const installationComparison = Number(walletB.installed) - Number(walletA.installed);
      if (installationComparison !== 0) {
        return installationComparison;
      }
      if (featuredWalletIds?.length) {
        const walletAFeaturedIndex = featuredWalletIds.indexOf(walletA.id);
        const walletBFeaturedIndex = featuredWalletIds.indexOf(walletB.id);
        if (walletAFeaturedIndex !== -1 && walletBFeaturedIndex !== -1) {
          return walletAFeaturedIndex - walletBFeaturedIndex;
        }
        if (walletAFeaturedIndex !== -1) {
          return -1;
        }
        if (walletBFeaturedIndex !== -1) {
          return 1;
        }
      }
      return 0;
    });
    return sortedWallets;
  },
  getConnectOrderMethod(_features, _connectors) {
    const connectMethodOrder = _features?.connectMethodsOrder || OptionsController.state.features?.connectMethodsOrder;
    const connectors = _connectors || ConnectorController.state.connectors;
    if (connectMethodOrder) {
      return connectMethodOrder;
    }
    const { injected, announced } = ConnectorUtil.getConnectorsByType(connectors, ApiController.state.recommended, ApiController.state.featured);
    const shownInjected = injected.filter(ConnectorUtil.showConnector);
    const shownAnnounced = announced.filter(ConnectorUtil.showConnector);
    if (shownInjected.length || shownAnnounced.length) {
      return ["wallet", "email", "social"];
    }
    return ConstantsUtil.DEFAULT_CONNECT_METHOD_ORDER;
  },
  isExcluded(wallet) {
    const isRDNSExcluded = Boolean(wallet.rdns) && ApiController.state.excludedWallets.some((w2) => w2.rdns === wallet.rdns);
    const isNameExcluded = Boolean(wallet.name) && ApiController.state.excludedWallets.some((w2) => HelpersUtil.isLowerCaseMatch(w2.name, wallet.name));
    return isRDNSExcluded || isNameExcluded;
  }
};
const ConnectorUtil = {
  getConnectorsByType(connectors, recommended, featured) {
    const { customWallets } = OptionsController.state;
    const recent = StorageUtil.getRecentWallets();
    const filteredRecommended = WalletUtil.filterOutDuplicateWallets(recommended);
    const filteredFeatured = WalletUtil.filterOutDuplicateWallets(featured);
    const multiChain = connectors.filter((connector) => connector.type === "MULTI_CHAIN");
    const announced = connectors.filter((connector) => connector.type === "ANNOUNCED");
    const injected = connectors.filter((connector) => connector.type === "INJECTED");
    const external = connectors.filter((connector) => connector.type === "EXTERNAL");
    return {
      custom: customWallets,
      recent,
      external,
      multiChain,
      announced,
      injected,
      recommended: filteredRecommended,
      featured: filteredFeatured
    };
  },
  showConnector(connector) {
    const rdns = connector.info?.rdns;
    const isRDNSExcluded = Boolean(rdns) && ApiController.state.excludedWallets.some((wallet) => Boolean(wallet.rdns) && wallet.rdns === rdns);
    const isNameExcluded = Boolean(connector.name) && ApiController.state.excludedWallets.some((wallet) => HelpersUtil.isLowerCaseMatch(wallet.name, connector.name));
    if (connector.type === "INJECTED") {
      const isBrowserWallet = connector.name === "Browser Wallet";
      if (isBrowserWallet) {
        if (!CoreHelperUtil.isMobile()) {
          return false;
        }
        if (CoreHelperUtil.isMobile() && !rdns && !ConnectionController.checkInstalled()) {
          return false;
        }
      }
      if (isRDNSExcluded || isNameExcluded) {
        return false;
      }
    }
    if ((connector.type === "ANNOUNCED" || connector.type === "EXTERNAL") && (isRDNSExcluded || isNameExcluded)) {
      return false;
    }
    return true;
  },
  getIsConnectedWithWC() {
    const chains = Array.from(ChainController.state.chains.values());
    const isConnectedWithWC = chains.some((chain) => {
      const connectorId = ConnectorController.getConnectorId(chain.namespace);
      return connectorId === ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT;
    });
    return isConnectedWithWC;
  },
  getConnectorTypeOrder({ recommended, featured, custom, recent, announced, injected, multiChain, external, overriddenConnectors = OptionsController.state.features?.connectorTypeOrder ?? [] }) {
    const isConnectedWithWC = ConnectorUtil.getIsConnectedWithWC();
    const isWCEnabled = OptionsController.state.enableWalletConnect;
    const allConnectors = [
      { type: "walletConnect", isEnabled: isWCEnabled && !isConnectedWithWC },
      { type: "recent", isEnabled: recent.length > 0 },
      { type: "injected", isEnabled: [...injected, ...announced, ...multiChain].length > 0 },
      { type: "featured", isEnabled: featured.length > 0 },
      { type: "custom", isEnabled: custom && custom.length > 0 },
      { type: "external", isEnabled: external.length > 0 },
      { type: "recommended", isEnabled: recommended.length > 0 }
    ];
    const enabledConnectors = allConnectors.filter((option) => option.isEnabled);
    const enabledConnectorTypes = new Set(enabledConnectors.map((option) => option.type));
    const prioritizedConnectors = overriddenConnectors.filter((type) => enabledConnectorTypes.has(type)).map((type) => ({ type, isEnabled: true }));
    const remainingConnectors = enabledConnectors.filter(({ type: enabledConnectorType }) => {
      const hasPrioritizedConnector = prioritizedConnectors.some(({ type: prioritizedConnectorType }) => prioritizedConnectorType === enabledConnectorType);
      return !hasPrioritizedConnector;
    });
    return Array.from(new Set([...prioritizedConnectors, ...remainingConnectors].map(({ type }) => type)));
  }
};
const t$1 = globalThis, e$2 = t$1.ShadowRoot && (void 0 === t$1.ShadyCSS || t$1.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, s$2 = /* @__PURE__ */ Symbol(), o$3 = /* @__PURE__ */ new WeakMap();
let n$2 = class n {
  constructor(t2, e2, o2) {
    if (this._$cssResult$ = true, o2 !== s$2) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t2, this.t = e2;
  }
  get styleSheet() {
    let t2 = this.o;
    const s2 = this.t;
    if (e$2 && void 0 === t2) {
      const e2 = void 0 !== s2 && 1 === s2.length;
      e2 && (t2 = o$3.get(s2)), void 0 === t2 && ((this.o = t2 = new CSSStyleSheet()).replaceSync(this.cssText), e2 && o$3.set(s2, t2));
    }
    return t2;
  }
  toString() {
    return this.cssText;
  }
};
const r$2 = (t2) => new n$2("string" == typeof t2 ? t2 : t2 + "", void 0, s$2), i$3 = (t2, ...e2) => {
  const o2 = 1 === t2.length ? t2[0] : e2.reduce((e3, s2, o3) => e3 + ((t3) => {
    if (true === t3._$cssResult$) return t3.cssText;
    if ("number" == typeof t3) return t3;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t3 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s2) + t2[o3 + 1], t2[0]);
  return new n$2(o2, t2, s$2);
}, S$1 = (s2, o2) => {
  if (e$2) s2.adoptedStyleSheets = o2.map((t2) => t2 instanceof CSSStyleSheet ? t2 : t2.styleSheet);
  else for (const e2 of o2) {
    const o3 = document.createElement("style"), n3 = t$1.litNonce;
    void 0 !== n3 && o3.setAttribute("nonce", n3), o3.textContent = e2.cssText, s2.appendChild(o3);
  }
}, c$2 = e$2 ? (t2) => t2 : (t2) => t2 instanceof CSSStyleSheet ? ((t3) => {
  let e2 = "";
  for (const s2 of t3.cssRules) e2 += s2.cssText;
  return r$2(e2);
})(t2) : t2;
const { is: i$2, defineProperty: e$1, getOwnPropertyDescriptor: h$1, getOwnPropertyNames: r$1, getOwnPropertySymbols: o$2, getPrototypeOf: n$1 } = Object, a$1 = globalThis, c$1 = a$1.trustedTypes, l$1 = c$1 ? c$1.emptyScript : "", p$1 = a$1.reactiveElementPolyfillSupport, d$1 = (t2, s2) => t2, u$1 = { toAttribute(t2, s2) {
  switch (s2) {
    case Boolean:
      t2 = t2 ? l$1 : null;
      break;
    case Object:
    case Array:
      t2 = null == t2 ? t2 : JSON.stringify(t2);
  }
  return t2;
}, fromAttribute(t2, s2) {
  let i2 = t2;
  switch (s2) {
    case Boolean:
      i2 = null !== t2;
      break;
    case Number:
      i2 = null === t2 ? null : Number(t2);
      break;
    case Object:
    case Array:
      try {
        i2 = JSON.parse(t2);
      } catch (t3) {
        i2 = null;
      }
  }
  return i2;
} }, f$1 = (t2, s2) => !i$2(t2, s2), b$1 = { attribute: true, type: String, converter: u$1, reflect: false, useDefault: false, hasChanged: f$1 };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a$1.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let y$1 = class y2 extends HTMLElement {
  static addInitializer(t2) {
    this._$Ei(), (this.l ??= []).push(t2);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t2, s2 = b$1) {
    if (s2.state && (s2.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t2) && ((s2 = Object.create(s2)).wrapped = true), this.elementProperties.set(t2, s2), !s2.noAccessor) {
      const i2 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t2, i2, s2);
      void 0 !== h3 && e$1(this.prototype, t2, h3);
    }
  }
  static getPropertyDescriptor(t2, s2, i2) {
    const { get: e2, set: r2 } = h$1(this.prototype, t2) ?? { get() {
      return this[s2];
    }, set(t3) {
      this[s2] = t3;
    } };
    return { get: e2, set(s3) {
      const h3 = e2?.call(this);
      r2?.call(this, s3), this.requestUpdate(t2, h3, i2);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t2) {
    return this.elementProperties.get(t2) ?? b$1;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d$1("elementProperties"))) return;
    const t2 = n$1(this);
    t2.finalize(), void 0 !== t2.l && (this.l = [...t2.l]), this.elementProperties = new Map(t2.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d$1("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d$1("properties"))) {
      const t3 = this.properties, s2 = [...r$1(t3), ...o$2(t3)];
      for (const i2 of s2) this.createProperty(i2, t3[i2]);
    }
    const t2 = this[Symbol.metadata];
    if (null !== t2) {
      const s2 = litPropertyMetadata.get(t2);
      if (void 0 !== s2) for (const [t3, i2] of s2) this.elementProperties.set(t3, i2);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t3, s2] of this.elementProperties) {
      const i2 = this._$Eu(t3, s2);
      void 0 !== i2 && this._$Eh.set(i2, t3);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s2) {
    const i2 = [];
    if (Array.isArray(s2)) {
      const e2 = new Set(s2.flat(1 / 0).reverse());
      for (const s3 of e2) i2.unshift(c$2(s3));
    } else void 0 !== s2 && i2.push(c$2(s2));
    return i2;
  }
  static _$Eu(t2, s2) {
    const i2 = s2.attribute;
    return false === i2 ? void 0 : "string" == typeof i2 ? i2 : "string" == typeof t2 ? t2.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t2) => this.enableUpdating = t2), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t2) => t2(this));
  }
  addController(t2) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t2), void 0 !== this.renderRoot && this.isConnected && t2.hostConnected?.();
  }
  removeController(t2) {
    this._$EO?.delete(t2);
  }
  _$E_() {
    const t2 = /* @__PURE__ */ new Map(), s2 = this.constructor.elementProperties;
    for (const i2 of s2.keys()) this.hasOwnProperty(i2) && (t2.set(i2, this[i2]), delete this[i2]);
    t2.size > 0 && (this._$Ep = t2);
  }
  createRenderRoot() {
    const t2 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S$1(t2, this.constructor.elementStyles), t2;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t2) => t2.hostConnected?.());
  }
  enableUpdating(t2) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t2) => t2.hostDisconnected?.());
  }
  attributeChangedCallback(t2, s2, i2) {
    this._$AK(t2, i2);
  }
  _$ET(t2, s2) {
    const i2 = this.constructor.elementProperties.get(t2), e2 = this.constructor._$Eu(t2, i2);
    if (void 0 !== e2 && true === i2.reflect) {
      const h3 = (void 0 !== i2.converter?.toAttribute ? i2.converter : u$1).toAttribute(s2, i2.type);
      this._$Em = t2, null == h3 ? this.removeAttribute(e2) : this.setAttribute(e2, h3), this._$Em = null;
    }
  }
  _$AK(t2, s2) {
    const i2 = this.constructor, e2 = i2._$Eh.get(t2);
    if (void 0 !== e2 && this._$Em !== e2) {
      const t3 = i2.getPropertyOptions(e2), h3 = "function" == typeof t3.converter ? { fromAttribute: t3.converter } : void 0 !== t3.converter?.fromAttribute ? t3.converter : u$1;
      this._$Em = e2;
      const r2 = h3.fromAttribute(s2, t3.type);
      this[e2] = r2 ?? this._$Ej?.get(e2) ?? r2, this._$Em = null;
    }
  }
  requestUpdate(t2, s2, i2, e2 = false, h3) {
    if (void 0 !== t2) {
      const r2 = this.constructor;
      if (false === e2 && (h3 = this[t2]), i2 ??= r2.getPropertyOptions(t2), !((i2.hasChanged ?? f$1)(h3, s2) || i2.useDefault && i2.reflect && h3 === this._$Ej?.get(t2) && !this.hasAttribute(r2._$Eu(t2, i2)))) return;
      this.C(t2, s2, i2);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t2, s2, { useDefault: i2, reflect: e2, wrapped: h3 }, r2) {
    i2 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t2) && (this._$Ej.set(t2, r2 ?? s2 ?? this[t2]), true !== h3 || void 0 !== r2) || (this._$AL.has(t2) || (this.hasUpdated || i2 || (s2 = void 0), this._$AL.set(t2, s2)), true === e2 && this._$Em !== t2 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t2));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t3) {
      Promise.reject(t3);
    }
    const t2 = this.scheduleUpdate();
    return null != t2 && await t2, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t4, s3] of this._$Ep) this[t4] = s3;
        this._$Ep = void 0;
      }
      const t3 = this.constructor.elementProperties;
      if (t3.size > 0) for (const [s3, i2] of t3) {
        const { wrapped: t4 } = i2, e2 = this[s3];
        true !== t4 || this._$AL.has(s3) || void 0 === e2 || this.C(s3, void 0, i2, e2);
      }
    }
    let t2 = false;
    const s2 = this._$AL;
    try {
      t2 = this.shouldUpdate(s2), t2 ? (this.willUpdate(s2), this._$EO?.forEach((t3) => t3.hostUpdate?.()), this.update(s2)) : this._$EM();
    } catch (s3) {
      throw t2 = false, this._$EM(), s3;
    }
    t2 && this._$AE(s2);
  }
  willUpdate(t2) {
  }
  _$AE(t2) {
    this._$EO?.forEach((t3) => t3.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t2)), this.updated(t2);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t2) {
    return true;
  }
  update(t2) {
    this._$Eq &&= this._$Eq.forEach((t3) => this._$ET(t3, this[t3])), this._$EM();
  }
  updated(t2) {
  }
  firstUpdated(t2) {
  }
};
y$1.elementStyles = [], y$1.shadowRootOptions = { mode: "open" }, y$1[d$1("elementProperties")] = /* @__PURE__ */ new Map(), y$1[d$1("finalized")] = /* @__PURE__ */ new Map(), p$1?.({ ReactiveElement: y$1 }), (a$1.reactiveElementVersions ??= []).push("2.1.2");
const t = globalThis, i$1 = (t2) => t2, s$1 = t.trustedTypes, e = s$1 ? s$1.createPolicy("lit-html", { createHTML: (t2) => t2 }) : void 0, h2 = "$lit$", o$1 = `lit$${Math.random().toFixed(9).slice(2)}$`, n2 = "?" + o$1, r = `<${n2}>`, l = document, c = () => l.createComment(""), a = (t2) => null === t2 || "object" != typeof t2 && "function" != typeof t2, u = Array.isArray, d2 = (t2) => u(t2) || "function" == typeof t2?.[Symbol.iterator], f2 = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _ = /-->/g, m2 = />/g, p = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), g = /'/g, $ = /"/g, y3 = /^(?:script|style|textarea|title)$/i, x = (t2) => (i2, ...s2) => ({ _$litType$: t2, strings: i2, values: s2 }), b = x(1), w = x(2), E = /* @__PURE__ */ Symbol.for("lit-noChange"), A = /* @__PURE__ */ Symbol.for("lit-nothing"), C = /* @__PURE__ */ new WeakMap(), P2 = l.createTreeWalker(l, 129);
function V2(t2, i2) {
  if (!u(t2) || !t2.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e ? e.createHTML(i2) : i2;
}
const N = (t2, i2) => {
  const s2 = t2.length - 1, e2 = [];
  let n3, l2 = 2 === i2 ? "<svg>" : 3 === i2 ? "<math>" : "", c2 = v;
  for (let i3 = 0; i3 < s2; i3++) {
    const s3 = t2[i3];
    let a2, u2, d3 = -1, f3 = 0;
    for (; f3 < s3.length && (c2.lastIndex = f3, u2 = c2.exec(s3), null !== u2); ) f3 = c2.lastIndex, c2 === v ? "!--" === u2[1] ? c2 = _ : void 0 !== u2[1] ? c2 = m2 : void 0 !== u2[2] ? (y3.test(u2[2]) && (n3 = RegExp("</" + u2[2], "g")), c2 = p) : void 0 !== u2[3] && (c2 = p) : c2 === p ? ">" === u2[0] ? (c2 = n3 ?? v, d3 = -1) : void 0 === u2[1] ? d3 = -2 : (d3 = c2.lastIndex - u2[2].length, a2 = u2[1], c2 = void 0 === u2[3] ? p : '"' === u2[3] ? $ : g) : c2 === $ || c2 === g ? c2 = p : c2 === _ || c2 === m2 ? c2 = v : (c2 = p, n3 = void 0);
    const x2 = c2 === p && t2[i3 + 1].startsWith("/>") ? " " : "";
    l2 += c2 === v ? s3 + r : d3 >= 0 ? (e2.push(a2), s3.slice(0, d3) + h2 + s3.slice(d3) + o$1 + x2) : s3 + o$1 + (-2 === d3 ? i3 : x2);
  }
  return [V2(t2, l2 + (t2[s2] || "<?>") + (2 === i2 ? "</svg>" : 3 === i2 ? "</math>" : "")), e2];
};
class S2 {
  constructor({ strings: t2, _$litType$: i2 }, e2) {
    let r2;
    this.parts = [];
    let l2 = 0, a2 = 0;
    const u2 = t2.length - 1, d3 = this.parts, [f3, v2] = N(t2, i2);
    if (this.el = S2.createElement(f3, e2), P2.currentNode = this.el.content, 2 === i2 || 3 === i2) {
      const t3 = this.el.content.firstChild;
      t3.replaceWith(...t3.childNodes);
    }
    for (; null !== (r2 = P2.nextNode()) && d3.length < u2; ) {
      if (1 === r2.nodeType) {
        if (r2.hasAttributes()) for (const t3 of r2.getAttributeNames()) if (t3.endsWith(h2)) {
          const i3 = v2[a2++], s2 = r2.getAttribute(t3).split(o$1), e3 = /([.?@])?(.*)/.exec(i3);
          d3.push({ type: 1, index: l2, name: e3[2], strings: s2, ctor: "." === e3[1] ? I2 : "?" === e3[1] ? L : "@" === e3[1] ? z : H }), r2.removeAttribute(t3);
        } else t3.startsWith(o$1) && (d3.push({ type: 6, index: l2 }), r2.removeAttribute(t3));
        if (y3.test(r2.tagName)) {
          const t3 = r2.textContent.split(o$1), i3 = t3.length - 1;
          if (i3 > 0) {
            r2.textContent = s$1 ? s$1.emptyScript : "";
            for (let s2 = 0; s2 < i3; s2++) r2.append(t3[s2], c()), P2.nextNode(), d3.push({ type: 2, index: ++l2 });
            r2.append(t3[i3], c());
          }
        }
      } else if (8 === r2.nodeType) if (r2.data === n2) d3.push({ type: 2, index: l2 });
      else {
        let t3 = -1;
        for (; -1 !== (t3 = r2.data.indexOf(o$1, t3 + 1)); ) d3.push({ type: 7, index: l2 }), t3 += o$1.length - 1;
      }
      l2++;
    }
  }
  static createElement(t2, i2) {
    const s2 = l.createElement("template");
    return s2.innerHTML = t2, s2;
  }
}
function M2(t2, i2, s2 = t2, e2) {
  if (i2 === E) return i2;
  let h3 = void 0 !== e2 ? s2._$Co?.[e2] : s2._$Cl;
  const o2 = a(i2) ? void 0 : i2._$litDirective$;
  return h3?.constructor !== o2 && (h3?._$AO?.(false), void 0 === o2 ? h3 = void 0 : (h3 = new o2(t2), h3._$AT(t2, s2, e2)), void 0 !== e2 ? (s2._$Co ??= [])[e2] = h3 : s2._$Cl = h3), void 0 !== h3 && (i2 = M2(t2, h3._$AS(t2, i2.values), h3, e2)), i2;
}
class R2 {
  constructor(t2, i2) {
    this._$AV = [], this._$AN = void 0, this._$AD = t2, this._$AM = i2;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t2) {
    const { el: { content: i2 }, parts: s2 } = this._$AD, e2 = (t2?.creationScope ?? l).importNode(i2, true);
    P2.currentNode = e2;
    let h3 = P2.nextNode(), o2 = 0, n3 = 0, r2 = s2[0];
    for (; void 0 !== r2; ) {
      if (o2 === r2.index) {
        let i3;
        2 === r2.type ? i3 = new k(h3, h3.nextSibling, this, t2) : 1 === r2.type ? i3 = new r2.ctor(h3, r2.name, r2.strings, this, t2) : 6 === r2.type && (i3 = new Z(h3, this, t2)), this._$AV.push(i3), r2 = s2[++n3];
      }
      o2 !== r2?.index && (h3 = P2.nextNode(), o2++);
    }
    return P2.currentNode = l, e2;
  }
  p(t2) {
    let i2 = 0;
    for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t2, s2, i2), i2 += s2.strings.length - 2) : s2._$AI(t2[i2])), i2++;
  }
}
class k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t2, i2, s2, e2) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t2, this._$AB = i2, this._$AM = s2, this.options = e2, this._$Cv = e2?.isConnected ?? true;
  }
  get parentNode() {
    let t2 = this._$AA.parentNode;
    const i2 = this._$AM;
    return void 0 !== i2 && 11 === t2?.nodeType && (t2 = i2.parentNode), t2;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t2, i2 = this) {
    t2 = M2(this, t2, i2), a(t2) ? t2 === A || null == t2 || "" === t2 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t2 !== this._$AH && t2 !== E && this._(t2) : void 0 !== t2._$litType$ ? this.$(t2) : void 0 !== t2.nodeType ? this.T(t2) : d2(t2) ? this.k(t2) : this._(t2);
  }
  O(t2) {
    return this._$AA.parentNode.insertBefore(t2, this._$AB);
  }
  T(t2) {
    this._$AH !== t2 && (this._$AR(), this._$AH = this.O(t2));
  }
  _(t2) {
    this._$AH !== A && a(this._$AH) ? this._$AA.nextSibling.data = t2 : this.T(l.createTextNode(t2)), this._$AH = t2;
  }
  $(t2) {
    const { values: i2, _$litType$: s2 } = t2, e2 = "number" == typeof s2 ? this._$AC(t2) : (void 0 === s2.el && (s2.el = S2.createElement(V2(s2.h, s2.h[0]), this.options)), s2);
    if (this._$AH?._$AD === e2) this._$AH.p(i2);
    else {
      const t3 = new R2(e2, this), s3 = t3.u(this.options);
      t3.p(i2), this.T(s3), this._$AH = t3;
    }
  }
  _$AC(t2) {
    let i2 = C.get(t2.strings);
    return void 0 === i2 && C.set(t2.strings, i2 = new S2(t2)), i2;
  }
  k(t2) {
    u(this._$AH) || (this._$AH = [], this._$AR());
    const i2 = this._$AH;
    let s2, e2 = 0;
    for (const h3 of t2) e2 === i2.length ? i2.push(s2 = new k(this.O(c()), this.O(c()), this, this.options)) : s2 = i2[e2], s2._$AI(h3), e2++;
    e2 < i2.length && (this._$AR(s2 && s2._$AB.nextSibling, e2), i2.length = e2);
  }
  _$AR(t2 = this._$AA.nextSibling, s2) {
    for (this._$AP?.(false, true, s2); t2 !== this._$AB; ) {
      const s3 = i$1(t2).nextSibling;
      i$1(t2).remove(), t2 = s3;
    }
  }
  setConnected(t2) {
    void 0 === this._$AM && (this._$Cv = t2, this._$AP?.(t2));
  }
}
class H {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t2, i2, s2, e2, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t2, this.name = i2, this._$AM = e2, this.options = h3, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = A;
  }
  _$AI(t2, i2 = this, s2, e2) {
    const h3 = this.strings;
    let o2 = false;
    if (void 0 === h3) t2 = M2(this, t2, i2, 0), o2 = !a(t2) || t2 !== this._$AH && t2 !== E, o2 && (this._$AH = t2);
    else {
      const e3 = t2;
      let n3, r2;
      for (t2 = h3[0], n3 = 0; n3 < h3.length - 1; n3++) r2 = M2(this, e3[s2 + n3], i2, n3), r2 === E && (r2 = this._$AH[n3]), o2 ||= !a(r2) || r2 !== this._$AH[n3], r2 === A ? t2 = A : t2 !== A && (t2 += (r2 ?? "") + h3[n3 + 1]), this._$AH[n3] = r2;
    }
    o2 && !e2 && this.j(t2);
  }
  j(t2) {
    t2 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t2 ?? "");
  }
}
class I2 extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t2) {
    this.element[this.name] = t2 === A ? void 0 : t2;
  }
}
class L extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t2) {
    this.element.toggleAttribute(this.name, !!t2 && t2 !== A);
  }
}
class z extends H {
  constructor(t2, i2, s2, e2, h3) {
    super(t2, i2, s2, e2, h3), this.type = 5;
  }
  _$AI(t2, i2 = this) {
    if ((t2 = M2(this, t2, i2, 0) ?? A) === E) return;
    const s2 = this._$AH, e2 = t2 === A && s2 !== A || t2.capture !== s2.capture || t2.once !== s2.once || t2.passive !== s2.passive, h3 = t2 !== A && (s2 === A || e2);
    e2 && this.element.removeEventListener(this.name, this, s2), h3 && this.element.addEventListener(this.name, this, t2), this._$AH = t2;
  }
  handleEvent(t2) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t2) : this._$AH.handleEvent(t2);
  }
}
class Z {
  constructor(t2, i2, s2) {
    this.element = t2, this.type = 6, this._$AN = void 0, this._$AM = i2, this.options = s2;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2) {
    M2(this, t2);
  }
}
const B2 = t.litHtmlPolyfillSupport;
B2?.(S2, k), (t.litHtmlVersions ??= []).push("3.3.3");
const D = (t2, i2, s2) => {
  const e2 = s2?.renderBefore ?? i2;
  let h3 = e2._$litPart$;
  if (void 0 === h3) {
    const t3 = s2?.renderBefore ?? null;
    e2._$litPart$ = h3 = new k(i2.insertBefore(c(), t3), t3, void 0, s2 ?? {});
  }
  return h3._$AI(t2), h3;
};
const s = globalThis;
class i extends y$1 {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t2 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t2.firstChild, t2;
  }
  update(t2) {
    const r2 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t2), this._$Do = D(r2, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
}
i._$litElement$ = true, i["finalized"] = true, s.litElementHydrateSupport?.({ LitElement: i });
const o = s.litElementPolyfillSupport;
o?.({ LitElement: i });
(s.litElementVersions ??= []).push("4.2.2");
let themeTag = void 0;
let darkModeTag = void 0;
let lightModeTag = void 0;
function initializeTheming(themeVariables, themeMode) {
  themeTag = document.createElement("style");
  darkModeTag = document.createElement("style");
  lightModeTag = document.createElement("style");
  themeTag.textContent = createRootStyles(themeVariables).core.cssText;
  darkModeTag.textContent = createRootStyles(themeVariables).dark.cssText;
  lightModeTag.textContent = createRootStyles(themeVariables).light.cssText;
  document.head.appendChild(themeTag);
  document.head.appendChild(darkModeTag);
  document.head.appendChild(lightModeTag);
  setColorTheme(themeMode);
}
function setColorTheme(themeMode) {
  if (darkModeTag && lightModeTag) {
    if (themeMode === "light") {
      darkModeTag.removeAttribute("media");
      lightModeTag.media = "enabled";
    } else {
      lightModeTag.removeAttribute("media");
      darkModeTag.media = "enabled";
    }
  }
}
function setThemeVariables(themeVariables) {
  if (themeTag && darkModeTag && lightModeTag) {
    themeTag.textContent = createRootStyles(themeVariables).core.cssText;
    darkModeTag.textContent = createRootStyles(themeVariables).dark.cssText;
    lightModeTag.textContent = createRootStyles(themeVariables).light.cssText;
  }
}
function createRootStyles(themeVariables) {
  return {
    core: i$3`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      @keyframes w3m-shake {
        0% {
          transform: scale(1) rotate(0deg);
        }
        20% {
          transform: scale(1) rotate(-1deg);
        }
        40% {
          transform: scale(1) rotate(1.5deg);
        }
        60% {
          transform: scale(1) rotate(-1.5deg);
        }
        80% {
          transform: scale(1) rotate(1deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
        }
      }
      @keyframes w3m-iframe-fade-out {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      @keyframes w3m-iframe-zoom-in {
        0% {
          transform: translateY(50px);
          opacity: 0;
        }
        100% {
          transform: translateY(0px);
          opacity: 1;
        }
      }
      @keyframes w3m-iframe-zoom-in-mobile {
        0% {
          transform: scale(0.95);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      :root {
        --w3m-modal-width: 360px;
        --w3m-color-mix-strength: ${r$2(themeVariables?.["--w3m-color-mix-strength"] ? `${themeVariables["--w3m-color-mix-strength"]}%` : "0%")};
        --w3m-font-family: ${r$2(themeVariables?.["--w3m-font-family"] || "Inter, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;")};
        --w3m-font-size-master: ${r$2(themeVariables?.["--w3m-font-size-master"] || "10px")};
        --w3m-border-radius-master: ${r$2(themeVariables?.["--w3m-border-radius-master"] || "4px")};
        --w3m-z-index: ${r$2(themeVariables?.["--w3m-z-index"] || 999)};

        --wui-font-family: var(--w3m-font-family);

        --wui-font-size-mini: calc(var(--w3m-font-size-master) * 0.8);
        --wui-font-size-micro: var(--w3m-font-size-master);
        --wui-font-size-tiny: calc(var(--w3m-font-size-master) * 1.2);
        --wui-font-size-small: calc(var(--w3m-font-size-master) * 1.4);
        --wui-font-size-paragraph: calc(var(--w3m-font-size-master) * 1.6);
        --wui-font-size-medium: calc(var(--w3m-font-size-master) * 1.8);
        --wui-font-size-large: calc(var(--w3m-font-size-master) * 2);
        --wui-font-size-title-6: calc(var(--w3m-font-size-master) * 2.2);
        --wui-font-size-medium-title: calc(var(--w3m-font-size-master) * 2.4);
        --wui-font-size-2xl: calc(var(--w3m-font-size-master) * 4);

        --wui-border-radius-5xs: var(--w3m-border-radius-master);
        --wui-border-radius-4xs: calc(var(--w3m-border-radius-master) * 1.5);
        --wui-border-radius-3xs: calc(var(--w3m-border-radius-master) * 2);
        --wui-border-radius-xxs: calc(var(--w3m-border-radius-master) * 3);
        --wui-border-radius-xs: calc(var(--w3m-border-radius-master) * 4);
        --wui-border-radius-s: calc(var(--w3m-border-radius-master) * 5);
        --wui-border-radius-m: calc(var(--w3m-border-radius-master) * 7);
        --wui-border-radius-l: calc(var(--w3m-border-radius-master) * 9);
        --wui-border-radius-3xl: calc(var(--w3m-border-radius-master) * 20);

        --wui-font-weight-light: 400;
        --wui-font-weight-regular: 500;
        --wui-font-weight-medium: 600;
        --wui-font-weight-bold: 700;

        --wui-letter-spacing-2xl: -1.6px;
        --wui-letter-spacing-medium-title: -0.96px;
        --wui-letter-spacing-title-6: -0.88px;
        --wui-letter-spacing-large: -0.8px;
        --wui-letter-spacing-medium: -0.72px;
        --wui-letter-spacing-paragraph: -0.64px;
        --wui-letter-spacing-small: -0.56px;
        --wui-letter-spacing-tiny: -0.48px;
        --wui-letter-spacing-micro: -0.2px;
        --wui-letter-spacing-mini: -0.16px;

        --wui-spacing-0: 0px;
        --wui-spacing-4xs: 2px;
        --wui-spacing-3xs: 4px;
        --wui-spacing-xxs: 6px;
        --wui-spacing-2xs: 7px;
        --wui-spacing-xs: 8px;
        --wui-spacing-1xs: 10px;
        --wui-spacing-s: 12px;
        --wui-spacing-m: 14px;
        --wui-spacing-l: 16px;
        --wui-spacing-2l: 18px;
        --wui-spacing-xl: 20px;
        --wui-spacing-xxl: 24px;
        --wui-spacing-2xl: 32px;
        --wui-spacing-3xl: 40px;
        --wui-spacing-4xl: 90px;
        --wui-spacing-5xl: 95px;

        --wui-icon-box-size-xxs: 14px;
        --wui-icon-box-size-xs: 20px;
        --wui-icon-box-size-sm: 24px;
        --wui-icon-box-size-md: 32px;
        --wui-icon-box-size-mdl: 36px;
        --wui-icon-box-size-lg: 40px;
        --wui-icon-box-size-2lg: 48px;
        --wui-icon-box-size-xl: 64px;

        --wui-icon-size-inherit: inherit;
        --wui-icon-size-xxs: 10px;
        --wui-icon-size-xs: 12px;
        --wui-icon-size-sm: 14px;
        --wui-icon-size-md: 16px;
        --wui-icon-size-mdl: 18px;
        --wui-icon-size-lg: 20px;
        --wui-icon-size-xl: 24px;
        --wui-icon-size-xxl: 28px;

        --wui-wallet-image-size-inherit: inherit;
        --wui-wallet-image-size-sm: 40px;
        --wui-wallet-image-size-md: 56px;
        --wui-wallet-image-size-lg: 80px;

        --wui-visual-size-size-inherit: inherit;
        --wui-visual-size-sm: 40px;
        --wui-visual-size-md: 55px;
        --wui-visual-size-lg: 80px;

        --wui-box-size-md: 100px;
        --wui-box-size-lg: 120px;

        --wui-ease-out-power-2: cubic-bezier(0, 0, 0.22, 1);
        --wui-ease-out-power-1: cubic-bezier(0, 0, 0.55, 1);

        --wui-ease-in-power-3: cubic-bezier(0.66, 0, 1, 1);
        --wui-ease-in-power-2: cubic-bezier(0.45, 0, 1, 1);
        --wui-ease-in-power-1: cubic-bezier(0.3, 0, 1, 1);

        --wui-ease-inout-power-1: cubic-bezier(0.45, 0, 0.55, 1);

        --wui-duration-lg: 200ms;
        --wui-duration-md: 125ms;
        --wui-duration-sm: 75ms;

        --wui-path-network-sm: path(
          'M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z'
        );

        --wui-path-network-md: path(
          'M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z'
        );

        --wui-path-network-lg: path(
          'M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z'
        );

        --wui-width-network-sm: 36px;
        --wui-width-network-md: 48px;
        --wui-width-network-lg: 86px;

        --wui-height-network-sm: 40px;
        --wui-height-network-md: 54px;
        --wui-height-network-lg: 96px;

        --wui-icon-size-network-xs: 12px;
        --wui-icon-size-network-sm: 16px;
        --wui-icon-size-network-md: 24px;
        --wui-icon-size-network-lg: 42px;

        --wui-color-inherit: inherit;

        --wui-color-inverse-100: #fff;
        --wui-color-inverse-000: #000;

        --wui-cover: rgba(20, 20, 20, 0.8);

        --wui-color-modal-bg: var(--wui-color-modal-bg-base);

        --wui-color-accent-100: var(--wui-color-accent-base-100);
        --wui-color-accent-090: var(--wui-color-accent-base-090);
        --wui-color-accent-080: var(--wui-color-accent-base-080);

        --wui-color-success-100: var(--wui-color-success-base-100);
        --wui-color-success-125: var(--wui-color-success-base-125);

        --wui-color-warning-100: var(--wui-color-warning-base-100);

        --wui-color-error-100: var(--wui-color-error-base-100);
        --wui-color-error-125: var(--wui-color-error-base-125);

        --wui-color-blue-100: var(--wui-color-blue-base-100);
        --wui-color-blue-90: var(--wui-color-blue-base-90);

        --wui-icon-box-bg-error-100: var(--wui-icon-box-bg-error-base-100);
        --wui-icon-box-bg-blue-100: var(--wui-icon-box-bg-blue-base-100);
        --wui-icon-box-bg-success-100: var(--wui-icon-box-bg-success-base-100);
        --wui-icon-box-bg-inverse-100: var(--wui-icon-box-bg-inverse-base-100);

        --wui-all-wallets-bg-100: var(--wui-all-wallets-bg-100);

        --wui-avatar-border: var(--wui-avatar-border-base);

        --wui-thumbnail-border: var(--wui-thumbnail-border-base);

        --wui-wallet-button-bg: var(--wui-wallet-button-bg-base);

        --wui-box-shadow-blue: var(--wui-color-accent-glass-020);
      }

      @supports (background: color-mix(in srgb, white 50%, black)) {
        :root {
          --wui-color-modal-bg: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-modal-bg-base)
          );

          --wui-box-shadow-blue: color-mix(in srgb, var(--wui-color-accent-100) 20%, transparent);

          --wui-color-accent-100: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 100%,
            transparent
          );
          --wui-color-accent-090: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 90%,
            transparent
          );
          --wui-color-accent-080: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 80%,
            transparent
          );
          --wui-color-accent-glass-090: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 90%,
            transparent
          );
          --wui-color-accent-glass-080: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 80%,
            transparent
          );
          --wui-color-accent-glass-020: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 20%,
            transparent
          );
          --wui-color-accent-glass-015: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 15%,
            transparent
          );
          --wui-color-accent-glass-010: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 10%,
            transparent
          );
          --wui-color-accent-glass-005: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 5%,
            transparent
          );
          --wui-color-accent-002: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 2%,
            transparent
          );

          --wui-color-fg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-100)
          );
          --wui-color-fg-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-125)
          );
          --wui-color-fg-150: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-150)
          );
          --wui-color-fg-175: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-175)
          );
          --wui-color-fg-200: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-200)
          );
          --wui-color-fg-225: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-225)
          );
          --wui-color-fg-250: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-250)
          );
          --wui-color-fg-275: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-275)
          );
          --wui-color-fg-300: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-300)
          );
          --wui-color-fg-325: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-325)
          );
          --wui-color-fg-350: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-350)
          );

          --wui-color-bg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-100)
          );
          --wui-color-bg-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-125)
          );
          --wui-color-bg-150: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-150)
          );
          --wui-color-bg-175: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-175)
          );
          --wui-color-bg-200: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-200)
          );
          --wui-color-bg-225: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-225)
          );
          --wui-color-bg-250: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-250)
          );
          --wui-color-bg-275: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-275)
          );
          --wui-color-bg-300: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-300)
          );
          --wui-color-bg-325: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-325)
          );
          --wui-color-bg-350: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-350)
          );

          --wui-color-success-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-success-base-100)
          );
          --wui-color-success-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-success-base-125)
          );

          --wui-color-warning-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-warning-base-100)
          );

          --wui-color-error-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-error-base-100)
          );
          --wui-color-blue-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-blue-base-100)
          );
          --wui-color-blue-90: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-blue-base-90)
          );
          --wui-color-error-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-error-base-125)
          );

          --wui-icon-box-bg-error-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-error-base-100)
          );
          --wui-icon-box-bg-accent-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-blue-base-100)
          );
          --wui-icon-box-bg-success-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-success-base-100)
          );
          --wui-icon-box-bg-inverse-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-inverse-base-100)
          );

          --wui-all-wallets-bg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-all-wallets-bg-100)
          );

          --wui-avatar-border: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-avatar-border-base)
          );

          --wui-thumbnail-border: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-thumbnail-border-base)
          );

          --wui-wallet-button-bg: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-wallet-button-bg-base)
          );
        }
      }
    `,
    light: i$3`
      :root {
        --w3m-color-mix: ${r$2(themeVariables?.["--w3m-color-mix"] || "#fff")};
        --w3m-accent: ${r$2(getW3mThemeVariables(themeVariables, "dark")["--w3m-accent"])};
        --w3m-default: #fff;

        --wui-color-modal-bg-base: ${r$2(getW3mThemeVariables(themeVariables, "dark")["--w3m-background"])};
        --wui-color-accent-base-100: var(--w3m-accent);

        --wui-color-blueberry-100: hsla(230, 100%, 67%, 1);
        --wui-color-blueberry-090: hsla(231, 76%, 61%, 1);
        --wui-color-blueberry-080: hsla(230, 59%, 55%, 1);
        --wui-color-blueberry-050: hsla(231, 100%, 70%, 0.1);

        --wui-color-fg-100: #e4e7e7;
        --wui-color-fg-125: #d0d5d5;
        --wui-color-fg-150: #a8b1b1;
        --wui-color-fg-175: #a8b0b0;
        --wui-color-fg-200: #949e9e;
        --wui-color-fg-225: #868f8f;
        --wui-color-fg-250: #788080;
        --wui-color-fg-275: #788181;
        --wui-color-fg-300: #6e7777;
        --wui-color-fg-325: #9a9a9a;
        --wui-color-fg-350: #363636;

        --wui-color-bg-100: #141414;
        --wui-color-bg-125: #191a1a;
        --wui-color-bg-150: #1e1f1f;
        --wui-color-bg-175: #222525;
        --wui-color-bg-200: #272a2a;
        --wui-color-bg-225: #2c3030;
        --wui-color-bg-250: #313535;
        --wui-color-bg-275: #363b3b;
        --wui-color-bg-300: #3b4040;
        --wui-color-bg-325: #252525;
        --wui-color-bg-350: #ffffff;

        --wui-color-success-base-100: #26d962;
        --wui-color-success-base-125: #30a46b;

        --wui-color-warning-base-100: #f3a13f;

        --wui-color-error-base-100: #f25a67;
        --wui-color-error-base-125: #df4a34;

        --wui-color-blue-base-100: rgba(102, 125, 255, 1);
        --wui-color-blue-base-90: rgba(102, 125, 255, 0.9);

        --wui-color-success-glass-001: rgba(38, 217, 98, 0.01);
        --wui-color-success-glass-002: rgba(38, 217, 98, 0.02);
        --wui-color-success-glass-005: rgba(38, 217, 98, 0.05);
        --wui-color-success-glass-010: rgba(38, 217, 98, 0.1);
        --wui-color-success-glass-015: rgba(38, 217, 98, 0.15);
        --wui-color-success-glass-020: rgba(38, 217, 98, 0.2);
        --wui-color-success-glass-025: rgba(38, 217, 98, 0.25);
        --wui-color-success-glass-030: rgba(38, 217, 98, 0.3);
        --wui-color-success-glass-060: rgba(38, 217, 98, 0.6);
        --wui-color-success-glass-080: rgba(38, 217, 98, 0.8);

        --wui-color-success-glass-reown-020: rgba(48, 164, 107, 0.2);

        --wui-color-warning-glass-reown-020: rgba(243, 161, 63, 0.2);

        --wui-color-error-glass-001: rgba(242, 90, 103, 0.01);
        --wui-color-error-glass-002: rgba(242, 90, 103, 0.02);
        --wui-color-error-glass-005: rgba(242, 90, 103, 0.05);
        --wui-color-error-glass-010: rgba(242, 90, 103, 0.1);
        --wui-color-error-glass-015: rgba(242, 90, 103, 0.15);
        --wui-color-error-glass-020: rgba(242, 90, 103, 0.2);
        --wui-color-error-glass-025: rgba(242, 90, 103, 0.25);
        --wui-color-error-glass-030: rgba(242, 90, 103, 0.3);
        --wui-color-error-glass-060: rgba(242, 90, 103, 0.6);
        --wui-color-error-glass-080: rgba(242, 90, 103, 0.8);

        --wui-color-error-glass-reown-020: rgba(223, 74, 52, 0.2);

        --wui-color-gray-glass-001: rgba(255, 255, 255, 0.01);
        --wui-color-gray-glass-002: rgba(255, 255, 255, 0.02);
        --wui-color-gray-glass-005: rgba(255, 255, 255, 0.05);
        --wui-color-gray-glass-010: rgba(255, 255, 255, 0.1);
        --wui-color-gray-glass-015: rgba(255, 255, 255, 0.15);
        --wui-color-gray-glass-020: rgba(255, 255, 255, 0.2);
        --wui-color-gray-glass-025: rgba(255, 255, 255, 0.25);
        --wui-color-gray-glass-030: rgba(255, 255, 255, 0.3);
        --wui-color-gray-glass-060: rgba(255, 255, 255, 0.6);
        --wui-color-gray-glass-080: rgba(255, 255, 255, 0.8);
        --wui-color-gray-glass-090: rgba(255, 255, 255, 0.9);

        --wui-color-dark-glass-100: rgba(42, 42, 42, 1);

        --wui-icon-box-bg-error-base-100: #3c2426;
        --wui-icon-box-bg-blue-base-100: #20303f;
        --wui-icon-box-bg-success-base-100: #1f3a28;
        --wui-icon-box-bg-inverse-base-100: #243240;

        --wui-all-wallets-bg-100: #222b35;

        --wui-avatar-border-base: #252525;

        --wui-thumbnail-border-base: #252525;

        --wui-wallet-button-bg-base: var(--wui-color-bg-125);

        --w3m-card-embedded-shadow-color: rgb(17 17 18 / 25%);
      }
    `,
    dark: i$3`
      :root {
        --w3m-color-mix: ${r$2(themeVariables?.["--w3m-color-mix"] || "#000")};
        --w3m-accent: ${r$2(getW3mThemeVariables(themeVariables, "light")["--w3m-accent"])};
        --w3m-default: #000;

        --wui-color-modal-bg-base: ${r$2(getW3mThemeVariables(themeVariables, "light")["--w3m-background"])};
        --wui-color-accent-base-100: var(--w3m-accent);

        --wui-color-blueberry-100: hsla(231, 100%, 70%, 1);
        --wui-color-blueberry-090: hsla(231, 97%, 72%, 1);
        --wui-color-blueberry-080: hsla(231, 92%, 74%, 1);

        --wui-color-fg-100: #141414;
        --wui-color-fg-125: #2d3131;
        --wui-color-fg-150: #474d4d;
        --wui-color-fg-175: #636d6d;
        --wui-color-fg-200: #798686;
        --wui-color-fg-225: #828f8f;
        --wui-color-fg-250: #8b9797;
        --wui-color-fg-275: #95a0a0;
        --wui-color-fg-300: #9ea9a9;
        --wui-color-fg-325: #9a9a9a;
        --wui-color-fg-350: #d0d0d0;

        --wui-color-bg-100: #ffffff;
        --wui-color-bg-125: #f5fafa;
        --wui-color-bg-150: #f3f8f8;
        --wui-color-bg-175: #eef4f4;
        --wui-color-bg-200: #eaf1f1;
        --wui-color-bg-225: #e5eded;
        --wui-color-bg-250: #e1e9e9;
        --wui-color-bg-275: #dce7e7;
        --wui-color-bg-300: #d8e3e3;
        --wui-color-bg-325: #f3f3f3;
        --wui-color-bg-350: #202020;

        --wui-color-success-base-100: #26b562;
        --wui-color-success-base-125: #30a46b;

        --wui-color-warning-base-100: #f3a13f;

        --wui-color-error-base-100: #f05142;
        --wui-color-error-base-125: #df4a34;

        --wui-color-blue-base-100: rgba(102, 125, 255, 1);
        --wui-color-blue-base-90: rgba(102, 125, 255, 0.9);

        --wui-color-success-glass-001: rgba(38, 181, 98, 0.01);
        --wui-color-success-glass-002: rgba(38, 181, 98, 0.02);
        --wui-color-success-glass-005: rgba(38, 181, 98, 0.05);
        --wui-color-success-glass-010: rgba(38, 181, 98, 0.1);
        --wui-color-success-glass-015: rgba(38, 181, 98, 0.15);
        --wui-color-success-glass-020: rgba(38, 181, 98, 0.2);
        --wui-color-success-glass-025: rgba(38, 181, 98, 0.25);
        --wui-color-success-glass-030: rgba(38, 181, 98, 0.3);
        --wui-color-success-glass-060: rgba(38, 181, 98, 0.6);
        --wui-color-success-glass-080: rgba(38, 181, 98, 0.8);

        --wui-color-success-glass-reown-020: rgba(48, 164, 107, 0.2);

        --wui-color-warning-glass-reown-020: rgba(243, 161, 63, 0.2);

        --wui-color-error-glass-001: rgba(240, 81, 66, 0.01);
        --wui-color-error-glass-002: rgba(240, 81, 66, 0.02);
        --wui-color-error-glass-005: rgba(240, 81, 66, 0.05);
        --wui-color-error-glass-010: rgba(240, 81, 66, 0.1);
        --wui-color-error-glass-015: rgba(240, 81, 66, 0.15);
        --wui-color-error-glass-020: rgba(240, 81, 66, 0.2);
        --wui-color-error-glass-025: rgba(240, 81, 66, 0.25);
        --wui-color-error-glass-030: rgba(240, 81, 66, 0.3);
        --wui-color-error-glass-060: rgba(240, 81, 66, 0.6);
        --wui-color-error-glass-080: rgba(240, 81, 66, 0.8);

        --wui-color-error-glass-reown-020: rgba(223, 74, 52, 0.2);

        --wui-icon-box-bg-error-base-100: #f4dfdd;
        --wui-icon-box-bg-blue-base-100: #d9ecfb;
        --wui-icon-box-bg-success-base-100: #daf0e4;
        --wui-icon-box-bg-inverse-base-100: #dcecfc;

        --wui-all-wallets-bg-100: #e8f1fa;

        --wui-avatar-border-base: #f3f4f4;

        --wui-thumbnail-border-base: #eaefef;

        --wui-wallet-button-bg-base: var(--wui-color-bg-125);

        --wui-color-gray-glass-001: rgba(0, 0, 0, 0.01);
        --wui-color-gray-glass-002: rgba(0, 0, 0, 0.02);
        --wui-color-gray-glass-005: rgba(0, 0, 0, 0.05);
        --wui-color-gray-glass-010: rgba(0, 0, 0, 0.1);
        --wui-color-gray-glass-015: rgba(0, 0, 0, 0.15);
        --wui-color-gray-glass-020: rgba(0, 0, 0, 0.2);
        --wui-color-gray-glass-025: rgba(0, 0, 0, 0.25);
        --wui-color-gray-glass-030: rgba(0, 0, 0, 0.3);
        --wui-color-gray-glass-060: rgba(0, 0, 0, 0.6);
        --wui-color-gray-glass-080: rgba(0, 0, 0, 0.8);
        --wui-color-gray-glass-090: rgba(0, 0, 0, 0.9);

        --wui-color-dark-glass-100: rgba(233, 233, 233, 1);

        --w3m-card-embedded-shadow-color: rgb(224 225 233 / 25%);
      }
    `
  };
}
const resetStyles = i$3`
  *,
  *::after,
  *::before,
  :host {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-style: normal;
    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--wui-font-family);
    backface-visibility: hidden;
  }
`;
const elementStyles = i$3`
  button,
  a {
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    transition:
      color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      box-shadow var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: background-color, color, border, box-shadow, border-radius;
    outline: none;
    border: none;
    column-gap: var(--wui-spacing-3xs);
    background-color: transparent;
    text-decoration: none;
  }

  wui-flex {
    transition: border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius;
  }

  button:disabled > wui-wallet-image,
  button:disabled > wui-all-wallets-image,
  button:disabled > wui-network-image,
  button:disabled > wui-image,
  button:disabled > wui-transaction-visual,
  button:disabled > wui-logo {
    filter: grayscale(1);
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: var(--wui-color-gray-glass-005);
    }

    button:active:enabled {
      background-color: var(--wui-color-gray-glass-010);
    }
  }

  button:disabled > wui-icon-box {
    opacity: 0.5;
  }

  input {
    border: none;
    outline: none;
    appearance: none;
  }
`;
const colorStyles = i$3`
  .wui-color-inherit {
    color: var(--wui-color-inherit);
  }

  .wui-color-accent-100 {
    color: var(--wui-color-accent-100);
  }

  .wui-color-error-100 {
    color: var(--wui-color-error-100);
  }

  .wui-color-blue-100 {
    color: var(--wui-color-blue-100);
  }

  .wui-color-blue-90 {
    color: var(--wui-color-blue-90);
  }

  .wui-color-error-125 {
    color: var(--wui-color-error-125);
  }

  .wui-color-success-100 {
    color: var(--wui-color-success-100);
  }

  .wui-color-success-125 {
    color: var(--wui-color-success-125);
  }

  .wui-color-inverse-100 {
    color: var(--wui-color-inverse-100);
  }

  .wui-color-inverse-000 {
    color: var(--wui-color-inverse-000);
  }

  .wui-color-fg-100 {
    color: var(--wui-color-fg-100);
  }

  .wui-color-fg-200 {
    color: var(--wui-color-fg-200);
  }

  .wui-color-fg-300 {
    color: var(--wui-color-fg-300);
  }

  .wui-color-fg-325 {
    color: var(--wui-color-fg-325);
  }

  .wui-color-fg-350 {
    color: var(--wui-color-fg-350);
  }

  .wui-bg-color-inherit {
    background-color: var(--wui-color-inherit);
  }

  .wui-bg-color-blue-100 {
    background-color: var(--wui-color-accent-100);
  }

  .wui-bg-color-error-100 {
    background-color: var(--wui-color-error-100);
  }

  .wui-bg-color-error-125 {
    background-color: var(--wui-color-error-125);
  }

  .wui-bg-color-success-100 {
    background-color: var(--wui-color-success-100);
  }

  .wui-bg-color-success-125 {
    background-color: var(--wui-color-success-100);
  }

  .wui-bg-color-inverse-100 {
    background-color: var(--wui-color-inverse-100);
  }

  .wui-bg-color-inverse-000 {
    background-color: var(--wui-color-inverse-000);
  }

  .wui-bg-color-fg-100 {
    background-color: var(--wui-color-fg-100);
  }

  .wui-bg-color-fg-200 {
    background-color: var(--wui-color-fg-200);
  }

  .wui-bg-color-fg-300 {
    background-color: var(--wui-color-fg-300);
  }

  .wui-color-fg-325 {
    background-color: var(--wui-color-fg-325);
  }

  .wui-color-fg-350 {
    background-color: var(--wui-color-fg-350);
  }
`;
const WcConstantsUtil = {
  ERROR_CODE_UNRECOGNIZED_CHAIN_ID: 4902,
  ERROR_CODE_DEFAULT: 5e3,
  ERROR_INVALID_CHAIN_ID: 32603,
  DEFAULT_ALLOWED_ANCESTORS: [
    "http://localhost:*",
    "https://*.pages.dev",
    "https://*.vercel.app",
    "https://*.ngrok-free.app",
    "https://secure-mobile.walletconnect.com",
    "https://secure-mobile.walletconnect.org"
  ]
};
function defineChain(chain) {
  return {
    formatters: void 0,
    fees: void 0,
    serializers: void 0,
    ...chain
  };
}
const solana = defineChain({
  id: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  name: "Solana",
  network: "solana-mainnet",
  nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
  rpcUrls: {
    default: { http: ["https://rpc.walletconnect.org/v1"] }
  },
  blockExplorers: { default: { name: "Solscan", url: "https://solscan.io" } },
  testnet: false,
  chainNamespace: "solana",
  caipNetworkId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  deprecatedCaipNetworkId: "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"
});
const solanaDevnet = defineChain({
  id: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  name: "Solana Devnet",
  network: "solana-devnet",
  nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
  rpcUrls: {
    default: { http: ["https://rpc.walletconnect.org/v1"] }
  },
  blockExplorers: { default: { name: "Solscan", url: "https://solscan.io" } },
  testnet: true,
  chainNamespace: "solana",
  caipNetworkId: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  deprecatedCaipNetworkId: "solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K"
});
defineChain({
  id: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
  name: "Solana Testnet",
  network: "solana-testnet",
  nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
  rpcUrls: {
    default: { http: ["https://rpc.walletconnect.org/v1"] }
  },
  blockExplorers: { default: { name: "Solscan", url: "https://solscan.io" } },
  testnet: true,
  chainNamespace: "solana",
  caipNetworkId: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z"
});
defineChain({
  id: "000000000019d6689c085ae165831e93",
  caipNetworkId: "bip122:000000000019d6689c085ae165831e93",
  chainNamespace: "bip122",
  name: "Bitcoin",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8
  },
  rpcUrls: {
    default: { http: ["https://rpc.walletconnect.org/v1"] }
  }
});
defineChain({
  id: "000000000933ea01ad0ee984209779ba",
  caipNetworkId: "bip122:000000000933ea01ad0ee984209779ba",
  chainNamespace: "bip122",
  name: "Bitcoin Testnet",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8
  },
  rpcUrls: {
    default: { http: ["https://rpc.walletconnect.org/v1"] }
  },
  testnet: true
});
const DEFAULT_METHODS = {
  solana: [
    "solana_signMessage",
    "solana_signTransaction",
    "solana_requestAccounts",
    "solana_getAccounts",
    "solana_signAllTransactions",
    "solana_signAndSendTransaction"
  ],
  eip155: [
    "eth_accounts",
    "eth_requestAccounts",
    "eth_sendRawTransaction",
    "eth_sign",
    "eth_signTransaction",
    "eth_signTypedData",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
    "eth_sendTransaction",
    "personal_sign",
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "wallet_getPermissions",
    "wallet_requestPermissions",
    "wallet_registerOnboarding",
    "wallet_watchAsset",
    "wallet_scanQRCode",
    // EIP-5792
    "wallet_getCallsStatus",
    "wallet_showCallsStatus",
    "wallet_sendCalls",
    "wallet_getCapabilities",
    // EIP-7715
    "wallet_grantPermissions",
    "wallet_revokePermissions",
    //EIP-7811
    "wallet_getAssets"
  ],
  bip122: ["sendTransfer", "signMessage", "signPsbt", "getAccountAddresses"]
};
const WcHelpersUtil = {
  getMethodsByChainNamespace(chainNamespace) {
    return DEFAULT_METHODS[chainNamespace] || [];
  },
  createDefaultNamespace(chainNamespace) {
    return {
      methods: this.getMethodsByChainNamespace(chainNamespace),
      events: ["accountsChanged", "chainChanged"],
      chains: [],
      rpcMap: {}
    };
  },
  applyNamespaceOverrides(baseNamespaces, overrides) {
    if (!overrides) {
      return { ...baseNamespaces };
    }
    const result = { ...baseNamespaces };
    const namespacesToOverride = /* @__PURE__ */ new Set();
    if (overrides.methods) {
      Object.keys(overrides.methods).forEach((ns2) => namespacesToOverride.add(ns2));
    }
    if (overrides.chains) {
      Object.keys(overrides.chains).forEach((ns2) => namespacesToOverride.add(ns2));
    }
    if (overrides.events) {
      Object.keys(overrides.events).forEach((ns2) => namespacesToOverride.add(ns2));
    }
    if (overrides.rpcMap) {
      Object.keys(overrides.rpcMap).forEach((chainId) => {
        const [ns2] = chainId.split(":");
        if (ns2) {
          namespacesToOverride.add(ns2);
        }
      });
    }
    namespacesToOverride.forEach((ns2) => {
      if (!result[ns2]) {
        result[ns2] = this.createDefaultNamespace(ns2);
      }
    });
    if (overrides.methods) {
      Object.entries(overrides.methods).forEach(([ns2, methods]) => {
        if (result[ns2]) {
          result[ns2].methods = methods;
        }
      });
    }
    if (overrides.chains) {
      Object.entries(overrides.chains).forEach(([ns2, chains]) => {
        if (result[ns2]) {
          result[ns2].chains = chains;
        }
      });
    }
    if (overrides.events) {
      Object.entries(overrides.events).forEach(([ns2, events]) => {
        if (result[ns2]) {
          result[ns2].events = events;
        }
      });
    }
    if (overrides.rpcMap) {
      const processedNamespaces = /* @__PURE__ */ new Set();
      Object.entries(overrides.rpcMap).forEach(([chainId, rpcUrl]) => {
        const [ns2, id] = chainId.split(":");
        if (!ns2 || !id || !result[ns2]) {
          return;
        }
        if (!result[ns2].rpcMap) {
          result[ns2].rpcMap = {};
        }
        if (!processedNamespaces.has(ns2)) {
          result[ns2].rpcMap = {};
          processedNamespaces.add(ns2);
        }
        result[ns2].rpcMap[id] = rpcUrl;
      });
    }
    return result;
  },
  createNamespaces(caipNetworks, configOverride) {
    const defaultNamespaces = caipNetworks.reduce((acc, chain) => {
      const { id, chainNamespace, rpcUrls } = chain;
      const rpcUrl = rpcUrls.default.http[0];
      if (!acc[chainNamespace]) {
        acc[chainNamespace] = this.createDefaultNamespace(chainNamespace);
      }
      const caipNetworkId = `${chainNamespace}:${id}`;
      const namespace = acc[chainNamespace];
      namespace.chains.push(caipNetworkId);
      switch (caipNetworkId) {
        case solana.caipNetworkId:
          namespace.chains.push(solana.deprecatedCaipNetworkId);
          break;
        case solanaDevnet.caipNetworkId:
          namespace.chains.push(solanaDevnet.deprecatedCaipNetworkId);
          break;
      }
      if (namespace?.rpcMap && rpcUrl) {
        namespace.rpcMap[id] = rpcUrl;
      }
      return acc;
    }, {});
    return this.applyNamespaceOverrides(defaultNamespaces, configOverride);
  },
  resolveReownName: async (name) => {
    const wcNameAddress = await EnsController.resolveName(name);
    const networkNameAddresses = Object.values(wcNameAddress?.addresses) || [];
    return networkNameAddresses[0]?.address || false;
  },
  getChainsFromNamespaces(namespaces = {}) {
    return Object.values(namespaces).flatMap((namespace) => {
      const chains = namespace.chains || [];
      const accountsChains = namespace.accounts.map((account) => {
        const [chainNamespace, chainId] = account.split(":");
        return `${chainNamespace}:${chainId}`;
      });
      return Array.from(/* @__PURE__ */ new Set([...chains, ...accountsChains]));
    });
  },
  isSessionEventData(data) {
    return typeof data === "object" && data !== null && "id" in data && "topic" in data && "params" in data && typeof data.params === "object" && data.params !== null && "chainId" in data.params && "event" in data.params && typeof data.params.event === "object" && data.params.event !== null;
  },
  isOriginAllowed(currentOrigin, allowedPatterns, defaultAllowedOrigins) {
    for (const pattern of [...allowedPatterns, ...defaultAllowedOrigins]) {
      if (pattern.includes("*")) {
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
        const regexString = `^${escapedPattern.replace(/\\\*/gu, ".*")}$`;
        const regex = new RegExp(regexString, "u");
        if (regex.test(currentOrigin)) {
          return true;
        }
      } else {
        try {
          if (new URL(pattern).origin === currentOrigin) {
            return true;
          }
        } catch (e2) {
          if (pattern === currentOrigin) {
            return true;
          }
        }
      }
    }
    return false;
  }
};
class WalletConnectConnector {
  constructor({ provider, namespace }) {
    this.id = ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT;
    this.name = PresetsUtil.ConnectorNamesMap[ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT];
    this.type = "WALLET_CONNECT";
    this.imageId = PresetsUtil.ConnectorImageIds[ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT];
    this.getCaipNetworks = ChainController.getCaipNetworks.bind(ChainController);
    this.caipNetworks = this.getCaipNetworks();
    this.provider = provider;
    this.chain = namespace;
  }
  get chains() {
    return this.getCaipNetworks();
  }
  async connectWalletConnect() {
    const isAuthenticated = await this.authenticate();
    if (!isAuthenticated) {
      const caipNetworks = this.getCaipNetworks();
      const universalProviderConfigOverride = OptionsController.state.universalProviderConfigOverride;
      const namespaces = WcHelpersUtil.createNamespaces(caipNetworks, universalProviderConfigOverride);
      await this.provider.connect({ optionalNamespaces: namespaces });
    }
    return {
      clientId: await this.provider.client.core.crypto.getClientId(),
      session: this.provider.session
    };
  }
  async disconnect() {
    await this.provider.disconnect();
  }
  async authenticate() {
    const chains = this.chains.map((network) => network.caipNetworkId);
    return SIWXUtil.universalProviderAuthenticate({
      universalProvider: this.provider,
      chains,
      methods: OPTIONAL_METHODS
    });
  }
}
const OPTIONAL_METHODS = [
  "eth_accounts",
  "eth_requestAccounts",
  "eth_sendRawTransaction",
  "eth_sign",
  "eth_signTransaction",
  "eth_signTypedData",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "eth_sendTransaction",
  "personal_sign",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
  "wallet_getPermissions",
  "wallet_requestPermissions",
  "wallet_registerOnboarding",
  "wallet_watchAsset",
  "wallet_scanQRCode",
  // EIP-5792
  "wallet_getCallsStatus",
  "wallet_sendCalls",
  "wallet_getCapabilities",
  // EIP-7715
  "wallet_grantPermissions",
  "wallet_revokePermissions",
  //EIP-7811
  "wallet_getAssets"
];
class AdapterBlueprint {
  /**
   * Creates an instance of AdapterBlueprint.
   * @param {AdapterBlueprint.Params} params - The parameters for initializing the adapter
   */
  constructor(params) {
    this.availableConnectors = [];
    this.eventListeners = /* @__PURE__ */ new Map();
    this.getCaipNetworks = (namespace) => ChainController.getCaipNetworks(namespace);
    if (params) {
      this.construct(params);
    }
  }
  /**
   * Initializes the adapter with the given parameters.
   * @param {AdapterBlueprint.Params} params - The parameters for initializing the adapter
   */
  construct(params) {
    this.projectId = params.projectId;
    this.namespace = params.namespace;
    this.adapterType = params.adapterType;
  }
  /**
   * Gets the available connectors.
   * @returns {Connector[]} An array of available connectors
   */
  get connectors() {
    return this.availableConnectors;
  }
  /**
   * Gets the supported networks.
   * @returns {CaipNetwork[]} An array of supported networks
   */
  get networks() {
    return this.getCaipNetworks(this.namespace);
  }
  /**
   * Sets the auth provider.
   * @param {W3mFrameProvider} authProvider - The auth provider instance
   */
  setAuthProvider(authProvider) {
    this.addConnector({
      id: ConstantsUtil$3.CONNECTOR_ID.AUTH,
      type: "AUTH",
      name: ConstantsUtil$3.CONNECTOR_NAMES.AUTH,
      provider: authProvider,
      imageId: PresetsUtil.ConnectorImageIds[ConstantsUtil$3.CONNECTOR_ID.AUTH],
      chain: this.namespace,
      chains: []
    });
  }
  /**
   * Adds one or more connectors to the available connectors list.
   * @param {...Connector} connectors - The connectors to add
   */
  addConnector(...connectors) {
    const connectorsAdded = /* @__PURE__ */ new Set();
    this.availableConnectors = [...connectors, ...this.availableConnectors].filter((connector) => {
      if (connectorsAdded.has(connector.id)) {
        return false;
      }
      connectorsAdded.add(connector.id);
      return true;
    });
    this.emit("connectors", this.availableConnectors);
  }
  setStatus(status, chainNamespace) {
    AccountController.setStatus(status, chainNamespace);
  }
  /**
   * Adds an event listener for a specific event.
   * @template T
   * @param {T} eventName - The name of the event
   * @param {EventCallback<T>} callback - The callback function to be called when the event is emitted
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, /* @__PURE__ */ new Set());
    }
    this.eventListeners.get(eventName)?.add(callback);
  }
  /**
   * Removes an event listener for a specific event.
   * @template T
   * @param {T} eventName - The name of the event
   * @param {EventCallback<T>} callback - The callback function to be removed
   */
  off(eventName, callback) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  /**
   * Removes all event listeners.
   */
  removeAllEventListeners() {
    this.eventListeners.forEach((listeners) => {
      listeners.clear();
    });
  }
  /**
   * Emits an event with the given name and optional data.
   * @template T
   * @param {T} eventName - The name of the event to emit
   * @param {EventData[T]} [data] - The optional data to be passed to the event listeners
   */
  emit(eventName, data) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
  /**
   * Connects to WalletConnect.
   * @param {number | string} [_chainId] - Optional chain ID to connect to
   */
  async connectWalletConnect(_chainId) {
    const connector = this.getWalletConnectConnector();
    const result = await connector.connectWalletConnect();
    return { clientId: result.clientId };
  }
  /**
   * Switches the network.
   * @param {AdapterBlueprint.SwitchNetworkParams} params - Network switching parameters
   */
  async switchNetwork(params) {
    const { caipNetwork, providerType } = params;
    if (!params.provider) {
      return;
    }
    const provider = "provider" in params.provider ? params.provider.provider : params.provider;
    if (providerType === "WALLET_CONNECT") {
      provider.setDefaultChain(caipNetwork.caipNetworkId);
      return;
    }
    if (provider && providerType === "AUTH") {
      const authProvider = provider;
      const preferredAccountType = AccountController.state.preferredAccountTypes?.[caipNetwork.chainNamespace];
      await authProvider.switchNetwork(caipNetwork.caipNetworkId);
      const user = await authProvider.getUser({
        chainId: caipNetwork.caipNetworkId,
        preferredAccountType
      });
      this.emit("switchNetwork", user);
    }
  }
  getWalletConnectConnector() {
    const connector = this.connectors.find((c2) => c2 instanceof WalletConnectConnector);
    if (!connector) {
      throw new Error("WalletConnectConnector not found");
    }
    return connector;
  }
}
class UniversalAdapter extends AdapterBlueprint {
  setUniversalProvider(universalProvider) {
    this.addConnector(new WalletConnectConnector({
      provider: universalProvider,
      caipNetworks: this.getCaipNetworks(),
      namespace: this.namespace
    }));
  }
  async connect(params) {
    return Promise.resolve({
      id: "WALLET_CONNECT",
      type: "WALLET_CONNECT",
      chainId: Number(params.chainId),
      provider: this.provider,
      address: ""
    });
  }
  async disconnect() {
    try {
      const connector = this.getWalletConnectConnector();
      await connector.disconnect();
    } catch (error) {
      console.warn("UniversalAdapter:disconnect - error", error);
    }
  }
  async getAccounts({ namespace }) {
    const provider = this.provider;
    const addresses = provider?.session?.namespaces?.[namespace]?.accounts?.map((account) => {
      const [, , address] = account.split(":");
      return address;
    }).filter((address, index, self) => self.indexOf(address) === index) || [];
    return Promise.resolve({
      accounts: addresses.map((address) => CoreHelperUtil.createAccount(namespace, address, namespace === "bip122" ? "payment" : "eoa"))
    });
  }
  async syncConnectors() {
    return Promise.resolve();
  }
  async getBalance(params) {
    const isBalanceSupported = params.caipNetwork && ConstantsUtil$2.BALANCE_SUPPORTED_CHAINS.includes(params.caipNetwork?.chainNamespace);
    if (!isBalanceSupported || params.caipNetwork?.testnet) {
      return {
        balance: "0.00",
        symbol: params.caipNetwork?.nativeCurrency.symbol || ""
      };
    }
    if (AccountController.state.balanceLoading && params.chainId === ChainController.state.activeCaipNetwork?.id) {
      return {
        balance: AccountController.state.balance || "0.00",
        symbol: AccountController.state.balanceSymbol || ""
      };
    }
    const balances = await AccountController.fetchTokenBalance();
    const balance = balances.find((b2) => b2.chainId === `${params.caipNetwork?.chainNamespace}:${params.chainId}` && b2.symbol === params.caipNetwork?.nativeCurrency.symbol);
    return {
      balance: balance?.quantity.numeric || "0.00",
      symbol: balance?.symbol || params.caipNetwork?.nativeCurrency.symbol || ""
    };
  }
  async signMessage(params) {
    const { provider, message, address } = params;
    if (!provider) {
      throw new Error("UniversalAdapter:signMessage - provider is undefined");
    }
    let signature = "";
    if (ChainController.state.activeCaipNetwork?.chainNamespace === ConstantsUtil$3.CHAIN.SOLANA) {
      const response = await provider.request({
        method: "solana_signMessage",
        params: {
          message: bs58.encode(new TextEncoder().encode(message)),
          pubkey: address
        }
      }, ChainController.state.activeCaipNetwork?.caipNetworkId);
      signature = response.signature;
    } else {
      signature = await provider.request({
        method: "personal_sign",
        params: [message, address]
      }, ChainController.state.activeCaipNetwork?.caipNetworkId);
    }
    return { signature };
  }
  // -- Transaction methods ---------------------------------------------------
  /**
   *
   * These methods are supported only on `wagmi` and `ethers` since the Solana SDK does not support them in the same way.
   * These function definition is to have a type parity between the clients. Currently not in use.
   */
  async estimateGas() {
    return Promise.resolve({
      gas: BigInt(0)
    });
  }
  async sendTransaction() {
    return Promise.resolve({
      hash: ""
    });
  }
  walletGetAssets(_params) {
    return Promise.resolve({});
  }
  async writeContract() {
    return Promise.resolve({
      hash: ""
    });
  }
  parseUnits() {
    return 0n;
  }
  formatUnits() {
    return "0";
  }
  async getCapabilities() {
    return Promise.resolve({});
  }
  async grantPermissions() {
    return Promise.resolve({});
  }
  async revokePermissions() {
    return Promise.resolve("0x");
  }
  async syncConnection() {
    return Promise.resolve({
      id: "WALLET_CONNECT",
      type: "WALLET_CONNECT",
      chainId: 1,
      provider: this.provider,
      address: ""
    });
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async switchNetwork(params) {
    const { caipNetwork } = params;
    const connector = this.getWalletConnectConnector();
    if (caipNetwork.chainNamespace === ConstantsUtil$3.CHAIN.EVM) {
      try {
        await connector.provider?.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHex$1(caipNetwork.id) }]
        });
      } catch (switchError) {
        if (switchError.code === WcConstantsUtil.ERROR_CODE_UNRECOGNIZED_CHAIN_ID || switchError.code === WcConstantsUtil.ERROR_INVALID_CHAIN_ID || switchError.code === WcConstantsUtil.ERROR_CODE_DEFAULT || switchError?.data?.originalError?.code === WcConstantsUtil.ERROR_CODE_UNRECOGNIZED_CHAIN_ID) {
          try {
            await connector.provider?.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: toHex$1(caipNetwork.id),
                  rpcUrls: [caipNetwork?.rpcUrls["chainDefault"]?.http],
                  chainName: caipNetwork.name,
                  nativeCurrency: caipNetwork.nativeCurrency,
                  blockExplorerUrls: [caipNetwork.blockExplorers?.default.url]
                }
              ]
            });
          } catch (error) {
            throw new Error("Chain is not supported");
          }
        }
      }
    }
    connector.provider.setDefaultChain(caipNetwork.caipNetworkId);
  }
  getWalletConnectProvider() {
    const connector = this.connectors.find((c2) => c2.type === "WALLET_CONNECT");
    const provider = connector?.provider;
    return provider;
  }
}
const FEATURE_KEYS = [
  "email",
  "socials",
  "swaps",
  "onramp",
  "activity",
  "reownBranding"
];
const featureConfig = {
  email: {
    apiFeatureName: "social_login",
    localFeatureName: "email",
    returnType: false,
    isLegacy: false,
    isAvailableOnBasic: false,
    processApi: (apiConfig) => {
      if (!apiConfig?.config) {
        return false;
      }
      const config = apiConfig.config;
      return Boolean(apiConfig.isEnabled) && config.includes("email");
    },
    processFallback: (localValue) => {
      if (localValue === void 0) {
        return ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.email;
      }
      return Boolean(localValue);
    }
  },
  socials: {
    apiFeatureName: "social_login",
    localFeatureName: "socials",
    returnType: false,
    isLegacy: false,
    isAvailableOnBasic: false,
    processApi: (apiConfig) => {
      if (!apiConfig?.config) {
        return false;
      }
      const config = apiConfig.config;
      return Boolean(apiConfig.isEnabled) && config.length > 0 ? config.filter((s2) => s2 !== "email") : false;
    },
    processFallback: (localValue) => {
      if (localValue === void 0) {
        return ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.socials;
      }
      if (typeof localValue === "boolean") {
        return localValue ? ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.socials : false;
      }
      return localValue;
    }
  },
  swaps: {
    apiFeatureName: "swap",
    localFeatureName: "swaps",
    returnType: false,
    isLegacy: false,
    isAvailableOnBasic: false,
    processApi: (apiConfig) => {
      if (!apiConfig?.config) {
        return false;
      }
      const config = apiConfig.config;
      return Boolean(apiConfig.isEnabled) && config.length > 0 ? config : false;
    },
    processFallback: (localValue) => {
      if (localValue === void 0) {
        return ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.swaps;
      }
      if (typeof localValue === "boolean") {
        return localValue ? ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.swaps : false;
      }
      return localValue;
    }
  },
  onramp: {
    apiFeatureName: "onramp",
    localFeatureName: "onramp",
    returnType: false,
    isLegacy: false,
    isAvailableOnBasic: false,
    processApi: (apiConfig) => {
      if (!apiConfig?.config) {
        return false;
      }
      const config = apiConfig.config;
      return Boolean(apiConfig.isEnabled) && config.length > 0 ? config : false;
    },
    processFallback: (localValue) => {
      if (localValue === void 0) {
        return ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.onramp;
      }
      if (typeof localValue === "boolean") {
        return localValue ? ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.onramp : false;
      }
      return localValue;
    }
  },
  activity: {
    apiFeatureName: "activity",
    localFeatureName: "history",
    returnType: false,
    isLegacy: true,
    isAvailableOnBasic: false,
    processApi: (apiConfig) => Boolean(apiConfig.isEnabled),
    processFallback: (localValue) => {
      if (localValue === void 0) {
        return ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.activity;
      }
      return Boolean(localValue);
    }
  },
  reownBranding: {
    apiFeatureName: "reown_branding",
    localFeatureName: "reownBranding",
    returnType: false,
    isLegacy: false,
    isAvailableOnBasic: false,
    processApi: (apiConfig) => Boolean(apiConfig.isEnabled),
    processFallback: (localValue) => {
      if (localValue === void 0) {
        return ConstantsUtil$2.DEFAULT_REMOTE_FEATURES.reownBranding;
      }
      return Boolean(localValue);
    }
  }
};
const ConfigUtil = {
  localSettingsOverridden: /* @__PURE__ */ new Set(),
  getApiConfig(id, apiProjectConfig) {
    return apiProjectConfig?.find((f3) => f3.id === id);
  },
  addWarning(localFeatureValue, featureKey) {
    if (localFeatureValue !== void 0) {
      const config = featureConfig[featureKey];
      const warningName = config.isLegacy ? `"features.${config.localFeatureName}" (now "${featureKey}")` : `"features.${featureKey}"`;
      this.localSettingsOverridden.add(warningName);
    }
  },
  processFeature(featureKey, localFeatures, apiProjectConfig, useApi, isBasic) {
    const config = featureConfig[featureKey];
    const localValue = localFeatures[config.localFeatureName];
    if (isBasic && !config.isAvailableOnBasic) {
      return false;
    }
    if (useApi) {
      const apiConfig = this.getApiConfig(config.apiFeatureName, apiProjectConfig);
      if (apiConfig?.config === null) {
        return this.processFallbackFeature(featureKey, localValue);
      }
      if (!apiConfig?.config) {
        return false;
      }
      if (localValue !== void 0) {
        this.addWarning(localValue, featureKey);
      }
      return this.processApiFeature(featureKey, apiConfig);
    }
    return this.processFallbackFeature(featureKey, localValue);
  },
  processApiFeature(featureKey, apiConfig) {
    return featureConfig[featureKey].processApi(apiConfig);
  },
  processFallbackFeature(featureKey, localValue) {
    return featureConfig[featureKey].processFallback(localValue);
  },
  async fetchRemoteFeatures(config) {
    const isBasic = config.basic ?? false;
    const localFeatures = config.features || {};
    this.localSettingsOverridden.clear();
    let apiProjectConfig = null;
    let useApiConfig = false;
    try {
      apiProjectConfig = await ApiController.fetchProjectConfig();
      useApiConfig = apiProjectConfig !== null && apiProjectConfig !== void 0;
    } catch (e2) {
      console.warn("[Reown Config] Failed to fetch remote project configuration. Using local/default values.", e2);
    }
    const remoteFeaturesConfig = useApiConfig && !isBasic ? ConstantsUtil$2.DEFAULT_REMOTE_FEATURES : ConstantsUtil$2.DEFAULT_REMOTE_FEATURES_DISABLED;
    try {
      for (const featureKey of FEATURE_KEYS) {
        const result = this.processFeature(featureKey, localFeatures, apiProjectConfig, useApiConfig, isBasic);
        Object.assign(remoteFeaturesConfig, { [featureKey]: result });
      }
    } catch (e2) {
      console.warn("[Reown Config] Failed to process the configuration from Cloud. Using default values.", e2);
      return ConstantsUtil$2.DEFAULT_REMOTE_FEATURES;
    }
    if (useApiConfig && this.localSettingsOverridden.size > 0) {
      const warningMessage = `Your local configuration for ${Array.from(this.localSettingsOverridden).join(", ")} was ignored because a remote configuration was successfully fetched. Please manage these features via your project dashboard on dashboard.reown.com.`;
      AlertController.open({
        shortMessage: "Local configuration ignored",
        longMessage: `[Reown Config Notice] ${warningMessage}`
      }, "warning");
    }
    return remoteFeaturesConfig;
  }
};
class AppKitBaseClient {
  constructor(options) {
    this.chainNamespaces = [];
    this.remoteFeatures = {};
    this.reportedAlertErrors = {};
    this.getCaipNetwork = (chainNamespace, id) => {
      if (chainNamespace) {
        const caipNetworkWithId = ChainController.getNetworkData(chainNamespace)?.requestedCaipNetworks?.find((c2) => c2.id === id);
        if (caipNetworkWithId) {
          return caipNetworkWithId;
        }
        const namespaceCaipNetwork = ChainController.getNetworkData(chainNamespace)?.caipNetwork;
        if (namespaceCaipNetwork) {
          return namespaceCaipNetwork;
        }
        const requestedCaipNetworks = ChainController.getRequestedCaipNetworks(chainNamespace);
        return requestedCaipNetworks.filter((c2) => c2.chainNamespace === chainNamespace)?.[0];
      }
      return ChainController.state.activeCaipNetwork || this.defaultCaipNetwork;
    };
    this.getCaipNetworkId = () => {
      const network = this.getCaipNetwork();
      if (network) {
        return network.id;
      }
      return void 0;
    };
    this.getCaipNetworks = (namespace) => ChainController.getCaipNetworks(namespace);
    this.getActiveChainNamespace = () => ChainController.state.activeChain;
    this.setRequestedCaipNetworks = (requestedCaipNetworks, chain) => {
      ChainController.setRequestedCaipNetworks(requestedCaipNetworks, chain);
    };
    this.getApprovedCaipNetworkIds = () => ChainController.getAllApprovedCaipNetworkIds();
    this.getCaipAddress = (chainNamespace) => {
      if (ChainController.state.activeChain === chainNamespace || !chainNamespace) {
        return ChainController.state.activeCaipAddress;
      }
      return ChainController.getAccountProp("caipAddress", chainNamespace);
    };
    this.setClientId = (clientId) => {
      BlockchainApiController.setClientId(clientId);
    };
    this.getProvider = (namespace) => ProviderUtil.getProvider(namespace);
    this.getProviderType = (namespace) => ProviderUtil.getProviderId(namespace);
    this.getPreferredAccountType = (namespace) => AccountController.state.preferredAccountTypes?.[namespace];
    this.setCaipAddress = (caipAddress, chain) => {
      AccountController.setCaipAddress(caipAddress, chain);
      if (caipAddress && OptionsController.state.enableEmbedded) {
        this.close();
      }
    };
    this.setBalance = (balance, balanceSymbol, chain) => {
      AccountController.setBalance(balance, balanceSymbol, chain);
    };
    this.setProfileName = (profileName, chain) => {
      AccountController.setProfileName(profileName, chain);
    };
    this.setProfileImage = (profileImage, chain) => {
      AccountController.setProfileImage(profileImage, chain);
    };
    this.setUser = (user, chain) => {
      AccountController.setUser(user, chain);
    };
    this.resetAccount = (chain) => {
      AccountController.resetAccount(chain);
    };
    this.setCaipNetwork = (caipNetwork) => {
      ChainController.setActiveCaipNetwork(caipNetwork);
    };
    this.setCaipNetworkOfNamespace = (caipNetwork, chainNamespace) => {
      ChainController.setChainNetworkData(chainNamespace, { caipNetwork });
    };
    this.setAllAccounts = (addresses, chain) => {
      AccountController.setAllAccounts(addresses, chain);
      OptionsController.setHasMultipleAddresses(addresses?.length > 1);
    };
    this.setStatus = (status, chain) => {
      AccountController.setStatus(status, chain);
      if (ConnectorController.isConnected()) {
        StorageUtil.setConnectionStatus("connected");
      } else {
        StorageUtil.setConnectionStatus("disconnected");
      }
    };
    this.getAddressByChainNamespace = (chainNamespace) => ChainController.getAccountProp("address", chainNamespace);
    this.setConnectors = (connectors) => {
      const allConnectors = [...ConnectorController.state.allConnectors, ...connectors];
      ConnectorController.setConnectors(allConnectors);
    };
    this.setConnections = (connections, chainNamespace) => {
      ConnectionController.setConnections(connections, chainNamespace);
    };
    this.fetchIdentity = (request) => BlockchainApiController.fetchIdentity(request);
    this.getReownName = (address) => EnsController.getNamesForAddress(address);
    this.getConnectors = () => ConnectorController.getConnectors();
    this.getConnectorImage = (connector) => AssetUtil.getConnectorImage(connector);
    this.setConnectedWalletInfo = (connectedWalletInfo, chain) => {
      const type = ProviderUtil.getProviderId(chain);
      const walletInfo = connectedWalletInfo ? { ...connectedWalletInfo, type } : void 0;
      AccountController.setConnectedWalletInfo(walletInfo, chain);
    };
    this.getIsConnectedState = () => Boolean(ChainController.state.activeCaipAddress);
    this.addAddressLabel = (address, label, chain) => {
      AccountController.addAddressLabel(address, label, chain);
    };
    this.removeAddressLabel = (address, chain) => {
      AccountController.removeAddressLabel(address, chain);
    };
    this.getAddress = (chainNamespace) => {
      if (ChainController.state.activeChain === chainNamespace || !chainNamespace) {
        return AccountController.state.address;
      }
      return ChainController.getAccountProp("address", chainNamespace);
    };
    this.setApprovedCaipNetworksData = (namespace) => ChainController.setApprovedCaipNetworksData(namespace);
    this.resetNetwork = (namespace) => {
      ChainController.resetNetwork(namespace);
    };
    this.addConnector = (connector) => {
      ConnectorController.addConnector(connector);
    };
    this.resetWcConnection = () => {
      ConnectionController.resetWcConnection();
    };
    this.setAddressExplorerUrl = (addressExplorerUrl, chain) => {
      AccountController.setAddressExplorerUrl(addressExplorerUrl, chain);
    };
    this.setSmartAccountDeployed = (isDeployed, chain) => {
      AccountController.setSmartAccountDeployed(isDeployed, chain);
    };
    this.setSmartAccountEnabledNetworks = (smartAccountEnabledNetworks, chain) => {
      ChainController.setSmartAccountEnabledNetworks(smartAccountEnabledNetworks, chain);
    };
    this.setPreferredAccountType = (preferredAccountType, chain) => {
      AccountController.setPreferredAccountType(preferredAccountType, chain);
    };
    this.setEIP6963Enabled = (enabled) => {
      OptionsController.setEIP6963Enabled(enabled);
    };
    this.handleUnsafeRPCRequest = () => {
      if (this.isOpen()) {
        if (this.isTransactionStackEmpty()) {
          return;
        }
        this.redirect("ApproveTransaction");
      } else {
        this.open({ view: "ApproveTransaction" });
      }
    };
    this.options = options;
    this.version = options.sdkVersion;
    this.caipNetworks = this.extendCaipNetworks(options);
    this.chainNamespaces = this.getChainNamespacesSet(options.adapters, this.caipNetworks);
    this.defaultCaipNetwork = this.extendDefaultCaipNetwork(options);
    this.chainAdapters = this.createAdapters(options.adapters);
    this.readyPromise = this.initialize(options);
  }
  getChainNamespacesSet(adapters, caipNetworks) {
    const adapterNamespaces = adapters?.map((adapter) => adapter.namespace).filter((namespace) => Boolean(namespace));
    if (adapterNamespaces?.length) {
      return [...new Set(adapterNamespaces)];
    }
    const networkNamespaces = caipNetworks?.map((network) => network.chainNamespace);
    return [...new Set(networkNamespaces)];
  }
  async initialize(options) {
    this.initializeProjectSettings(options);
    this.initControllers(options);
    await this.initChainAdapters();
    this.sendInitializeEvent(options);
    await this.syncExistingConnection();
    this.remoteFeatures = await ConfigUtil.fetchRemoteFeatures(options);
    OptionsController.setRemoteFeatures(this.remoteFeatures);
    if (this.remoteFeatures.onramp) {
      OnRampController.setOnrampProviders(this.remoteFeatures.onramp);
    }
    if (OptionsController.state.remoteFeatures?.email || Array.isArray(OptionsController.state.remoteFeatures?.socials) && OptionsController.state.remoteFeatures?.socials.length > 0) {
      await this.checkAllowedOrigins();
    }
  }
  async checkAllowedOrigins() {
    const allowedOrigins = await ApiController.fetchAllowedOrigins();
    if (allowedOrigins && CoreHelperUtil.isClient()) {
      const currentOrigin = window.location.origin;
      const isOriginAllowed = WcHelpersUtil.isOriginAllowed(currentOrigin, allowedOrigins, WcConstantsUtil.DEFAULT_ALLOWED_ANCESTORS);
      if (!isOriginAllowed) {
        AlertController.open(ErrorUtil.ALERT_ERRORS.INVALID_APP_CONFIGURATION, "error");
      }
    } else {
      AlertController.open(ErrorUtil.ALERT_ERRORS.PROJECT_ID_NOT_CONFIGURED, "error");
    }
  }
  sendInitializeEvent(options) {
    const { ...optionsCopy } = options;
    delete optionsCopy.adapters;
    delete optionsCopy.universalProvider;
    EventsController.sendEvent({
      type: "track",
      event: "INITIALIZE",
      properties: {
        ...optionsCopy,
        networks: options.networks.map((n3) => n3.id),
        siweConfig: {
          options: options.siweConfig?.options || {}
        }
      }
    });
  }
  // -- Controllers initialization ---------------------------------------------------
  initControllers(options) {
    this.initializeOptionsController(options);
    this.initializeChainController(options);
    this.initializeThemeController(options);
    this.initializeConnectionController(options);
    this.initializeConnectorController();
  }
  initializeThemeController(options) {
    if (options.themeMode) {
      ThemeController.setThemeMode(options.themeMode);
    }
    if (options.themeVariables) {
      ThemeController.setThemeVariables(options.themeVariables);
    }
  }
  initializeChainController(options) {
    if (!this.connectionControllerClient || !this.networkControllerClient) {
      throw new Error("ConnectionControllerClient and NetworkControllerClient must be set");
    }
    ChainController.initialize(options.adapters ?? [], this.caipNetworks, {
      connectionControllerClient: this.connectionControllerClient,
      networkControllerClient: this.networkControllerClient
    });
    const network = this.getDefaultNetwork();
    if (network) {
      ChainController.setActiveCaipNetwork(network);
    }
  }
  initializeConnectionController(options) {
    ConnectionController.setWcBasic(options.basic ?? false);
  }
  initializeConnectorController() {
    ConnectorController.initialize(this.chainNamespaces);
  }
  initializeProjectSettings(options) {
    OptionsController.setProjectId(options.projectId);
    OptionsController.setSdkVersion(options.sdkVersion);
  }
  initializeOptionsController(options) {
    OptionsController.setDebug(options.debug !== false);
    OptionsController.setEnableWalletConnect(options.enableWalletConnect !== false);
    OptionsController.setEnableWalletGuide(options.enableWalletGuide !== false);
    OptionsController.setEnableWallets(options.enableWallets !== false);
    OptionsController.setEIP6963Enabled(options.enableEIP6963 !== false);
    OptionsController.setEnableNetworkSwitch(options.enableNetworkSwitch !== false);
    OptionsController.setEnableAuthLogger(options.enableAuthLogger !== false);
    OptionsController.setCustomRpcUrls(options.customRpcUrls);
    OptionsController.setEnableEmbedded(options.enableEmbedded);
    OptionsController.setAllWallets(options.allWallets);
    OptionsController.setIncludeWalletIds(options.includeWalletIds);
    OptionsController.setExcludeWalletIds(options.excludeWalletIds);
    OptionsController.setFeaturedWalletIds(options.featuredWalletIds);
    OptionsController.setTokens(options.tokens);
    OptionsController.setTermsConditionsUrl(options.termsConditionsUrl);
    OptionsController.setPrivacyPolicyUrl(options.privacyPolicyUrl);
    OptionsController.setCustomWallets(options.customWallets);
    OptionsController.setFeatures(options.features);
    OptionsController.setAllowUnsupportedChain(options.allowUnsupportedChain);
    OptionsController.setUniversalProviderConfigOverride(options.universalProviderConfigOverride);
    OptionsController.setPreferUniversalLinks(options.experimental_preferUniversalLinks);
    OptionsController.setDefaultAccountTypes(options.defaultAccountTypes);
    const storedAccountTypes = StorageUtil.getPreferredAccountTypes() || {};
    const defaultTypes = { ...OptionsController.state.defaultAccountTypes, ...storedAccountTypes };
    AccountController.setPreferredAccountTypes(defaultTypes);
    const defaultMetaData = this.getDefaultMetaData();
    if (!options.metadata && defaultMetaData) {
      options.metadata = defaultMetaData;
    }
    OptionsController.setMetadata(options.metadata);
    OptionsController.setDisableAppend(options.disableAppend);
    OptionsController.setEnableEmbedded(options.enableEmbedded);
    OptionsController.setSIWX(options.siwx);
    if (!options.projectId) {
      AlertController.open(ErrorUtil.ALERT_ERRORS.PROJECT_ID_NOT_CONFIGURED, "error");
      return;
    }
    const evmAdapter = options.adapters?.find((adapter) => adapter.namespace === ConstantsUtil$3.CHAIN.EVM);
    if (evmAdapter) {
      if (options.siweConfig) {
        if (options.siwx) {
          throw new Error("Cannot set both `siweConfig` and `siwx` options");
        }
        OptionsController.setSIWX(options.siweConfig.mapToSIWX());
      }
    }
  }
  getDefaultMetaData() {
    if (CoreHelperUtil.isClient()) {
      return {
        name: document.getElementsByTagName("title")?.[0]?.textContent || "",
        description: document.querySelector('meta[property="og:description"]')?.content || "",
        url: window.location.origin,
        icons: [document.querySelector('link[rel~="icon"]')?.href || ""]
      };
    }
    return null;
  }
  // -- Network Initialization ---------------------------------------------------
  setUnsupportedNetwork(chainId) {
    const namespace = this.getActiveChainNamespace();
    if (namespace) {
      const unsupportedNetwork = CaipNetworksUtil.getUnsupportedNetwork(`${namespace}:${chainId}`);
      ChainController.setActiveCaipNetwork(unsupportedNetwork);
    }
  }
  getDefaultNetwork() {
    return CaipNetworksUtil.getCaipNetworkFromStorage(this.defaultCaipNetwork);
  }
  extendCaipNetwork(network, options) {
    const extendedNetwork = CaipNetworksUtil.extendCaipNetwork(network, {
      customNetworkImageUrls: options.chainImages,
      projectId: options.projectId
    });
    return extendedNetwork;
  }
  extendCaipNetworks(options) {
    const extendedNetworks = CaipNetworksUtil.extendCaipNetworks(options.networks, {
      customNetworkImageUrls: options.chainImages,
      customRpcUrls: options.customRpcUrls,
      projectId: options.projectId
    });
    return extendedNetworks;
  }
  extendDefaultCaipNetwork(options) {
    const defaultNetwork = options.networks.find((n3) => n3.id === options.defaultNetwork?.id);
    const extendedNetwork = defaultNetwork ? CaipNetworksUtil.extendCaipNetwork(defaultNetwork, {
      customNetworkImageUrls: options.chainImages,
      customRpcUrls: options.customRpcUrls,
      projectId: options.projectId
    }) : void 0;
    return extendedNetwork;
  }
  async disconnectNamespace(namespace) {
    try {
      const adapter = this.getAdapter(namespace);
      const provider = ProviderUtil.getProvider(namespace);
      const providerType = ProviderUtil.getProviderId(namespace);
      const { caipAddress } = ChainController.getAccountData(namespace) || {};
      this.setLoading(true, namespace);
      if (caipAddress && adapter?.disconnect) {
        await adapter.disconnect({ provider, providerType });
      }
      StorageUtil.removeConnectedNamespace(namespace);
      ProviderUtil.resetChain(namespace);
      this.setUser(void 0, namespace);
      this.setStatus("disconnected", namespace);
      this.setConnectedWalletInfo(void 0, namespace);
      ConnectorController.removeConnectorId(namespace);
      ChainController.resetAccount(namespace);
      ChainController.resetNetwork(namespace);
      this.setLoading(false, namespace);
    } catch (error) {
      this.setLoading(false, namespace);
      throw new Error(`Failed to disconnect chain ${namespace}: ${error.message}`);
    }
  }
  // -- Client Initialization ---------------------------------------------------
  createClients() {
    this.connectionControllerClient = {
      connectWalletConnect: async () => {
        const activeChain = ChainController.state.activeChain;
        const adapter = this.getAdapter(activeChain);
        const chainId = this.getCaipNetwork(activeChain)?.id;
        if (!adapter) {
          throw new Error("Adapter not found");
        }
        const result = await adapter.connectWalletConnect(chainId);
        this.close();
        this.setClientId(result?.clientId || null);
        StorageUtil.setConnectedNamespaces([...ChainController.state.chains.keys()]);
        this.chainNamespaces.forEach((namespace) => {
          ConnectorController.setConnectorId(ConstantsUtil$1.CONNECTOR_TYPE_WALLET_CONNECT, namespace);
        });
        await this.syncWalletConnectAccount();
      },
      connectExternal: async ({ id, info, type, provider, chain, caipNetwork, socialUri }) => {
        const activeChain = ChainController.state.activeChain;
        const chainToUse = chain || activeChain;
        const adapter = this.getAdapter(chainToUse);
        if (chain && chain !== activeChain && !caipNetwork) {
          const toConnectNetwork = this.getCaipNetworks().find((network) => network.chainNamespace === chain);
          if (toConnectNetwork) {
            this.setCaipNetwork(toConnectNetwork);
          }
        }
        if (!adapter) {
          throw new Error("Adapter not found");
        }
        const fallbackCaipNetwork = this.getCaipNetwork(chainToUse);
        const res = await adapter.connect({
          id,
          info,
          type,
          provider,
          socialUri,
          chainId: caipNetwork?.id || fallbackCaipNetwork?.id,
          rpcUrl: caipNetwork?.rpcUrls?.default?.http?.[0] || fallbackCaipNetwork?.rpcUrls?.default?.http?.[0]
        });
        if (!res) {
          return;
        }
        StorageUtil.addConnectedNamespace(chainToUse);
        this.syncProvider({ ...res, chainNamespace: chainToUse });
        const syncedAccounts = AccountController.state.allAccounts;
        const { accounts } = syncedAccounts?.length > 0 ? (
          // eslint-disable-next-line line-comment-position
          // Using new array else the accounts will have the same reference and react will not re-render
          { accounts: [...syncedAccounts] }
        ) : await adapter.getAccounts({ namespace: chainToUse, id });
        this.setAllAccounts(accounts, chainToUse);
        this.setStatus("connected", chainToUse);
        this.syncConnectedWalletInfo(chainToUse);
      },
      reconnectExternal: async ({ id, info, type, provider }) => {
        const namespace = ChainController.state.activeChain;
        const adapter = this.getAdapter(namespace);
        if (adapter?.reconnect) {
          await adapter?.reconnect({ id, info, type, provider, chainId: this.getCaipNetwork()?.id });
          StorageUtil.addConnectedNamespace(namespace);
          this.syncConnectedWalletInfo(namespace);
        }
      },
      disconnect: async (chainNamespace) => {
        const chainsToDisconnect = getChainsToDisconnect(chainNamespace);
        try {
          const disconnectResults = await Promise.allSettled(chainsToDisconnect.map(async ([ns2]) => this.disconnectNamespace(ns2)));
          SendController.resetSend();
          ConnectionController.resetWcConnection();
          await SIWXUtil.clearSessions();
          ConnectorController.setFilterByNamespace(void 0);
          const failures = disconnectResults.filter((result) => result.status === "rejected");
          if (failures.length > 0) {
            throw new Error(failures.map((f3) => f3.reason.message).join(", "));
          }
          StorageUtil.deleteConnectedSocialProvider();
          EventsController.sendEvent({
            type: "track",
            event: "DISCONNECT_SUCCESS",
            properties: {
              namespace: chainNamespace || "all"
            }
          });
        } catch (error) {
          throw new Error(`Failed to disconnect chains: ${error.message}`);
        }
      },
      checkInstalled: (ids) => {
        if (!ids) {
          return Boolean(window.ethereum);
        }
        return ids.some((id) => Boolean(window.ethereum?.[String(id)]));
      },
      signMessage: async (message) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        const result = await adapter?.signMessage({
          message,
          address: AccountController.state.address,
          provider: ProviderUtil.getProvider(ChainController.state.activeChain)
        });
        return result?.signature || "";
      },
      sendTransaction: async (args) => {
        const namespace = args.chainNamespace;
        if (ConstantsUtil$2.SEND_SUPPORTED_NAMESPACES.includes(namespace)) {
          const adapter = this.getAdapter(ChainController.state.activeChain);
          const provider = ProviderUtil.getProvider(namespace);
          const result = await adapter?.sendTransaction({
            ...args,
            caipNetwork: this.getCaipNetwork(),
            provider
          });
          return result?.hash || "";
        }
        return "";
      },
      estimateGas: async (args) => {
        if (args.chainNamespace === ConstantsUtil$3.CHAIN.EVM) {
          const adapter = this.getAdapter(ChainController.state.activeChain);
          const provider = ProviderUtil.getProvider(ChainController.state.activeChain);
          const caipNetwork = this.getCaipNetwork();
          if (!caipNetwork) {
            throw new Error("CaipNetwork is undefined");
          }
          const result = await adapter?.estimateGas({
            ...args,
            provider,
            caipNetwork
          });
          return result?.gas || 0n;
        }
        return 0n;
      },
      getEnsAvatar: async () => {
        await this.syncIdentity({
          address: AccountController.state.address,
          chainId: Number(this.getCaipNetwork()?.id),
          chainNamespace: ChainController.state.activeChain
        });
        return AccountController.state.profileImage || false;
      },
      getEnsAddress: async (name) => await WcHelpersUtil.resolveReownName(name),
      writeContract: async (args) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        const caipNetwork = this.getCaipNetwork();
        const caipAddress = this.getCaipAddress();
        const provider = ProviderUtil.getProvider(ChainController.state.activeChain);
        if (!caipNetwork || !caipAddress) {
          throw new Error("CaipNetwork or CaipAddress is undefined");
        }
        const result = await adapter?.writeContract({ ...args, caipNetwork, provider, caipAddress });
        return result?.hash;
      },
      parseUnits: (value, decimals) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        return adapter?.parseUnits({ value, decimals }) ?? 0n;
      },
      formatUnits: (value, decimals) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        return adapter?.formatUnits({ value, decimals }) ?? "0";
      },
      getCapabilities: async (params) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        return await adapter?.getCapabilities(params);
      },
      grantPermissions: async (params) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        return await adapter?.grantPermissions(params);
      },
      revokePermissions: async (params) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        if (adapter?.revokePermissions) {
          return await adapter.revokePermissions(params);
        }
        return "0x";
      },
      walletGetAssets: async (params) => {
        const adapter = this.getAdapter(ChainController.state.activeChain);
        return await adapter?.walletGetAssets(params) ?? {};
      },
      updateBalance: (namespace) => {
        const caipNetwork = this.getCaipNetwork(namespace);
        if (!caipNetwork || !AccountController.state.address) {
          return;
        }
        this.updateNativeBalance(AccountController.state.address, caipNetwork?.id, namespace);
      }
    };
    this.networkControllerClient = {
      switchCaipNetwork: async (caipNetwork) => await this.switchCaipNetwork(caipNetwork),
      // eslint-disable-next-line @typescript-eslint/require-await
      getApprovedCaipNetworksData: async () => this.getApprovedCaipNetworksData()
    };
    ConnectionController.setClient(this.connectionControllerClient);
  }
  getApprovedCaipNetworksData() {
    const providerType = ProviderUtil.getProviderId(ChainController.state.activeChain);
    if (providerType === ConstantsUtil$1.CONNECTOR_TYPE_WALLET_CONNECT) {
      const namespaces = this.universalProvider?.session?.namespaces;
      return {
        /*
         * MetaMask Wallet only returns 1 namespace in the session object. This makes it imposible
         * to switch to other networks. Setting supportsAllNetworks to true for MetaMask Wallet
         * will make it possible to switch to other networks.
         */
        supportsAllNetworks: this.universalProvider?.session?.peer?.metadata.name === "MetaMask Wallet",
        approvedCaipNetworkIds: this.getChainsFromNamespaces(namespaces)
      };
    }
    return { supportsAllNetworks: true, approvedCaipNetworkIds: [] };
  }
  async switchCaipNetwork(caipNetwork) {
    if (!caipNetwork) {
      return;
    }
    const networkNamespace = caipNetwork.chainNamespace;
    const namespaceAddress = this.getAddressByChainNamespace(caipNetwork.chainNamespace);
    if (namespaceAddress) {
      const provider = ProviderUtil.getProvider(networkNamespace);
      const providerType = ProviderUtil.getProviderId(networkNamespace);
      if (caipNetwork.chainNamespace === ChainController.state.activeChain) {
        const adapter = this.getAdapter(networkNamespace);
        await adapter?.switchNetwork({ caipNetwork, provider, providerType });
      } else {
        this.setCaipNetwork(caipNetwork);
        if (providerType === ConstantsUtil$1.CONNECTOR_TYPE_WALLET_CONNECT) {
          this.syncWalletConnectAccount();
        } else {
          const address = this.getAddressByChainNamespace(networkNamespace);
          if (address) {
            this.syncAccount({
              address,
              chainId: caipNetwork.id,
              chainNamespace: networkNamespace
            });
          }
        }
      }
    } else {
      this.setCaipNetwork(caipNetwork);
    }
  }
  getChainsFromNamespaces(namespaces = {}) {
    return Object.values(namespaces).flatMap((namespace) => {
      const chains = namespace.chains || [];
      const accountsChains = namespace.accounts.map((account) => {
        const { chainId, chainNamespace } = ParseUtil.parseCaipAddress(account);
        return `${chainNamespace}:${chainId}`;
      });
      return Array.from(/* @__PURE__ */ new Set([...chains, ...accountsChains]));
    });
  }
  // -- Adapter Initialization ---------------------------------------------------
  createAdapters(blueprints) {
    this.createClients();
    return this.chainNamespaces.reduce((adapters, namespace) => {
      const blueprint = blueprints?.find((b2) => b2.namespace === namespace);
      if (blueprint) {
        blueprint.construct({
          namespace,
          projectId: this.options?.projectId,
          networks: this.getCaipNetworks()
        });
        adapters[namespace] = blueprint;
      } else {
        adapters[namespace] = new UniversalAdapter({
          namespace,
          networks: this.getCaipNetworks()
        });
      }
      return adapters;
    }, {});
  }
  async initChainAdapter(namespace) {
    this.onConnectors(namespace);
    this.listenAdapter(namespace);
    await this.chainAdapters?.[namespace].syncConnectors(this.options, this);
    await this.createUniversalProviderForAdapter(namespace);
  }
  async initChainAdapters() {
    await Promise.all(this.chainNamespaces.map(async (namespace) => {
      await this.initChainAdapter(namespace);
    }));
  }
  onConnectors(chainNamespace) {
    const adapter = this.getAdapter(chainNamespace);
    adapter?.on("connectors", this.setConnectors.bind(this));
  }
  listenAdapter(chainNamespace) {
    const adapter = this.getAdapter(chainNamespace);
    if (!adapter) {
      return;
    }
    const connectionStatus = StorageUtil.getConnectionStatus();
    if (connectionStatus === "connected") {
      this.setStatus("connecting", chainNamespace);
    } else if (connectionStatus === "disconnected") {
      StorageUtil.clearAddressCache();
      this.setStatus(connectionStatus, chainNamespace);
    } else {
      this.setStatus(connectionStatus, chainNamespace);
    }
    adapter.on("switchNetwork", ({ address, chainId }) => {
      const caipNetwork = this.getCaipNetworks().find((n3) => n3.id === chainId || n3.caipNetworkId === chainId);
      const isSameNamespace = ChainController.state.activeChain === chainNamespace;
      const accountAddress = ChainController.getAccountProp("address", chainNamespace);
      if (caipNetwork) {
        const account = isSameNamespace && address ? address : accountAddress;
        if (account) {
          this.syncAccount({ address: account, chainId: caipNetwork.id, chainNamespace });
        }
      } else {
        this.setUnsupportedNetwork(chainId);
      }
    });
    adapter.on("disconnect", this.disconnect.bind(this, chainNamespace));
    adapter.on("connections", (connections) => {
      this.setConnections(connections, chainNamespace);
    });
    adapter.on("pendingTransactions", () => {
      const address = AccountController.state.address;
      const activeCaipNetwork = ChainController.state.activeCaipNetwork;
      if (!address || !activeCaipNetwork?.id) {
        return;
      }
      this.updateNativeBalance(address, activeCaipNetwork.id, activeCaipNetwork.chainNamespace);
    });
    adapter.on("accountChanged", ({ address, chainId }) => {
      const isActiveChain = ChainController.state.activeChain === chainNamespace;
      if (isActiveChain && chainId) {
        this.syncAccount({
          address,
          chainId,
          chainNamespace
        });
      } else if (isActiveChain && ChainController.state.activeCaipNetwork?.id) {
        this.syncAccount({
          address,
          chainId: ChainController.state.activeCaipNetwork?.id,
          chainNamespace
        });
      } else {
        this.syncAccountInfo(address, chainId, chainNamespace);
      }
      this.syncAllAccounts(chainNamespace);
    });
  }
  async createUniversalProviderForAdapter(chainNamespace) {
    await this.getUniversalProvider();
    if (this.universalProvider) {
      this.chainAdapters?.[chainNamespace]?.setUniversalProvider?.(this.universalProvider);
    }
  }
  // -- Connection Sync ---------------------------------------------------
  async syncExistingConnection() {
    await Promise.allSettled(this.chainNamespaces.map((namespace) => this.syncNamespaceConnection(namespace)));
  }
  async syncNamespaceConnection(namespace) {
    try {
      if (namespace === ConstantsUtil$3.CHAIN.EVM && CoreHelperUtil.isSafeApp()) {
        ConnectorController.setConnectorId(ConstantsUtil$3.CONNECTOR_ID.SAFE, namespace);
      }
      const connectorId = ConnectorController.getConnectorId(namespace);
      this.setStatus("connecting", namespace);
      switch (connectorId) {
        case ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT:
          await this.syncWalletConnectAccount();
          break;
        case ConstantsUtil$3.CONNECTOR_ID.AUTH:
          break;
        default:
          await this.syncAdapterConnection(namespace);
      }
    } catch (err) {
      console.warn("AppKit couldn't sync existing connection", err);
      this.setStatus("disconnected", namespace);
    }
  }
  async syncAdapterConnection(namespace) {
    const adapter = this.getAdapter(namespace);
    const connectorId = ConnectorController.getConnectorId(namespace);
    const caipNetwork = this.getCaipNetwork(namespace);
    const connectors = ConnectorController.getConnectors(namespace);
    const connector = connectors.find((c2) => c2.id === connectorId);
    try {
      if (!adapter || !connector) {
        throw new Error(`Adapter or connector not found for namespace ${namespace}`);
      }
      if (!caipNetwork?.id) {
        throw new Error("CaipNetwork not found");
      }
      const connection = await adapter?.syncConnection({
        namespace,
        id: connector.id,
        chainId: caipNetwork.id,
        rpcUrl: caipNetwork?.rpcUrls?.default?.http?.[0]
      });
      if (connection) {
        const accounts = await adapter?.getAccounts({
          namespace,
          id: connector.id
        });
        if (accounts && accounts.accounts.length > 0) {
          this.setAllAccounts(accounts.accounts, namespace);
        } else {
          this.setAllAccounts([CoreHelperUtil.createAccount(namespace, connection.address, "eoa")], namespace);
        }
        this.syncProvider({ ...connection, chainNamespace: namespace });
        await this.syncAccount({ ...connection, chainNamespace: namespace });
        this.setStatus("connected", namespace);
      } else {
        this.setStatus("disconnected", namespace);
      }
    } catch (e2) {
      this.setStatus("disconnected", namespace);
    }
  }
  async syncWalletConnectAccount() {
    const syncTasks = this.chainNamespaces.map(async (chainNamespace) => {
      const adapter = this.getAdapter(chainNamespace);
      const namespaceAccounts = this.universalProvider?.session?.namespaces?.[chainNamespace]?.accounts || [];
      const activeChainId = ChainController.state.activeCaipNetwork?.id;
      const sessionAddress = namespaceAccounts.find((account) => {
        const { chainId } = ParseUtil.parseCaipAddress(account);
        return chainId === activeChainId?.toString();
      }) || namespaceAccounts[0];
      if (sessionAddress) {
        const caipAddress = ParseUtil.validateCaipAddress(sessionAddress);
        const { chainId, address } = ParseUtil.parseCaipAddress(caipAddress);
        ProviderUtil.setProviderId(chainNamespace, ConstantsUtil$1.CONNECTOR_TYPE_WALLET_CONNECT);
        if (this.caipNetworks && ChainController.state.activeCaipNetwork && adapter?.namespace !== ConstantsUtil$3.CHAIN.EVM) {
          const provider = adapter?.getWalletConnectProvider({
            caipNetworks: this.getCaipNetworks(),
            provider: this.universalProvider,
            activeCaipNetwork: ChainController.state.activeCaipNetwork
          });
          ProviderUtil.setProvider(chainNamespace, provider);
        } else {
          ProviderUtil.setProvider(chainNamespace, this.universalProvider);
        }
        ConnectorController.setConnectorId(ConstantsUtil$3.CONNECTOR_ID.WALLET_CONNECT, chainNamespace);
        StorageUtil.addConnectedNamespace(chainNamespace);
        this.syncWalletConnectAccounts(chainNamespace);
        await this.syncAccount({
          address,
          chainId,
          chainNamespace
        });
      } else {
        this.setStatus("disconnected", chainNamespace);
      }
      this.syncConnectedWalletInfo(chainNamespace);
      await ChainController.setApprovedCaipNetworksData(chainNamespace);
    });
    await Promise.all(syncTasks);
  }
  syncWalletConnectAccounts(chainNamespace) {
    const addresses = this.universalProvider?.session?.namespaces?.[chainNamespace]?.accounts?.map((account) => {
      const { address } = ParseUtil.parseCaipAddress(account);
      return address;
    }).filter((address, index, self) => self.indexOf(address) === index);
    if (addresses) {
      this.setAllAccounts(addresses.map((address) => CoreHelperUtil.createAccount(chainNamespace, address, chainNamespace === "bip122" ? "payment" : "eoa")), chainNamespace);
    }
  }
  syncProvider({ type, provider, id, chainNamespace }) {
    ProviderUtil.setProviderId(chainNamespace, type);
    ProviderUtil.setProvider(chainNamespace, provider);
    ConnectorController.setConnectorId(id, chainNamespace);
  }
  async syncAllAccounts(namespace) {
    const connectorId = ConnectorController.getConnectorId(namespace);
    if (!connectorId) {
      return;
    }
    const adapter = this.getAdapter(namespace);
    const accounts = await adapter?.getAccounts({ namespace, id: connectorId });
    if (accounts && accounts.accounts.length > 0) {
      this.setAllAccounts(accounts.accounts, namespace);
    }
  }
  async syncAccount(params) {
    const isActiveNamespace = params.chainNamespace === ChainController.state.activeChain;
    const networkOfChain = ChainController.getCaipNetworkByNamespace(params.chainNamespace, params.chainId);
    const { address, chainId, chainNamespace } = params;
    const { chainId: activeChainId } = StorageUtil.getActiveNetworkProps();
    const chainIdToUse = chainId || activeChainId;
    const isUnsupportedNetwork = ChainController.state.activeCaipNetwork?.name === ConstantsUtil$3.UNSUPPORTED_NETWORK_NAME;
    const shouldSupportAllNetworks = ChainController.getNetworkProp("supportsAllNetworks", chainNamespace);
    this.setStatus("connected", chainNamespace);
    if (isUnsupportedNetwork && !shouldSupportAllNetworks) {
      return;
    }
    if (chainIdToUse) {
      let caipNetwork = this.getCaipNetworks().find((n3) => n3.id.toString() === chainIdToUse.toString());
      let fallbackCaipNetwork = this.getCaipNetworks().find((n3) => n3.chainNamespace === chainNamespace);
      if (!shouldSupportAllNetworks && !caipNetwork && !fallbackCaipNetwork) {
        const caipNetworkIds = this.getApprovedCaipNetworkIds() || [];
        const caipNetworkId = caipNetworkIds.find((id) => ParseUtil.parseCaipNetworkId(id)?.chainId === chainIdToUse.toString());
        const fallBackCaipNetworkId = caipNetworkIds.find((id) => ParseUtil.parseCaipNetworkId(id)?.chainNamespace === chainNamespace);
        caipNetwork = this.getCaipNetworks().find((n3) => n3.caipNetworkId === caipNetworkId);
        fallbackCaipNetwork = this.getCaipNetworks().find((n3) => n3.caipNetworkId === fallBackCaipNetworkId || // This is a workaround used in Solana network to support deprecated caipNetworkId
        "deprecatedCaipNetworkId" in n3 && n3.deprecatedCaipNetworkId === fallBackCaipNetworkId);
      }
      const network = caipNetwork || fallbackCaipNetwork;
      if (network?.chainNamespace === ChainController.state.activeChain) {
        if (OptionsController.state.enableNetworkSwitch && !OptionsController.state.allowUnsupportedChain && ChainController.state.activeCaipNetwork?.name === ConstantsUtil$3.UNSUPPORTED_NETWORK_NAME) {
          ChainController.showUnsupportedChainUI();
        } else {
          this.setCaipNetwork(network);
        }
      } else if (!isActiveNamespace) {
        if (networkOfChain) {
          this.setCaipNetworkOfNamespace(networkOfChain, chainNamespace);
        }
      }
      this.syncConnectedWalletInfo(chainNamespace);
      if (!HelpersUtil.isLowerCaseMatch(address, AccountController.state.address)) {
        this.syncAccountInfo(address, network?.id, chainNamespace);
      }
      if (isActiveNamespace) {
        await this.syncBalance({ address, chainId: network?.id, chainNamespace });
      } else {
        await this.syncBalance({ address, chainId: networkOfChain?.id, chainNamespace });
      }
    }
  }
  async syncAccountInfo(address, chainId, chainNamespace) {
    const caipAddress = this.getCaipAddress(chainNamespace);
    const newChainId = chainId || caipAddress?.split(":")[1];
    if (!newChainId) {
      return;
    }
    const newCaipAddress = `${chainNamespace}:${newChainId}:${address}`;
    this.setCaipAddress(newCaipAddress, chainNamespace);
    await this.syncIdentity({
      address,
      chainId: newChainId,
      chainNamespace
    });
  }
  async syncReownName(address, chainNamespace) {
    try {
      const registeredWcNames = await this.getReownName(address);
      if (registeredWcNames[0]) {
        const wcName = registeredWcNames[0];
        this.setProfileName(wcName.name, chainNamespace);
      } else {
        this.setProfileName(null, chainNamespace);
      }
    } catch {
      this.setProfileName(null, chainNamespace);
    }
  }
  syncConnectedWalletInfo(chainNamespace) {
    const connectorId = ConnectorController.getConnectorId(chainNamespace);
    const providerType = ProviderUtil.getProviderId(chainNamespace);
    if (providerType === ConstantsUtil$1.CONNECTOR_TYPE_ANNOUNCED || providerType === ConstantsUtil$1.CONNECTOR_TYPE_INJECTED) {
      if (connectorId) {
        const connector = this.getConnectors().find((c2) => c2.id === connectorId);
        if (connector) {
          const { info, name, imageUrl } = connector;
          const icon = imageUrl || this.getConnectorImage(connector);
          this.setConnectedWalletInfo({ name, icon, ...info }, chainNamespace);
        }
      }
    } else if (providerType === ConstantsUtil$1.CONNECTOR_TYPE_WALLET_CONNECT) {
      const provider = ProviderUtil.getProvider(chainNamespace);
      if (provider?.session) {
        this.setConnectedWalletInfo({
          ...provider.session.peer.metadata,
          name: provider.session.peer.metadata.name,
          icon: provider.session.peer.metadata.icons?.[0]
        }, chainNamespace);
      }
    } else if (connectorId) {
      if (connectorId === ConstantsUtil$3.CONNECTOR_ID.COINBASE) {
        const connector = this.getConnectors().find((c2) => c2.id === ConstantsUtil$3.CONNECTOR_ID.COINBASE);
        this.setConnectedWalletInfo({ name: "Coinbase Wallet", icon: this.getConnectorImage(connector) }, chainNamespace);
      }
    }
  }
  async syncBalance(params) {
    const caipNetwork = NetworkUtil$1.getNetworksByNamespace(this.getCaipNetworks(), params.chainNamespace).find((n3) => n3.id.toString() === params.chainId?.toString());
    if (!caipNetwork || !params.chainId) {
      return;
    }
    await this.updateNativeBalance(params.address, params.chainId, params.chainNamespace);
  }
  async ready() {
    await this.readyPromise;
  }
  async updateNativeBalance(address, chainId, namespace) {
    const adapter = this.getAdapter(namespace);
    const caipNetwork = ChainController.getCaipNetworkByNamespace(namespace, chainId);
    if (adapter) {
      const balance = await adapter.getBalance({
        address,
        chainId,
        caipNetwork,
        tokens: this.options.tokens
      });
      this.setBalance(balance.balance, balance.symbol, namespace);
      return balance;
    }
    return void 0;
  }
  // -- Universal Provider ---------------------------------------------------
  async initializeUniversalAdapter() {
    const logger = LoggerUtil.createLogger((error, ...args) => {
      if (error) {
        this.handleAlertError(error);
      }
      console.error(...args);
    });
    const universalProviderOptions = {
      projectId: this.options?.projectId,
      metadata: {
        name: this.options?.metadata ? this.options?.metadata.name : "",
        description: this.options?.metadata ? this.options?.metadata.description : "",
        url: this.options?.metadata ? this.options?.metadata.url : "",
        icons: this.options?.metadata ? this.options?.metadata.icons : [""]
      },
      logger
    };
    OptionsController.setManualWCControl(Boolean(this.options?.manualWCControl));
    this.universalProvider = this.options.universalProvider ?? await B$1.init(universalProviderOptions);
    this.listenWalletConnect();
  }
  listenWalletConnect() {
    if (this.universalProvider) {
      this.universalProvider.on("display_uri", (uri) => {
        ConnectionController.setUri(uri);
      });
      this.universalProvider.on("connect", ConnectionController.finalizeWcConnection);
      this.universalProvider.on("disconnect", () => {
        this.chainNamespaces.forEach((namespace) => {
          this.resetAccount(namespace);
        });
        ConnectionController.resetWcConnection();
      });
      this.universalProvider.on("chainChanged", (chainId) => {
        const caipNetwork = this.getCaipNetworks().find((c2) => c2.id == chainId);
        const currentCaipNetwork = this.getCaipNetwork();
        if (!caipNetwork) {
          this.setUnsupportedNetwork(chainId);
          return;
        }
        if (currentCaipNetwork?.id !== caipNetwork?.id) {
          this.setCaipNetwork(caipNetwork);
        }
      });
      this.universalProvider.on("session_event", (callbackData) => {
        if (WcHelpersUtil.isSessionEventData(callbackData)) {
          const { name, data } = callbackData.params.event;
          if (name === "accountsChanged" && Array.isArray(data) && CoreHelperUtil.isCaipAddress(data[0])) {
            this.syncAccount(ParseUtil.parseCaipAddress(data[0]));
          }
        }
      });
    }
  }
  createUniversalProvider() {
    if (!this.universalProviderInitPromise && CoreHelperUtil.isClient() && this.options?.projectId) {
      this.universalProviderInitPromise = this.initializeUniversalAdapter();
    }
    return this.universalProviderInitPromise;
  }
  async getUniversalProvider() {
    if (!this.universalProvider) {
      try {
        await this.createUniversalProvider();
      } catch (err) {
        EventsController.sendEvent({
          type: "error",
          event: "INTERNAL_SDK_ERROR",
          properties: {
            errorType: "UniversalProviderInitError",
            errorMessage: err instanceof Error ? err.message : "Unknown",
            uncaught: false
          }
        });
        console.error("AppKit:getUniversalProvider - Cannot create provider", err);
      }
    }
    return this.universalProvider;
  }
  // - Utils -------------------------------------------------------------------
  handleAlertError(error) {
    const matchedUniversalProviderError = Object.entries(ErrorUtil.UniversalProviderErrors).find(([, { message: message2 }]) => error.message.includes(message2));
    const [errorKey, errorValue] = matchedUniversalProviderError ?? [];
    const { message, alertErrorKey } = errorValue ?? {};
    if (errorKey && message && !this.reportedAlertErrors[errorKey]) {
      const alertError = ErrorUtil.ALERT_ERRORS[alertErrorKey];
      if (alertError) {
        AlertController.open(alertError, "error");
        this.reportedAlertErrors[errorKey] = true;
      }
    }
  }
  getAdapter(namespace) {
    if (!namespace) {
      return void 0;
    }
    return this.chainAdapters?.[namespace];
  }
  createAdapter(blueprint) {
    if (!blueprint) {
      return;
    }
    const namespace = blueprint.namespace;
    if (!namespace) {
      return;
    }
    this.createClients();
    const adapterBlueprint = blueprint;
    adapterBlueprint.namespace = namespace;
    adapterBlueprint.construct({
      namespace,
      projectId: this.options?.projectId,
      networks: this.getCaipNetworks()
    });
    if (!this.chainNamespaces.includes(namespace)) {
      this.chainNamespaces.push(namespace);
    }
    if (this.chainAdapters) {
      this.chainAdapters[namespace] = adapterBlueprint;
    }
  }
  // -- Public -------------------------------------------------------------------
  async open(options) {
    await this.injectModalUi();
    if (options?.uri) {
      ConnectionController.setUri(options.uri);
    }
    if (options?.arguments) {
      switch (options?.view) {
        case "Swap":
          return ModalController.open({ ...options, data: { swap: options.arguments } });
      }
    }
    return ModalController.open(options);
  }
  async close() {
    await this.injectModalUi();
    ModalController.close();
  }
  setLoading(loading, namespace) {
    ModalController.setLoading(loading, namespace);
  }
  async disconnect(chainNamespace) {
    await ConnectionController.disconnect(chainNamespace);
  }
  getSIWX() {
    return OptionsController.state.siwx;
  }
  // -- review these -------------------------------------------------------------------
  getError() {
    return "";
  }
  getChainId() {
    return ChainController.state.activeCaipNetwork?.id;
  }
  async switchNetwork(appKitNetwork) {
    const network = this.getCaipNetworks().find((n3) => n3.id === appKitNetwork.id);
    if (!network) {
      AlertController.open(ErrorUtil.ALERT_ERRORS.SWITCH_NETWORK_NOT_FOUND, "error");
      return;
    }
    await ChainController.switchActiveNetwork(network);
  }
  getWalletProvider() {
    return ChainController.state.activeChain ? ProviderUtil.state.providers[ChainController.state.activeChain] : null;
  }
  getWalletProviderType() {
    return ProviderUtil.getProviderId(ChainController.state.activeChain);
  }
  subscribeProviders(callback) {
    return ProviderUtil.subscribeProviders(callback);
  }
  getThemeMode() {
    return ThemeController.state.themeMode;
  }
  getThemeVariables() {
    return ThemeController.state.themeVariables;
  }
  setThemeMode(themeMode) {
    ThemeController.setThemeMode(themeMode);
    setColorTheme(ThemeController.state.themeMode);
  }
  setTermsConditionsUrl(termsConditionsUrl) {
    OptionsController.setTermsConditionsUrl(termsConditionsUrl);
  }
  setPrivacyPolicyUrl(privacyPolicyUrl) {
    OptionsController.setPrivacyPolicyUrl(privacyPolicyUrl);
  }
  setThemeVariables(themeVariables) {
    ThemeController.setThemeVariables(themeVariables);
    setThemeVariables(ThemeController.state.themeVariables);
  }
  subscribeTheme(callback) {
    return ThemeController.subscribe(callback);
  }
  getWalletInfo() {
    return AccountController.state.connectedWalletInfo;
  }
  getAccount(namespace) {
    const authConnector = ConnectorController.getAuthConnector(namespace);
    const accountState2 = ChainController.getAccountData(namespace);
    const activeChain = ChainController.state.activeChain;
    const activeConnectorId = StorageUtil.getConnectedConnectorId(namespace || activeChain);
    if (!accountState2) {
      return void 0;
    }
    return {
      allAccounts: accountState2.allAccounts,
      caipAddress: accountState2.caipAddress,
      address: CoreHelperUtil.getPlainAddress(accountState2.caipAddress),
      isConnected: Boolean(accountState2.caipAddress),
      status: accountState2.status,
      embeddedWalletInfo: authConnector && activeConnectorId === ConstantsUtil$3.CONNECTOR_ID.AUTH ? {
        user: accountState2.user ? {
          ...accountState2.user,
          /*
           * Getting the username from the chain controller works well for social logins,
           * but Farcaster uses a different connection flow and doesn't emit the username via events.
           * Since the username is stored in local storage before the chain controller updates,
           * it's safe to use the local storage value here.
           */
          username: StorageUtil.getConnectedSocialUsername()
        } : void 0,
        authProvider: accountState2.socialProvider || "email",
        accountType: accountState2.preferredAccountTypes?.[namespace || activeChain],
        isSmartAccountDeployed: Boolean(accountState2.smartAccountDeployed)
      } : void 0
    };
  }
  subscribeAccount(callback, namespace) {
    const updateVal = () => {
      const account = this.getAccount(namespace);
      if (!account) {
        return;
      }
      callback(account);
    };
    if (namespace) {
      ChainController.subscribeChainProp("accountState", updateVal, namespace);
    } else {
      ChainController.subscribe(updateVal);
    }
    ConnectorController.subscribe(updateVal);
  }
  subscribeNetwork(callback) {
    return ChainController.subscribe(({ activeCaipNetwork }) => {
      callback({
        caipNetwork: activeCaipNetwork,
        chainId: activeCaipNetwork?.id,
        caipNetworkId: activeCaipNetwork?.caipNetworkId
      });
    });
  }
  subscribeWalletInfo(callback) {
    return AccountController.subscribeKey("connectedWalletInfo", callback);
  }
  subscribeShouldUpdateToAddress(callback) {
    AccountController.subscribeKey("shouldUpdateToAddress", callback);
  }
  subscribeCaipNetworkChange(callback) {
    ChainController.subscribeKey("activeCaipNetwork", callback);
  }
  getState() {
    return PublicStateController.state;
  }
  subscribeState(callback) {
    return PublicStateController.subscribe(callback);
  }
  showErrorMessage(message) {
    SnackController.showError(message);
  }
  showSuccessMessage(message) {
    SnackController.showSuccess(message);
  }
  getEvent() {
    return { ...EventsController.state };
  }
  subscribeEvents(callback) {
    return EventsController.subscribe(callback);
  }
  replace(route) {
    RouterController.replace(route);
  }
  redirect(route) {
    RouterController.push(route);
  }
  popTransactionStack(status) {
    RouterController.popTransactionStack(status);
  }
  isOpen() {
    return ModalController.state.open;
  }
  isTransactionStackEmpty() {
    return RouterController.state.transactionStack.length === 0;
  }
  static getInstance() {
    return this.instance;
  }
  updateFeatures(newFeatures) {
    OptionsController.setFeatures(newFeatures);
  }
  updateRemoteFeatures(newRemoteFeatures) {
    OptionsController.setRemoteFeatures(newRemoteFeatures);
  }
  updateOptions(newOptions) {
    const currentOptions = OptionsController.state || {};
    const updatedOptions = { ...currentOptions, ...newOptions };
    OptionsController.setOptions(updatedOptions);
  }
  setConnectMethodsOrder(connectMethodsOrder) {
    OptionsController.setConnectMethodsOrder(connectMethodsOrder);
  }
  setWalletFeaturesOrder(walletFeaturesOrder) {
    OptionsController.setWalletFeaturesOrder(walletFeaturesOrder);
  }
  setCollapseWallets(collapseWallets) {
    OptionsController.setCollapseWallets(collapseWallets);
  }
  setSocialsOrder(socialsOrder) {
    OptionsController.setSocialsOrder(socialsOrder);
  }
  getConnectMethodsOrder() {
    return WalletUtil.getConnectOrderMethod(OptionsController.state.features, ConnectorController.getConnectors());
  }
  /**
   * Adds a network to an existing adapter in AppKit.
   * @param namespace - The chain namespace to add the network to (e.g. 'eip155', 'solana')
   * @param network - The network configuration to add
   * @throws Error if adapter for namespace doesn't exist
   */
  addNetwork(namespace, network) {
    if (this.chainAdapters && !this.chainAdapters[namespace]) {
      throw new Error(`Adapter for namespace ${namespace} doesn't exist`);
    }
    const extendedNetwork = this.extendCaipNetwork(network, this.options);
    if (!this.getCaipNetworks().find((n3) => n3.id === extendedNetwork.id)) {
      ChainController.addNetwork(extendedNetwork);
    }
  }
  /**
   * Removes a network from an existing adapter in AppKit.
   * @param namespace - The chain namespace the network belongs to
   * @param networkId - The network ID to remove
   * @throws Error if adapter for namespace doesn't exist or if removing last network
   */
  removeNetwork(namespace, networkId) {
    if (this.chainAdapters && !this.chainAdapters[namespace]) {
      throw new Error(`Adapter for namespace ${namespace} doesn't exist`);
    }
    const networkToRemove = this.getCaipNetworks().find((n3) => n3.id === networkId);
    if (!networkToRemove) {
      return;
    }
    ChainController.removeNetwork(namespace, networkId);
  }
}
let isInitialized = false;
class AppKit extends AppKitBaseClient {
  // -- Overrides --------------------------------------------------------------
  async open(options) {
    const isConnected = ConnectorController.isConnected();
    if (!isConnected) {
      await super.open(options);
    }
  }
  async close() {
    await super.close();
    if (this.options.manualWCControl) {
      ConnectionController.finalizeWcConnection();
    }
  }
  async syncIdentity(_request) {
    return Promise.resolve();
  }
  async syncBalance(_params) {
    return Promise.resolve();
  }
  async injectModalUi() {
    if (!isInitialized && CoreHelperUtil.isClient()) {
      await import("./basic-CCGSNC1l.js");
      await import("./w3m-modal-ChSvVLYr.js");
      const isElementCreated = document.querySelector("w3m-modal");
      if (!isElementCreated) {
        const modal = document.createElement("w3m-modal");
        if (!OptionsController.state.disableAppend && !OptionsController.state.enableEmbedded) {
          document.body.insertAdjacentElement("beforeend", modal);
        }
      }
      isInitialized = true;
    }
  }
}
const PACKAGE_VERSION = "1.7.8";
function createAppKit(options) {
  return new AppKit({
    ...options,
    basic: true,
    sdkVersion: `html-core-${PACKAGE_VERSION}`
  });
}
const core = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AppKit,
  createAppKit
}, Symbol.toStringTag, { value: "Module" }));
export {
  ApiController as A,
  f$1 as B,
  ConnectorController as C,
  u$1 as D,
  EventsController as E,
  E as F,
  createView as G,
  Hash as H,
  aexists as I,
  toBytes$1 as J,
  aoutput as K,
  wrapConstructor as L,
  ModalController as M,
  rotr as N,
  OptionsController as O,
  ahash as P,
  abytes as Q,
  RouterController as R,
  StorageUtil as S,
  ThemeController as T,
  randomBytes as U,
  concatBytes as V,
  WalletUtil as W,
  core as X,
  i as a,
  b,
  CoreHelperUtil as c,
  ConnectorUtil as d,
  elementStyles as e,
  AssetUtil as f,
  ConnectionController as g,
  ConstantsUtil$3 as h,
  i$3 as i,
  ChainController as j,
  AssetController as k,
  SnackController as l,
  ConstantsUtil$2 as m,
  A as n,
  colorStyles as o,
  withErrorBoundary as p,
  subscribe as q,
  resetStyles as r,
  subscribeKey as s,
  proxy as t,
  SIWXUtil as u,
  AlertController as v,
  w,
  ConstantsUtil as x,
  AccountController as y,
  initializeTheming as z
};
//# sourceMappingURL=core-Di8BJxgx.js.map

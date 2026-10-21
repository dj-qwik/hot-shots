// ───────────────────────── DETERMINISM KIT ─────────────────────────
// Online matches are simulated by the server AND by every player's browser from the same seed + inputs, so
// every browser must compute bit-identical physics. JS + - * / and sqrt are exactly specified (IEEE-754
// double, round-to-nearest, no fused ops), but Math.sin/cos/atan2/exp are NOT: engines may differ in the
// last bit. DET_MATH re-implements those with fdlibm's algorithms using only exactly-specified arithmetic.
// Randomness comes from seeded sfc32 streams, never Math.random.
const DET_MATH = (() => {
  // exact power of two from the exponent bits (no pow(): its rounding is engine-defined)
  const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
  const HI = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 1 : 0; // little-endian → high word at [1]
  function pow2(k) { f64[0] = 0; u32[HI] = ((k + 1023) << 20) >>> 0; return f64[0]; }
  function scalbn(x, k) {
    if (k > 1023) { x *= pow2(1023); k -= 1023; if (k > 1023) return x * Infinity; }
    else if (k < -1022) { x *= pow2(-1022); k += 1022; if (k < -1022) return x * 0; } // exp only needs k ≥ -1075
    return x * pow2(k);
  }
  // ── sin / cos (fdlibm __kernel_sin / __kernel_cos, Cody–Waite reduction by π/2)
  const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
    S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
  const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
    C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
  const INVPIO2 = 6.36619772367581382433e-01, PIO2_1 = 1.57079632673412561417e+00, PIO2_2 = 6.07710050630396597660e-11,
    PIO2_3 = 2.02226624871116645580e-21, PIO4 = 7.85398163397448278999e-01;
  function ksin(x) { const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6))); return x + v * (S1 + z * r); }
  function kcos(x) { const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6))))), hz = 0.5 * z, w = 1 - hz; return w + (((1 - w) - hz) + z * r); }
  function reduce(x) { // → [quadrant, r] with r in [-π/4, π/4]
    const n = Math.round(x * INVPIO2); // Math.round is exact
    return [n, ((x - n * PIO2_1) - n * PIO2_2) - n * PIO2_3];
  }
  function sin(x) {
    if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
    if (x > -PIO4 && x < PIO4) return ksin(x);
    const [n, r] = reduce(x), q = ((n % 4) + 4) % 4;
    return q === 0 ? ksin(r) : q === 1 ? kcos(r) : q === 2 ? -ksin(r) : -kcos(r);
  }
  function cos(x) {
    if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
    if (x > -PIO4 && x < PIO4) return kcos(x);
    const [n, r] = reduce(x), q = ((n % 4) + 4) % 4;
    return q === 0 ? kcos(r) : q === 1 ? -ksin(r) : q === 2 ? -kcos(r) : ksin(r);
  }
  // ── atan / atan2 (fdlibm s_atan.c, e_atan2.c)
  const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
  const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
  const AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
    9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
    4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
  function atan(x) {
    if (!(x === x)) return NaN;
    const neg = x < 0; let ax = neg ? -x : x, id;
    if (ax >= 7.378697629483821e19) return neg ? -ATANHI[3] - ATANLO[3] : ATANHI[3] + ATANLO[3]; // 2^66
    if (ax < 0.4375) { if (ax < 3.725290298461914e-9) return x; id = -1; }
    else if (ax < 1.1875) { if (ax < 0.6875) { id = 0; ax = (2 * ax - 1) / (2 + ax); } else { id = 1; ax = (ax - 1) / (ax + 1); } }
    else if (ax < 2.4375) { id = 2; ax = (ax - 1.5) / (1 + 1.5 * ax); }
    else { id = 3; ax = -1 / ax; }
    const z = ax * ax, w = z * z;
    const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
    const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
    if (id < 0) return neg ? -(ax - ax * (s1 + s2)) : ax - ax * (s1 + s2);
    const r = ATANHI[id] - ((ax * (s1 + s2) - ATANLO[id]) - ax);
    return neg ? -r : r;
  }
  const PI = 3.1415926535897931160e+00, PI_LO = 1.2246467991473531772e-16, PIO2 = 1.57079632679489655800e+00;
  function atan2(y, x) {
    if (!(x === x) || !(y === y)) return NaN;
    if (x === 1) return atan(y);
    const yneg = y < 0 || Object.is(y, -0), xneg = x < 0 || Object.is(x, -0);
    if (y === 0) return xneg ? (yneg ? -PI : PI) : y;
    if (x === 0) return yneg ? -PIO2 : PIO2;
    if (x === Infinity || x === -Infinity) {
      if (y === Infinity || y === -Infinity) return (x > 0 ? PI / 4 : 3 * PI / 4) * (yneg ? -1 : 1);
      return x > 0 ? (yneg ? -0 : 0) : (yneg ? -PI : PI);
    }
    if (y === Infinity || y === -Infinity) return yneg ? -PIO2 : PIO2;
    let z = atan(Math.abs(y / x));
    if (x < 0) z = PI - (z - PI_LO);
    return yneg ? -z : z;
  }
  // ── exp (fdlibm e_exp.c)
  const LN2HI = 6.93147180369123816490e-01, LN2LO = 1.90821492927058770002e-10, INVLN2 = 1.44269504088896338700e+00;
  const P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05,
    P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;
  function exp(x) {
    if (!(x === x)) return NaN;
    if (x > 709.782712893383973096) return Infinity;
    if (x < -745.13321910194110842) return 0;
    let hi = 0, lo = 0, k = 0;
    const ax = x < 0 ? -x : x;
    if (ax > 0.34657359027997264) { // > ln2/2
      if (ax < 1.03972077083991796413) { k = x < 0 ? -1 : 1; } // < 1.5 ln2
      else k = Math.trunc(INVLN2 * x + (x < 0 ? -0.5 : 0.5));
      hi = x - k * LN2HI; lo = k * LN2LO; x = hi - lo;
    } else if (ax < 3.725290298461914e-9) return 1 + x;
    const t = x * x, c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
    if (k === 0) return 1 - ((x * c) / (c - 2) - x);
    const y = 1 - ((lo - (x * c) / (2 - c)) - hi);
    return scalbn(y, k);
  }
  const hypot = (x, y) => Math.sqrt(x * x + y * y); // sqrt is exactly specified
  return Object.freeze({ sin, cos, atan2, atan, exp, hypot, PI: Math.PI, pow2, scalbn });
})();

// sfc32: small, fast, 128-bit state; only integer ops (exact in every engine).
function makeRng(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = (seed >>> 0) ^ 0xdeadbeef;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 2654435761); b = Math.imul(b ^ a, 1597334677); c = (c + Math.imul(b, 3266489917)) | 0; }
  const next = () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next();
  return next;
}
// Fisher–Yates with a given rng (a sort with a random comparator is engine-dependent).
function shuffleWith(rng, arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// FNV-1a over exact float bits: two simulations agree iff these hashes agree.
const HASH_F64 = new Float64Array(1), HASH_U32 = new Uint32Array(HASH_F64.buffer);
function hashNums(nums) {
  let h = 0x811c9dc5;
  for (const v of nums) { HASH_F64[0] = v; for (const w of [HASH_U32[0], HASH_U32[1]]) { h ^= w & 0xffff; h = Math.imul(h, 16777619); h ^= w >>> 16; h = Math.imul(h, 16777619); } }
  return h >>> 0;
}

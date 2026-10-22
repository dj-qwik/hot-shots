import { B as f$1, D as u, i as i$2, r as resetStyles, a as i$3, b, n as A, F as E, o as colorStyles, e as elementStyles } from "./core-Di8BJxgx.js";
const UiHelperUtil = {
  getSpacingStyles(spacing, index) {
    if (Array.isArray(spacing)) {
      return spacing[index] ? `var(--wui-spacing-${spacing[index]})` : void 0;
    } else if (typeof spacing === "string") {
      return `var(--wui-spacing-${spacing})`;
    }
    return void 0;
  },
  getFormattedDate(date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  },
  getHostName(url) {
    try {
      const newUrl = new URL(url);
      return newUrl.hostname;
    } catch (error) {
      return "";
    }
  },
  getTruncateString({ string, charsStart, charsEnd, truncate }) {
    if (string.length <= charsStart + charsEnd) {
      return string;
    }
    if (truncate === "end") {
      return `${string.substring(0, charsStart)}...`;
    } else if (truncate === "start") {
      return `...${string.substring(string.length - charsEnd)}`;
    }
    return `${string.substring(0, Math.floor(charsStart))}...${string.substring(string.length - Math.floor(charsEnd))}`;
  },
  generateAvatarColors(address) {
    const hash = address.toLowerCase().replace(/^0x/iu, "").replace(/[^a-f0-9]/gu, "");
    const baseColor = hash.substring(0, 6).padEnd(6, "0");
    const rgbColor = this.hexToRgb(baseColor);
    const masterBorderRadius = getComputedStyle(document.documentElement).getPropertyValue("--w3m-border-radius-master");
    const radius = Number(masterBorderRadius?.replace("px", ""));
    const edge = 100 - 3 * radius;
    const gradientCircle = `${edge}% ${edge}% at 65% 40%`;
    const colors = [];
    for (let i3 = 0; i3 < 5; i3 += 1) {
      const tintedColor = this.tintColor(rgbColor, 0.15 * i3);
      colors.push(`rgb(${tintedColor[0]}, ${tintedColor[1]}, ${tintedColor[2]})`);
    }
    return `
    --local-color-1: ${colors[0]};
    --local-color-2: ${colors[1]};
    --local-color-3: ${colors[2]};
    --local-color-4: ${colors[3]};
    --local-color-5: ${colors[4]};
    --local-radial-circle: ${gradientCircle}
   `;
  },
  hexToRgb(hex) {
    const bigint = parseInt(hex, 16);
    const r2 = bigint >> 16 & 255;
    const g = bigint >> 8 & 255;
    const b2 = bigint & 255;
    return [r2, g, b2];
  },
  tintColor(rgb, tint) {
    const [r2, g, b2] = rgb;
    const tintedR = Math.round(r2 + (255 - r2) * tint);
    const tintedG = Math.round(g + (255 - g) * tint);
    const tintedB = Math.round(b2 + (255 - b2) * tint);
    return [tintedR, tintedG, tintedB];
  },
  isNumber(character) {
    const regex = {
      number: /^[0-9]+$/u
    };
    return regex.number.test(character);
  },
  getColorTheme(theme) {
    if (theme) {
      return theme;
    } else if (typeof window !== "undefined" && window.matchMedia) {
      if (window.matchMedia("(prefers-color-scheme: dark)")?.matches) {
        return "dark";
      }
      return "light";
    }
    return "dark";
  },
  splitBalance(input) {
    const parts = input.split(".");
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return ["0", "00"];
  },
  roundNumber(number, threshold, fixed) {
    const roundedNumber = number.toString().length >= threshold ? Number(number).toFixed(fixed) : number;
    return roundedNumber;
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
  }
};
function standardCustomElement(tagName, descriptor) {
  const { kind, elements } = descriptor;
  return {
    kind,
    elements,
    finisher(clazz) {
      if (!customElements.get(tagName)) {
        customElements.define(tagName, clazz);
      }
    }
  };
}
function legacyCustomElement(tagName, clazz) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, clazz);
  }
  return clazz;
}
function customElement(tagName) {
  return function create(classOrDescriptor) {
    return typeof classOrDescriptor === "function" ? legacyCustomElement(tagName, classOrDescriptor) : standardCustomElement(tagName, classOrDescriptor);
  };
}
const o$2 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f$1 }, r$3 = (t2 = o$2, e2, r2) => {
  const { kind: n2, metadata: i3 } = r2;
  let s2 = globalThis.litPropertyMetadata.get(i3);
  if (void 0 === s2 && globalThis.litPropertyMetadata.set(i3, s2 = /* @__PURE__ */ new Map()), "setter" === n2 && ((t2 = Object.create(t2)).wrapped = true), s2.set(r2.name, t2), "accessor" === n2) {
    const { name: o2 } = r2;
    return { set(r3) {
      const n3 = e2.get.call(this);
      e2.set.call(this, r3), this.requestUpdate(o2, n3, t2, true, r3);
    }, init(e3) {
      return void 0 !== e3 && this.C(o2, void 0, t2, e3), e3;
    } };
  }
  if ("setter" === n2) {
    const { name: o2 } = r2;
    return function(r3) {
      const n3 = this[o2];
      e2.call(this, r3), this.requestUpdate(o2, n3, t2, true, r3);
    };
  }
  throw Error("Unsupported decorator location: " + n2);
};
function n$3(t2) {
  return (e2, o2) => "object" == typeof o2 ? r$3(t2, e2, o2) : ((t3, e3, o3) => {
    const r2 = e3.hasOwnProperty(o3);
    return e3.constructor.createProperty(o3, t3), r2 ? Object.getOwnPropertyDescriptor(e3, o3) : void 0;
  })(t2, e2, o2);
}
function r$2(r2) {
  return n$3({ ...r2, state: true, attribute: false });
}
const styles$6 = i$2`
  :host {
    display: flex;
    width: inherit;
    height: inherit;
  }
`;
var __decorate$6 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i3 = decorators.length - 1; i3 >= 0; i3--) if (d = decorators[i3]) r2 = (c2 < 3 ? d(r2) : c2 > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiFlex = class WuiFlex2 extends i$3 {
  render() {
    this.style.cssText = `
      flex-direction: ${this.flexDirection};
      flex-wrap: ${this.flexWrap};
      flex-basis: ${this.flexBasis};
      flex-grow: ${this.flexGrow};
      flex-shrink: ${this.flexShrink};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      column-gap: ${this.columnGap && `var(--wui-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap && `var(--wui-spacing-${this.rowGap})`};
      gap: ${this.gap && `var(--wui-spacing-${this.gap})`};
      padding-top: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 0)};
      padding-right: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 1)};
      padding-bottom: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 2)};
      padding-left: ${this.padding && UiHelperUtil.getSpacingStyles(this.padding, 3)};
      margin-top: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 0)};
      margin-right: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 1)};
      margin-bottom: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 2)};
      margin-left: ${this.margin && UiHelperUtil.getSpacingStyles(this.margin, 3)};
    `;
    return b`<slot></slot>`;
  }
};
WuiFlex.styles = [resetStyles, styles$6];
__decorate$6([
  n$3()
], WuiFlex.prototype, "flexDirection", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "flexWrap", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "flexBasis", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "flexGrow", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "flexShrink", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "alignItems", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "justifyContent", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "columnGap", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "rowGap", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "gap", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "padding", void 0);
__decorate$6([
  n$3()
], WuiFlex.prototype, "margin", void 0);
WuiFlex = __decorate$6([
  customElement("wui-flex")
], WuiFlex);
const o$1 = (o2) => o2 ?? A;
const n$2 = (o2) => null === o2 || "object" != typeof o2 && "function" != typeof o2, r$1 = (o2) => void 0 === o2.strings;
const t = { ATTRIBUTE: 1, CHILD: 2 }, e$1 = (t2) => (...e2) => ({ _$litDirective$: t2, values: e2 });
let i$1 = class i {
  constructor(t2) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t2, e2, i3) {
    this._$Ct = t2, this._$AM = e2, this._$Ci = i3;
  }
  _$AS(t2, e2) {
    return this.update(t2, e2);
  }
  update(t2, e2) {
    return this.render(...e2);
  }
};
const s$1 = (i3, t2) => {
  const e2 = i3._$AN;
  if (void 0 === e2) return false;
  for (const i4 of e2) i4._$AO?.(t2, false), s$1(i4, t2);
  return true;
}, o = (i3) => {
  let t2, e2;
  do {
    if (void 0 === (t2 = i3._$AM)) break;
    e2 = t2._$AN, e2.delete(i3), i3 = t2;
  } while (0 === e2?.size);
}, r = (i3) => {
  for (let t2; t2 = i3._$AM; i3 = t2) {
    let e2 = t2._$AN;
    if (void 0 === e2) t2._$AN = e2 = /* @__PURE__ */ new Set();
    else if (e2.has(i3)) break;
    e2.add(i3), c$1(t2);
  }
};
function h$1(i3) {
  void 0 !== this._$AN ? (o(this), this._$AM = i3, r(this)) : this._$AM = i3;
}
function n$1(i3, t2 = false, e2 = 0) {
  const r2 = this._$AH, h2 = this._$AN;
  if (void 0 !== h2 && 0 !== h2.size) if (t2) if (Array.isArray(r2)) for (let i4 = e2; i4 < r2.length; i4++) s$1(r2[i4], false), o(r2[i4]);
  else null != r2 && (s$1(r2, false), o(r2));
  else s$1(this, i3);
}
const c$1 = (i3) => {
  i3.type == t.CHILD && (i3._$AP ??= n$1, i3._$AQ ??= h$1);
};
class f extends i$1 {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(i3, t2, e2) {
    super._$AT(i3, t2, e2), r(this), this.isConnected = i3._$AU;
  }
  _$AO(i3, t2 = true) {
    i3 !== this.isConnected && (this.isConnected = i3, i3 ? this.reconnected?.() : this.disconnected?.()), t2 && (s$1(this, i3), o(this));
  }
  setValue(t2) {
    if (r$1(this._$Ct)) this._$Ct._$AI(t2, this);
    else {
      const i3 = [...this._$Ct._$AH];
      i3[this._$Ci] = t2, this._$Ct._$AI(i3, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
}
class s {
  constructor(t2) {
    this.G = t2;
  }
  disconnect() {
    this.G = void 0;
  }
  reconnect(t2) {
    this.G = t2;
  }
  deref() {
    return this.G;
  }
}
class i2 {
  constructor() {
    this.Y = void 0, this.Z = void 0;
  }
  get() {
    return this.Y;
  }
  pause() {
    this.Y ??= new Promise((t2) => this.Z = t2);
  }
  resume() {
    this.Z?.(), this.Y = this.Z = void 0;
  }
}
const n = (t2) => !n$2(t2) && "function" == typeof t2.then, h = 1073741823;
class c extends f {
  constructor() {
    super(...arguments), this._$Cwt = h, this._$Cbt = [], this._$CK = new s(this), this._$CX = new i2();
  }
  render(...s2) {
    return s2.find((t2) => !n(t2)) ?? E;
  }
  update(s2, i3) {
    const e2 = this._$Cbt;
    let r2 = e2.length;
    this._$Cbt = i3;
    const o2 = this._$CK, c2 = this._$CX;
    this.isConnected || this.disconnected();
    for (let t2 = 0; t2 < i3.length && !(t2 > this._$Cwt); t2++) {
      const s3 = i3[t2];
      if (!n(s3)) return this._$Cwt = t2, s3;
      t2 < r2 && s3 === e2[t2] || (this._$Cwt = h, r2 = 0, Promise.resolve(s3).then(async (t3) => {
        for (; c2.get(); ) await c2.get();
        const i4 = o2.deref();
        if (void 0 !== i4) {
          const e3 = i4._$Cbt.indexOf(s3);
          e3 > -1 && e3 < i4._$Cwt && (i4._$Cwt = e3, i4.setValue(t3));
        }
      }));
    }
    return E;
  }
  disconnected() {
    this._$CK.disconnect(), this._$CX.pause();
  }
  reconnected() {
    this._$CK.reconnect(this), this._$CX.resume();
  }
}
const m = e$1(c);
class CacheUtil {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  set(key, value) {
    this.cache.set(key, value);
  }
  get(key) {
    return this.cache.get(key);
  }
  has(key) {
    return this.cache.has(key);
  }
  delete(key) {
    this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
}
const globalSvgCache = new CacheUtil();
const styles$5 = i$2`
  :host {
    display: flex;
    aspect-ratio: var(--local-aspect-ratio);
    color: var(--local-color);
    width: var(--local-width);
  }

  svg {
    width: inherit;
    height: inherit;
    object-fit: contain;
    object-position: center;
  }

  .fallback {
    width: var(--local-width);
    height: var(--local-height);
  }
`;
var __decorate$5 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i3 = decorators.length - 1; i3 >= 0; i3--) if (d = decorators[i3]) r2 = (c2 < 3 ? d(r2) : c2 > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
const ICONS = {
  add: async () => (await import("./add-DYFNavRN.js")).addSvg,
  allWallets: async () => (await import("./all-wallets-DZSJun1k.js")).allWalletsSvg,
  arrowBottomCircle: async () => (await import("./arrow-bottom-circle-BBaq0wir.js")).arrowBottomCircleSvg,
  appStore: async () => (await import("./app-store-oo011fbd.js")).appStoreSvg,
  apple: async () => (await import("./apple-DlrhBeF-.js")).appleSvg,
  arrowBottom: async () => (await import("./arrow-bottom-BV8lHQiK.js")).arrowBottomSvg,
  arrowLeft: async () => (await import("./arrow-left-BA6c80UA.js")).arrowLeftSvg,
  arrowRight: async () => (await import("./arrow-right-BvdWOTNx.js")).arrowRightSvg,
  arrowTop: async () => (await import("./arrow-top-BQQDnkTz.js")).arrowTopSvg,
  bank: async () => (await import("./bank-BGIOM1KV.js")).bankSvg,
  browser: async () => (await import("./browser-Ci8zsy4L.js")).browserSvg,
  card: async () => (await import("./card-B6NXBMzo.js")).cardSvg,
  checkmark: async () => (await import("./checkmark-BRJTazx2.js")).checkmarkSvg,
  checkmarkBold: async () => (await import("./checkmark-bold-0HfVpEtN.js")).checkmarkBoldSvg,
  chevronBottom: async () => (await import("./chevron-bottom-Dl_zOPYD.js")).chevronBottomSvg,
  chevronLeft: async () => (await import("./chevron-left-CTDsKM1T.js")).chevronLeftSvg,
  chevronRight: async () => (await import("./chevron-right-DfVnomPc.js")).chevronRightSvg,
  chevronTop: async () => (await import("./chevron-top-B1Q2iUd_.js")).chevronTopSvg,
  chromeStore: async () => (await import("./chrome-store-C-USw_Se.js")).chromeStoreSvg,
  clock: async () => (await import("./clock-7hzRE3do.js")).clockSvg,
  close: async () => (await import("./close-CZFHvba8.js")).closeSvg,
  compass: async () => (await import("./compass-DDEp4qaC.js")).compassSvg,
  coinPlaceholder: async () => (await import("./coinPlaceholder-D6nUcDvM.js")).coinPlaceholderSvg,
  copy: async () => (await import("./copy-DTmf0Yz6.js")).copySvg,
  cursor: async () => (await import("./cursor-y8CarYTu.js")).cursorSvg,
  cursorTransparent: async () => (await import("./cursor-transparent-CvDmxTvJ.js")).cursorTransparentSvg,
  desktop: async () => (await import("./desktop-DKQq_Br_.js")).desktopSvg,
  disconnect: async () => (await import("./disconnect-BI55gb8y.js")).disconnectSvg,
  discord: async () => (await import("./discord-JLKPracD.js")).discordSvg,
  etherscan: async () => (await import("./etherscan-QxZbcxsH.js")).etherscanSvg,
  extension: async () => (await import("./extension-NfE-IeUV.js")).extensionSvg,
  externalLink: async () => (await import("./external-link-BJiXwYQe.js")).externalLinkSvg,
  facebook: async () => (await import("./facebook-Bl21nIqe.js")).facebookSvg,
  farcaster: async () => (await import("./farcaster-Cz_e-7w1.js")).farcasterSvg,
  filters: async () => (await import("./filters-CS0rHgni.js")).filtersSvg,
  github: async () => (await import("./github-FDXVKKeY.js")).githubSvg,
  google: async () => (await import("./google-CuMJhEfe.js")).googleSvg,
  helpCircle: async () => (await import("./help-circle-Y_XrTfvq.js")).helpCircleSvg,
  image: async () => (await import("./image-Bl4XEFoW.js")).imageSvg,
  id: async () => (await import("./id-C7LiI1i3.js")).idSvg,
  infoCircle: async () => (await import("./info-circle-BaAuEQ0E.js")).infoCircleSvg,
  lightbulb: async () => (await import("./lightbulb-BTf52LKH.js")).lightbulbSvg,
  mail: async () => (await import("./mail-BPF89q2x.js")).mailSvg,
  mobile: async () => (await import("./mobile-BNAH7W5j.js")).mobileSvg,
  more: async () => (await import("./more-C_9LfiNC.js")).moreSvg,
  networkPlaceholder: async () => (await import("./network-placeholder-DkvYUuTW.js")).networkPlaceholderSvg,
  nftPlaceholder: async () => (await import("./nftPlaceholder-D2nQ7Hw_.js")).nftPlaceholderSvg,
  off: async () => (await import("./off-sH7VA7NJ.js")).offSvg,
  playStore: async () => (await import("./play-store-D0-0x9Ay.js")).playStoreSvg,
  plus: async () => (await import("./plus-BjYKNePE.js")).plusSvg,
  qrCode: async () => (await import("./qr-code-i3xjWpB_.js")).qrCodeIcon,
  recycleHorizontal: async () => (await import("./recycle-horizontal-BCVrssbO.js")).recycleHorizontalSvg,
  refresh: async () => (await import("./refresh-CMf-jB3a.js")).refreshSvg,
  search: async () => (await import("./search-C39c-0E2.js")).searchSvg,
  send: async () => (await import("./send-BZ4zjtZ0.js")).sendSvg,
  swapHorizontal: async () => (await import("./swapHorizontal-Cw1I7grM.js")).swapHorizontalSvg,
  swapHorizontalMedium: async () => (await import("./swapHorizontalMedium-D3JPdg6K.js")).swapHorizontalMediumSvg,
  swapHorizontalBold: async () => (await import("./swapHorizontalBold-ePU99YzM.js")).swapHorizontalBoldSvg,
  swapHorizontalRoundedBold: async () => (await import("./swapHorizontalRoundedBold-CJGT8tD5.js")).swapHorizontalRoundedBoldSvg,
  swapVertical: async () => (await import("./swapVertical-JkRjNIL5.js")).swapVerticalSvg,
  telegram: async () => (await import("./telegram-TbJqI7LR.js")).telegramSvg,
  threeDots: async () => (await import("./three-dots-MdKlpdz0.js")).threeDotsSvg,
  twitch: async () => (await import("./twitch-BRHXAmj3.js")).twitchSvg,
  twitter: async () => (await import("./x-DfoQVO03.js")).xSvg,
  twitterIcon: async () => (await import("./twitterIcon-DzCHe4KK.js")).twitterIconSvg,
  verify: async () => (await import("./verify-BkGtuxyd.js")).verifySvg,
  verifyFilled: async () => (await import("./verify-filled-BT9rMyTj.js")).verifyFilledSvg,
  wallet: async () => (await import("./wallet-D9-CdYFw.js")).walletSvg,
  walletConnect: async () => (await import("./walletconnect-Bf433rpg.js")).walletConnectSvg,
  walletConnectLightBrown: async () => (await import("./walletconnect-Bf433rpg.js")).walletConnectLightBrownSvg,
  walletConnectBrown: async () => (await import("./walletconnect-Bf433rpg.js")).walletConnectBrownSvg,
  walletPlaceholder: async () => (await import("./wallet-placeholder-Dmgx3gUi.js")).walletPlaceholderSvg,
  warningCircle: async () => (await import("./warning-circle-C9BYZh8q.js")).warningCircleSvg,
  x: async () => (await import("./x-DfoQVO03.js")).xSvg,
  info: async () => (await import("./info-UG2pNGcK.js")).infoSvg,
  exclamationTriangle: async () => (await import("./exclamation-triangle-lKfDmUS_.js")).exclamationTriangleSvg,
  reown: async () => (await import("./reown-logo-Br6FKZYd.js")).reownSvg
};
async function getSvg(name) {
  if (globalSvgCache.has(name)) {
    return globalSvgCache.get(name);
  }
  const importFn = ICONS[name] ?? ICONS.copy;
  const svgPromise = importFn();
  globalSvgCache.set(name, svgPromise);
  return svgPromise;
}
let WuiIcon = class WuiIcon2 extends i$3 {
  constructor() {
    super(...arguments);
    this.size = "md";
    this.name = "copy";
    this.color = "fg-300";
    this.aspectRatio = "1 / 1";
  }
  render() {
    this.style.cssText = `
      --local-color: ${`var(--wui-color-${this.color});`}
      --local-width: ${`var(--wui-icon-size-${this.size});`}
      --local-aspect-ratio: ${this.aspectRatio}
    `;
    return b`${m(getSvg(this.name), b`<div class="fallback"></div>`)}`;
  }
};
WuiIcon.styles = [resetStyles, colorStyles, styles$5];
__decorate$5([
  n$3()
], WuiIcon.prototype, "size", void 0);
__decorate$5([
  n$3()
], WuiIcon.prototype, "name", void 0);
__decorate$5([
  n$3()
], WuiIcon.prototype, "color", void 0);
__decorate$5([
  n$3()
], WuiIcon.prototype, "aspectRatio", void 0);
WuiIcon = __decorate$5([
  customElement("wui-icon")
], WuiIcon);
const e = e$1(class extends i$1 {
  constructor(t$1) {
    if (super(t$1), t$1.type !== t.ATTRIBUTE || "class" !== t$1.name || t$1.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(t2) {
    return " " + Object.keys(t2).filter((s2) => t2[s2]).join(" ") + " ";
  }
  update(s2, [i3]) {
    if (void 0 === this.st) {
      this.st = /* @__PURE__ */ new Set(), void 0 !== s2.strings && (this.nt = new Set(s2.strings.join(" ").split(/\s/).filter((t2) => "" !== t2)));
      for (const t2 in i3) i3[t2] && !this.nt?.has(t2) && this.st.add(t2);
      return this.render(i3);
    }
    const r2 = s2.element.classList;
    for (const t2 of this.st) t2 in i3 || (r2.remove(t2), this.st.delete(t2));
    for (const t2 in i3) {
      const s3 = !!i3[t2];
      s3 === this.st.has(t2) || this.nt?.has(t2) || (s3 ? (r2.add(t2), this.st.add(t2)) : (r2.remove(t2), this.st.delete(t2)));
    }
    return E;
  }
});
const styles$4 = i$2`
  :host {
    display: inline-flex !important;
  }

  slot {
    width: 100%;
    display: inline-block;
    font-style: normal;
    font-family: var(--wui-font-family);
    font-feature-settings:
      'tnum' on,
      'lnum' on,
      'case' on;
    line-height: 130%;
    font-weight: var(--wui-font-weight-regular);
    overflow: inherit;
    text-overflow: inherit;
    text-align: var(--local-align);
    color: var(--local-color);
  }

  .wui-line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .wui-line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .wui-font-medium-400 {
    font-size: var(--wui-font-size-medium);
    font-weight: var(--wui-font-weight-light);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-medium-600 {
    font-size: var(--wui-font-size-medium);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-title-600 {
    font-size: var(--wui-font-size-title);
    letter-spacing: var(--wui-letter-spacing-title);
  }

  .wui-font-title-6-600 {
    font-size: var(--wui-font-size-title-6);
    letter-spacing: var(--wui-letter-spacing-title-6);
  }

  .wui-font-mini-700 {
    font-size: var(--wui-font-size-mini);
    letter-spacing: var(--wui-letter-spacing-mini);
    text-transform: uppercase;
  }

  .wui-font-large-500,
  .wui-font-large-600,
  .wui-font-large-700 {
    font-size: var(--wui-font-size-large);
    letter-spacing: var(--wui-letter-spacing-large);
  }

  .wui-font-2xl-500,
  .wui-font-2xl-600,
  .wui-font-2xl-700 {
    font-size: var(--wui-font-size-2xl);
    letter-spacing: var(--wui-letter-spacing-2xl);
  }

  .wui-font-paragraph-400,
  .wui-font-paragraph-500,
  .wui-font-paragraph-600,
  .wui-font-paragraph-700 {
    font-size: var(--wui-font-size-paragraph);
    letter-spacing: var(--wui-letter-spacing-paragraph);
  }

  .wui-font-small-400,
  .wui-font-small-500,
  .wui-font-small-600 {
    font-size: var(--wui-font-size-small);
    letter-spacing: var(--wui-letter-spacing-small);
  }

  .wui-font-tiny-400,
  .wui-font-tiny-500,
  .wui-font-tiny-600 {
    font-size: var(--wui-font-size-tiny);
    letter-spacing: var(--wui-letter-spacing-tiny);
  }

  .wui-font-micro-700,
  .wui-font-micro-600 {
    font-size: var(--wui-font-size-micro);
    letter-spacing: var(--wui-letter-spacing-micro);
    text-transform: uppercase;
  }

  .wui-font-tiny-400,
  .wui-font-small-400,
  .wui-font-medium-400,
  .wui-font-paragraph-400 {
    font-weight: var(--wui-font-weight-light);
  }

  .wui-font-large-700,
  .wui-font-paragraph-700,
  .wui-font-micro-700,
  .wui-font-mini-700 {
    font-weight: var(--wui-font-weight-bold);
  }

  .wui-font-medium-600,
  .wui-font-medium-title-600,
  .wui-font-title-6-600,
  .wui-font-large-600,
  .wui-font-paragraph-600,
  .wui-font-small-600,
  .wui-font-tiny-600,
  .wui-font-micro-600 {
    font-weight: var(--wui-font-weight-medium);
  }

  :host([disabled]) {
    opacity: 0.4;
  }
`;
var __decorate$4 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i3 = decorators.length - 1; i3 >= 0; i3--) if (d = decorators[i3]) r2 = (c2 < 3 ? d(r2) : c2 > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiText = class WuiText2 extends i$3 {
  constructor() {
    super(...arguments);
    this.variant = "paragraph-500";
    this.color = "fg-300";
    this.align = "left";
    this.lineClamp = void 0;
  }
  render() {
    const classes = {
      [`wui-font-${this.variant}`]: true,
      [`wui-color-${this.color}`]: true,
      [`wui-line-clamp-${this.lineClamp}`]: this.lineClamp ? true : false
    };
    this.style.cssText = `
      --local-align: ${this.align};
      --local-color: var(--wui-color-${this.color});
    `;
    return b`<slot class=${e(classes)}></slot>`;
  }
};
WuiText.styles = [resetStyles, styles$4];
__decorate$4([
  n$3()
], WuiText.prototype, "variant", void 0);
__decorate$4([
  n$3()
], WuiText.prototype, "color", void 0);
__decorate$4([
  n$3()
], WuiText.prototype, "align", void 0);
__decorate$4([
  n$3()
], WuiText.prototype, "lineClamp", void 0);
WuiText = __decorate$4([
  customElement("wui-text")
], WuiText);
const styles$3 = i$2`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
    background-color: var(--wui-color-gray-glass-020);
    border-radius: var(--local-border-radius);
    border: var(--local-border);
    box-sizing: content-box;
    width: var(--local-size);
    height: var(--local-size);
    min-height: var(--local-size);
    min-width: var(--local-size);
  }

  @supports (background: color-mix(in srgb, white 50%, black)) {
    :host {
      background-color: color-mix(in srgb, var(--local-bg-value) var(--local-bg-mix), transparent);
    }
  }
`;
var __decorate$3 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i3 = decorators.length - 1; i3 >= 0; i3--) if (d = decorators[i3]) r2 = (c2 < 3 ? d(r2) : c2 > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiIconBox = class WuiIconBox2 extends i$3 {
  constructor() {
    super(...arguments);
    this.size = "md";
    this.backgroundColor = "accent-100";
    this.iconColor = "accent-100";
    this.background = "transparent";
    this.border = false;
    this.borderColor = "wui-color-bg-125";
    this.icon = "copy";
  }
  render() {
    const iconSize = this.iconSize || this.size;
    const isLg = this.size === "lg";
    const isXl = this.size === "xl";
    const bgMix = isLg ? "12%" : "16%";
    const borderRadius = isLg ? "xxs" : isXl ? "s" : "3xl";
    const isGray = this.background === "gray";
    const isOpaque = this.background === "opaque";
    const isColorChange = this.backgroundColor === "accent-100" && isOpaque || this.backgroundColor === "success-100" && isOpaque || this.backgroundColor === "error-100" && isOpaque || this.backgroundColor === "inverse-100" && isOpaque;
    let bgValueVariable = `var(--wui-color-${this.backgroundColor})`;
    if (isColorChange) {
      bgValueVariable = `var(--wui-icon-box-bg-${this.backgroundColor})`;
    } else if (isGray) {
      bgValueVariable = `var(--wui-color-gray-${this.backgroundColor})`;
    }
    this.style.cssText = `
       --local-bg-value: ${bgValueVariable};
       --local-bg-mix: ${isColorChange || isGray ? `100%` : bgMix};
       --local-border-radius: var(--wui-border-radius-${borderRadius});
       --local-size: var(--wui-icon-box-size-${this.size});
       --local-border: ${this.borderColor === "wui-color-bg-125" ? `2px` : `1px`} solid ${this.border ? `var(--${this.borderColor})` : `transparent`}
   `;
    return b` <wui-icon color=${this.iconColor} size=${iconSize} name=${this.icon}></wui-icon> `;
  }
};
WuiIconBox.styles = [resetStyles, elementStyles, styles$3];
__decorate$3([
  n$3()
], WuiIconBox.prototype, "size", void 0);
__decorate$3([
  n$3()
], WuiIconBox.prototype, "backgroundColor", void 0);
__decorate$3([
  n$3()
], WuiIconBox.prototype, "iconColor", void 0);
__decorate$3([
  n$3()
], WuiIconBox.prototype, "iconSize", void 0);
__decorate$3([
  n$3()
], WuiIconBox.prototype, "background", void 0);
__decorate$3([
  n$3({ type: Boolean })
], WuiIconBox.prototype, "border", void 0);
__decorate$3([
  n$3()
], WuiIconBox.prototype, "borderColor", void 0);
__decorate$3([
  n$3()
], WuiIconBox.prototype, "icon", void 0);
WuiIconBox = __decorate$3([
  customElement("wui-icon-box")
], WuiIconBox);
const styles$2 = i$2`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    border-radius: inherit;
  }
`;
var __decorate$2 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i3 = decorators.length - 1; i3 >= 0; i3--) if (d = decorators[i3]) r2 = (c2 < 3 ? d(r2) : c2 > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiImage = class WuiImage2 extends i$3 {
  constructor() {
    super(...arguments);
    this.src = "./path/to/image.jpg";
    this.alt = "Image";
    this.size = void 0;
  }
  render() {
    this.style.cssText = `
      --local-width: ${this.size ? `var(--wui-icon-size-${this.size});` : "100%"};
      --local-height: ${this.size ? `var(--wui-icon-size-${this.size});` : "100%"};
      `;
    return b`<img src=${this.src} alt=${this.alt} @error=${this.handleImageError} />`;
  }
  handleImageError() {
    this.dispatchEvent(new CustomEvent("onLoadError", { bubbles: true, composed: true }));
  }
};
WuiImage.styles = [resetStyles, colorStyles, styles$2];
__decorate$2([
  n$3()
], WuiImage.prototype, "src", void 0);
__decorate$2([
  n$3()
], WuiImage.prototype, "alt", void 0);
__decorate$2([
  n$3()
], WuiImage.prototype, "size", void 0);
WuiImage = __decorate$2([
  customElement("wui-image")
], WuiImage);
const styles$1 = i$2`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    height: var(--wui-spacing-m);
    padding: 0 var(--wui-spacing-3xs) !important;
    border-radius: var(--wui-border-radius-5xs);
    transition:
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius, background-color;
  }

  :host > wui-text {
    transform: translateY(5%);
  }

  :host([data-variant='main']) {
    background-color: var(--wui-color-accent-glass-015);
    color: var(--wui-color-accent-100);
  }

  :host([data-variant='shade']) {
    background-color: var(--wui-color-gray-glass-010);
    color: var(--wui-color-fg-200);
  }

  :host([data-variant='success']) {
    background-color: var(--wui-icon-box-bg-success-100);
    color: var(--wui-color-success-100);
  }

  :host([data-variant='error']) {
    background-color: var(--wui-icon-box-bg-error-100);
    color: var(--wui-color-error-100);
  }

  :host([data-size='lg']) {
    padding: 11px 5px !important;
  }

  :host([data-size='lg']) > wui-text {
    transform: translateY(2%);
  }
`;
var __decorate$1 = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i3 = decorators.length - 1; i3 >= 0; i3--) if (d = decorators[i3]) r2 = (c2 < 3 ? d(r2) : c2 > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiTag = class WuiTag2 extends i$3 {
  constructor() {
    super(...arguments);
    this.variant = "main";
    this.size = "lg";
  }
  render() {
    this.dataset["variant"] = this.variant;
    this.dataset["size"] = this.size;
    const textVariant = this.size === "md" ? "mini-700" : "micro-700";
    return b`
      <wui-text data-variant=${this.variant} variant=${textVariant} color="inherit">
        <slot></slot>
      </wui-text>
    `;
  }
};
WuiTag.styles = [resetStyles, styles$1];
__decorate$1([
  n$3()
], WuiTag.prototype, "variant", void 0);
__decorate$1([
  n$3()
], WuiTag.prototype, "size", void 0);
WuiTag = __decorate$1([
  customElement("wui-tag")
], WuiTag);
const styles = i$2`
  :host {
    display: flex;
  }

  :host([data-size='sm']) > svg {
    width: 12px;
    height: 12px;
  }

  :host([data-size='md']) > svg {
    width: 16px;
    height: 16px;
  }

  :host([data-size='lg']) > svg {
    width: 24px;
    height: 24px;
  }

  :host([data-size='xl']) > svg {
    width: 32px;
    height: 32px;
  }

  svg {
    animation: rotate 2s linear infinite;
  }

  circle {
    fill: none;
    stroke: var(--local-color);
    stroke-width: 4px;
    stroke-dasharray: 1, 124;
    stroke-dashoffset: 0;
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }

  :host([data-size='md']) > svg > circle {
    stroke-width: 6px;
  }

  :host([data-size='sm']) > svg > circle {
    stroke-width: 8px;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 124;
      stroke-dashoffset: 0;
    }

    50% {
      stroke-dasharray: 90, 124;
      stroke-dashoffset: -35;
    }

    100% {
      stroke-dashoffset: -125;
    }
  }
`;
var __decorate = function(decorators, target, key, desc) {
  var c2 = arguments.length, r2 = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r2 = Reflect.decorate(decorators, target, key, desc);
  else for (var i3 = decorators.length - 1; i3 >= 0; i3--) if (d = decorators[i3]) r2 = (c2 < 3 ? d(r2) : c2 > 3 ? d(target, key, r2) : d(target, key)) || r2;
  return c2 > 3 && r2 && Object.defineProperty(target, key, r2), r2;
};
let WuiLoadingSpinner = class WuiLoadingSpinner2 extends i$3 {
  constructor() {
    super(...arguments);
    this.color = "accent-100";
    this.size = "lg";
  }
  render() {
    this.style.cssText = `--local-color: ${this.color === "inherit" ? "inherit" : `var(--wui-color-${this.color})`}`;
    this.dataset["size"] = this.size;
    return b`<svg viewBox="25 25 50 50">
      <circle r="20" cy="50" cx="50"></circle>
    </svg>`;
  }
};
WuiLoadingSpinner.styles = [resetStyles, styles];
__decorate([
  n$3()
], WuiLoadingSpinner.prototype, "color", void 0);
__decorate([
  n$3()
], WuiLoadingSpinner.prototype, "size", void 0);
WuiLoadingSpinner = __decorate([
  customElement("wui-loading-spinner")
], WuiLoadingSpinner);
export {
  UiHelperUtil as U,
  e as a,
  customElement as c,
  e$1 as e,
  f,
  n$3 as n,
  o$1 as o,
  r$2 as r
};
//# sourceMappingURL=index-DIzZZF9K.js.map

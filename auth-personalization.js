(function () {
  const STYLE_PRESETS = ["blueSplit", "clientOnboarding", "securityReset", "softPlatform", "photoDark"];
  const SCREEN_KEYS = ["login", "register", "forgot", "mfa", "registerVerify", "forgotVerify"];
  const PRIMARY_SCREEN_KEYS = ["login", "register", "forgot"];
  const COMPOSITION_PRESETS = ["splitTrust", "floatingConsole", "stepperRail", "identityLedger", "campaignPassport", "vaultMinimal"];
  const LOGO_PLACEMENTS = ["heroTopLeft", "topCenter", "formTop", "mobileTop"];
  const LAYOUT_TYPES = ["split", "mediaSplit", "centeredCard", "fullBleed", "cardOverlay", "mobileFirst"];
  const FORM_POSITIONS = ["left", "right", "center"];
  const MEDIA_POSITIONS = ["left", "right", "background", "none"];
  const HERO_VISIBILITIES = ["full", "compact", "hidden"];
  const MOBILE_STRATEGIES = ["logoFirst", "formFirst", "mediaMuted", "singleColumn"];
  const REGISTER_LAYOUTS = ["centerCard", "splitForm", "sideRail", "timeline", "floatingPanel", "cardless"];
  const REGISTER_VISUAL_PLACEMENTS = ["left", "right", "background", "none"];
  const REGISTER_CARD_CHROMES = ["bordered", "borderless", "elevated", "glass", "flat"];
  const REGISTER_SECTION_FLOWS = ["singleColumn", "twoColumn", "groupedCards", "stepper"];
  const REGISTER_OFFER_PLACEMENTS = ["top", "side", "inline", "hidden"];
  const REGISTER_TERMS_PLACEMENTS = ["insideForm", "footer"];
  const SOCIAL_LOGIN_POSITIONS = ["top", "bottom", "sideRail", "inlineHeader"];
  const SOCIAL_LOGIN_STYLES = ["fullButtons", "iconGrid", "brandTiles", "pills", "minimalText"];
  const SOCIAL_LOGIN_DIVIDERS = ["line", "copy", "none"];

  const icons = {
    arrowRight: '<path d="M5 12h14" /><path d="m13 6 6 6-6 6" />',
    arrowLeft: '<path d="M19 12H5" /><path d="m11 6-6 6 6 6" />',
    chart: '<path d="M4 16.5 9 11l3.5 3.5L20 7" /><path d="M16 7h4v4" />',
    check: '<path d="m5 12 4 4L19 6" />',
    chevronDown: '<path d="m7 10 5 5 5-5" />',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" />',
    globe: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9c-2-2.4-3-5.4-3-9s1-6.6 3-9z" />',
    key: '<path d="M21 2l-2 2m-7.6 7.6a5 5 0 1 1-2.9-2.9L21 2z" /><path d="m15 5 4 4" />',
    lock: '<rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6.3 6.3l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z" />',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />',
    user: '<circle cx="12" cy="8" r="4" /><path d="M4 22a8 8 0 0 1 16 0" />',
  };

  function svg(name, className = "") {
    return `<svg${className ? ` class="${className}"` : ""} viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chart}</svg>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cleanText(value, fallback = "", limit = 220) {
    const text = String(value || fallback).replace(/\s+/g, " ").trim();
    return text.slice(0, limit);
  }

  function stableHash(value = "") {
    return String(value)
      .split("")
      .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function merge(base, override) {
    const output = { ...(isObject(base) ? base : {}) };
    if (!isObject(override)) return output;
    Object.entries(override).forEach(([key, value]) => {
      if (isObject(value) && isObject(output[key])) {
        output[key] = merge(output[key], value);
      } else if (Array.isArray(value)) {
        output[key] = value.slice();
      } else if (value !== undefined && value !== null && value !== "") {
        output[key] = value;
      }
    });
    return output;
  }

  function inferStylePreset(prompt = "", options = {}) {
    if (STYLE_PRESETS.includes(options.stylePreset)) return options.stylePreset;
    const guidedText = `${options.intent || ""} ${options.designStyle || ""} ${options.theme || ""} ${options.audience || ""} ${options.registerDepth || ""}`.toLowerCase();
    if (/resettrust|securelogin/.test(guidedText)) return "securityReset";
    if (/premium|blackgold|高净值|黑金|graphite|高级/.test(guidedText)) return "photoDark";
    if (/partnerinvite/.test(guidedText)) return "clientOnboarding";
    if (/campaignsignup/.test(guidedText)) return "photoDark";
    if (/compliance|合规|clientonboarding/.test(guidedText)) return "clientOnboarding";
    if (/soft|friendly|亲和|轻量/.test(guidedText)) return "softPlatform";
    if (/secure|security|twofactor|科技安全|双重/.test(guidedText)) return "securityReset";
    const text = `${prompt} ${options.stylePreset || ""}`.toLowerCase();
    if (/黑金|高净值|premium|blackgold|graphite|高级/.test(text)) return "photoDark";
    if (/找回|重置|reset|forgot|安全/.test(text)) return "securityReset";
    if (/开户|客户注册|kyc|投资|资料|onboarding/.test(text)) return "clientOnboarding";
    if (/照片|城市|移民|深色|statue|haame|photo|dark/.test(text)) return "photoDark";
    if (/平台|浅蓝|咨询|数字化|soft/.test(text)) return "softPlatform";
    return "blueSplit";
  }

  function inferIntent(prompt = "", options = {}) {
    const explicit = cleanText(options.intent, "", 40);
    if (explicit) return explicit;
    const text = String(prompt || "").toLowerCase();
    if (/活动|campaign|promo|奖励|转化|注册送|权益/.test(text)) return "campaignSignup";
    if (/代理|ib|渠道|邀请/.test(text)) return "partnerInvite";
    if (/找回|忘记|重置|reset|forgot/.test(text)) return "resetTrust";
    if (/安全登录|双重|2fa|securelogin/.test(text)) return "secureLogin";
    return "openAccount";
  }

  function inferRegisterDepth(prompt = "", options = {}) {
    const explicit = cleanText(options.registerDepth, "", 40);
    if (explicit) return explicit;
    const text = String(prompt || "").toLowerCase();
    if (/专业版|合规增强|合规版|compliance|full[_\s-]?kyc|kyc 前置|风险披露/.test(text)) return "compliance";
    if (/基础版|轻量|light/.test(text)) return "light";
    return "standard";
  }

  function inferTheme(prompt = "", options = {}) {
    const explicit = cleanText(options.theme, "", 40);
    if (explicit) return explicit;
    const text = String(prompt || "").toLowerCase();
    if (/黑金|高净值|blackgold|private|premium/.test(text)) return "blackGold";
    if (/石墨|银|graphite/.test(text)) return "graphiteSilver";
    if (/玫红|rose/.test(text)) return "roseCampaign";
    if (/青绿|绿色|emerald/.test(text)) return "emeraldSecure";
    return "blueTrust";
  }

  function expandFeatures(features = [], prompt = "") {
    const text = String(prompt || "").toLowerCase();
    const next = new Set(listValue(features));
    [
      ["phoneEmailLogin", /手机号|手机|邮箱|email|phone/],
      ["socialLogin", /第三方|google|apple|social/],
      ["tradingAccountLogin", /交易账号|交易账户|mt4|mt5|trading account/],
      ["captcha", /验证码|captcha|图形验证/],
      ["twoFactor", /双重|2fa|动态口令|two-factor|two factor/],
      ["inviteCode", /推荐码|邀请码|invite|referral|ib/],
      ["kycPrelude", /kyc|实名|身份|前置说明/],
      ["riskConsent", /风险|risk|披露|保证金/],
      ["promoReward", /活动|奖励|注册送|权益|礼遇|转化/],
    ].forEach(([feature, pattern]) => {
      if (pattern.test(text)) next.add(feature);
    });
    return [...next];
  }

  function inferScreen(prompt = "", options = {}) {
    if (SCREEN_KEYS.includes(options.screen)) return options.screen;
    const text = String(prompt || "").toLowerCase();
    if (/注册|开户|register|sign up|open account/.test(text)) return "register";
    if (/找回|忘记|重置|forgot|reset/.test(text)) return "forgot";
    return "login";
  }

  function inferComposition(prompt = "", options = {}, stylePreset = "blueSplit") {
    const explicit = cleanText(options.composition || options.visual?.composition, "", 40);
    if (COMPOSITION_PRESETS.includes(explicit)) return explicit;

    const text = [
      prompt,
      options.intent,
      options.audience,
      options.registerDepth,
      options.designStyle,
      options.theme,
      ...(Array.isArray(options.features) ? options.features : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/活动|campaign|promo|奖励|转化|lead|注册送/.test(text)) return "campaignPassport";
    if (/找回|忘记|重置|安全|双重|2fa|secure|reset|vault/.test(text)) return "vaultMinimal";
    if (/ib|代理|渠道|partner|invite|邀请码|推荐码/.test(text)) return "identityLedger";
    if (/高净值|黑金|premium|private|隐私|专属/.test(text) || stylePreset === "photoDark") return "floatingConsole";
    if (/kyc|合规|问卷|投资|开户注册|开户|onboarding|资料/.test(text)) return "stepperRail";

    const pool = ["splitTrust", "floatingConsole", "identityLedger"];
    return pool[Math.abs(stableHash(text || stylePreset)) % pool.length];
  }

  function normalizeHex(value, fallback) {
    const raw = String(value || "").trim();
    return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(raw) ? raw : fallback;
  }

  function normalizeLogoPlacement(value, fallback = "heroTopLeft") {
    return LOGO_PLACEMENTS.includes(value) ? value : fallback;
  }

  function inferLogoPlacement(prompt = "", options = {}, composition = "splitTrust", stylePreset = "blueSplit") {
    const explicit = cleanText(options.logoPlacement || options.brand?.logoPlacement, "", 40);
    if (LOGO_PLACEMENTS.includes(explicit)) return explicit;
    const text = `${prompt} ${options.intent || ""} ${options.designStyle || ""} ${options.theme || ""}`.toLowerCase();
    if (/表单顶部|form\s*top|formtop/.test(text)) return "formTop";
    if (/顶部居中|top\s*center|topcenter/.test(text)) return "topCenter";
    if (/logo\s*(?:在|放在|置于|优先|固定)?[^。；，,.;\n]{0,12}(?:移动端|手机|mobile)|(?:移动端|手机|mobile)\s*logo/.test(text)) return "mobileTop";
    if (explicitSplitLayoutRequested(text)) return "heroTopLeft";
    if (composition === "vaultMinimal" || stylePreset === "softPlatform") return "formTop";
    return "heroTopLeft";
  }

  function explicitSplitLayoutRequested(text = "") {
    const source = String(text || "").toLowerCase();
    if (/不要(?:用|做)?(?:左右|分栏|双栏|两栏)|不要.*split/.test(source)) return false;
    return /左右布局|左右分栏|左右结构|左右版式|左右排版|左右两栏|双栏|两栏|分栏布局|side[\s-]*by[\s-]*side|split[\s-]*layout|two[\s-]*column|2[\s-]*column/.test(source);
  }

  function allowedValue(value, allowed, fallback) {
    const raw = cleanText(value, "", 48);
    return allowed.includes(raw) ? raw : fallback;
  }

  function inferLayoutFields(prompt = "", options = {}, composition = "splitTrust", stylePreset = "blueSplit") {
    const visual = isObject(options.visual) ? options.visual : {};
    const text = [
      prompt,
      options.layoutType,
      options.formPosition,
      options.mediaPosition,
      visual.layoutType,
      visual.formPosition,
      visual.mediaPosition,
      options.designStyle,
      options.theme,
    ].filter(Boolean).join(" ").toLowerCase();
    const wantsSplitLayout = explicitSplitLayoutRequested(text);
    const hasCenter = !wantsSplitLayout && /居中|center|centered|中间|单卡|单列/.test(text);
    const hasOverlay = /背景图|背景视觉|浮层|overlay|full.?bleed|全屏|沉浸/.test(text);
    const hasMedia = wantsSplitLayout || /图|图片|插画|视觉|媒体|photo|image|illustration|卡通/.test(text);
    const mediaRight = /图在右|右图|右侧图|右侧视觉|视觉在右|媒体在右|插画在右|image right|media right|right visual/.test(text);
    const mediaLeft = /图在左|左图|左侧图|左侧视觉|视觉在左|媒体在左|插画在左|image left|media left|left visual/.test(text);
    const formLeft = /表单在左|左表单|form left|form-left/.test(text) || mediaRight;
    const formRight = /表单在右|右表单|form right|form-right/.test(text) || mediaLeft;
    const requestedLayout = cleanText(options.layoutType || visual.layoutType, "", 40);
    const layoutType = wantsSplitLayout
      ? (hasMedia || mediaLeft || mediaRight ? "mediaSplit" : "split")
      : allowedValue(
          requestedLayout,
          LAYOUT_TYPES,
          hasCenter
            ? "centeredCard"
            : hasOverlay
              ? "cardOverlay"
              : hasMedia
                ? "mediaSplit"
                : stylePreset === "softPlatform" || composition === "vaultMinimal"
                  ? "centeredCard"
                  : "split",
        );
    const formPosition = wantsSplitLayout
      ? (formLeft ? "left" : "right")
      : allowedValue(
          options.formPosition || visual.formPosition,
          FORM_POSITIONS,
          layoutType === "centeredCard" ? "center" : formLeft ? "left" : formRight ? "right" : "right",
        );
    const mediaPosition = wantsSplitLayout
      ? (formPosition === "left" ? "right" : "left")
      : allowedValue(
          options.mediaPosition || visual.mediaPosition,
          MEDIA_POSITIONS,
          layoutType === "centeredCard" ? "none" : layoutType === "cardOverlay" ? "background" : formPosition === "left" || mediaRight ? "right" : formPosition === "right" || mediaLeft ? "left" : "none",
        );
    return {
      layoutType,
      formPosition,
      mediaPosition,
      heroVisibility: wantsSplitLayout ? "full" : allowedValue(visual.heroVisibility, HERO_VISIBILITIES, layoutType === "centeredCard" ? "hidden" : layoutType === "cardOverlay" || layoutType === "mobileFirst" ? "compact" : "full"),
      mobileStrategy: allowedValue(visual.mobileStrategy, MOBILE_STRATEGIES, /移动端|手机|mobile|单手/.test(text) ? "logoFirst" : layoutType === "centeredCard" ? "formFirst" : "singleColumn"),
    };
  }

  function inferRegisterPresentation(prompt = "", options = {}, composition = "splitTrust", stylePreset = "blueSplit", intent = "openAccount", registerDepth = "standard") {
    const visual = isObject(options.visual) ? options.visual : {};
    const explicit = isObject(visual.registerPresentation) ? visual.registerPresentation : {};
    const text = [
      prompt,
      options.intent,
      options.designStyle,
      options.theme,
      options.registerDepth,
      options.layoutType,
      visual.layoutType,
      visual.formPosition,
      visual.mediaPosition,
    ].filter(Boolean).join(" ").toLowerCase();
    const wantsNoBorder = /无边框|不要边框|去掉边框|borderless|cardless|无卡片/.test(text);
    const wantsSteps = /步骤|stepper|timeline|开户流程|开户注册|kyc|合规/.test(text) || registerDepth === "compliance";
    const wantsSide = /侧栏|side|左右|分栏|rail/.test(text);
    const wantsBackground = /背景|浮层|沉浸|overlay|floating|glass/.test(text);
    const layout = allowedValue(
      explicit.layout,
      REGISTER_LAYOUTS,
      wantsNoBorder
        ? "cardless"
        : wantsSteps
          ? "timeline"
          : intent === "campaignSignup"
            ? "sideRail"
            : wantsBackground || stylePreset === "photoDark"
              ? "floatingPanel"
              : wantsSide || composition === "identityLedger"
                ? "splitForm"
                : "centerCard",
    );
    const socialPosition = allowedValue(explicit.socialLogin?.position, SOCIAL_LOGIN_POSITIONS, intent === "campaignSignup" || layout === "sideRail" ? "sideRail" : "top");
    return {
      layout,
      formPosition: allowedValue(explicit.formPosition, FORM_POSITIONS, visual.formPosition === "left" ? "left" : visual.formPosition === "center" ? "center" : "right"),
      visualPlacement: allowedValue(
        explicit.visualPlacement,
        REGISTER_VISUAL_PLACEMENTS,
        layout === "centerCard" || layout === "cardless" ? "none" : visual.mediaPosition === "right" ? "right" : visual.mediaPosition === "background" || layout === "floatingPanel" ? "background" : "left",
      ),
      cardChrome: allowedValue(explicit.cardChrome, REGISTER_CARD_CHROMES, wantsNoBorder ? "borderless" : layout === "floatingPanel" ? "glass" : stylePreset === "clientOnboarding" ? "bordered" : "elevated"),
      sectionFlow: allowedValue(explicit.sectionFlow, REGISTER_SECTION_FLOWS, wantsSteps ? "stepper" : registerDepth === "light" ? "singleColumn" : intent === "campaignSignup" ? "groupedCards" : "twoColumn"),
      offerPlacement: allowedValue(explicit.offerPlacement, REGISTER_OFFER_PLACEMENTS, intent === "campaignSignup" ? "side" : "top"),
      termsPlacement: allowedValue(explicit.termsPlacement, REGISTER_TERMS_PLACEMENTS, layout === "cardless" ? "footer" : "insideForm"),
      socialLogin: {
        position: socialPosition,
        style: allowedValue(explicit.socialLogin?.style, SOCIAL_LOGIN_STYLES, socialPosition === "sideRail" ? "brandTiles" : layout === "cardless" ? "minimalText" : "fullButtons"),
        divider: allowedValue(explicit.socialLogin?.divider, SOCIAL_LOGIN_DIVIDERS, socialPosition === "sideRail" ? "none" : "line"),
      },
    };
  }

  function normalizeRegisterPresentation(source = {}, fallback = {}) {
    const safeSource = isObject(source) ? source : {};
    const safeSocial = isObject(safeSource.socialLogin) ? safeSource.socialLogin : {};
    const fallbackSocial = isObject(fallback.socialLogin) ? fallback.socialLogin : {};
    return {
      layout: allowedValue(safeSource.layout, REGISTER_LAYOUTS, fallback.layout || "centerCard"),
      formPosition: allowedValue(safeSource.formPosition, FORM_POSITIONS, fallback.formPosition || "right"),
      visualPlacement: allowedValue(safeSource.visualPlacement, REGISTER_VISUAL_PLACEMENTS, fallback.visualPlacement || "none"),
      cardChrome: allowedValue(safeSource.cardChrome, REGISTER_CARD_CHROMES, fallback.cardChrome || "elevated"),
      sectionFlow: allowedValue(safeSource.sectionFlow, REGISTER_SECTION_FLOWS, fallback.sectionFlow || "twoColumn"),
      offerPlacement: allowedValue(safeSource.offerPlacement, REGISTER_OFFER_PLACEMENTS, fallback.offerPlacement || "top"),
      termsPlacement: allowedValue(safeSource.termsPlacement, REGISTER_TERMS_PLACEMENTS, fallback.termsPlacement || "insideForm"),
      socialLogin: {
        position: allowedValue(safeSocial.position, SOCIAL_LOGIN_POSITIONS, fallbackSocial.position || "top"),
        style: allowedValue(safeSocial.style, SOCIAL_LOGIN_STYLES, fallbackSocial.style || "fullButtons"),
        divider: allowedValue(safeSocial.divider, SOCIAL_LOGIN_DIVIDERS, fallbackSocial.divider || "line"),
      },
    };
  }

  function inferSocialLoginPresentation(prompt = "", options = {}, registerPresentation = {}) {
    const visual = isObject(options.visual) ? options.visual : {};
    const explicit = isObject(visual.socialLogin) ? visual.socialLogin : {};
    const text = [
      prompt,
      options.intent,
      options.designStyle,
      options.theme,
      ...(Array.isArray(options.features) ? options.features : []),
    ].filter(Boolean).join(" ").toLowerCase();
    const wantsIcons = /图标|icon|宫格|grid/.test(text);
    const wantsPills = /胶囊|pill|轻量/.test(text);
    const wantsMinimal = /极简|minimal|文字链接/.test(text);
    return {
      position: allowedValue(explicit.position, SOCIAL_LOGIN_POSITIONS, registerPresentation.socialLogin?.position || "top"),
      style: allowedValue(explicit.style, SOCIAL_LOGIN_STYLES, wantsMinimal ? "minimalText" : wantsIcons ? "iconGrid" : wantsPills ? "pills" : registerPresentation.socialLogin?.style || "fullButtons"),
      divider: allowedValue(explicit.divider, SOCIAL_LOGIN_DIVIDERS, registerPresentation.socialLogin?.divider || "line"),
    };
  }

  function normalizeSocialLoginPresentation(source = {}, fallback = {}) {
    const safeSource = isObject(source) ? source : {};
    return {
      position: allowedValue(safeSource.position, SOCIAL_LOGIN_POSITIONS, fallback.position || "top"),
      style: allowedValue(safeSource.style, SOCIAL_LOGIN_STYLES, fallback.style || "fullButtons"),
      divider: allowedValue(safeSource.divider, SOCIAL_LOGIN_DIVIDERS, fallback.divider || "line"),
    };
  }

  function splitReferenceStructure(layoutFields = {}) {
    if (layoutFields.layoutType === "centeredCard") return "居中表单，弱化侧边品牌视觉。";
    if (layoutFields.mediaPosition === "right") return "左右分栏：表单在左，媒体/插画/品牌视觉在右。";
    if (layoutFields.mediaPosition === "left") return "左右分栏：媒体/插画/品牌视觉在左，表单在右。";
    return "左右分栏：品牌叙事区与表单区并排，移动端单列降级。";
  }

  function listValue(value) {
    return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
  }

  function hasFeature(features, prompt, feature, pattern) {
    return features.includes(feature) || pattern.test(String(prompt || ""));
  }

  function guidedAccentFallback(options = {}, stylePreset = "blueSplit") {
    const theme = String(options.theme || "").toLowerCase();
    if (/blackgold/.test(theme)) return "#b7791f";
    if (/emerald/.test(theme)) return "#059669";
    if (/graphite/.test(theme)) return "#334155";
    if (/rose/.test(theme)) return "#e11d48";
    if (stylePreset === "photoDark") return "#e65b8d";
    return "#2563eb";
  }

  function audienceCopy(audience, fallback) {
    const map = {
      highNetWorth: ["专属账户安全中心", "为高净值客户提供更克制、更私密的开户注册体验。"],
      ibPartner: ["合作伙伴认证入口", "邀请码、联系资料与合作身份会在注册流程中清晰关联。"],
      returningTrader: ["欢迎回到交易账户", "快速登录、可靠找回和安全验证帮助客户顺畅回到交易。"],
      campaignLead: ["领取活动权益并完成开户", "以更短注册路径承接活动线索，同时保留必要风险提示。"],
      newTrader: ["创建您的交易账户", "用清晰步骤帮助新客户完成注册、安全设置和后续开户。"],
    };
    return map[audience] || fallback;
  }

  function brandTagline(options = {}, stylePreset = "blueSplit", intent = "openAccount") {
    if (intent === "campaignSignup") return "新客礼遇开户中心";
    if (stylePreset === "photoDark") return "黑金账户安全入口";
    if (options.audience === "ibPartner") return "合作伙伴账户入口";
    if (stylePreset === "softPlatform") return "轻量开户注册中心";
    return "安全账户服务中心";
  }

  function serviceLineFor(options = {}, intent = "openAccount") {
    if (intent === "campaignSignup") return "活动开户通行证";
    if (options.audience === "ibPartner") return "邀请关系确认台";
    return "客户认证中心";
  }

  function compositionProofPoints(composition, isZh = true) {
    const zh = {
      splitTrust: ["官方安全入口", "资料加密传输", "开户链接承接 KYC"],
      floatingConsole: ["专属身份校验", "账户安全审阅", "私密开户注册"],
      stepperRail: ["1 基础资料", "2 安全验证", "3 开户审核"],
      identityLedger: ["邀请关系确认", "合作身份归档", "协议授权留痕"],
      campaignPassport: ["手机号验证码", "活动权益锁定", "风险披露确认"],
      vaultMinimal: ["官方域名校验", "设备与邮箱验证", "安全重置保护"],
    };
    const en = {
      splitTrust: ["Official secure access", "Encrypted profile submission", "KYC-ready account opening"],
      floatingConsole: ["Private identity check", "Account security review", "Discreet onboarding"],
      stepperRail: ["1 Profile", "2 Security", "3 Review"],
      identityLedger: ["Invitation matched", "Partner identity filed", "Agreement recorded"],
      campaignPassport: ["Mobile verification", "Reward eligibility", "Risk disclosure"],
      vaultMinimal: ["Official domain check", "Device and email verification", "Protected reset"],
    };
    return (isZh ? zh : en)[composition] || (isZh ? zh.splitTrust : en.splitTrust);
  }

  function buildRegisterSections(options = {}, prompt = "", isZh = true) {
    const features = expandFeatures(options.features, prompt);
    const depth = String(options.registerDepth || "standard");
    const needsInvite = hasFeature(features, prompt, "inviteCode", /推荐码|邀请码|invite|ib/i);
    const needsRisk = hasFeature(features, prompt, "riskConsent", /风险|risk/i) || depth === "compliance";
    const needsKyc = hasFeature(features, prompt, "kycPrelude", /kyc|实名|身份/i) || depth === "compliance";
    const needsPromo = hasFeature(features, prompt, "promoReward", /活动|奖励|权益|注册送|礼遇|转化/i);
    const basicFields = [
      { id: "identifier", label: isZh ? "手机号或邮箱" : "Phone or email", type: "text", placeholder: isZh ? "请输入手机号或邮箱" : "Phone or email", required: true, span: "full" },
      { id: "password", label: isZh ? "密码" : "Password", type: "password", placeholder: isZh ? "至少 8 位字符" : "At least 8 characters", required: true },
      { id: "confirmPassword", label: isZh ? "确认密码" : "Confirm password", type: "password", placeholder: isZh ? "再次输入密码" : "Confirm password", required: true },
    ];
    if (depth !== "light") {
      basicFields.splice(1, 0, { id: "country", label: isZh ? "国家/地区" : "Country/Region", type: "select", placeholder: isZh ? "请选择国家或地区" : "Select country", required: true, span: "full" });
    }
    if (needsInvite) {
      basicFields.push({ id: "inviteCode", label: isZh ? "推荐码 / 邀请码" : "Invitation code", type: "text", placeholder: isZh ? "如有请填写" : "Optional", span: "full" });
    }

    const sections = [
      {
        title: isZh ? "账号信息" : "Account",
        description: isZh ? "先创建登录凭证，手机号或邮箱会在下一步完成验证" : "Create the credential first; phone or email is verified in the next step",
        fields: basicFields,
      },
    ];

    if (needsPromo) {
      sections.push({
        title: isZh ? "活动权益" : "Campaign eligibility",
        description: isZh ? "注册后先锁定资格，奖励发放以 KYC 审核与活动规则为准" : "Reserve eligibility before KYC review and campaign rule checks",
        fields: [
          { id: "campaignCode", label: isZh ? "活动码" : "Campaign code", type: "text", placeholder: isZh ? "系统自动识别或手动输入" : "Auto-detected or manual" },
          { id: "rewardChannel", label: isZh ? "奖励接收方式" : "Reward channel", type: "select", placeholder: isZh ? "请选择" : "Select" },
          { id: "rewardNotice", label: isZh ? "我了解奖励需满足开户、KYC 和活动规则" : "I understand reward eligibility rules", type: "radio", options: isZh ? ["确认并继续", "先完成普通开户"] : ["Confirm", "Standard signup"], required: true, span: "full" },
        ],
      });
    }

    if (needsKyc || needsRisk) {
      sections.push({
        title: isZh ? "开户与风险说明" : "Onboarding notice",
        description: isZh ? "注册成功后进入 KYC、风险测评和开户资料流程，此处只做提交前说明" : "After signup, continue to KYC, risk profiling, and account opening",
        fields: [
          { id: "onboardingNotice", label: isZh ? "我了解注册后需要继续完成 KYC 与风险确认" : "I understand KYC and risk checks continue after signup", type: "radio", options: isZh ? ["已了解并继续"] : ["Continue"], required: true, span: "full" },
        ],
      });
    }

    return sections;
  }

  function defaultScheme(options = {}) {
    const prompt = options.prompt || "";
    const stylePreset = inferStylePreset(prompt, options);
    const defaultScreen = inferScreen(prompt, options);
    const composition = inferComposition(prompt, options, stylePreset);
    const logoPlacement = inferLogoPlacement(prompt, options, composition, stylePreset);
    const layoutFields = inferLayoutFields(prompt, options, composition, stylePreset);
    const language = cleanText(options.language, "zh-CN", 20);
    const brandName = cleanText(options.brandName, "ForexCRM", 40);
    const features = expandFeatures(options.features, prompt);
    const intent = inferIntent(prompt, options);
    const audience = cleanText(options.audience, "newTrader", 40);
    const registerDepth = inferRegisterDepth(prompt, options);
    const designStyle = cleanText(options.designStyle, "trustClean", 40);
    const theme = inferTheme(prompt, options);
    const promptAccent = String(prompt || "").match(/#[0-9a-f]{3}(?:[0-9a-f]{3})?/i)?.[0] || "";
    const requestedAccent = cleanText(promptAccent || options.accent, "", 24);
    const accent = normalizeHex(theme === "blackGold" && requestedAccent.toLowerCase() === "#2563eb" ? "" : requestedAccent, guidedAccentFallback({ ...options, theme }, stylePreset));
    const accent2 = normalizeHex(options.accent2, theme === "blackGold" ? "#f5c46b" : stylePreset === "softPlatform" ? "#24b7aa" : "#1d4ed8");
    const isZh = language.startsWith("zh");
    const [audienceTitle, audienceSubtitle] = audienceCopy(audience, [
      defaultScreen === "register" ? "创建您的交易账户" : defaultScreen === "forgot" ? "安全重置密码，放心回到您的账户" : "Welcome Back",
      defaultScreen === "register" ? "填写注册信息，系统将自动创建客户资料并进入后续账户流程。" : "Sign in to access your account",
    ]);
    const registerSections = buildRegisterSections({ ...options, features, registerDepth }, prompt, isZh);
    const hasSocial = hasFeature(features, prompt, "socialLogin", /google|apple|第三方|social/i);
    const hasCaptcha = hasFeature(features, prompt, "captcha", /验证码|captcha|hcaptcha/i);
    const hasTwoFactor = hasFeature(features, prompt, "twoFactor", /双重|2fa|two-factor|two factor/i);
    const registerPresentation = inferRegisterPresentation(prompt, { ...options, features, visual: { ...(options.visual || {}), ...layoutFields } }, composition, stylePreset, intent, registerDepth);
    const socialLogin = inferSocialLoginPresentation(prompt, { ...options, features }, registerPresentation);

    return {
      id: `auth-local-${Date.now().toString(36)}`,
      name: `${brandName} 认证中心`,
      summary: "登录、注册、找回密码三条流程已按业务目标生成成独立认证模块。",
      language,
      stylePreset,
      defaultScreen,
      sourceType: "local",
      experience: {
        intent,
        audience,
        registerDepth,
        designStyle,
        theme,
        features,
      },
      brand: {
        name: brandName,
        tagline: brandTagline({ audience }, stylePreset, intent),
        serviceLine: serviceLineFor({ audience }, intent),
        logoPlacement,
      },
      visual: {
        accent,
        accent2,
        panelTone: stylePreset === "photoDark" ? "dark" : "light",
        density: stylePreset === "clientOnboarding" ? "compact" : "comfortable",
        radius: stylePreset === "photoDark" ? "10px" : "18px",
        composition,
        ...layoutFields,
        registerPresentation,
        socialLogin,
        referenceStructure: layoutFields.layoutType === "centeredCard"
          ? "居中表单，弱化侧边品牌视觉。"
          : layoutFields.mediaPosition === "right"
            ? "表单在左，媒体/插画/品牌视觉在右。"
            : layoutFields.mediaPosition === "left"
              ? "媒体/插画/品牌视觉在左，表单在右。"
              : "表单与品牌叙事分栏，移动端单列降级。",
      },
      hero: {
        title: intent === "campaignSignup" ? "领取新客礼遇并完成开户" : audienceTitle,
        subtitle: intent === "campaignSignup" ? "把手机号验证、活动资格、KYC 前置说明和风险披露串成清晰路径，减少新手开户犹豫。" : audienceSubtitle,
        proofPoints: compositionProofPoints(composition, isZh),
        bullets: [
          hasFeature(features, prompt, "promoReward", /活动|奖励|权益|注册送/i) ? "注册后锁定活动权益" : hasCaptcha || hasTwoFactor ? "验证码与安全校验降低账户风险" : "安全提交客户资料",
          hasFeature(features, prompt, "inviteCode", /推荐码|邀请码|invite|ib/i) ? "支持推荐码自动关联" : "注册后可继续完成 KYC 与开户",
          registerDepth === "light" ? "移动端友好的轻量注册路径" : "注册信息按步骤清晰拆分",
        ],
      },
      screens: {
        login: {
          title: isZh ? "欢迎回来" : "Welcome Back",
          subtitle: isZh ? "输入手机号或邮箱与密码登录；如需双重验证，将在下一步完成。" : "Sign in with phone or email and password; MFA continues on the next step when required.",
          modeTabs: [],
          identifierLabel: isZh ? "账号（手机号 / 邮箱）" : "Account (phone / email)",
          identifierPlaceholder: isZh ? "请输入手机号或邮箱" : "Phone or email",
          passwordLabel: isZh ? "密码" : "Password",
          passwordPlaceholder: isZh ? "请输入密码" : "••••••••",
          rememberLabel: isZh ? "记住账号" : "Remember me",
          forgotLabel: isZh ? "忘记密码?" : "Forgot password?",
          primaryAction: isZh ? "登录" : "Sign In",
          registerPrompt: isZh ? "没有账号？" : "Don't have an account?",
          registerAction: isZh ? "立即注册" : "Open Account",
          socialProviders: hasSocial ? ["Google", "Apple"] : [],
          extraFields: [],
          securityFlow: {
            requiresMfa: hasTwoFactor,
            riskCaptcha: hasCaptcha,
            title: isZh ? "安全验证" : "Security verification",
            subtitle: hasTwoFactor
              ? (isZh ? "此账号已开启双重验证，请输入认证器或短信中的 6 位验证码。" : "Enter the 6-digit code from your authenticator or message.")
              : (isZh ? "我们会根据登录风险触发人机校验，正常登录不会打断。" : "Human verification is triggered only when risk is elevated."),
            deliveryHint: isZh ? "验证码来自认证器应用 / 已绑定手机号" : "Code from authenticator app / bound phone",
            primaryAction: isZh ? "完成验证" : "Verify",
            resendAction: isZh ? "重新发送" : "Resend",
            recoveryAction: isZh ? "使用备用恢复码" : "Use recovery code",
          },
          helperNotice: hasTwoFactor ? "账号密码通过后进入 6 位验证码验证" : "人机校验按风险触发，不占用登录首屏",
        },
        register: {
          title: intent === "campaignSignup" ? "注册并锁定开户礼遇" : registerDepth === "light" ? "快速创建账户" : stylePreset === "photoDark" ? "账号注册" : "创建您的账户",
          subtitle: intent === "campaignSignup" ? "先创建账号并验证手机号或邮箱，KYC、奖励条件和风险披露会在注册后清晰继续。" : "填写账号与密码，提交前完成人机校验，下一步验证手机号或邮箱。",
          modeTabs: ["手机号", "邮箱"],
          socialProviders: hasSocial ? ["Google", "Apple"] : [],
          sections: registerSections,
          termsText: "我已阅读并同意 服务条款、隐私政策及风险披露，确认提交的信息真实有效。",
          primaryAction: isZh ? "继续验证" : "Continue",
          backAction: isZh ? "返回登录" : "Back to Login",
          trustNotice: "提交注册前会先完成人机校验，随后验证手机号或邮箱。",
          verification: {
            title: isZh ? "验证账号" : "Verify account",
            subtitle: isZh ? "完成一次人机校验，并输入发送到手机号或邮箱的 6 位验证码。" : "Complete a human check and enter the 6-digit phone or email code.",
            humanCheck: isZh ? "人机校验将在发送验证码前触发" : "Human check runs before sending the code",
            deliveryHint: isZh ? "验证码已发送至您的手机号或邮箱" : "Code sent to your phone or email",
            primaryAction: isZh ? "完成注册" : "Create account",
            resendAction: isZh ? "重新发送验证码" : "Resend code",
          },
        },
        forgot: {
          title: isZh ? "找回密码" : "Reset Password",
          subtitle: isZh ? "输入手机号或邮箱，完成人机校验和身份验证后设置新密码。" : "Verify your phone or email before setting a new password.",
          identifierLabel: isZh ? "账号（手机号 / 邮箱）" : "Account (phone / email)",
          identifierPlaceholder: isZh ? "请输入邮箱或手机号" : "your@email.com",
          primaryAction: isZh ? "继续验证身份" : "Continue Verification",
          backAction: isZh ? "返回登录" : "Back to Login",
          registerAction: isZh ? "去注册" : "Create Account",
          steps: ["输入账号", "人机校验", "验证身份", "设置新密码"],
          verification: {
            title: isZh ? "验证身份并设置新密码" : "Verify identity and reset password",
            subtitle: isZh ? "如果账号存在，我们会发送验证码。通过后即可设置新密码。" : "If the account exists, we will send a code before password reset.",
            humanCheck: isZh ? "发送验证码前进行人机校验，防止批量找回攻击" : "Human check protects password recovery from automation",
            primaryAction: isZh ? "确认重置密码" : "Reset password",
            resendAction: isZh ? "重新发送验证码" : "Resend code",
          },
        },
      },
      securityNotes: [
        hasTwoFactor ? "账号密码通过后进入 6 位双重验证" : "登录页仅收集账号与密码",
        "密码不会通过邮件明文发送",
        hasCaptcha ? "人机校验在登录风险、注册提交和找回密码发送验证码前触发" : "官方品牌页面，降低钓鱼风险",
      ],
      designNotes: [
        "视觉素材仅作为抽象设计语言借鉴，生成结果按当前业务目标重新组织。",
        `Logo 摆放采用 ${logoPlacement}，移动端首屏必须保留品牌识别、主登录入口和主按钮。`,
        "登录首屏只展示账号与密码；2FA、人机校验、注册验证码和找回密码验证码都进入后续验证步骤。",
      ],
    };
  }

  function normalizeScheme(source = {}, options = {}) {
    const fallback = defaultScheme(options);
    const raw = isObject(source?.scheme) ? source.scheme : source;
    const merged = merge(fallback, raw);
    const prompt = options.prompt || "";
    const mergedThemeText = `${merged.experience?.theme || ""} ${merged.visual?.accent || ""}`.toLowerCase();
    const mergedFeatureText = Array.isArray(merged.experience?.features) ? merged.experience.features.join(" ") : "";
    const mergedIntentText = `${merged.experience?.intent || ""} ${merged.summary || ""} ${merged.hero?.title || ""} ${mergedFeatureText}`.toLowerCase();
    const mergedDepthText = `${merged.experience?.registerDepth || ""} ${(merged.screens?.register?.sections || []).map((section) => section?.title || "").join(" ")}`.toLowerCase();
    const requestedTheme = /blackgold|黑金|高净值|#b7791f/.test(mergedThemeText) ? "blackGold" : inferTheme(prompt, options);
    const requestedIntent = /campaignsignup|活动|奖励|转化|权益|礼遇|promoReward/i.test(mergedIntentText) ? "campaignSignup" : inferIntent(prompt, options);
    const requestedRegisterDepth = /compliance|专业|合规|full|kyc/.test(mergedDepthText) ? "compliance" : inferRegisterDepth(prompt, options);
    const requestedLogoPlacement = inferLogoPlacement(prompt, options, fallback.visual?.composition, fallback.stylePreset);
    const stylePreset = requestedTheme === "blackGold"
      ? "photoDark"
      : STYLE_PRESETS.includes(merged.stylePreset)
        ? merged.stylePreset
        : fallback.stylePreset;
    const defaultScreen = SCREEN_KEYS.includes(merged.defaultScreen) ? merged.defaultScreen : fallback.defaultScreen;
    const composition = requestedIntent === "campaignSignup"
      ? "campaignPassport"
      : COMPOSITION_PRESETS.includes(merged.visual?.composition)
        ? merged.visual.composition
        : fallback.visual.composition;
    const promptAccent = String(prompt || "").match(/#[0-9a-f]{3}(?:[0-9a-f]{3})?/i)?.[0] || "";
    const requestedAccent = cleanText(promptAccent || merged.visual?.accent, "", 24);
    const layoutFields = inferLayoutFields(prompt, { ...options, visual: merged.visual }, composition, stylePreset);
    const enforceSplitLayout = explicitSplitLayoutRequested(`${prompt} ${options.layoutType || ""} ${options.formPosition || ""} ${options.mediaPosition || ""}`);
    const normalized = {
      ...merged,
      stylePreset,
      defaultScreen,
      brand: merge(fallback.brand, merged.brand),
      visual: {
        ...merge(fallback.visual, merged.visual),
        accent: normalizeHex(requestedTheme === "blackGold" && requestedAccent.toLowerCase() === "#2563eb" ? "" : requestedAccent, fallback.visual.accent),
        accent2: normalizeHex(merged.visual?.accent2, requestedTheme === "blackGold" ? "#f5c46b" : fallback.visual.accent2),
        composition,
        layoutType: enforceSplitLayout ? layoutFields.layoutType : allowedValue(merged.visual?.layoutType, LAYOUT_TYPES, layoutFields.layoutType),
        formPosition: enforceSplitLayout ? layoutFields.formPosition : allowedValue(merged.visual?.formPosition, FORM_POSITIONS, layoutFields.formPosition),
        mediaPosition: enforceSplitLayout ? layoutFields.mediaPosition : allowedValue(merged.visual?.mediaPosition, MEDIA_POSITIONS, layoutFields.mediaPosition),
        heroVisibility: enforceSplitLayout ? layoutFields.heroVisibility : allowedValue(merged.visual?.heroVisibility, HERO_VISIBILITIES, layoutFields.heroVisibility),
        mobileStrategy: allowedValue(merged.visual?.mobileStrategy, MOBILE_STRATEGIES, layoutFields.mobileStrategy),
        referenceStructure: enforceSplitLayout ? splitReferenceStructure(layoutFields) : cleanText(merged.visual?.referenceStructure, fallback.visual?.referenceStructure || "", 220),
      },
      hero: {
        ...merge(fallback.hero, merged.hero),
        proofPoints: (Array.isArray(merged.hero?.proofPoints) ? merged.hero.proofPoints : fallback.hero.proofPoints || []).slice(0, 5),
        bullets: (Array.isArray(merged.hero?.bullets) ? merged.hero.bullets : fallback.hero.bullets).slice(0, 5),
      },
      screens: {
        login: merge(fallback.screens.login, merged.screens?.login),
        register: merge(fallback.screens.register, merged.screens?.register),
        forgot: merge(fallback.screens.forgot, merged.screens?.forgot),
      },
      experience: merge(fallback.experience, merged.experience),
      securityNotes: (Array.isArray(merged.securityNotes) ? merged.securityNotes : fallback.securityNotes).slice(0, 6),
      designNotes: (Array.isArray(merged.designNotes) ? merged.designNotes : fallback.designNotes).slice(0, 8),
    };
    normalized.visual.registerPresentation = normalizeRegisterPresentation(merged.visual?.registerPresentation || merged.registerPresentation, fallback.visual.registerPresentation);
    normalized.visual.socialLogin = normalizeSocialLoginPresentation(merged.visual?.socialLogin || normalized.visual.registerPresentation.socialLogin, fallback.visual.socialLogin);
    normalized.visual.registerPresentation.socialLogin = normalizeSocialLoginPresentation(normalized.visual.registerPresentation.socialLogin, normalized.visual.socialLogin);
    normalized.brand.logoPlacement = requestedLogoPlacement !== "heroTopLeft" ? requestedLogoPlacement : normalizeLogoPlacement(merged.brand?.logoPlacement, fallback.brand.logoPlacement || "heroTopLeft");
    normalized.experience.intent = requestedIntent || normalized.experience.intent;
    normalized.experience.theme = requestedTheme || normalized.experience.theme;
    normalized.experience.registerDepth = requestedRegisterDepth || normalized.experience.registerDepth;
    normalized.experience.features = expandFeatures(normalized.experience.features || [], prompt);
    normalized.screens.login.extraFields = [];
    normalized.screens.login.modeTabs = [];
    normalized.screens.login.identifierLabel = normalized.language?.startsWith("zh") ? "账号（手机号 / 邮箱）" : "Account (phone / email)";
    normalized.screens.login.identifierPlaceholder = normalized.language?.startsWith("zh") ? "请输入手机号或邮箱" : "Phone or email";
    if (hasFeature(normalized.experience.features, prompt, "socialLogin", /google|apple|第三方|social/i) && (!Array.isArray(normalized.screens.login.socialProviders) || !normalized.screens.login.socialProviders.length)) {
      normalized.screens.login.socialProviders = ["Google", "Apple"];
    }
    normalized.screens.login.socialProviders = sanitizeSocialProviders(normalized.screens.login.socialProviders, fallback.screens.login.socialProviders);
    normalized.screens.register.socialProviders = sanitizeSocialProviders(normalized.screens.register.socialProviders, normalized.screens.login.socialProviders);
    normalized.screens.login.securityFlow = merge(fallback.screens.login.securityFlow, normalized.screens.login.securityFlow);
    normalized.screens.register.sections = sanitizeRegisterSections(normalized.screens.register.sections);
    normalized.screens.register.verification = merge(fallback.screens.register.verification, normalized.screens.register.verification);
    normalized.screens.forgot.verification = merge(fallback.screens.forgot.verification, normalized.screens.forgot.verification);
    if (requestedIntent === "campaignSignup") {
      normalized.brand.tagline = brandTagline({ audience: normalized.experience.audience }, normalized.stylePreset, requestedIntent);
      normalized.brand.serviceLine = serviceLineFor({ audience: normalized.experience.audience }, requestedIntent);
      if (/^(创建您的交易账户|登录你的账户|Welcome Back|ForexCRM 认证中心)$/i.test(normalized.hero.title || "")) {
        normalized.hero.title = "领取新客礼遇并完成开户";
      }
    }
    if (enforceSplitLayout) {
      normalized.designNotes = [
        splitReferenceStructure(layoutFields),
        "移动端折叠为单列，但保留 Logo、主登录入口和主按钮的首屏优先级。",
        ...(Array.isArray(normalized.designNotes) ? normalized.designNotes : []),
      ].filter(Boolean).slice(0, 8);
    }
    return normalized;
  }

  function localSchemeFromPrompt(prompt = "", options = {}) {
    return normalizeScheme(null, { ...options, prompt });
  }

  function fieldLooksLikeInlineChallenge(field = {}) {
    const text = `${field.id || ""} ${field.label || ""} ${field.placeholder || ""}`.toLowerCase();
    return /captcha|验证码|动态口令|安全验证码|双重|2fa|mfa|人机/.test(text);
  }

  function sanitizeRegisterSections(sections = []) {
    return (Array.isArray(sections) ? sections : [])
      .map((section) => ({
        ...section,
        fields: (Array.isArray(section?.fields) ? section.fields : []).filter((field) => !fieldLooksLikeInlineChallenge(field)),
      }))
      .filter((section) => !fieldLooksLikeInlineChallenge({ label: section.title, placeholder: section.description }))
      .filter((section) => section.title || section.description || section.fields.length);
  }

  function sanitizeSocialProviders(providers = [], fallback = []) {
    const source = Array.isArray(providers) && providers.length ? providers : fallback;
    return (Array.isArray(source) ? source : [])
      .map((item) => cleanText(item, "", 30))
      .filter(Boolean)
      .slice(0, 4);
  }

  function featureEnabled(scheme = {}, feature) {
    return listValue(scheme.experience?.features).includes(feature);
  }

  function hasProgressiveLoginChallenge(scheme = {}) {
    const flow = scheme.screens?.login?.securityFlow || {};
    return Boolean(flow.requiresMfa || flow.riskCaptcha || featureEnabled(scheme, "twoFactor") || featureEnabled(scheme, "captcha"));
  }

  function providerBadge(provider) {
    const value = cleanText(provider, "", 30);
    if (!value) return "";
    return `<span class="auth-source-badge">${escapeHtml(value)}</span>`;
  }

  function renderBrandMark(scheme, variant = "hero") {
    return `
      <div class="auth-brand-lockup auth-brand-lockup-${escapeHtml(variant)}">
        <span class="auth-brand-mark">${svg("chart")}</span>
        <span>
          <b>${escapeHtml(scheme.brand.name)}</b>
          <small>${escapeHtml(scheme.brand.tagline)}</small>
        </span>
      </div>
    `;
  }

  function renderFormLogo(scheme) {
    if (scheme.brand.logoPlacement !== "formTop") return "";
    return `<div class="auth-form-logo">${renderBrandMark(scheme, "form")}</div>`;
  }

  function renderMobileFormBrand(scheme) {
    if (scheme.brand.logoPlacement === "formTop") return "";
    return `<div class="auth-mobile-form-brand">${renderBrandMark(scheme, "mobile")}</div>`;
  }

  function renderHero(scheme, screen) {
    const bullets = (scheme.hero.bullets || []).map((item) => `<li>${svg("shield")}${escapeHtml(item)}</li>`).join("");
    const securityTiles = (scheme.securityNotes || []).map((item, index) => `<li>${svg(index === 1 ? "lock" : "shield")}<span>${escapeHtml(item)}</span></li>`).join("");
    const proofPoints = (scheme.hero.proofPoints || scheme.securityNotes || []).slice(0, 3);
    const proofMarkup = proofPoints.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("");
    const composition = scheme.visual?.composition || "splitTrust";
    const artifact = `
      <div class="auth-hero-artifact" aria-hidden="true">
        <div class="auth-artifact-head">
          <span>${svg(screen === "forgot" ? "mail" : composition === "vaultMinimal" ? "lock" : "shield")}</span>
          <b>${escapeHtml(scheme.brand.serviceLine || "Client Portal")}</b>
        </div>
        <div class="auth-artifact-lines">${proofMarkup}</div>
      </div>
    `;
    const showHeroLogo = !["topCenter", "formTop", "mobileTop"].includes(scheme.brand.logoPlacement);
    return `
      <aside class="auth-hero-panel" aria-label="认证品牌说明">
        ${showHeroLogo ? renderBrandMark(scheme) : ""}
        <div class="auth-hero-center">
          <span class="auth-hero-icon">${svg(screen === "forgot" ? "mail" : "chart")}</span>
          <h1>${escapeHtml(scheme.hero.title)}</h1>
          <p>${escapeHtml(scheme.hero.subtitle)}</p>
          <ul class="auth-hero-bullets">${bullets}</ul>
        </div>
        ${artifact}
        <ul class="auth-security-tiles">${securityTiles}</ul>
      </aside>
    `;
  }

  function renderLanguageControl(scheme) {
    return `
      <div class="auth-language-control" aria-label="语言选择">
        ${svg("globe")}
        <span>${scheme.language?.startsWith("zh") ? "中文" : "English"}</span>
        ${svg("chevronDown")}
      </div>
    `;
  }

  function renderInput(icon, label, placeholder, type = "text", value = "") {
    return `
      <label class="auth-field">
        <span>${escapeHtml(label)}</span>
        <i>${svg(icon)}</i>
        <input type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" autocomplete="off" />
        ${type === "password" ? `<button type="button" aria-label="显示密码">${svg("eye")}</button>` : ""}
      </label>
    `;
  }

  function renderSocialButton(provider, language = "zh-CN", screen = "login") {
    const isApple = /apple/i.test(provider);
    const isZh = String(language || "").startsWith("zh");
    const action = screen === "register" ? (isZh ? "注册" : "Sign up") : (isZh ? "继续" : "Continue");
    const label = /google/i.test(provider)
      ? (isZh ? `使用 Google ${action}` : `${action} with Google`)
      : /apple/i.test(provider)
        ? (isZh ? `使用 Apple ${action}` : `${action} with Apple`)
        : (isZh ? `使用 ${provider} ${action}` : `${action} with ${provider}`);
    return `<button class="auth-social-button${isApple ? " apple" : ""}" type="button"><span>${escapeHtml(provider.slice(0, 1))}</span>${escapeHtml(label)}</button>`;
  }

  function renderSocialBlock(scheme, screen = "login") {
    const socialConfig = normalizeSocialLoginPresentation(scheme.visual?.socialLogin, scheme.visual?.registerPresentation?.socialLogin || {});
    const screenConfig = scheme.screens?.[screen] || {};
    const providers = sanitizeSocialProviders(screenConfig.socialProviders, screen === "register" ? scheme.screens?.login?.socialProviders : []);
    if (!providers.length) return "";
    const social = providers.map((provider) => renderSocialButton(provider, scheme.language, screen)).join("");
    const dividerText = screen === "register" ? "或填写资料注册" : "或使用账号登录";
    const divider = socialConfig.divider === "none" ? "" : `<div class="auth-divider auth-divider-${escapeHtml(socialConfig.divider)}"><span>${escapeHtml(dividerText)}</span></div>`;
    return `
      <div class="auth-social-block auth-social-block-${escapeHtml(socialConfig.position)}" data-auth-social-screen="${escapeHtml(screen)}">
        <div class="auth-social-stack">${social}</div>
        ${divider}
      </div>
    `;
  }

  function renderCampaignOffer(scheme, screen = "login") {
    const features = listValue(scheme.experience?.features);
    const shouldShow = scheme.visual?.composition === "campaignPassport" || scheme.experience?.intent === "campaignSignup" || features.includes("promoReward");
    if (!shouldShow) return "";
    const copy = {
      login: ["新客礼遇待领取", "登录或注册后锁定活动资格，KYC 与风险确认将在提交前说明。"],
      register: ["注册即锁定活动资格", "完成手机/邮箱验证后进入 KYC，奖励发放以活动规则与审核结果为准。"],
      forgot: ["安全找回不影响权益", "通过验证后继续使用原活动资格，敏感操作会触发二次校验。"],
    }[screen] || ["活动资格", "完成验证后继续开户流程。"];
    return `
      <div class="auth-offer-strip">
        <b>${escapeHtml(copy[0])}</b>
        <span>${escapeHtml(copy[1])}</span>
      </div>
    `;
  }

  function renderScreenTabs(activeScreen) {
    return `
      <div class="auth-screen-tabs" role="tablist" aria-label="认证流程">
        <button class="${activeScreen === "login" ? "active" : ""}" type="button" data-auth-screen-switch="login">登录</button>
        <button class="${activeScreen === "register" ? "active" : ""}" type="button" data-auth-screen-switch="register">注册</button>
        <button class="${activeScreen === "forgot" ? "active" : ""}" type="button" data-auth-screen-switch="forgot">找回密码</button>
      </div>
    `;
  }

  function renderModeTabs(labels = []) {
    if (!Array.isArray(labels) || !labels.length) return "";
    const iconForLabel = (label, index) => /交易|account/i.test(label) ? "user" : index === 0 ? "phone" : "mail";
    return `<div class="auth-mode-tabs">${labels.map((label, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${svg(iconForLabel(label, index))}${escapeHtml(label)}</button>`).join("")}</div>`;
  }

  function renderStepPills(items = [], activeIndex = 0) {
    const steps = Array.isArray(items) && items.length ? items : ["账号密码", "安全验证", "完成"];
    return `
      <ol class="auth-step-pills">
        ${steps.map((item, index) => `<li class="${index === activeIndex ? "active" : index < activeIndex ? "done" : ""}"><span>${index + 1}</span>${escapeHtml(item)}</li>`).join("")}
      </ol>
    `;
  }

  function renderOtpInput(label = "6 位验证码") {
    return `
      <label class="auth-otp-field">
        <span>${escapeHtml(label)}</span>
        <div class="auth-otp-grid" aria-label="${escapeHtml(label)}">
          ${Array.from({ length: 6 }, (_, index) => `<input inputmode="numeric" maxlength="1" aria-label="验证码第 ${index + 1} 位" />`).join("")}
        </div>
      </label>
    `;
  }

  function renderHumanCheck(text = "人机校验将在关键步骤触发") {
    return `
      <div class="auth-human-check">
        <span>${svg("shield")}</span>
        <div>
          <b>人机校验</b>
          <small>${escapeHtml(text)}</small>
        </div>
        <i>按风险触发</i>
      </div>
    `;
  }

  function renderLogin(scheme) {
    const screen = scheme.screens.login || {};
    const socialBlock = renderSocialBlock(scheme, "login");
    return `
      <article class="auth-form-card auth-login-card">
        ${renderFormLogo(scheme)}
        ${scheme.stylePreset === "softPlatform" ? renderScreenTabs("login") : ""}
        <header class="auth-form-head">
          <h2>${escapeHtml(screen.title)}</h2>
          <p>${escapeHtml(screen.subtitle)}</p>
        </header>
        ${renderCampaignOffer(scheme, "login")}
        ${renderModeTabs(screen.modeTabs || [])}
        ${socialBlock}
        <form class="auth-form" data-auth-demo-form="login">
          ${renderInput(/mail|email/i.test(screen.identifierLabel) ? "mail" : "user", screen.identifierLabel, screen.identifierPlaceholder, "text", /@/.test(screen.identifierPlaceholder || "") ? screen.identifierPlaceholder : "")}
          ${renderInput("lock", screen.passwordLabel, screen.passwordPlaceholder, "password")}
          <div class="auth-inline-row">
            <label class="auth-checkbox"><input type="checkbox" checked /><span>${escapeHtml(screen.rememberLabel)}</span></label>
            <button type="button" data-auth-screen-switch="forgot">${escapeHtml(screen.forgotLabel)}</button>
          </div>
          <button class="auth-primary-action" type="submit">${escapeHtml(screen.primaryAction)} ${svg("arrowRight")}</button>
          <p class="auth-switch-copy">${escapeHtml(screen.registerPrompt)} <button type="button" data-auth-screen-switch="register">${escapeHtml(screen.registerAction)}</button></p>
          <small class="auth-trust-line">${svg("shield")}${escapeHtml(screen.helperNotice)}</small>
          <output data-auth-submit-status hidden></output>
        </form>
      </article>
    `;
  }

  function renderMfa(scheme) {
    const login = scheme.screens.login || {};
    const flow = login.securityFlow || {};
    const needsMfa = Boolean(flow.requiresMfa || featureEnabled(scheme, "twoFactor"));
    const title = cleanText(flow.title, needsMfa ? "双重验证" : "安全验证", 60);
    const subtitle = cleanText(flow.subtitle, needsMfa ? "请输入认证器应用或短信中的 6 位验证码。" : "当前登录需要先完成一次人机校验。", 120);
    return `
      <article class="auth-form-card auth-mfa-card">
        ${renderFormLogo(scheme)}
        <button class="auth-back-link" type="button" data-auth-screen-switch="login">${svg("arrowLeft")} 返回登录</button>
        ${renderStepPills(["账号密码", needsMfa ? "双重验证" : "风险校验", "进入账户"], 1)}
        <span class="auth-reset-icon">${svg(needsMfa ? "key" : "shield")}</span>
        <header class="auth-form-head centered">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </header>
        <form class="auth-form" data-auth-demo-form="mfa">
          ${renderHumanCheck(flow.riskCaptcha ? "异常设备、连续失败或发送验证码前会触发" : "当前步骤会校验设备与请求风险")}
          ${needsMfa ? renderOtpInput("6 位验证码") : ""}
          <small class="auth-delivery-hint">${svg("lock")}${escapeHtml(flow.deliveryHint || "验证码来自认证器应用 / 已绑定手机号")}</small>
          <button class="auth-primary-action" type="submit">${escapeHtml(flow.primaryAction || "完成验证")} ${svg("arrowRight")}</button>
          <div class="auth-forgot-links">
            <button type="button">${escapeHtml(flow.resendAction || "重新发送")}</button>
            <button type="button">${escapeHtml(flow.recoveryAction || "使用备用恢复码")}</button>
          </div>
          <output data-auth-submit-status hidden></output>
        </form>
      </article>
    `;
  }

  function renderField(field = {}) {
    const label = `${field.label || "字段"}${field.required ? " *" : ""}`;
    const span = field.span === "full" ? " full" : "";
    if (field.type === "select") {
      return `
        <label class="auth-field compact${span}">
          <span>${escapeHtml(label)}</span>
          <select>
            <option>${escapeHtml(field.placeholder || "请选择")}</option>
            <option>中国大陆</option>
            <option>Singapore</option>
            <option>United Kingdom</option>
          </select>
        </label>
      `;
    }
    if (field.type === "radio") {
      const options = Array.isArray(field.options) && field.options.length ? field.options : ["选项一", "选项二"];
      return `<fieldset class="auth-radio-field${span}"><legend>${escapeHtml(label)}</legend>${options.map((item) => `<label><input type="radio" name="${escapeHtml(field.id || label)}" />${escapeHtml(item)}</label>`).join("")}</fieldset>`;
    }
    return `
      <label class="auth-field compact${span}">
        <span>${escapeHtml(label)}</span>
        <input type="${escapeHtml(field.type || "text")}" placeholder="${escapeHtml(field.placeholder || "")}" autocomplete="off" />
      </label>
    `;
  }

  function renderRegisterSections(screen = {}, isFull = false) {
    if (isFull) {
      return (screen.sections || []).map((section) => `
        <section class="auth-register-section">
          <h3>${escapeHtml(section.title)}</h3>
          ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
          <div class="auth-field-grid">${(section.fields || []).map(renderField).join("")}</div>
        </section>
      `).join("");
    }
    const flatFields = (screen.sections || []).flatMap((section) => section.fields || []);
    const preferredIds = ["identifier", "country", "password", "confirmPassword", "inviteCode"];
    const pickedFields = preferredIds
      .map((id) => flatFields.find((field) => field.id === id))
      .filter(Boolean)
      .slice(0, 4);
    const fields = pickedFields.length >= 2 ? pickedFields : flatFields.slice(0, 4);
    return `
      <section class="auth-register-section auth-register-section-compact">
        <div class="auth-field-grid single">${fields.map(renderField).join("")}</div>
      </section>
    `;
  }

  function renderRegisterAside(scheme, screen = {}, presentation = {}, sideContent = {}) {
    const proofPoints = (scheme.hero?.proofPoints || scheme.hero?.bullets || []).slice(0, 3);
    const steps = ["账号信息", "人机校验", "验证码", "开户流程"];
    return `
      <aside class="auth-register-aside" aria-label="注册辅助信息">
        <div class="auth-register-aside-head">
          <span>${svg(presentation.layout === "timeline" ? "check" : "shield")}</span>
          <div>
            <b>${escapeHtml(scheme.brand.serviceLine || "开户链接")}</b>
            <small>${escapeHtml(screen.trustNotice || "提交前完成安全校验")}</small>
          </div>
        </div>
        <ol class="auth-register-mini-steps">
          ${steps.map((item, index) => `<li><span>${index + 1}</span>${escapeHtml(item)}</li>`).join("")}
        </ol>
        ${proofPoints.length ? `<div class="auth-register-proof">${proofPoints.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
        ${sideContent.offer || ""}
        ${sideContent.social || ""}
      </aside>
    `;
  }

  function renderRegisterShell(scheme, isFull = false) {
    const screen = scheme.screens.register || {};
    const presentation = normalizeRegisterPresentation(scheme.visual?.registerPresentation, {});
    const socialPosition = presentation.socialLogin.position;
    const socialBlock = renderSocialBlock(scheme, "register");
    const offer = renderCampaignOffer(scheme, "register");
    const sideSocial = socialPosition === "sideRail" ? socialBlock : "";
    const topSocial = ["top", "inlineHeader"].includes(socialPosition) ? socialBlock : "";
    const bottomSocial = socialPosition === "bottom" ? socialBlock : "";
    const sideOffer = presentation.offerPlacement === "side" ? offer : "";
    const topOffer = ["top", "inline"].includes(presentation.offerPlacement) ? offer : "";
    const showAside = !["centerCard", "cardless"].includes(presentation.layout) || sideOffer || sideSocial;
    const sections = renderRegisterSections(screen, isFull);
    const modeTabs = renderModeTabs(screen.modeTabs);
    const infoStrip = `<div class="auth-info-strip">${svg("shield")}<span>${escapeHtml(screen.trustNotice || "注册成功后将向邮箱发送验证码")}</span></div>`;
    const termsClass = presentation.termsPlacement === "footer" ? " auth-terms-footer" : "";
    return `
      <article class="auth-form-card auth-register-card ${isFull ? "wide" : ""} auth-register-layout-${escapeHtml(presentation.layout)} auth-register-chrome-${escapeHtml(presentation.cardChrome)} auth-register-flow-${escapeHtml(presentation.sectionFlow)} auth-register-offer-${escapeHtml(presentation.offerPlacement)} auth-register-visual-${escapeHtml(presentation.visualPlacement)} auth-register-social-${escapeHtml(socialPosition)}">
        ${renderFormLogo(scheme)}
        <button class="auth-back-link" type="button" data-auth-screen-switch="login">${svg("arrowLeft")} ${escapeHtml(screen.backAction || "返回登录")}</button>
        <div class="auth-register-inner">
          ${showAside ? renderRegisterAside(scheme, screen, presentation, { offer: sideOffer, social: sideSocial }) : ""}
          <div class="auth-register-main">
            ${scheme.stylePreset === "softPlatform" ? renderScreenTabs("register") : ""}
            <header class="auth-form-head">
              <h2>${escapeHtml(screen.title)}</h2>
              <p>${escapeHtml(screen.subtitle)}</p>
            </header>
            ${topOffer}
            ${modeTabs}
            ${infoStrip}
            ${topSocial}
            <form class="auth-form" data-auth-demo-form="register">
              <div class="auth-register-sections">${sections}</div>
              <label class="auth-terms-box${termsClass}"><input type="checkbox" /> <span>${escapeHtml(screen.termsText)}</span></label>
              <button class="auth-primary-action" type="submit">${escapeHtml(screen.primaryAction)} ${svg("arrowRight")}</button>
              ${bottomSocial}
              <small class="auth-trust-line">${svg("shield")}您的信息受到严格保护，安全加密传输</small>
              <output data-auth-submit-status hidden></output>
            </form>
          </div>
        </div>
      </article>
    `;
  }

  function renderFullRegister(scheme) {
    return renderRegisterShell(scheme, true);
  }

  function renderCompactRegister(scheme) {
    return renderRegisterShell(scheme, false);
  }

  function renderForgot(scheme) {
    const screen = scheme.screens.forgot || {};
    return `
      <article class="auth-form-card auth-forgot-card">
        ${renderFormLogo(scheme)}
        ${scheme.stylePreset === "softPlatform" ? renderScreenTabs("forgot") : ""}
        <span class="auth-reset-icon">${svg("mail")}</span>
        <header class="auth-form-head centered">
          <h2>${escapeHtml(screen.title)}</h2>
          <p>${escapeHtml(screen.subtitle)}</p>
        </header>
        ${renderCampaignOffer(scheme, "forgot")}
        <form class="auth-form" data-auth-demo-form="forgot">
          ${renderInput("mail", screen.identifierLabel, screen.identifierPlaceholder, "text")}
          <button class="auth-primary-action" type="submit">${escapeHtml(screen.primaryAction)}</button>
          <div class="auth-forgot-links">
            <button type="button" data-auth-screen-switch="login">${svg("arrowLeft")} ${escapeHtml(screen.backAction)}</button>
            <button type="button" data-auth-screen-switch="register">${escapeHtml(screen.registerAction)}</button>
          </div>
          <output data-auth-submit-status hidden></output>
        </form>
      </article>
    `;
  }

  function renderRegisterVerify(scheme) {
    const screen = scheme.screens.register || {};
    const verification = screen.verification || {};
    return `
      <article class="auth-form-card auth-register-verify-card">
        ${renderFormLogo(scheme)}
        <button class="auth-back-link" type="button" data-auth-screen-switch="register">${svg("arrowLeft")} ${escapeHtml(screen.backAction || "返回注册")}</button>
        ${renderStepPills(["账号信息", "人机校验", "验证码", "完成"], 2)}
        <header class="auth-form-head">
          <h2>${escapeHtml(verification.title || "验证账号")}</h2>
          <p>${escapeHtml(verification.subtitle || "完成一次人机校验，并输入发送到手机号或邮箱的 6 位验证码。")}</p>
        </header>
        <form class="auth-form" data-auth-demo-form="registerVerify">
          ${renderHumanCheck(verification.humanCheck || "人机校验将在发送验证码前触发")}
          ${renderOtpInput("手机号 / 邮箱验证码")}
          <small class="auth-delivery-hint">${svg("mail")}${escapeHtml(verification.deliveryHint || "验证码已发送至您的手机号或邮箱")}</small>
          <button class="auth-primary-action" type="submit">${escapeHtml(verification.primaryAction || "完成注册")} ${svg("arrowRight")}</button>
          <div class="auth-forgot-links">
            <button type="button">${escapeHtml(verification.resendAction || "重新发送验证码")}</button>
            <button type="button" data-auth-screen-switch="login">返回登录</button>
          </div>
          <output data-auth-submit-status hidden></output>
        </form>
      </article>
    `;
  }

  function renderForgotVerify(scheme) {
    const screen = scheme.screens.forgot || {};
    const verification = screen.verification || {};
    return `
      <article class="auth-form-card auth-forgot-verify-card">
        ${renderFormLogo(scheme)}
        <button class="auth-back-link" type="button" data-auth-screen-switch="forgot">${svg("arrowLeft")} ${escapeHtml(screen.backAction || "返回")}</button>
        ${renderStepPills(screen.steps || ["输入账号", "人机校验", "验证身份", "设置新密码"], 2)}
        <header class="auth-form-head">
          <h2>${escapeHtml(verification.title || "验证身份并设置新密码")}</h2>
          <p>${escapeHtml(verification.subtitle || "如果账号存在，我们会发送验证码。通过后即可设置新密码。")}</p>
        </header>
        <form class="auth-form" data-auth-demo-form="forgotVerify">
          ${renderHumanCheck(verification.humanCheck || "发送验证码前进行人机校验，防止批量找回攻击")}
          ${renderOtpInput("身份验证码")}
          ${renderInput("lock", "新密码", "请输入新密码", "password")}
          ${renderInput("lock", "确认新密码", "再次输入新密码", "password")}
          <button class="auth-primary-action" type="submit">${escapeHtml(verification.primaryAction || "确认重置密码")}</button>
          <div class="auth-forgot-links">
            <button type="button">${escapeHtml(verification.resendAction || "重新发送验证码")}</button>
            <button type="button" data-auth-screen-switch="login">返回登录</button>
          </div>
          <output data-auth-submit-status hidden></output>
        </form>
      </article>
    `;
  }

  function renderForm(scheme, screen) {
    if (screen === "mfa") return renderMfa(scheme);
    if (screen === "registerVerify") return renderRegisterVerify(scheme);
    if (screen === "forgotVerify") return renderForgotVerify(scheme);
    if (screen === "register") {
      const depth = String(scheme.experience?.registerDepth || "");
      const needsFullRegister = scheme.stylePreset === "clientOnboarding" || /compliance|专业|合规|full/i.test(depth);
      return needsFullRegister ? renderFullRegister(scheme) : renderCompactRegister(scheme);
    }
    if (screen === "forgot") return renderForgot(scheme);
    return renderLogin(scheme);
  }

  function bindPreview(host, scheme, options) {
    host.querySelectorAll("[data-auth-screen-switch]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextScreen = button.dataset.authScreenSwitch;
        if (SCREEN_KEYS.includes(nextScreen)) renderAuthPreview(host, scheme, { ...options, screen: nextScreen });
      });
    });

    host.querySelectorAll("[data-auth-demo-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const flow = form.dataset.authDemoForm || "";
        if (flow === "login" && hasProgressiveLoginChallenge(scheme)) {
          renderAuthPreview(host, scheme, { ...options, screen: "mfa" });
          return;
        }
        if (flow === "register") {
          renderAuthPreview(host, scheme, { ...options, screen: "registerVerify" });
          return;
        }
        if (flow === "forgot") {
          renderAuthPreview(host, scheme, { ...options, screen: "forgotVerify" });
          return;
        }
        const output = form.querySelector("[data-auth-submit-status]");
        if (!output) return;
        output.hidden = false;
        output.value = "已模拟提交，真实登录注册接口后续可独立接入。";
        window.setTimeout(() => {
          output.hidden = true;
        }, 2600);
      });
    });
  }

  function renderAuthPreview(host, rawScheme, options = {}) {
    if (!host) return null;
    const scheme = normalizeScheme(rawScheme, options);
    const screen = SCREEN_KEYS.includes(options.screen) ? options.screen : scheme.defaultScreen;
    const style = scheme.stylePreset;
    const layoutType = allowedValue(scheme.visual?.layoutType, LAYOUT_TYPES, "split");
    const formPosition = allowedValue(scheme.visual?.formPosition, FORM_POSITIONS, "right");
    const mediaPosition = allowedValue(scheme.visual?.mediaPosition, MEDIA_POSITIONS, formPosition === "left" ? "right" : "left");
    const heroVisibility = allowedValue(scheme.visual?.heroVisibility, HERO_VISIBILITIES, layoutType === "centeredCard" ? "hidden" : "full");
    const mobileStrategy = allowedValue(scheme.visual?.mobileStrategy, MOBILE_STRATEGIES, "singleColumn");
    const socialLogin = normalizeSocialLoginPresentation(scheme.visual?.socialLogin, scheme.visual?.registerPresentation?.socialLogin || {});
    const formMarkup = `
      <main class="auth-form-side" aria-label="${escapeHtml(screen)} form">
        ${renderMobileFormBrand(scheme)}
        ${renderForm(scheme, screen)}
      </main>
    `;
    const heroMarkup = heroVisibility === "hidden" ? "" : renderHero(scheme, screen);
    const formFirst = formPosition === "left" && heroMarkup;
    host.dataset.authPreviewMounted = "true";
    host.innerHTML = `
      <section
        class="auth-preview-shell auth-style-${escapeHtml(style)} auth-composition-${escapeHtml(scheme.visual.composition || "splitTrust")} auth-layout-${escapeHtml(layoutType)} auth-form-${escapeHtml(formPosition)} auth-media-${escapeHtml(mediaPosition)} auth-hero-${escapeHtml(heroVisibility)} auth-mobile-${escapeHtml(mobileStrategy)} auth-logo-${escapeHtml(scheme.brand.logoPlacement || "heroTopLeft")} auth-social-style-${escapeHtml(socialLogin.style)} auth-social-position-${escapeHtml(socialLogin.position)} auth-social-divider-${escapeHtml(socialLogin.divider)} auth-screen-${escapeHtml(screen)}"
        style="--auth-accent:${escapeHtml(scheme.visual.accent)};--auth-accent-2:${escapeHtml(scheme.visual.accent2)}"
      >
        <div class="auth-preview-meta">
          ${providerBadge(scheme.sourceType)}
          ${scheme.fallbackReason ? `<span>${escapeHtml(scheme.fallbackReason)}</span>` : ""}
        </div>
        ${["topCenter", "mobileTop"].includes(scheme.brand.logoPlacement) ? renderBrandMark(scheme, "shell") : ""}
        ${renderLanguageControl(scheme)}
        <div class="auth-preview-grid">
          ${formFirst ? formMarkup : heroMarkup}
          ${formFirst ? heroMarkup : formMarkup}
        </div>
      </section>
    `;
    bindPreview(host, scheme, options);
    return scheme;
  }

  window.AuthPersonalization = {
    defaultScheme,
    localSchemeFromPrompt,
    normalizeScheme,
    renderAuthPreview,
  };
})();

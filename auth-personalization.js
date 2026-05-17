(function () {
  const STYLE_PRESETS = ["blueSplit", "clientOnboarding", "securityReset", "softPlatform", "photoDark"];
  const SCREEN_KEYS = ["login", "register", "forgot"];
  const COMPOSITION_PRESETS = ["splitTrust", "floatingConsole", "stepperRail", "identityLedger", "campaignPassport", "vaultMinimal"];

  const icons = {
    arrowRight: '<path d="M5 12h14" /><path d="m13 6 6 6-6 6" />',
    arrowLeft: '<path d="M19 12H5" /><path d="m11 6-6 6 6 6" />',
    chart: '<path d="M4 16.5 9 11l3.5 3.5L20 7" /><path d="M16 7h4v4" />',
    check: '<path d="m5 12 4 4L19 6" />',
    chevronDown: '<path d="m7 10 5 5 5-5" />',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" />',
    globe: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9c-2-2.4-3-5.4-3-9s1-6.6 3-9z" />',
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
    if (/partnerinvite/.test(guidedText)) return "clientOnboarding";
    if (/campaignsignup/.test(guidedText)) return "softPlatform";
    if (/compliance|合规|clientonboarding/.test(guidedText)) return "clientOnboarding";
    if (/premium|blackgold|高净值|黑金|graphite|高级/.test(guidedText)) return "photoDark";
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
    const features = listValue(options.features);
    const depth = String(options.registerDepth || "standard");
    const needsInvite = hasFeature(features, prompt, "inviteCode", /推荐码|邀请码|invite|ib/i);
    const needsCaptcha = hasFeature(features, prompt, "captcha", /验证码|captcha|hcaptcha/i);
    const needsRisk = hasFeature(features, prompt, "riskConsent", /风险|risk/i) || depth === "compliance";
    const needsKyc = hasFeature(features, prompt, "kycPrelude", /kyc|实名|身份/i) || depth === "compliance";
    const basicFields = [
      { id: "name", label: isZh ? "姓名" : "Full name", type: "text", placeholder: isZh ? "请输入您的真实姓名" : "Enter full name", required: true, span: "full" },
      { id: "country", label: isZh ? "国家/地区" : "Country/Region", type: "select", placeholder: isZh ? "请选择国家或地区" : "Select country", required: true },
      { id: "email", label: isZh ? "邮箱" : "Email", type: "email", placeholder: isZh ? "请输入邮箱" : "name@example.com", required: true },
    ];
    if (depth !== "light") {
      basicFields.splice(2, 0, { id: "phone", label: isZh ? "手机号" : "Phone", type: "tel", placeholder: isZh ? "请输入手机号" : "Phone number", required: true });
    }
    if (needsInvite) {
      basicFields.push({ id: "inviteCode", label: isZh ? "推荐码 / 邀请码" : "Invitation code", type: "text", placeholder: isZh ? "如有请填写" : "Optional", span: "full" });
    }

    const sections = [
      {
        title: isZh ? "基础资料" : "Profile",
        description: isZh ? "用于创建客户资料并关联后续开户注册流程" : "Create the customer profile and connect the onboarding flow",
        fields: basicFields,
      },
    ];

    if (depth !== "light") {
      sections.push({
        title: isZh ? "投资背景" : "Investment background",
        description: isZh ? "帮助平台判断适配的账户和风险提示" : "Help tailor account setup and risk notices",
        fields: [
          { id: "experience", label: isZh ? "交易经验" : "Trading experience", type: "select", placeholder: isZh ? "请选择" : "Select", required: true },
          { id: "income", label: isZh ? "年收入范围" : "Annual income", type: "select", placeholder: isZh ? "请选择" : "Select" },
          { id: "goal", label: isZh ? "投资目的" : "Investment goal", type: "radio", options: isZh ? ["资产增值", "收益稳定", "短期交易", "风险对冲"] : ["Growth", "Yield", "Trading", "Hedging"], required: true, span: "full" },
          { id: "fundSource", label: isZh ? "资金来源" : "Source of funds", type: "select", placeholder: isZh ? "请选择" : "Select" },
        ],
      });
    }

    if (needsKyc) {
      sections.push({
        title: isZh ? "身份与合规提示" : "Identity and compliance",
        description: isZh ? "注册后可继续完成 KYC 和开户地址验证" : "Continue with KYC and address verification after registration",
        fields: [
          { id: "idType", label: isZh ? "证件类型" : "ID type", type: "select", placeholder: isZh ? "请选择" : "Select" },
          { id: "residence", label: isZh ? "居住地" : "Residence", type: "select", placeholder: isZh ? "请选择" : "Select" },
        ],
      });
    }

    sections.push({
      title: isZh ? "账户安全" : "Account security",
      fields: [
        { id: "password", label: isZh ? "密码" : "Password", type: "password", placeholder: isZh ? "至少 8 位字符" : "At least 8 characters", required: true },
        { id: "confirmPassword", label: isZh ? "确认密码" : "Confirm password", type: "password", placeholder: isZh ? "再次输入密码" : "Confirm password", required: true },
        ...(needsCaptcha ? [{ id: "captcha", label: isZh ? "图形验证码" : "Captcha", type: "text", placeholder: isZh ? "请输入验证码" : "Enter code", span: "full" }] : []),
      ],
    });

    if (needsRisk) {
      sections.push({
        title: isZh ? "风险确认" : "Risk acknowledgement",
        fields: [
          { id: "riskAgreement", label: isZh ? "我了解保证金交易存在较高风险" : "I understand margin trading risk", type: "radio", options: isZh ? ["已了解并继续", "稍后再看"] : ["I understand", "Review later"], required: true, span: "full" },
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
    const language = cleanText(options.language, "zh-CN", 20);
    const brandName = cleanText(options.brandName, "ForexCRM", 40);
    const features = listValue(options.features);
    const intent = cleanText(options.intent, "openAccount", 40);
    const audience = cleanText(options.audience, "newTrader", 40);
    const registerDepth = cleanText(options.registerDepth, "standard", 40);
    const designStyle = cleanText(options.designStyle, "trustClean", 40);
    const theme = cleanText(options.theme, "blueTrust", 40);
    const accent = normalizeHex(options.accent, guidedAccentFallback(options, stylePreset));
    const accent2 = normalizeHex(options.accent2, stylePreset === "softPlatform" ? "#24b7aa" : "#1d4ed8");
    const isZh = language.startsWith("zh");
    const [audienceTitle, audienceSubtitle] = audienceCopy(audience, [
      defaultScreen === "register" ? "创建您的交易账户" : defaultScreen === "forgot" ? "安全重置密码，放心回到您的账户" : "Welcome Back",
      defaultScreen === "register" ? "填写注册信息，系统将自动创建客户资料并进入后续账户流程。" : "Sign in to access your account",
    ]);
    const registerSections = buildRegisterSections(options, prompt, isZh);
    const hasSocial = hasFeature(features, prompt, "socialLogin", /google|apple|第三方|social/i);
    const hasCaptcha = hasFeature(features, prompt, "captcha", /验证码|captcha|hcaptcha/i);
    const hasTwoFactor = hasFeature(features, prompt, "twoFactor", /双重|2fa|two-factor|two factor/i);
    const loginExtraFields = [
      ...(hasCaptcha ? [{ id: "loginCaptcha", label: isZh ? "验证码" : "Verification code", type: "text", placeholder: isZh ? "请输入验证码" : "Enter code" }] : []),
      ...(hasTwoFactor ? [{ id: "twoFactorCode", label: isZh ? "双重验证码" : "2FA code", type: "text", placeholder: isZh ? "请输入动态验证码" : "Authenticator code" }] : []),
    ];

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
        tagline: stylePreset === "softPlatform" ? "轻量开户注册中心" : audience === "ibPartner" ? "合作伙伴账户入口" : "安全账户服务中心",
        serviceLine: "Client Portal",
      },
      visual: {
        accent,
        accent2,
        panelTone: stylePreset === "photoDark" ? "dark" : "light",
        density: stylePreset === "clientOnboarding" ? "compact" : "comfortable",
        radius: stylePreset === "photoDark" ? "10px" : "18px",
        composition,
      },
      hero: {
        title: audienceTitle,
        subtitle: audienceSubtitle,
        proofPoints: compositionProofPoints(composition, isZh),
        bullets: [
          hasCaptcha || hasTwoFactor ? "验证码与安全校验降低账户风险" : "安全提交客户资料",
          hasFeature(features, prompt, "inviteCode", /推荐码|邀请码|invite|ib/i) ? "支持推荐码自动关联" : "注册后可继续完成 KYC 与开户",
          registerDepth === "light" ? "移动端友好的轻量注册路径" : "注册信息按步骤清晰拆分",
        ],
      },
      screens: {
        login: {
          title: isZh ? "登录你的账户" : "Welcome Back",
          subtitle: isZh ? "使用邮箱、手机号或第三方方式进入账户" : "Sign in to access your account",
          identifierLabel: isZh ? "邮箱或手机号" : "Email Address",
          identifierPlaceholder: isZh ? "请输入您的邮箱或手机号" : "n02badd@gmail.com",
          passwordLabel: isZh ? "密码" : "Password",
          passwordPlaceholder: isZh ? "请输入密码" : "••••••••",
          rememberLabel: isZh ? "记住账号" : "Remember me",
          forgotLabel: isZh ? "忘记密码?" : "Forgot password?",
          primaryAction: isZh ? "登录" : "Sign In",
          registerPrompt: isZh ? "没有账号？" : "Don't have an account?",
          registerAction: isZh ? "立即注册" : "Open Account",
          socialProviders: hasSocial ? ["Google", "Apple"] : [],
          extraFields: loginExtraFields,
          helperNotice: hasTwoFactor ? "已启用双重验证提示，保护账户登录安全" : "您的信息受到严格保护，安全加密传输",
        },
        register: {
          title: registerDepth === "light" ? "快速创建账户" : stylePreset === "clientOnboarding" ? "客户注册流程" : stylePreset === "photoDark" ? "账号注册" : "创建您的交易账户",
          subtitle: registerDepth === "light" ? "先完成必要信息，后续再补充开户地址和 KYC。" : stylePreset === "clientOnboarding" ? "标准客户注册，收集基本信息并自动进入后续审核。" : "填写注册信息，系统将自动创建客户资料并进入后续账户流程。",
          modeTabs: ["手机号", "邮箱"],
          sections: registerSections,
          termsText: "我已阅读并同意 服务条款、隐私政策及风险披露，确认提交的信息真实有效。",
          primaryAction: isZh ? "提交注册" : "Create Account",
          backAction: isZh ? "返回登录" : "Back to Login",
          trustNotice: hasCaptcha ? "注册成功前需要完成验证码校验" : "注册成功后将向邮箱发送验证码",
        },
        forgot: {
          title: "Reset Password",
          subtitle: isZh ? "输入邮箱，我们会发送受保护的重置链接。" : "Enter your email and we'll send you a reset link.",
          identifierLabel: isZh ? "邮箱地址" : "Email Address",
          identifierPlaceholder: "your@email.com",
          primaryAction: isZh ? "发送重置链接" : "Send Reset Link",
          backAction: isZh ? "返回登录" : "Back to Login",
          registerAction: isZh ? "去注册" : "Create Account",
          steps: ["使用邮箱", "验证身份", "设置新密码"],
        },
      },
      securityNotes: [
        hasTwoFactor ? "双重验证提示提升高风险登录安全" : "加密链接验证，保护账户安全",
        "密码不会通过邮件明文发送",
        hasCaptcha ? "验证码占位可接入真实风控服务" : "官方品牌页面，降低钓鱼风险",
      ],
      designNotes: ["参考界面仅作为质量学习标准，生成结果按当前业务目标重新组织。", "登录、注册和找回密码共享品牌与安全语义，但每个流程独立渲染。"],
    };
  }

  function normalizeScheme(source = {}, options = {}) {
    const fallback = defaultScheme(options);
    const raw = isObject(source?.scheme) ? source.scheme : source;
    const merged = merge(fallback, raw);
    const stylePreset = STYLE_PRESETS.includes(merged.stylePreset) ? merged.stylePreset : fallback.stylePreset;
    const defaultScreen = SCREEN_KEYS.includes(merged.defaultScreen) ? merged.defaultScreen : fallback.defaultScreen;
    const composition = COMPOSITION_PRESETS.includes(merged.visual?.composition) ? merged.visual.composition : fallback.visual.composition;
    const normalized = {
      ...merged,
      stylePreset,
      defaultScreen,
      brand: merge(fallback.brand, merged.brand),
      visual: {
        ...merge(fallback.visual, merged.visual),
        accent: normalizeHex(merged.visual?.accent, fallback.visual.accent),
        accent2: normalizeHex(merged.visual?.accent2, fallback.visual.accent2),
        composition,
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
    if (Array.isArray(merged.screens?.login?.extraFields)) {
      normalized.screens.login.extraFields = merged.screens.login.extraFields.slice(0, 4);
    }
    return normalized;
  }

  function localSchemeFromPrompt(prompt = "", options = {}) {
    return normalizeScheme(null, { ...options, prompt });
  }

  function providerBadge(provider) {
    const value = cleanText(provider, "", 30);
    if (!value) return "";
    return `<span class="auth-source-badge">${escapeHtml(value)}</span>`;
  }

  function renderBrandMark(scheme) {
    return `
      <div class="auth-brand-lockup">
        <span class="auth-brand-mark">${svg("chart")}</span>
        <span>
          <b>${escapeHtml(scheme.brand.name)}</b>
          <small>${escapeHtml(scheme.brand.tagline)}</small>
        </span>
      </div>
    `;
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
    return `
      <aside class="auth-hero-panel" aria-label="认证品牌说明">
        ${renderBrandMark(scheme)}
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

  function renderSocialButton(provider) {
    const isApple = /apple/i.test(provider);
    const label = /google/i.test(provider) ? "Continue with Google" : /apple/i.test(provider) ? "Continue with Apple" : `Continue with ${provider}`;
    return `<button class="auth-social-button${isApple ? " apple" : ""}" type="button"><span>${escapeHtml(provider.slice(0, 1))}</span>${escapeHtml(label)}</button>`;
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
    return `<div class="auth-mode-tabs">${labels.map((label, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${index === 0 ? svg("phone") : svg("mail")}${escapeHtml(label)}</button>`).join("")}</div>`;
  }

  function renderLogin(scheme) {
    const screen = scheme.screens.login || {};
    const socialProviders = Array.isArray(screen.socialProviders) ? screen.socialProviders : [];
    const social = socialProviders.map(renderSocialButton).join("");
    const socialBlock = scheme.stylePreset === "photoDark" || !social ? "" : `<div class="auth-social-stack">${social}</div><div class="auth-divider"><span>OR CONTINUE WITH</span></div>`;
    const extraFields = (Array.isArray(screen.extraFields) ? screen.extraFields : []).slice(0, 4).map(renderField).join("");
    return `
      <article class="auth-form-card auth-login-card">
        ${scheme.stylePreset === "softPlatform" ? renderScreenTabs("login") : ""}
        <header class="auth-form-head">
          <h2>${escapeHtml(screen.title)}</h2>
          <p>${escapeHtml(screen.subtitle)}</p>
        </header>
        ${scheme.stylePreset === "softPlatform" ? renderModeTabs(["手机号", "邮箱"]) : ""}
        ${socialBlock}
        <form class="auth-form" data-auth-demo-form>
          ${renderInput(/mail|email/i.test(screen.identifierLabel) ? "mail" : "user", screen.identifierLabel, screen.identifierPlaceholder, "text", /@/.test(screen.identifierPlaceholder || "") ? screen.identifierPlaceholder : "")}
          ${renderInput("lock", screen.passwordLabel, screen.passwordPlaceholder, "password")}
          ${extraFields}
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

  function renderFullRegister(scheme) {
    const screen = scheme.screens.register || {};
    const sections = (screen.sections || []).map((section) => `
      <section class="auth-register-section">
        <h3>${escapeHtml(section.title)}</h3>
        ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
        <div class="auth-field-grid">${(section.fields || []).map(renderField).join("")}</div>
      </section>
    `).join("");
    return `
      <article class="auth-form-card auth-register-card wide">
        <button class="auth-back-link" type="button" data-auth-screen-switch="login">${svg("arrowLeft")} ${escapeHtml(screen.backAction || "返回登录")}</button>
        <header class="auth-form-head">
          <h2>${escapeHtml(screen.title)}</h2>
          <p>${escapeHtml(screen.subtitle)}</p>
        </header>
        <form class="auth-form" data-auth-demo-form>
          ${sections}
          <label class="auth-terms-box"><input type="checkbox" /> <span>${escapeHtml(screen.termsText)}</span></label>
          <button class="auth-primary-action" type="submit">${escapeHtml(screen.primaryAction)}</button>
          <output data-auth-submit-status hidden></output>
        </form>
      </article>
    `;
  }

  function renderCompactRegister(scheme) {
    const screen = scheme.screens.register || {};
    const firstSection = screen.sections?.[0] || { fields: [] };
    const securitySection = screen.sections?.find((section) => /安全|密码/.test(section.title || "")) || screen.sections?.[2] || { fields: [] };
    const fields = [...(firstSection.fields || []).slice(0, 2), ...(securitySection.fields || []).slice(0, 2)];
    return `
      <article class="auth-form-card auth-register-card">
        ${scheme.stylePreset === "softPlatform" ? renderScreenTabs("register") : ""}
        <header class="auth-form-head">
          <h2>${escapeHtml(screen.title)}</h2>
          <p>${escapeHtml(screen.subtitle)}</p>
        </header>
        ${renderModeTabs(screen.modeTabs)}
        <div class="auth-info-strip">${svg("shield")}<span>${escapeHtml(screen.trustNotice || "注册成功后将向邮箱发送验证码")}</span></div>
        <form class="auth-form" data-auth-demo-form>
          <div class="auth-field-grid single">${fields.map(renderField).join("")}</div>
          <label class="auth-checkbox auth-terms-inline"><input type="checkbox" /> <span>${escapeHtml(screen.termsText)}</span></label>
          <button class="auth-primary-action" type="submit">${escapeHtml(screen.primaryAction)} ${svg("arrowRight")}</button>
          <small class="auth-trust-line">${svg("shield")}您的信息受到严格保护，安全加密传输</small>
          <output data-auth-submit-status hidden></output>
        </form>
      </article>
    `;
  }

  function renderForgot(scheme) {
    const screen = scheme.screens.forgot || {};
    return `
      <article class="auth-form-card auth-forgot-card">
        ${scheme.stylePreset === "softPlatform" ? renderScreenTabs("forgot") : ""}
        <span class="auth-reset-icon">${svg("mail")}</span>
        <header class="auth-form-head centered">
          <h2>${escapeHtml(screen.title)}</h2>
          <p>${escapeHtml(screen.subtitle)}</p>
        </header>
        <form class="auth-form" data-auth-demo-form>
          ${renderInput("mail", screen.identifierLabel, screen.identifierPlaceholder, "email")}
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

  function renderForm(scheme, screen) {
    if (screen === "register") {
      return scheme.stylePreset === "clientOnboarding" ? renderFullRegister(scheme) : renderCompactRegister(scheme);
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
    host.dataset.authPreviewMounted = "true";
    host.innerHTML = `
      <section
        class="auth-preview-shell auth-style-${escapeHtml(style)} auth-composition-${escapeHtml(scheme.visual.composition || "splitTrust")} auth-screen-${escapeHtml(screen)}"
        style="--auth-accent:${escapeHtml(scheme.visual.accent)};--auth-accent-2:${escapeHtml(scheme.visual.accent2)}"
      >
        <div class="auth-preview-meta">
          ${providerBadge(scheme.sourceType)}
          ${scheme.fallbackReason ? `<span>${escapeHtml(scheme.fallbackReason)}</span>` : ""}
        </div>
        ${renderLanguageControl(scheme)}
        <div class="auth-preview-grid">
          ${renderHero(scheme, screen)}
          <main class="auth-form-side" aria-label="${escapeHtml(screen)} form">
            ${renderForm(scheme, screen)}
          </main>
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

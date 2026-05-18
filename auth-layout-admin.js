(function () {
  const auth = window.AuthPersonalization;
  if (!auth) return;

  const STORAGE_KEY = "forexcrm.auth.generated.scheme";
  const PROMPT_KEY = "forexcrm.auth.ai.prompt";
  const ACTIVE_AUTH_JOB_KEY = "forexcrm.auth.ai.activeGenerationJob";
  const PREVIEW_URL = "./auth-layout-preview.html";
  const modelSettings = window.ForexCRMModelSettings;
  const MODEL_CONFIG_KEY = modelSettings?.STORAGE_KEY || "forexcrm.ai.model.config";
  const SUGGESTION_HISTORY_KEY = "forexcrm.auth.ai.suggestion.history";
  const SELECTED_REFERENCE_KEY = "forexcrm.auth.visual.reference.ids";
  const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
  const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1";
  const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
  const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
  const GEMINI_TEXT_MODELS = [
    GEMINI_DEFAULT_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.1-pro-preview-customtools",
  ];
  const BACKGROUND_JOB_POLL_MS = 1100;
  const BACKGROUND_JOB_MAX_WAIT_MS = 20 * 60 * 1000;

  const AI_MODEL_PRESETS = {
    openai: {
      provider: "openai",
      name: "OpenAI",
      model: "gpt-5.2",
      models: ["gpt-5.2", "gpt-5.2-pro", "gpt-5-mini", "gpt-4.1"],
      baseUrl: "https://api.openai.com/v1",
      endpoint: "/responses",
      apiMode: "responses",
      apiKeyLabel: "OPENAI_API_KEY",
    },
    claude: {
      provider: "claude",
      name: "Claude",
      model: "claude-sonnet-4-6",
      models: ["claude-sonnet-4-6", "claude-sonnet-4-5-20250929", "claude-opus-4-6"],
      baseUrl: "https://api.anthropic.com/v1",
      endpoint: "/messages",
      apiMode: "anthropic-messages",
      apiKeyLabel: "ANTHROPIC_API_KEY",
    },
    minimax: {
      provider: "minimax",
      name: "MiniMax",
      model: "MiniMax-M2.7",
      models: ["MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5"],
      baseUrl: MINIMAX_CN_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MINIMAX_API_KEY",
    },
    kimi: {
      provider: "kimi",
      name: "Kimi",
      model: "kimi-k2.6",
      models: ["kimi-k2.6", "kimi-k2.5", "kimi-k2-thinking", "moonshot-v1-128k"],
      baseUrl: KIMI_CN_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MOONSHOT_API_KEY",
    },
    deepseek: {
      provider: "deepseek",
      name: "DeepSeek",
      model: "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "deepseek-v4-pro"],
      baseUrl: DEEPSEEK_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "DEEPSEEK_API_KEY",
    },
    gemini: {
      provider: "gemini",
      name: "Gemini",
      model: GEMINI_DEFAULT_MODEL,
      models: GEMINI_TEXT_MODELS,
      baseUrl: GEMINI_OPENAI_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "GEMINI_API_KEY",
    },
  };

  const DEFAULT_MODEL_CONFIG = {
    ...AI_MODEL_PRESETS.openai,
    proxyEndpoint: "/api/auth-ai/generate",
    temperature: 0.4,
    maxOutputTokens: 6000,
    apiKey: "",
    apiKeys: {},
  };

  const GUIDED_LABELS = {
    intent: {
      openAccount: "开户链接",
      secureLogin: "安全登录",
      campaignSignup: "活动转化",
      partnerInvite: "代理邀请",
      resetTrust: "找回信任",
    },
    audience: {
      newTrader: "新手开户客户",
      highNetWorth: "高净值客户",
      ibPartner: "IB / 代理客户",
      returningTrader: "回访交易客户",
      campaignLead: "活动注册客户",
    },
    registerDepth: {
      light: "轻量注册",
      standard: "标准开户注册",
      compliance: "合规增强",
    },
    designStyle: {
      trustClean: "可信清爽",
      premiumCalm: "高级克制",
      techSecure: "科技安全",
      softFriendly: "亲和轻量",
      campaignFocus: "活动转化",
    },
    theme: {
      blueTrust: "蓝色信任",
      blackGold: "黑金高净值",
      emeraldSecure: "青绿安全",
      graphiteSilver: "石墨银",
      roseCampaign: "玫红活动",
    },
    features: {
      phoneEmailLogin: "手机号 / 邮箱登录",
      socialLogin: "第三方登录",
      tradingAccountLogin: "交易账号登录",
      captcha: "验证码 / Captcha",
      twoFactor: "双重验证",
      inviteCode: "推荐码 / 邀请码",
      kycPrelude: "KYC 前置说明",
      riskConsent: "风险披露确认",
      promoReward: "注册送礼 / 活动奖励",
    },
    logoPlacement: {
      heroTopLeft: "品牌区左上",
      topCenter: "顶部居中",
      formTop: "表单顶部",
      mobileTop: "移动端优先",
    },
  };

  const THEME_ACCENTS = {
    blueTrust: "#2563eb",
    blackGold: "#b7791f",
    emeraldSecure: "#059669",
    graphiteSilver: "#334155",
    roseCampaign: "#e11d48",
  };

  const DEFAULT_AUTH_FEATURES = ["phoneEmailLogin", "socialLogin", "captcha", "twoFactor", "riskConsent"];

  const AUTH_SUGGESTIONS = [
    {
      id: "trust-new-trader",
      title: "移动首屏视觉",
      prompt: "生成一套移动端首屏视觉方案：Logo 在手机首屏自然露出，表单卡片轻盈但可信，按钮层级清晰，留白和输入框高度适合单手操作；桌面端必须是左右布局，左侧品牌平台开户说明，右侧表单。功能按默认完整登录、注册、找回密码模块处理。",
      tags: ["新手", "开户", "移动端", "Logo", "首屏"],
    },
    {
      id: "premium-client",
      title: "高端私密视觉",
      prompt: "生成一套高端私密视觉方案：黑金或石墨银倾向，背景低噪声，Logo 和安全标识克制呈现，表单像专属账户入口而不是营销页；移动端保持轻量、高质感和私密感。功能按默认完整登录、注册、找回密码模块处理。",
      tags: ["高净值", "高级", "私密", "黑金", "石墨银"],
    },
    {
      id: "campaign-lead",
      title: "活动氛围视觉",
      prompt: "生成一套活动落地页气质的视觉方案：首屏有权益感和转化焦点，但保持金融平台的可信边界；使用更鲜明的强调色、轻量动效感、奖励提示区和明确主按钮层级。功能按默认完整登录、注册、找回密码模块处理。",
      tags: ["活动", "转化", "权益", "强调色", "移动端"],
    },
    {
      id: "ib-partner",
      title: "渠道专业视觉",
      prompt: "生成一套渠道合作入口视觉方案：结构像专业业务后台入口，Logo、身份标识和协议信息有清晰层级，分隔线、步骤轨道和信息密度偏理性；移动端要高效、清爽，避免花哨营销感。功能按默认完整登录、注册、找回密码模块处理。",
      tags: ["IB", "邀请", "渠道", "专业", "后台"],
    },
    {
      id: "secure-reset",
      title: "安全可信视觉",
      prompt: "生成一套强调安全可信的视觉方案：Logo 摆放强化官方感，背景、边框和提示区都要低噪声，安全图标和校验提示清楚但不压迫表单；移动端先让用户确认这是可信入口。功能按默认完整登录、注册、找回密码模块处理。",
      tags: ["安全", "可信", "找回", "低噪声", "Logo"],
    },
    {
      id: "mobile-first",
      title: "精致移动表单",
      prompt: "生成一套精致移动表单视觉方案：输入框、按钮、辅助入口和协议文字的密度要适合手机首屏，Logo、标题和主按钮形成稳定视觉轴线；桌面端扩展为更完整的品牌区域。功能按默认完整登录、注册、找回密码模块处理。",
      tags: ["移动端", "表单", "单手", "密度", "精致"],
    },
  ];

  const els = {
    prompt: document.querySelector("[data-auth-ai-prompt]"),
    generate: document.querySelector("[data-auth-generate]"),
    local: document.querySelector("[data-auth-local]"),
    reset: document.querySelector("[data-auth-reset]"),
    status: document.querySelector("[data-auth-status]"),
    previewHost: document.querySelector("[data-auth-preview-host]"),
    previewTabs: [...document.querySelectorAll("[data-auth-preview-tab]")],
    generationModeButtons: [...document.querySelectorAll("[data-auth-generation-mode-button]")],
    generationPanels: [...document.querySelectorAll("[data-auth-generation-panel]")],
    guidedChoices: [...document.querySelectorAll("[data-auth-guided-choice]")],
    guidedGenerate: document.querySelector("[data-auth-guided-generate]"),
    guidedSync: document.querySelector("[data-auth-guided-sync]"),
    guidedSummary: document.querySelector("[data-auth-guided-summary]"),
    guidedSummaryTitle: document.querySelector("[data-auth-guided-summary-title]"),
    guidedNote: document.querySelector("[data-auth-guided-note]"),
    brandName: document.querySelector("[data-auth-brand-name]"),
    language: document.querySelector("[data-auth-language]"),
    accent: document.querySelector("[data-auth-accent]"),
    modelSummaries: [...document.querySelectorAll("[data-auth-model-summary]")],
    modelOpenButtons: [...document.querySelectorAll("[data-auth-model-open]")],
    history: document.querySelector("[data-auth-history]"),
    source: document.querySelector("[data-auth-source]"),
    suggestionPanel: document.querySelector("[data-auth-suggestions]"),
    suggestionNote: document.querySelector("[data-auth-suggestion-note]"),
    generateSuggestions: document.querySelector("[data-auth-generate-suggestions]"),
    refreshSuggestions: document.querySelector("[data-auth-refresh-suggestions]"),
    guidedStepButtons: [...document.querySelectorAll("[data-auth-guided-step-button]")],
    guidedStepPanels: [...document.querySelectorAll("[data-auth-guided-step]")],
    guidedPrev: document.querySelector("[data-auth-guided-prev]"),
    guidedNext: document.querySelector("[data-auth-guided-next]"),
    guidedMainIdea: document.querySelector("[data-auth-guided-main-idea]"),
    guidedMainDetail: document.querySelector("[data-auth-guided-main-detail]"),
    referenceCount: document.querySelector("[data-auth-reference-count]"),
    referenceSummary: document.querySelector("[data-auth-reference-summary]"),
    referenceFile: document.querySelector("[data-auth-reference-file]"),
    referenceRefresh: document.querySelector("[data-auth-reference-refresh]"),
    referenceList: document.querySelector("[data-auth-reference-list]"),
  };

  const GUIDED_STEPS = ["intent", "flow", "brand"];

  const state = {
    screen: "login",
    generationMode: "quick",
    guidedStep: "intent",
    providerRuntimeStatus: {},
    modelConfig: loadModelConfig(),
    scheme: loadSavedScheme(),
    suggestionRound: 0,
    authReferences: [],
    selectedReferenceIds: readSelectedReferenceIds(),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function compactList(values, fallback = "默认") {
    const source = Array.isArray(values) ? values.filter(Boolean) : [];
    return source.length ? source.join("、") : fallback;
  }

  function setStatus(message, tone = "") {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.className = `ai-chat-status${tone ? ` ${tone}` : ""}`;
  }

  function setBusy(isBusy, label = "正在生成认证模块") {
    [els.generate, els.guidedGenerate].filter(Boolean).forEach((button) => {
      button.disabled = isBusy;
      button.classList.toggle("is-loading", isBusy);
    });
    document.querySelector(".ai-chat-composer, .auth-chat-composer")?.classList.toggle("is-generating", isBusy);
    if (isBusy) setStatus(label, "is-loading");
  }

  function showToast(message) {
    setStatus(message, "success");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setStatus("等待输入"), 1800);
  }

  function providerPreset(provider) {
    return AI_MODEL_PRESETS[provider] || AI_MODEL_PRESETS.openai;
  }

  function sanitizeModelConfig(source = {}) {
    const preset = providerPreset(source.provider);
    const model = String(source.model || preset.model).trim();
    const apiKeys = {
      ...(source.apiKeys && typeof source.apiKeys === "object" ? source.apiKeys : {}),
    };
    const apiKey = String(source.apiKey || apiKeys[preset.provider] || "").trim();
    if (apiKey) apiKeys[preset.provider] = apiKey;

    return {
      ...preset,
      provider: preset.provider,
      model: model.slice(0, 100),
      baseUrl: String(source.baseUrl || preset.baseUrl).trim().replace(/\/+$/, ""),
      endpoint: String(source.endpoint || preset.endpoint).trim() || preset.endpoint,
      apiMode: String(source.apiMode || preset.apiMode),
      proxyEndpoint: "/api/auth-ai/generate",
      temperature: Number.isFinite(Number(source.temperature)) ? Number(source.temperature) : 0.4,
      maxOutputTokens: Number.isFinite(Number(source.maxOutputTokens)) ? Math.min(Math.max(Math.round(Number(source.maxOutputTokens)), 512), 12000) : 6000,
      apiKey,
      apiKeys,
    };
  }

  function loadModelConfig() {
    if (modelSettings) return sanitizeModelConfig(modelSettings.loadModelConfig());
    try {
      return sanitizeModelConfig(JSON.parse(window.localStorage.getItem(MODEL_CONFIG_KEY) || "null") || DEFAULT_MODEL_CONFIG);
    } catch (error) {
      return sanitizeModelConfig(DEFAULT_MODEL_CONFIG);
    }
  }

  function saveModelConfig(config) {
    state.modelConfig = sanitizeModelConfig(config);
    if (modelSettings) {
      modelSettings.saveModelConfig(state.modelConfig, { source: "auth-layout-admin" });
    } else {
      window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(state.modelConfig));
    }
    renderModelSummary();
    return state.modelConfig;
  }

  function aiRequestModelConfig(config = state.modelConfig) {
    const normalized = sanitizeModelConfig(config);
    return {
      provider: normalized.provider,
      model: normalized.model,
      baseUrl: normalized.baseUrl,
      endpoint: normalized.endpoint,
      apiMode: normalized.apiMode,
      temperature: normalized.temperature,
      maxOutputTokens: normalized.maxOutputTokens,
      apiKey: normalized.apiKey,
    };
  }

  function readSelectedReferenceIds() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SELECTED_REFERENCE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map((id) => String(id || "")).filter(Boolean).slice(0, 6) : [];
    } catch (error) {
      return [];
    }
  }

  function saveSelectedReferenceIds(ids = []) {
    state.selectedReferenceIds = ids.map((id) => String(id || "")).filter(Boolean).slice(0, 6);
    window.localStorage.setItem(SELECTED_REFERENCE_KEY, JSON.stringify(state.selectedReferenceIds));
  }

  function loadSavedScheme() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") return auth.normalizeScheme(saved, readOptions());
    } catch (error) {
      return null;
    }
    return null;
  }

  function saveScheme(scheme) {
    state.scheme = auth.normalizeScheme(scheme, readOptions());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scheme));
    if (els.source) els.source.textContent = state.scheme.sourceType || "local";
  }

  function guidedButtonsFor(group) {
    return els.guidedChoices.filter((button) => button.dataset.authGuidedGroup === group);
  }

  function activeGuidedValue(group, fallback = "") {
    return guidedButtonsFor(group).find((button) => button.classList.contains("active"))?.dataset.authGuidedValue || fallback;
  }

  function activeGuidedValues(group) {
    return guidedButtonsFor(group)
      .filter((button) => button.classList.contains("active"))
      .map((button) => button.dataset.authGuidedValue)
      .filter(Boolean);
  }

  function guidedLabel(group, value) {
    const button = guidedButtonsFor(group).find((item) => item.dataset.authGuidedValue === value);
    if (button?.dataset.authGuidedLabel) return button.dataset.authGuidedLabel;
    return GUIDED_LABELS[group]?.[value] || value || "";
  }

  function guidedStylePresetHint(guidedState) {
    if (guidedState.intent === "resetTrust" || guidedState.intent === "secureLogin") return "securityReset";
    if (guidedState.theme === "blackGold" || guidedState.designStyle === "premiumCalm") return "photoDark";
    if (guidedState.intent === "partnerInvite") return "clientOnboarding";
    if (guidedState.intent === "campaignSignup") return "softPlatform";
    if (guidedState.registerDepth === "compliance") return "clientOnboarding";
    if (guidedState.designStyle === "softFriendly") return "softPlatform";
    if (guidedState.designStyle === "techSecure" || guidedState.features.includes("twoFactor")) return "securityReset";
    return "blueSplit";
  }

  function readGuidedState() {
    const intent = activeGuidedValue("intent", "openAccount");
    const theme = activeGuidedValue("theme", "blueTrust");
    const designStyle = activeGuidedValue("designStyle", "trustClean");
    const registerDepth = activeGuidedValue("registerDepth", "standard");
    const audience = activeGuidedValue("audience", "newTrader");
    const logoPlacement = activeGuidedValue("logoPlacement", "heroTopLeft");
    const features = activeGuidedValues("features");
    return {
      intent,
      audience,
      registerDepth,
      designStyle,
      theme,
      logoPlacement,
      features,
      flows: activeGuidedValues("flows"),
      brandName: els.brandName?.value || "ForexCRM",
      language: els.language?.value || "zh-CN",
      accent: els.accent?.value || THEME_ACCENTS[theme] || "#2563eb",
      note: els.guidedNote?.value || "",
      stylePreset: guidedStylePresetHint({ intent, audience, registerDepth, designStyle, theme, features }),
    };
  }

  function readOptions(extra = {}) {
    const guidedState = readGuidedState();
    const useGuided = state.generationMode === "guided" || extra.inputMode === "guided" || extra.useGuided === true;
    const base = {
      prompt: els.prompt?.value || "",
      brandName: guidedState.brandName,
      language: guidedState.language,
      accent: guidedState.accent,
      features: DEFAULT_AUTH_FEATURES.slice(),
      screen: state.screen,
    };
    const guidedOptions = useGuided
      ? {
          density: guidedState.registerDepth === "light" ? "spacious" : guidedState.registerDepth === "compliance" ? "compact" : "comfortable",
          intent: guidedState.intent,
          audience: guidedState.audience,
          registerDepth: guidedState.registerDepth,
          designStyle: guidedState.designStyle,
          theme: guidedState.theme,
          features: guidedState.features,
          flows: guidedState.flows,
          logoPlacement: guidedState.logoPlacement,
          stylePreset: guidedState.stylePreset,
        }
      : {};
    return {
      ...base,
      ...guidedOptions,
      ...extra,
    };
  }

  function buildGuidedPrompt() {
    const guidedState = readGuidedState();
    const lines = [
      `为 ${guidedState.brandName} 生成一套完整的登录、注册、找回密码认证模块。`,
      `模块主旨：${guidedLabel("intent", guidedState.intent)}。`,
      `客户对象：${guidedLabel("audience", guidedState.audience)}。`,
      `注册深度：${guidedLabel("registerDepth", guidedState.registerDepth)}。`,
      `视觉气质：${guidedLabel("designStyle", guidedState.designStyle)}，主题倾向：${guidedLabel("theme", guidedState.theme)}，主色 ${guidedState.accent}。`,
      `平台 Logo 摆放：${guidedLabel("logoPlacement", guidedState.logoPlacement)}；移动端首屏必须能自然露出 Logo、主登录入口和主按钮。`,
      `增强能力：${compactList(guidedState.features.map((feature) => guidedLabel("features", feature)), "保持标准登录注册能力")}。`,
      "布局硬约束：如果补充要求或快速输入里出现“左右布局、左右分栏、双栏、两栏”，桌面端必须输出左右分栏；不能生成居中单卡。",
      "登录首屏必须只保留账号（手机号/邮箱）和密码；双重验证进入下一步输入 6 位验证码，人机校验只在风险、注册提交、找回密码发送验证码前触发。",
      "请生成的是一个个性化认证业务模块，不要套用固定模板；素材只作为抽象设计语言借鉴，不能把素材名、素材来源或原版式当作可见内容输出。",
      "如果选择了视觉素材，请先自动识别结构，不依赖人工标签：识别居中/左右/背景视觉、表单位置、图在左或右、Logo 位置和移动端首屏策略，并让这些结构真实影响预览布局。",
      "需要有让人耳目一新的构图差异，不能只改颜色、标题或按钮文案；请明确选择适合业务目标的首屏骨架和信息表达方式。",
      "移动端适配和移动端美观是硬要求：表单密度、按钮高度、入口位置、三方登录、协议文字、找回密码和注册入口都要适合手机单手操作。",
      "需要包含登录、注册、找回密码三条流程的字段、状态、按钮文案、安全提示、合规提示、账号密码/三方入口、注册验证和找回密码验证的响应式摆放策略。",
    ];
    if (guidedState.note.trim()) lines.push(`补充要求：${guidedState.note.trim()}`);
    return lines.join("\n");
  }

  function buildGuidedIntake() {
    const guidedState = readGuidedState();
    return {
      ...guidedState,
      labels: {
        intent: guidedLabel("intent", guidedState.intent),
        audience: guidedLabel("audience", guidedState.audience),
        registerDepth: guidedLabel("registerDepth", guidedState.registerDepth),
        designStyle: guidedLabel("designStyle", guidedState.designStyle),
        theme: guidedLabel("theme", guidedState.theme),
        logoPlacement: guidedLabel("logoPlacement", guidedState.logoPlacement),
        features: guidedState.features.map((feature) => guidedLabel("features", feature)),
      },
    };
  }

  function localApiEndpointCandidates(path) {
    const value = String(path || "").startsWith("/") ? path : `/${path || ""}`;
    if (/^https?:\/\//i.test(value)) return [value];
    const candidates = [];
    if (/^https?:\/\//i.test(window.location.origin)) candidates.push(`${window.location.origin}${value}`);
    const currentHost = window.location.hostname || "127.0.0.1";
    [...new Set([currentHost, "127.0.0.1", "localhost"])].forEach((host) => {
      ["5174", "5184", "5194"].forEach((port) => candidates.push(`http://${host}:${port}${value}`));
    });
    return [...new Set(candidates)];
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function readActiveAuthJob() {
    try {
      const raw = window.localStorage.getItem(ACTIVE_AUTH_JOB_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function saveActiveAuthJob(job) {
    window.localStorage.setItem(ACTIVE_AUTH_JOB_KEY, JSON.stringify(job));
  }

  function clearActiveAuthJob(jobId = "") {
    const current = readActiveAuthJob();
    if (!jobId || current?.jobId === jobId) {
      window.localStorage.removeItem(ACTIVE_AUTH_JOB_KEY);
    }
  }

  async function pollBackgroundAuthJob(statusUrl, jobId) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < BACKGROUND_JOB_MAX_WAIT_MS) {
      const response = await fetch(statusUrl, { headers: { accept: "application/json" }, cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || `${response.status} ${response.statusText}`);
      }

      const job = data.job || {};
      if (job.status === "success") return job.result || {};
      if (job.status === "failed") {
        const error = new Error(job.error?.message || "后台认证模块生成失败");
        error.proxyPayload = {
          details: job.error?.details || null,
          callRecord: job.error?.callRecord || null,
        };
        throw error;
      }

      const current = readActiveAuthJob();
      if (current?.jobId === jobId) {
        saveActiveAuthJob({ ...current, status: job.status || "running", updatedAt: Date.now() });
      }
      await sleep(BACKGROUND_JOB_POLL_MS);
    }

    throw new Error("后台认证模块生成等待超时");
  }

  async function requestBackgroundAuthJob(payload) {
    const endpoints = localApiEndpointCandidates("/api/auth-ai/jobs");
    let lastMessage = "";

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(payload || {}),
        });
        const data = await response.json().catch(() => null);

        if (response.ok && data?.ok !== false && data?.jobId) {
          const statusUrl = new URL(data.job?.statusPath || `/api/auth-ai/jobs/${data.jobId}`, endpoint).toString();
          saveActiveAuthJob({
            jobId: data.jobId,
            statusUrl,
            prompt: payload.prompt || "",
            options: payload.options || null,
            inputMode: payload.inputMode || "quick",
            startedAt: Date.now(),
            updatedAt: Date.now(),
          });
          try {
            return await pollBackgroundAuthJob(statusUrl, data.jobId);
          } catch (error) {
            error.backgroundJobStarted = true;
            throw error;
          }
        }

        lastMessage = data?.error || `${response.status} ${response.statusText}`;
        if (![404, 405, 501].includes(response.status)) break;
      } catch (error) {
        if (error?.backgroundJobStarted) throw error;
        lastMessage = String(error?.message || error || "Failed to fetch");
      }
    }

    throw new Error(`${lastMessage || "Failed to start background job"} · 已尝试 ${endpoints.join(" -> ")}`);
  }

  async function requestJsonEndpoint(path, payload, method = "POST") {
    const endpoints = localApiEndpointCandidates(path);
    let lastMessage = "";
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "content-type": "application/json", accept: "application/json" },
          body: method === "GET" ? undefined : JSON.stringify(payload || {}),
        });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.ok !== false) return data || {};
        lastMessage = data?.error || `${response.status} ${response.statusText}`;
        if (![404, 405, 501].includes(response.status)) break;
      } catch (error) {
        lastMessage = String(error?.message || error || "Failed to fetch");
      }
    }
    throw new Error(`${lastMessage || "Failed to fetch"} · 已尝试 ${endpoints.join(" -> ")}`);
  }

  function readAuthReferenceFilePayload(file) {
    const isText = /html|text/i.test(file.type) || /\.html?$/i.test(file.name);
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
      reader.onload = () => {
        resolve({
          name: file.name,
          mime: file.type || (isText ? "text/html" : "application/octet-stream"),
          size: file.size,
          dataUrl: isText ? "" : String(reader.result || ""),
          textContent: isText ? String(reader.result || "") : "",
        });
      };
      if (isText) reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
  }

  function authReferencePromptSeed(asset = {}) {
    return [
      `借鉴「${asset.name || "认证视觉素材"}」的抽象设计语言，不要复制原图。`,
      "适用流程：登录、注册、找回密码。",
      "系统会自动识别结构：居中、图左图右、背景视觉、表单位置、Logo 摆放和移动端首屏节奏。",
      "界面分格：品牌叙事区、Logo 位置、表单卡片、安全信任点、移动端首屏节奏。",
      "生成要求：把素材转译成新的 ForexCRM 认证模块，三条流程都要完整。",
    ].join("\n");
  }

  function authVisualStructureSummary(asset = {}) {
    const structure = asset.visualStructure || {};
    if (!structure.summary) return "";
    return [
      structure.summary,
      `布局 ${structure.layoutType || "split"} · 表单 ${structure.formPosition || "right"} · 视觉 ${structure.mediaPosition || "left"}`,
    ].join(" / ");
  }

  async function uploadAuthReferenceFiles(filesLike) {
    const files = [...(filesLike || [])].slice(0, 3);
    if (!files.length) return;
    if (filesLike.length > 3) setStatus("一次最多上传 3 张，已自动取前 3 张。");
    else setStatus(`正在上传 ${files.length} 张认证视觉素材...`);

    const payloads = await Promise.all(files.map(readAuthReferenceFilePayload));
    const assets = payloads.map((filePayload) => ({
      ...filePayload,
      flow: "三流程",
      tags: ["生成页上传", "认证视觉素材"],
      segments: ["品牌叙事区", "Logo 位置", "表单卡片", "安全信任点", "移动端首屏"],
      styleBrief: "从登录注册生成页快速上传；保存后由系统自动识别布局结构。",
      note: "用户希望 AI 自动识别这组认证界面的布局、比例、表单密度、Logo 摆放、移动端节奏和视觉气质。",
      promptSeed: authReferencePromptSeed(filePayload),
    }));
    const data = await requestJsonEndpoint("/api/auth-ai/reference-assets", { assets });
    state.authReferences = data.records || [];
    saveSelectedReferenceIds(state.authReferences.slice(0, Math.min(3, state.authReferences.length)).map((asset) => asset.id));
    renderAuthReferenceSummary();
    setStatus(`已上传 ${assets.length} 张视觉素材，本次生成会直接借鉴。`, "success");
  }

  function referenceIdsForGeneration() {
    const available = new Set(state.authReferences.map((asset) => asset.id));
    const selected = readSelectedReferenceIds().filter((id) => available.has(id));
    if (selected.length) return selected.slice(0, 6);
    return state.authReferences.slice(0, 6).map((asset) => asset.id);
  }

  function renderAuthReferenceSummary() {
    const total = state.authReferences.length;
    const selected = referenceIdsForGeneration().length;
    if (els.referenceCount) els.referenceCount.textContent = `${total} 个素材`;
    if (els.referenceSummary) {
      els.referenceSummary.textContent = total
        ? `当前生成会读取 ${selected} 个认证视觉素材，优先使用自动结构识别：居中、图左图右、背景视觉、表单位置、Logo 摆放和移动端策略。`
        : "直接上传 1-3 张登录/注册/找回密码素材，上传后系统自动识别结构并立即用于本次生成。保存位置：auth-ai-reference-assets.json 和 artifacts/auth-ai-reference-assets/。";
    }
    if (els.referenceList) {
      const selectedIds = new Set(referenceIdsForGeneration());
      els.referenceList.innerHTML = state.authReferences.length
        ? state.authReferences.slice(0, 6).map((asset) => {
            const selectedClass = selectedIds.has(asset.id) ? " is-selected" : "";
            const meta = authVisualStructureSummary(asset) || [asset.flow || asset.type || "视觉素材", ...(Array.isArray(asset.tags) ? asset.tags.slice(0, 2) : [])].filter(Boolean).join(" · ");
            const thumb = asset.type === "image" && asset.url
              ? `<img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.name)}" />`
              : `<span>${escapeHtml((asset.type || "file").toUpperCase())}</span>`;
            return `
              <article class="auth-reference-inline-card${selectedClass}">
                <div class="auth-reference-inline-thumb">${thumb}</div>
                <div>
                  <strong>${escapeHtml(asset.name || "认证视觉素材")}</strong>
                  <small>${escapeHtml(meta || "已保存到认证视觉库")}</small>
                </div>
              </article>
            `;
          }).join("")
        : `<p>暂无已保存视觉素材。上传后会在这里回显，重启后从本地文件重新读取。</p>`;
    }
  }

  async function refreshAuthReferences() {
    try {
      const prompt = encodeURIComponent(els.prompt?.value || "");
      const data = await requestJsonEndpoint(`/api/auth-ai/reference-assets?prompt=${prompt}`, null, "GET");
      state.authReferences = Array.isArray(data.rankedReferences) && data.rankedReferences.length ? data.rankedReferences : (data.records || []);
      state.selectedReferenceIds = readSelectedReferenceIds();
    } catch (error) {
      state.authReferences = [];
      state.selectedReferenceIds = [];
    }
    renderAuthReferenceSummary();
  }

  function renderPreview() {
    const options = readOptions();
    const scheme = state.scheme || auth.localSchemeFromPrompt(options.prompt, options);
    auth.renderAuthPreview(els.previewHost, scheme, { ...options, screen: state.screen });
    els.previewTabs.forEach((button) => button.classList.toggle("active", button.dataset.authPreviewTab === state.screen));
    if (els.source) els.source.textContent = scheme.sourceType || "local";
  }

  function openPreviewPage(screen = state.screen) {
    const suffix = screen ? `?screen=${encodeURIComponent(screen)}` : "";
    window.location.href = `${PREVIEW_URL}${suffix}`;
  }

  function createLocalScheme(sourcePrompt = els.prompt?.value || "", tone = "success") {
    const useGuided = state.generationMode === "guided";
    const options = readOptions({ prompt: sourcePrompt, inputMode: useGuided ? "guided" : "quick", useGuided });
    const scheme = auth.localSchemeFromPrompt(sourcePrompt, options);
    saveScheme({ ...scheme, sourceType: "local" });
    renderPreview();
    setStatus("已生成本地认证模块草稿，未调用模型。", tone);
  }

  async function generateScheme(sourceMode = state.generationMode) {
    const isGuided = sourceMode === "guided";
    const prompt = isGuided ? syncGuidedPromptToQuick({ switchMode: false, toast: false }) : (els.prompt?.value || "");
    const options = readOptions({ prompt, inputMode: isGuided ? "guided" : "quick", useGuided: isGuided });
    const guidedIntake = isGuided ? buildGuidedIntake() : null;
    window.localStorage.setItem(PROMPT_KEY, prompt);
    setBusy(true, isGuided ? "正在生成引导式认证视觉方案..." : "正在生成登录注册视觉方案...");

    try {
      const requestPayload = {
        prompt,
        options,
        guidedIntake,
        inputMode: isGuided ? "guided" : "quick",
        referenceAssetIds: referenceIdsForGeneration(),
        modelConfig: aiRequestModelConfig(),
      };
      let data = null;
      try {
        data = await requestBackgroundAuthJob(requestPayload);
      } catch (error) {
        if (error?.backgroundJobStarted) throw error;
        data = await requestJsonEndpoint("/api/auth-ai/generate", requestPayload);
      }
      const scheme = auth.normalizeScheme(data.scheme, options);
      clearActiveAuthJob();
      saveScheme(scheme);
      state.screen = scheme.defaultScreen || state.screen;
      renderPreview();
      setStatus(data.localFallback ? `已使用本地兜底：${data.fallbackReason || "模型暂不可用"}` : `已生成：${scheme.name}`, data.localFallback ? "" : "success");
      refreshHistory();
      window.setTimeout(() => openPreviewPage(state.screen), 160);
    } catch (error) {
      clearActiveAuthJob();
      const fallback = auth.localSchemeFromPrompt(prompt, options);
      saveScheme({ ...fallback, sourceType: "local-fallback", fallbackReason: String(error.message || error).slice(0, 180) });
      state.screen = fallback.defaultScreen || state.screen;
      renderPreview();
      setStatus(`模型调用失败，已显示本地草稿：${String(error.message || error).slice(0, 160)}`, "error");
      window.setTimeout(() => openPreviewPage(state.screen), 360);
    } finally {
      setBusy(false);
    }
  }

  async function resumeActiveAuthJob() {
    const job = readActiveAuthJob();
    if (!job?.jobId || !job.statusUrl) return;
    if (Date.now() - Number(job.startedAt || 0) > BACKGROUND_JOB_MAX_WAIT_MS) {
      clearActiveAuthJob(job.jobId);
      return;
    }

    setBusy(true, "正在恢复后台认证模块生成...");
    setStatus("后台认证模块生成仍在进行，正在接回结果...", "");
    try {
      const data = await pollBackgroundAuthJob(job.statusUrl, job.jobId);
      clearActiveAuthJob(job.jobId);
      const options = job.options || readOptions({ prompt: job.prompt || els.prompt?.value || "", inputMode: job.inputMode || "quick" });
      const scheme = auth.normalizeScheme(data.scheme, options);
      saveScheme(scheme);
      state.screen = scheme.defaultScreen || state.screen;
      renderPreview();
      setStatus(data.localFallback ? `已使用本地兜底：${data.fallbackReason || "模型暂不可用"}` : `后台生成已完成：${scheme.name}`, data.localFallback ? "" : "success");
      refreshHistory();
      window.setTimeout(() => openPreviewPage(state.screen), 160);
    } catch (error) {
      clearActiveAuthJob(job.jobId);
      const options = job.options || readOptions({ prompt: job.prompt || els.prompt?.value || "", inputMode: job.inputMode || "quick" });
      const fallback = auth.localSchemeFromPrompt(job.prompt || els.prompt?.value || "", options);
      saveScheme({ ...fallback, sourceType: "local-fallback", fallbackReason: String(error.message || error).slice(0, 180) });
      state.screen = fallback.defaultScreen || state.screen;
      renderPreview();
      setStatus(`后台生成失败，已显示本地草稿：${String(error.message || error).slice(0, 160)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  function renderModelSummary() {
    const config = state.modelConfig;
    const runtime = state.providerRuntimeStatus[config.provider] || {};
    const keyText = config.apiKey ? "已保存 Key，生成时自动沿用" : runtime.hasServerKey ? `服务端已配置 ${runtime.serverKeyEnv || providerPreset(config.provider).apiKeyLabel}` : "Key 在大模型配置页统一维护";
    els.modelSummaries.forEach((summary) => {
      summary.innerHTML = `
        <div>
          <strong>${escapeHtml(providerPreset(config.provider).name)} / ${escapeHtml(config.model)}</strong>
          <small>${escapeHtml(keyText)}</small>
        </div>
        <button type="button" data-auth-model-open>选择</button>
      `;
      summary.querySelector("[data-auth-model-open]")?.addEventListener("click", openModelModal);
    });
  }

  function renderHistory(records = []) {
    if (!els.history) return;
    if (!records.length) {
      els.history.innerHTML = `<p class="auth-status-line">暂无认证模块生成记录。</p>`;
      return;
    }
    els.history.innerHTML = records
      .slice(0, 6)
      .map((record) => `
        <article class="auth-history-item">
          <strong>${escapeHtml(record.message || record.action || "生成记录")}</strong>
          <span>${escapeHtml(record.status || "--")} · ${escapeHtml(record.schemeSnapshot?.brand || record.provider || "")} · ${new Date(record.at).toLocaleString()}</span>
        </article>
      `)
      .join("");
  }

  async function refreshHistory() {
    try {
      const data = await requestJsonEndpoint("/api/auth-ai/calls", null, "GET");
      renderHistory(Array.isArray(data?.records) ? data.records : []);
    } catch (error) {
      renderHistory([]);
    }
  }

  async function refreshProviderRuntimeStatus() {
    try {
      const data = await requestJsonEndpoint("/api/auth-ai/providers", null, "GET");
      if (!data?.providers) return;
      state.providerRuntimeStatus = data.providers;
      if (!modelSettings?.hasSavedConfig?.() && !window.localStorage.getItem(MODEL_CONFIG_KEY)) {
        const provider = ["deepseek", "minimax", "kimi", "openai", "claude"].find((id) => data.providers[id]?.hasServerKey);
        if (provider) state.modelConfig = sanitizeModelConfig({ ...providerPreset(provider), apiKey: "" });
      }
      renderModelSummary();
    } catch (error) {
      renderModelSummary();
    }
  }

  function openModelModal() {
    if (modelSettings?.openModelPicker) {
      modelSettings.openModelPicker({
        title: "选择登录注册生成模型",
        description: "这里只选择当前想用的模型。API Key、Base URL、Endpoint 等大模型信息请到统一配置页维护，保存过的 Key 会自动沿用。",
        activeConfig: state.modelConfig,
        providerStatus: state.providerRuntimeStatus,
        source: "auth-layout-admin",
        saveLabel: "用于登录注册生成",
        onSave: (config) => {
          state.modelConfig = sanitizeModelConfig(config);
          renderModelSummary();
          setStatus(`已选择 ${providerPreset(state.modelConfig.provider).name} / ${state.modelConfig.model}`, "success");
        },
      });
      return;
    }
    let modal = document.querySelector("[data-auth-model-modal]");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "ai-model-modal";
      modal.dataset.authModelModal = "true";
      modal.innerHTML = `
        <div class="ai-model-modal-backdrop" data-auth-model-close></div>
        <section class="ai-model-dialog" role="dialog" aria-modal="true" aria-labelledby="authModelTitle">
          <header class="ai-model-head">
            <div>
              <h2 id="authModelTitle">认证模块模型配置</h2>
              <p>独立存储，不影响首页 AI 生成配置。</p>
            </div>
            <button class="ai-model-close" type="button" data-auth-model-close aria-label="关闭">×</button>
          </header>
          <form class="ai-model-form" data-auth-model-form>
            <label>厂商<select data-auth-model-field="provider">${Object.values(AI_MODEL_PRESETS).map((preset) => `<option value="${preset.provider}">${preset.name}</option>`).join("")}</select></label>
            <label>模型<input data-auth-model-field="model" list="auth-ai-model-options" autocomplete="off" /></label>
            <datalist id="auth-ai-model-options"></datalist>
            <label>Base URL<input data-auth-model-field="baseUrl" autocomplete="off" /></label>
            <label>Endpoint<input data-auth-model-field="endpoint" autocomplete="off" /></label>
            <label>API Mode<input data-auth-model-field="apiMode" autocomplete="off" /></label>
            <label>临时 API Key<input data-auth-model-field="apiKey" type="password" autocomplete="off" /></label>
            <label>Temperature<input data-auth-model-field="temperature" type="number" min="0" max="2" step="0.1" /></label>
            <label>Max Tokens<input data-auth-model-field="maxOutputTokens" type="number" min="512" max="12000" step="256" /></label>
            <div class="ai-model-config-note" data-auth-model-note></div>
          </form>
          <footer class="ai-model-actions">
            <button type="button" data-auth-model-reset>恢复厂商预设</button>
            <button type="button" data-auth-model-test>测试连通性</button>
            <button class="primary" type="button" data-auth-model-save>保存配置</button>
          </footer>
        </section>
      `;
      document.body.append(modal);
      modal.querySelectorAll("[data-auth-model-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
      modal.querySelector("[data-auth-model-field='provider']")?.addEventListener("change", () => {
        const provider = modal.querySelector("[data-auth-model-field='provider']").value;
        fillModelModal(sanitizeModelConfig({ ...providerPreset(provider), apiKey: state.modelConfig.apiKeys?.[provider] || "" }));
      });
      modal.querySelector("[data-auth-model-reset]")?.addEventListener("click", () => {
        const provider = modal.querySelector("[data-auth-model-field='provider']").value;
        fillModelModal(sanitizeModelConfig(providerPreset(provider)));
      });
      modal.querySelector("[data-auth-model-save]")?.addEventListener("click", () => {
        saveModelConfig(readModelModal());
        modal.remove();
        setStatus("认证模块模型配置已保存。", "success");
      });
      modal.querySelector("[data-auth-model-test]")?.addEventListener("click", testModelConnection);
    }
    fillModelModal(state.modelConfig);
  }

  function readModelModal() {
    const modal = document.querySelector("[data-auth-model-modal]");
    const value = (name) => modal.querySelector(`[data-auth-model-field="${name}"]`)?.value || "";
    return sanitizeModelConfig({
      provider: value("provider"),
      model: value("model"),
      baseUrl: value("baseUrl"),
      endpoint: value("endpoint"),
      apiMode: value("apiMode"),
      apiKey: value("apiKey"),
      temperature: value("temperature"),
      maxOutputTokens: value("maxOutputTokens"),
      apiKeys: state.modelConfig.apiKeys,
    });
  }

  function fillModelModal(config) {
    const modal = document.querySelector("[data-auth-model-modal]");
    if (!modal) return;
    const normalized = sanitizeModelConfig(config);
    const set = (name, value) => {
      const field = modal.querySelector(`[data-auth-model-field="${name}"]`);
      if (field) field.value = value;
    };
    set("provider", normalized.provider);
    set("model", normalized.model);
    set("baseUrl", normalized.baseUrl);
    set("endpoint", normalized.endpoint);
    set("apiMode", normalized.apiMode);
    set("apiKey", normalized.apiKey);
    set("temperature", normalized.temperature);
    set("maxOutputTokens", normalized.maxOutputTokens);
    const models = providerPreset(normalized.provider).models || [normalized.model];
    modal.querySelector("#auth-ai-model-options").innerHTML = models.map((model) => `<option value="${escapeHtml(model)}"></option>`).join("");
    const runtime = state.providerRuntimeStatus[normalized.provider] || {};
    modal.querySelector("[data-auth-model-note]").textContent = runtime.hasServerKey
      ? `服务端已配置 ${runtime.serverKeyEnv || providerPreset(normalized.provider).apiKeyLabel}；也可临时填写 API Key 覆盖。`
      : "可填写临时 API Key；不填写时生成会自动显示本地兜底草稿。";
  }

  async function testModelConnection() {
    const modal = document.querySelector("[data-auth-model-modal]");
    const button = modal?.querySelector("[data-auth-model-test]");
    const note = modal?.querySelector("[data-auth-model-note]");
    if (!modal || !button || !note) return;
    button.disabled = true;
    note.textContent = "正在测试模型连通性...";
    try {
      const config = readModelModal();
      const data = await requestJsonEndpoint("/api/auth-ai/test", { modelConfig: aiRequestModelConfig(config) });
      note.textContent = `连通成功：${data.message || data.url || config.model}`;
      refreshHistory();
    } catch (error) {
      note.textContent = `连通失败：${String(error.message || error).slice(0, 180)}`;
    } finally {
      button.disabled = false;
    }
  }

  function setGenerationMode(mode) {
    state.generationMode = mode === "guided" ? "guided" : "quick";
    els.generationModeButtons.forEach((button) => {
      const active = button.dataset.authGenerationModeButton === state.generationMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.generationPanels.forEach((panel) => {
      const active = panel.dataset.authGenerationPanel === state.generationMode;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    if (state.generationMode === "guided") setGuidedStep(state.guidedStep);
    renderGuidedSummary();
  }

  function setGuidedStep(step) {
    const nextStep = GUIDED_STEPS.includes(step) ? step : "intent";
    state.guidedStep = nextStep;
    els.guidedStepButtons.forEach((button) => {
      const active = button.dataset.authGuidedStepButton === nextStep;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "step" : "false");
    });
    els.guidedStepPanels.forEach((panel) => {
      const active = panel.dataset.authGuidedStep === nextStep;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
    const index = GUIDED_STEPS.indexOf(nextStep);
    if (els.guidedPrev) els.guidedPrev.disabled = index <= 0;
    if (els.guidedNext) {
      const isLast = index >= GUIDED_STEPS.length - 1;
      els.guidedNext.textContent = isLast ? "生成预览" : "下一步";
      els.guidedNext.dataset.authGuidedNextAction = isLast ? "generate" : "next";
    }
    renderGuidedSummary();
  }

  function moveGuidedStep(direction) {
    const index = GUIDED_STEPS.indexOf(state.guidedStep);
    const nextIndex = Math.min(Math.max(index + direction, 0), GUIDED_STEPS.length - 1);
    setGuidedStep(GUIDED_STEPS[nextIndex]);
  }

  function renderGuidedSummary() {
    if (!els.guidedSummary) return;
    const guidedState = readGuidedState();
    const optionalFeatures = guidedState.features.filter(Boolean);
    const requiredFlows = guidedState.flows.length || 3;
    const rows = [
      ["分级", guidedLabel("registerDepth", guidedState.registerDepth)],
      ["设计", guidedLabel("designStyle", guidedState.designStyle)],
      ["风格", `${guidedLabel("theme", guidedState.theme)} · ${guidedLabel("intent", guidedState.intent)}`],
      ["Logo", guidedLabel("logoPlacement", guidedState.logoPlacement)],
      ["模块", `必选 ${requiredFlows} 项 · 选填 ${optionalFeatures.length} 项`],
    ];
    if (els.guidedSummaryTitle) els.guidedSummaryTitle.textContent = `${guidedLabel("registerDepth", guidedState.registerDepth)}方案`;
    if (els.guidedMainIdea) els.guidedMainIdea.textContent = `${guidedLabel("intent", guidedState.intent)} · ${guidedLabel("audience", guidedState.audience)}`;
    if (els.guidedMainDetail) els.guidedMainDetail.textContent = `${guidedLabel("registerDepth", guidedState.registerDepth)}，${guidedLabel("designStyle", guidedState.designStyle)}，${guidedLabel("theme", guidedState.theme)}。`;
    els.guidedSummary.innerHTML = rows
      .map(
        ([label, value]) => `
          <article>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </article>
        `,
      )
      .join("");
  }

  function syncGuidedPromptToQuick(options = {}) {
    const prompt = buildGuidedPrompt();
    if (els.prompt) els.prompt.value = prompt;
    window.localStorage.setItem(PROMPT_KEY, prompt);
    if (options.switchMode) setGenerationMode("quick");
    if (options.toast) showToast("已写入快速输入");
    return prompt;
  }

  function suggestionScore(card, text) {
    const source = String(text || "").toLowerCase();
    return card.tags.reduce((score, tag) => score + (source.includes(tag.toLowerCase()) ? 8 : 0), 0);
  }

  function pickSuggestionCards() {
    const prompt = els.prompt?.value || "";
    const sorted = AUTH_SUGGESTIONS.map((card, index) => ({ ...card, score: suggestionScore(card, prompt) + ((index + state.suggestionRound) % 3) }))
      .sort((a, b) => b.score - a.score);
    const start = state.suggestionRound % Math.max(sorted.length, 1);
    return sorted.concat(sorted).slice(start, start + 3);
  }

  function readSuggestionHistory() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SUGGESTION_HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function rememberSuggestionCards(cards) {
    const history = readSuggestionHistory().concat(cards.map((card) => card.id));
    window.localStorage.setItem(SUGGESTION_HISTORY_KEY, JSON.stringify([...new Set(history)].slice(-AUTH_SUGGESTIONS.length)));
  }

  function renderSuggestionCards(note = "推荐可直接套用的视觉方向") {
    if (!els.suggestionPanel) return;
    const cards = pickSuggestionCards();
    rememberSuggestionCards(cards);
    els.suggestionPanel.querySelectorAll("[data-auth-suggestion-prompt]").forEach((node) => node.remove());
    els.suggestionPanel.insertAdjacentHTML(
      "beforeend",
      cards
        .map(
          (card) => `
            <button type="button" data-auth-suggestion-prompt="${escapeHtml(card.id)}">
              <b>${escapeHtml(card.title)}</b>
              <small>${escapeHtml(card.prompt)}</small>
            </button>
          `,
        )
        .join(""),
    );
    if (els.suggestionNote) els.suggestionNote.textContent = note;
    els.suggestionPanel.querySelectorAll("[data-auth-suggestion-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = AUTH_SUGGESTIONS.find((item) => item.id === button.dataset.authSuggestionPrompt);
        if (!card || !els.prompt) return;
        els.prompt.value = card.prompt;
        window.localStorage.setItem(PROMPT_KEY, card.prompt);
        setGenerationMode("quick");
        createLocalScheme(card.prompt);
      });
    });
  }

  function bindGuidedControls() {
    els.guidedChoices.forEach((button) => {
      if (button.dataset.authGuidedRequired === "true") {
        button.classList.add("active");
        button.setAttribute("aria-disabled", "true");
      }
      button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
      button.addEventListener("click", () => {
        const group = button.dataset.authGuidedGroup;
        const isMultiple = button.hasAttribute("data-auth-guided-multiple");

        if (button.dataset.authGuidedRequired === "true") {
          button.classList.add("active");
          button.setAttribute("aria-pressed", "true");
          renderGuidedSummary();
          return;
        }

        if (isMultiple) {
          const willActivate = !button.classList.contains("active");
          button.classList.toggle("active", willActivate);
          button.setAttribute("aria-pressed", willActivate ? "true" : "false");
          const activeInGroup = guidedButtonsFor(group).filter((item) => item.classList.contains("active"));
          if (!activeInGroup.length) {
            button.classList.add("active");
            button.setAttribute("aria-pressed", "true");
          }
        } else {
          guidedButtonsFor(group).forEach((item) => {
            const active = item === button;
            item.classList.toggle("active", active);
            item.setAttribute("aria-pressed", active ? "true" : "false");
          });
        }

        if (group === "theme" && els.accent) {
          els.accent.value = THEME_ACCENTS[button.dataset.authGuidedValue] || els.accent.value;
        }
        renderGuidedSummary();
        renderPreview();
      });
    });

    els.guidedNote?.addEventListener("input", renderGuidedSummary);
    [els.brandName, els.language, els.accent].forEach((field) => {
      field?.addEventListener("input", () => {
        renderGuidedSummary();
        renderPreview();
      });
      field?.addEventListener("change", () => {
        renderGuidedSummary();
        renderPreview();
      });
    });
  }

  function bindControls() {
    els.generate?.addEventListener("click", () => generateScheme("quick"));
    els.guidedGenerate?.addEventListener("click", () => generateScheme("guided"));
    els.guidedSync?.addEventListener("click", () => syncGuidedPromptToQuick({ switchMode: true, toast: true }));
    els.local?.addEventListener("click", () => createLocalScheme(state.generationMode === "guided" ? buildGuidedPrompt() : els.prompt?.value || ""));
    els.reset?.addEventListener("click", () => {
      window.localStorage.removeItem(STORAGE_KEY);
      state.scheme = null;
      createLocalScheme(els.prompt?.value || "");
    });
    els.modelOpenButtons.forEach((button) => button.addEventListener("click", openModelModal));
    els.generationModeButtons.forEach((button) => {
      button.addEventListener("click", () => setGenerationMode(button.dataset.authGenerationModeButton));
    });
    els.guidedStepButtons.forEach((button) => {
      button.addEventListener("click", () => setGuidedStep(button.dataset.authGuidedStepButton));
    });
    els.guidedPrev?.addEventListener("click", () => moveGuidedStep(-1));
    els.guidedNext?.addEventListener("click", () => {
      if (els.guidedNext.dataset.authGuidedNextAction === "generate") {
        generateScheme("guided");
        return;
      }
      moveGuidedStep(1);
    });
    els.previewTabs.forEach((button) => {
      button.addEventListener("click", () => {
        state.screen = button.dataset.authPreviewTab || "login";
        renderPreview();
      });
    });
    els.prompt?.addEventListener("input", () => {
      window.localStorage.setItem(PROMPT_KEY, els.prompt.value || "");
      if (!state.scheme || state.scheme.sourceType === "local") {
        state.scheme = null;
        renderPreview();
      }
      window.clearTimeout(refreshAuthReferences.timer);
      refreshAuthReferences.timer = window.setTimeout(refreshAuthReferences, 360);
    });
    els.referenceRefresh?.addEventListener("click", () => {
      setStatus("正在刷新认证视觉素材...");
      refreshAuthReferences().then(() => setStatus("认证视觉素材已刷新。", "success")).catch((error) => setStatus(String(error.message || error).slice(0, 160), "error"));
    });
    els.referenceFile?.addEventListener("change", () => {
      const files = [...(els.referenceFile.files || [])];
      uploadAuthReferenceFiles(files)
        .catch((error) => setStatus(String(error.message || error).slice(0, 180), "error"))
        .finally(() => {
          if (els.referenceFile) els.referenceFile.value = "";
        });
    });
    els.generateSuggestions?.addEventListener("click", () => {
      state.suggestionRound += 1;
      renderSuggestionCards("已根据当前输入生成视觉方案");
    });
    els.refreshSuggestions?.addEventListener("click", () => {
      state.suggestionRound += 1;
      renderSuggestionCards("已换一批认证模块视觉方案");
    });
    bindGuidedControls();
  }

  function init() {
    if (els.prompt) {
      els.prompt.value =
        window.localStorage.getItem(PROMPT_KEY) ||
        els.prompt.value ||
        "帮我生成一套适合外汇平台开户的登录注册模块：中文，移动端优先且必须美观，布局方案为左右布局，桌面端左侧品牌平台开户说明、右侧登录表单，移动端折叠为单列但保留 Logo、主入口和主按钮优先级。平台 Logo 摆放要有明确方案。登录首屏只保留账号（手机号/邮箱）和密码，可提供 Google / Apple 快捷登录；如账号开启双重验证，下一步输入 6 位验证码。注册和找回密码在提交、发送验证码等关键步骤触发人机校验，KYC 与风险确认放到注册后的开户流程说明里，整体可信但不要像通用模板。";
    }
    state.screen = state.scheme?.defaultScreen || state.screen;
    if (!state.scheme) state.scheme = auth.localSchemeFromPrompt(els.prompt?.value || "", readOptions());
    bindControls();
    setGuidedStep("intent");
    renderGuidedSummary();
    renderSuggestionCards();
    renderModelSummary();
    renderPreview();
    resumeActiveAuthJob();
    window.addEventListener("forexcrm:model-config-change", (event) => {
      if (!event.detail?.config) return;
      state.modelConfig = sanitizeModelConfig(event.detail.config);
      renderModelSummary();
    });
    refreshProviderRuntimeStatus();
    refreshHistory();
    refreshAuthReferences();
  }

  init();
})();

(function () {
  const auth = window.AuthPersonalization;
  if (!auth) return;

  const STORAGE_KEY = "forexcrm.auth.generated.scheme";
  const PROMPT_KEY = "forexcrm.auth.ai.prompt";
  const MODEL_CONFIG_KEY = "forexcrm.auth.ai.model.config";
  const SUGGESTION_HISTORY_KEY = "forexcrm.auth.ai.suggestion.history";
  const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
  const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1";
  const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

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
      captcha: "验证码 / Captcha",
      twoFactor: "双重验证",
      inviteCode: "推荐码 / 邀请码",
      kycPrelude: "KYC 前置说明",
      riskConsent: "风险披露确认",
      promoReward: "注册送礼 / 活动奖励",
    },
  };

  const THEME_ACCENTS = {
    blueTrust: "#2563eb",
    blackGold: "#b7791f",
    emeraldSecure: "#059669",
    graphiteSilver: "#334155",
    roseCampaign: "#e11d48",
  };

  const AUTH_SUGGESTIONS = [
    {
      id: "trust-new-trader",
      title: "新手开户链接",
      prompt: "生成一套面向新手客户的 ForexCRM 登录注册模块：中文，注册流程要清楚拆分基本资料、国家地区、投资经验、账户安全和协议确认，登录支持手机号/邮箱，整体像可信的金融客户端，不要像通用 SaaS 模板。",
      tags: ["新手", "开户注册", "可信"],
    },
    {
      id: "premium-client",
      title: "高净值客户",
      prompt: "生成一套高净值客户使用的登录注册模块：视觉高级克制，黑金或石墨银倾向，首屏强调账户安全、专属服务和隐私保护，注册表单不要拥挤，找回密码流程要显得正式可靠。",
      tags: ["高净值", "高级", "安全"],
    },
    {
      id: "campaign-lead",
      title: "活动转化",
      prompt: "生成一套活动落地页风格的登录注册模块：突出注册送体验金、推荐码和手机号验证码，注册步骤尽量短，登录仍保持专业金融感，页面需要同时包含找回密码和风险提示。",
      tags: ["活动", "转化", "验证码"],
    },
    {
      id: "ib-partner",
      title: "代理邀请",
      prompt: "生成一套面向 IB / 代理客户的认证模块：登录和注册都要支持邀请码，注册信息包含联系方式、国家地区、合作身份和协议确认，视觉要像专业渠道后台入口，避免花哨营销感。",
      tags: ["IB", "邀请", "渠道"],
    },
    {
      id: "secure-reset",
      title: "安全找回",
      prompt: "生成一套强调安全的登录注册和找回密码模块：登录支持双重验证提示，找回密码需要邮箱验证、身份确认和新密码步骤，文案要降低客户对钓鱼页面的担心。",
      tags: ["安全", "找回密码", "双重验证"],
    },
    {
      id: "mobile-first",
      title: "移动优先",
      prompt: "生成一套移动端优先的认证模块：手机号验证码作为主路径，邮箱密码作为备选，注册字段分步骤展示，按钮和表单适合手机单手操作，同时在桌面端保持完整品牌区域。",
      tags: ["移动端", "手机号", "分步骤"],
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
    els.status.className = `auth-chat-status${tone ? ` ${tone}` : ""}`;
  }

  function setBusy(isBusy, label = "正在生成认证模块") {
    [els.generate, els.guidedGenerate].filter(Boolean).forEach((button) => {
      button.disabled = isBusy;
      button.classList.toggle("is-loading", isBusy);
    });
    document.querySelector(".auth-chat-composer")?.classList.toggle("is-generating", isBusy);
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
    try {
      return sanitizeModelConfig(JSON.parse(window.localStorage.getItem(MODEL_CONFIG_KEY) || "null") || DEFAULT_MODEL_CONFIG);
    } catch (error) {
      return sanitizeModelConfig(DEFAULT_MODEL_CONFIG);
    }
  }

  function saveModelConfig(config) {
    state.modelConfig = sanitizeModelConfig(config);
    window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(state.modelConfig));
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
    return GUIDED_LABELS[group]?.[value] || value || "";
  }

  function guidedStylePresetHint(guidedState) {
    if (guidedState.intent === "resetTrust" || guidedState.intent === "secureLogin") return "securityReset";
    if (guidedState.intent === "partnerInvite") return "clientOnboarding";
    if (guidedState.intent === "campaignSignup") return "softPlatform";
    if (guidedState.registerDepth === "compliance") return "clientOnboarding";
    if (guidedState.theme === "blackGold" || guidedState.designStyle === "premiumCalm") return "photoDark";
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
    const features = activeGuidedValues("features");
    return {
      intent,
      audience,
      registerDepth,
      designStyle,
      theme,
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
      `增强能力：${compactList(guidedState.features.map((feature) => guidedLabel("features", feature)), "保持标准登录注册能力")}。`,
      "请生成的是一个个性化认证业务模块，不要套用固定模板；参考界面只作为质量标准学习，不能把参考版式当作可见模板名输出。",
      "需要包含登录、注册、找回密码三条流程的字段、状态、按钮文案、安全提示、合规提示和移动端适配策略。",
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
      ["5174", "5184"].forEach((port) => candidates.push(`http://${host}:${port}${value}`));
    });
    return [...new Set(candidates)];
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

  function renderPreview() {
    const options = readOptions();
    const scheme = state.scheme || auth.localSchemeFromPrompt(options.prompt, options);
    auth.renderAuthPreview(els.previewHost, scheme, { ...options, screen: state.screen });
    els.previewTabs.forEach((button) => button.classList.toggle("active", button.dataset.authPreviewTab === state.screen));
    if (els.source) els.source.textContent = scheme.sourceType || "local";
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
    setBusy(true, isGuided ? "正在生成引导式认证模块..." : "正在生成登录注册模块...");

    try {
      const data = await requestJsonEndpoint("/api/auth-ai/generate", {
        prompt,
        options,
        guidedIntake,
        inputMode: isGuided ? "guided" : "quick",
        modelConfig: aiRequestModelConfig(),
      });
      const scheme = auth.normalizeScheme(data.scheme, options);
      saveScheme(scheme);
      state.screen = scheme.defaultScreen || state.screen;
      renderPreview();
      setStatus(data.localFallback ? `已使用本地兜底：${data.fallbackReason || "模型暂不可用"}` : `已生成：${scheme.name}`, data.localFallback ? "" : "success");
      refreshHistory();
    } catch (error) {
      const fallback = auth.localSchemeFromPrompt(prompt, options);
      saveScheme({ ...fallback, sourceType: "local-fallback", fallbackReason: String(error.message || error).slice(0, 180) });
      renderPreview();
      setStatus(`模型调用失败，已显示本地草稿：${String(error.message || error).slice(0, 160)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  function renderModelSummary() {
    const config = state.modelConfig;
    const runtime = state.providerRuntimeStatus[config.provider] || {};
    const keyText = config.apiKey ? "临时密钥已填写" : runtime.hasServerKey ? `服务端已配置 ${runtime.serverKeyEnv || providerPreset(config.provider).apiKeyLabel}` : "未填写密钥时会使用本地兜底";
    els.modelSummaries.forEach((summary) => {
      summary.innerHTML = `
        <div>
          <strong>${escapeHtml(providerPreset(config.provider).name)} / ${escapeHtml(config.model)}</strong>
          <small>${escapeHtml(keyText)}</small>
        </div>
        <button type="button" data-auth-model-open>配置</button>
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
      if (!window.localStorage.getItem(MODEL_CONFIG_KEY)) {
        const provider = ["deepseek", "minimax", "kimi", "openai", "claude"].find((id) => data.providers[id]?.hasServerKey);
        if (provider) state.modelConfig = sanitizeModelConfig({ ...providerPreset(provider), apiKey: "" });
      }
      renderModelSummary();
    } catch (error) {
      renderModelSummary();
    }
  }

  function openModelModal() {
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
    const mainIdea = `${guidedLabel("intent", guidedState.intent)} · ${guidedLabel("audience", guidedState.audience)}`;
    const mainDetail = `${guidedLabel("registerDepth", guidedState.registerDepth)}，${guidedLabel("designStyle", guidedState.designStyle)}，${guidedLabel("theme", guidedState.theme)}。`;
    const rows = [
      ["主旨", guidedLabel("intent", guidedState.intent)],
      ["对象", guidedLabel("audience", guidedState.audience)],
      ["注册", guidedLabel("registerDepth", guidedState.registerDepth)],
      ["能力", compactList(guidedState.features.map((feature) => guidedLabel("features", feature)), "标准能力")],
    ];
    if (els.guidedSummaryTitle) els.guidedSummaryTitle.textContent = `${guidedLabel("intent", guidedState.intent)}方案`;
    if (els.guidedMainIdea) els.guidedMainIdea.textContent = mainIdea;
    if (els.guidedMainDetail) els.guidedMainDetail.textContent = mainDetail;
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

  function renderSuggestionCards(note = "推荐可直接套用的登录注册模块提示语") {
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
    });
    els.generateSuggestions?.addEventListener("click", () => {
      state.suggestionRound += 1;
      renderSuggestionCards("已根据当前输入生成提示语");
    });
    els.refreshSuggestions?.addEventListener("click", () => {
      state.suggestionRound += 1;
      renderSuggestionCards("已换一批认证模块提示语");
    });
    bindGuidedControls();
  }

  function init() {
    if (els.prompt) {
      els.prompt.value =
        window.localStorage.getItem(PROMPT_KEY) ||
        els.prompt.value ||
        "帮我生成一套适合外汇平台开户的登录注册模块：中文，蓝白金融科技感，登录支持邮箱/手机号，注册要包含国家地区、投资经验、密码和协议，整体要可信但不要像通用模板。";
    }
    state.screen = state.scheme?.defaultScreen || state.screen;
    if (!state.scheme) state.scheme = auth.localSchemeFromPrompt(els.prompt?.value || "", readOptions());
    bindControls();
    setGuidedStep("intent");
    renderGuidedSummary();
    renderSuggestionCards();
    renderModelSummary();
    renderPreview();
    refreshProviderRuntimeStatus();
    refreshHistory();
  }

  init();
})();

(function () {
  const home = window.HomePersonalization;

  if (!home) return;

  const PROMPT_KEY = "forexcrm.home.personalization.prompt";
  const PREVIEW_SIZE_KEY = "forexcrm.home.preview.size";
  const MODEL_CONFIG_KEY = "forexcrm.home.ai.model.config";
  const MODEL_HISTORY_KEY = "forexcrm.home.ai.call.history";
  const MAX_MODEL_HISTORY = 120;
  const MODEL_HISTORY_PREVIEW_LIMIT = 5;
  const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
  const MINIMAX_CN_TYPED_ALIAS_BASE_URL = "https://api.minimaxi.cn/v1";
  const MINIMAX_GLOBAL_BASE_URL = "https://api.minimax.io/v1";
  const MINIMAX_MAX_COMPLETION_TOKENS = 2048;
  const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  const PREVIEW_SIZE_PRESETS = {
    mobile: { label: "手机", meta: "390x844" },
    tablet: { label: "平板", meta: "768x1024" },
    web: { label: "Web", meta: "1440x900" },
    large: { label: "大屏", meta: "1920x1080" },
  };
  const PREVIEW_SIZE_ALIASES = {
    standard: "web",
    wide: "web",
    immersive: "large",
    desktop: "web",
    phone: "mobile",
  };

  const AI_MODEL_PRESETS = {
    openai: {
      provider: "openai",
      name: "OpenAI",
      badge: "Responses API",
      model: "gpt-5.2",
      models: ["gpt-5.2", "gpt-5.2-pro", "gpt-5-mini", "gpt-4.1"],
      baseUrl: "https://api.openai.com/v1",
      endpoint: "/responses",
      apiMode: "responses",
      apiKeyLabel: "OPENAI_API_KEY",
      note: "适合生成稳定 JSON 蓝图、结构化输出和复杂首页策略。",
    },
    claude: {
      provider: "claude",
      name: "Claude",
      badge: "Messages API",
      model: "claude-sonnet-4-6",
      models: ["claude-sonnet-4-6", "claude-sonnet-4-5-20250929", "claude-opus-4-6"],
      baseUrl: "https://api.anthropic.com/v1",
      endpoint: "/messages",
      apiMode: "anthropic-messages",
      apiKeyLabel: "ANTHROPIC_API_KEY",
      note: "适合较长需求理解、信息架构判断和多步骤方案推理。",
    },
    minimax: {
      provider: "minimax",
      name: "MiniMax",
      badge: "OpenAI Compatible",
      model: "MiniMax-M2.7",
      models: ["MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5", "MiniMax-M2.5-highspeed", "MiniMax-M2.1"],
      baseUrl: MINIMAX_CN_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MINIMAX_API_KEY",
      note: `适合中文业务语境。CN 站点官方 API Base URL 是 ${MINIMAX_CN_BASE_URL}，不是 ${MINIMAX_CN_TYPED_ALIAS_BASE_URL}；国际账号可改为 ${MINIMAX_GLOBAL_BASE_URL}。输出上限按 MiniMax Chat Completions 控制为 ${MINIMAX_MAX_COMPLETION_TOKENS}。`,
    },
    kimi: {
      provider: "kimi",
      name: "Kimi",
      badge: "OpenAI Compatible",
      model: "kimi-k2.5",
      models: ["kimi-k2.5", "kimi-k2-thinking", "moonshot-v1-128k"],
      baseUrl: "https://api.moonshot.ai/v1",
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MOONSHOT_API_KEY",
      note: "适合中文长文本理解、运营需求摘要和大上下文首页方案整理。",
    },
    deepseek: {
      provider: "deepseek",
      name: "DeepSeek",
      badge: "OpenAI Compatible",
      model: "deepseek-v4-pro",
      models: ["deepseek-v4-pro", "deepseek-v4-flash"],
      baseUrl: DEEPSEEK_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "DEEPSEEK_API_KEY",
      note: "DeepSeek V4 最新官方 API 模型。V4-Pro 适合复杂方案推理，V4-Flash 适合更快生成；Base URL 保持 https://api.deepseek.com。",
    },
  };

  const DEFAULT_MODEL_CONFIG = {
    ...AI_MODEL_PRESETS.openai,
    callMode: "serverProxy",
    proxyEndpoint: "/api/home-ai/complete",
    temperature: 0.4,
    maxOutputTokens: 2400,
    apiKey: "",
    apiKeys: {},
  };

  const els = {
    intakePage: document.querySelector("[data-ai-intake-page]"),
    previewPage: document.querySelector("[data-preview-page]"),
    prompt: document.querySelector("[data-ai-prompt]"),
    generate: document.querySelector("[data-generate-config]"),
    random: document.querySelector("[data-random-config]"),
    regenerateIntelligence: document.querySelector("[data-regenerate-intelligence]"),
    regenerate: document.querySelector("[data-regenerate-preview]"),
    publish: document.querySelector("[data-publish-config]"),
    reset: document.querySelector("[data-reset-config]"),
    preview: document.querySelector("[data-home-preview]"),
    previewStage: document.querySelector(".preview-stage-panel"),
    previewSizeButtons: [...document.querySelectorAll("[data-preview-size]")],
    previewSizeMeta: document.querySelector("[data-preview-size-meta]"),
    previewFullscreen: document.querySelector("[data-preview-fullscreen]"),
    schemeOptions: document.querySelector("[data-scheme-options]"),
    intelligenceSummary: document.querySelector("[data-intelligence-summary]"),
    status: document.querySelector("[data-config-status]"),
    summaryName: document.querySelector("[data-summary-name]"),
    summary: document.querySelector("[data-ai-summary]"),
    layout: document.querySelector("[data-summary-layout]"),
    theme: document.querySelector("[data-summary-theme]"),
    density: document.querySelector("[data-summary-density]"),
    strength: document.querySelector("[data-summary-strength]"),
    hero: document.querySelector("[data-summary-hero]"),
    decisionReasons: document.querySelector("[data-decision-reasons]"),
    variantSummary: document.querySelector("[data-variant-summary]"),
    moduleOutline: document.querySelector("[data-module-outline]"),
    pagePresetControls: document.querySelector("[data-page-preset-controls]"),
    moduleStyleControls: document.querySelector("[data-module-style-controls]"),
    moduleSettingControls: document.querySelector("[data-module-setting-controls]"),
    modelConfigOpen: [...document.querySelectorAll("[data-model-config-open]")],
    modelConfigSummary: [...document.querySelectorAll("[data-model-config-summary]")],
    modelCallHistory: document.querySelector("[data-model-call-history]"),
    json: document.querySelector("[data-config-json]"),
    toast: document.querySelector("[data-admin-toast]"),
  };

  let currentConfig = els.previewPage ? home.loadDraft() : home.loadConfig();
  let schemeOptions = [];
  let activeSchemeIndex = 0;
  let selectedSuggestion = null;
  let interpretationRound = 0;
  let activePreviewSize = "web";
  let aiModelConfig = loadModelConfig();
  let editingModelConfig = null;
  let modelTestState = { tone: "", message: "尚未测试" };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    if (!els.toast) return;

    els.toast.textContent = message;
    els.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 1800);
  }

  function labelDensity(density) {
    return {
      compact: "紧凑",
      balanced: "平衡",
      spacious: "舒展",
    }[density] || density;
  }

  function labelStrength(strength) {
    return {
      subtle: "轻度",
      medium: "中度",
      strong: "强差异",
    }[strength] || strength;
  }

  function sectionTypeLabel(type) {
    return {
      hero: "首屏",
      rail: "横排",
      split: "分栏",
      full: "整行",
    }[type] || type;
  }

  function visibleModules(config) {
    const modules = [];

    home.normalizeConfig(config).layout.forEach((block) => {
      const moduleId = block.module?.id;
      if (moduleId && home.MODULE_VARIANT_OPTIONS?.[moduleId] && !modules.includes(moduleId)) {
        modules.push(moduleId);
      }
    });

    return modules;
  }

  function updateStatus(text, published) {
    if (!els.status) return;

    els.status.textContent = text;
    els.status.classList.toggle("published", Boolean(published));
  }

  function normalizePreviewSize(size) {
    const value = String(size || "").trim();
    const normalized = PREVIEW_SIZE_ALIASES[value] || value;
    return Object.prototype.hasOwnProperty.call(PREVIEW_SIZE_PRESETS, normalized) ? normalized : "web";
  }

  function setPreviewSize(size, options = {}) {
    if (!els.previewPage) return;

    const nextSize = normalizePreviewSize(size);
    const preset = PREVIEW_SIZE_PRESETS[nextSize];
    activePreviewSize = nextSize;
    els.previewPage.dataset.previewSize = nextSize;
    els.previewSizeButtons.forEach((button) => {
      const isActive = button.dataset.previewSize === nextSize;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    if (els.previewSizeMeta) els.previewSizeMeta.textContent = preset.meta;

    if (options.persist !== false) {
      window.localStorage.setItem(PREVIEW_SIZE_KEY, nextSize);
    }
  }

  function updateFullscreenButton() {
    if (!els.previewFullscreen) return;
    const isFullscreen = document.fullscreenElement === els.previewStage;
    els.previewFullscreen.textContent = isFullscreen ? "退出全屏" : "全屏预览";
    els.previewFullscreen.classList.toggle("active", isFullscreen);
  }

  function initPreviewSizing() {
    if (!els.previewPage || !els.previewSizeButtons.length) return;

    setPreviewSize(window.localStorage.getItem(PREVIEW_SIZE_KEY) || "web", { persist: false });

    els.previewSizeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setPreviewSize(button.dataset.previewSize || "web");
      });
    });

    if (els.previewFullscreen && els.previewStage) {
      els.previewFullscreen.addEventListener("click", async () => {
        try {
          if (document.fullscreenElement === els.previewStage) {
            await document.exitFullscreen();
          } else {
            setPreviewSize("large");
            await els.previewStage.requestFullscreen();
          }
        } catch (error) {
          showToast("当前浏览器不支持全屏预览");
        }
      });
      document.addEventListener("fullscreenchange", updateFullscreenButton);
      updateFullscreenButton();
    }
  }

  function applyPreview(allowReload = false) {
    if (!els.preview) return;

    try {
      const frameWindow = els.preview.contentWindow;

      if (frameWindow?.HomePersonalization && frameWindow.document?.body) {
        frameWindow.HomePersonalization.applyConfig(currentConfig, frameWindow.document);
        return;
      }
    } catch (error) {
      // file:// previews can block direct iframe access; reloading lets the iframe read the saved draft.
    }

    if (allowReload) {
      const nextUrl = new URL(els.preview.getAttribute("src") || "./client-home.html?preview=1", window.location.href);
      nextUrl.searchParams.set("_draft", String(Date.now()));
      els.preview.src = nextUrl.href;
    }
  }

  function renderSummary() {
    const config = home.normalizeConfig(currentConfig);

    if (els.summaryName) els.summaryName.textContent = config.name;
    if (els.summary) els.summary.textContent = config.aiSummary;
    if (els.layout) els.layout.textContent = home.layoutLabel(config.layoutPreset);
    if (els.theme) els.theme.textContent = home.themeLabel(config.themePreset || config.theme);
    if (els.density) els.density.textContent = labelDensity(config.density);
    if (els.strength) els.strength.textContent = labelStrength(config.personalizationStrength);
    if (els.hero) els.hero.textContent = home.featureLabel(config.heroFocus);
    if (els.json) els.json.textContent = JSON.stringify(config, null, 2);
  }

  function renderIntelligenceSummary() {
    if (!els.intelligenceSummary) return;

    const prompt = window.localStorage.getItem(PROMPT_KEY) || promptValue();
    const items = home.describeIntelligence(currentConfig, prompt);
    els.intelligenceSummary.innerHTML = items
      .map(
        (item) => `
          <article>
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </article>
        `,
      )
      .join("");
  }

  function renderDecisionReasons() {
    if (!els.decisionReasons) return;

    const prompt = window.localStorage.getItem(PROMPT_KEY) || promptValue();
    const items = home.describeDecision(currentConfig, prompt);
    els.decisionReasons.innerHTML = items
      .map(
        (item) => `
          <article>
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.reason)}</p>
          </article>
        `,
      )
      .join("");
  }

  function renderVariantSummary() {
    if (!els.variantSummary) return;

    els.variantSummary.innerHTML = home
      .moduleVariantSummary(currentConfig)
      .map(
        (item) => `
          <article>
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.variantLabel)}</strong>
            <small>${escapeHtml(item.variant)}</small>
          </article>
        `,
      )
      .join("");
  }

  function setConfig(config, statusText, options = {}) {
    currentConfig = home.normalizeConfig(config);
    if (options.saveDraft) home.saveDraft(currentConfig);
    renderSummary();
    renderIntelligenceSummary();
    renderDecisionReasons();
    renderVariantSummary();
    renderModuleOutline();
    renderPagePresetControls();
    renderModuleStyleControls();
    renderModuleSettingControls();
    applyPreview(true);
    updateStatus(statusText || "草稿预览", false);
  }

  function promptValue() {
    return (els.prompt?.value || "").trim();
  }

  function savePrompt() {
    window.localStorage.setItem(PROMPT_KEY, promptValue());
  }

  function restorePrompt() {
    if (!els.prompt) return;

    const savedPrompt = window.localStorage.getItem(PROMPT_KEY);
    if (savedPrompt) els.prompt.value = savedPrompt;
  }

  function providerPreset(provider) {
    return AI_MODEL_PRESETS[provider] || AI_MODEL_PRESETS.openai;
  }

  function normalizeModelTemperature(provider, value) {
    if (!Number.isFinite(value)) return DEFAULT_MODEL_CONFIG.temperature;
    if (provider === "minimax") return Math.min(Math.max(value, 0.01), 1);
    return Math.min(Math.max(value, 0), 2);
  }

  function normalizeModelBaseUrl(provider, value) {
    const baseUrl = String(value || "").trim().replace(/\/+$/, "");
    if (provider !== "minimax") return baseUrl;

    try {
      const target = new URL(baseUrl);
      if (target.hostname === "api.minimaxi.cn") return MINIMAX_CN_BASE_URL;
    } catch (error) {
      return baseUrl;
    }

    return baseUrl === MINIMAX_CN_TYPED_ALIAS_BASE_URL ? MINIMAX_CN_BASE_URL : baseUrl;
  }

  function sanitizeModelConfig(config) {
    const preset = providerPreset(config?.provider);
    const source = config && typeof config === "object" ? config : {};
    const apiKeys = {
      ...(DEFAULT_MODEL_CONFIG.apiKeys || {}),
      ...(source.apiKeys && typeof source.apiKeys === "object" ? source.apiKeys : {}),
    };
    const merged = {
      ...DEFAULT_MODEL_CONFIG,
      ...preset,
      ...source,
    };

    const model = String(merged.model || preset.model || DEFAULT_MODEL_CONFIG.model).trim();
    const baseUrl = normalizeModelBaseUrl(preset.provider, merged.baseUrl || preset.baseUrl);
    const endpoint = String(merged.endpoint || preset.endpoint).trim();
    const proxyEndpoint = String(merged.proxyEndpoint || DEFAULT_MODEL_CONFIG.proxyEndpoint).trim();
    const temperature = Number(merged.temperature);
    const maxOutputTokens = Number(merged.maxOutputTokens);
    const hasApiKeyField = Object.prototype.hasOwnProperty.call(source, "apiKey");
    const apiKey = hasApiKeyField
      ? String(source.apiKey || "").trim()
      : String(merged.apiKey || apiKeys[preset.provider] || "").trim();

    if (apiKey) {
      apiKeys[preset.provider] = apiKey;
    } else if (hasApiKeyField) {
      delete apiKeys[preset.provider];
    }

    return {
      ...preset,
      provider: preset.provider,
      model: model.slice(0, 80),
      baseUrl: baseUrl.slice(0, 180),
      endpoint: endpoint.startsWith("/") ? endpoint.slice(0, 120) : `/${endpoint.slice(0, 119)}`,
      apiMode: String(merged.apiMode || preset.apiMode).slice(0, 40),
      callMode: ["local", "serverProxy"].includes(merged.callMode) ? merged.callMode : "local",
      proxyEndpoint: proxyEndpoint || DEFAULT_MODEL_CONFIG.proxyEndpoint,
      temperature: normalizeModelTemperature(preset.provider, temperature),
      maxOutputTokens: Number.isFinite(maxOutputTokens)
        ? Math.min(Math.max(Math.round(maxOutputTokens), 512), preset.provider === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 12000)
        : preset.provider === "minimax"
          ? MINIMAX_MAX_COMPLETION_TOKENS
          : DEFAULT_MODEL_CONFIG.maxOutputTokens,
      apiKey,
      apiKeys,
    };
  }

  function loadModelConfig() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_CONFIG_KEY) || "null");
      return sanitizeModelConfig(saved || DEFAULT_MODEL_CONFIG);
    } catch (error) {
      return sanitizeModelConfig(DEFAULT_MODEL_CONFIG);
    }
  }

  function saveModelConfig(config) {
    const normalized = sanitizeModelConfig(config);
    window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function callModeLabel(mode) {
    return {
      local: "本地规则生成",
      serverProxy: "后端代理调用",
    }[mode] || mode;
  }

  function maskedApiKey(value) {
    const key = String(value || "");
    if (!key) return "未填写";
    if (key.length <= 10) return "已填写";
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  }

  function renderModelConfigSummary() {
    if (!els.modelConfigSummary.length) return;

    const config = sanitizeModelConfig(aiModelConfig);
    const preset = providerPreset(config.provider);
    const runtimeHint =
      config.callMode === "serverProxy"
        ? `将通过 ${config.proxyEndpoint} 转发到 ${config.baseUrl}${config.endpoint}`
        : "当前仍使用本地规则生成，未发起大模型请求";

    els.modelConfigSummary.forEach((target) => {
      target.innerHTML = `
        <div>
          <span>${escapeHtml(preset.name)}</span>
          <strong>${escapeHtml(config.model)}</strong>
          <small>${escapeHtml(preset.badge)} · ${escapeHtml(callModeLabel(config.callMode))}</small>
          <p>${escapeHtml(runtimeHint)}</p>
        </div>
        <button type="button" data-model-config-open>配置</button>
      `;
    });
  }

  function loadModelHistory() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_HISTORY_KEY) || "[]");
      return Array.isArray(saved) ? saved.slice(0, MAX_MODEL_HISTORY) : [];
    } catch (error) {
      return [];
    }
  }

  function saveModelHistory(records) {
    const normalized = (Array.isArray(records) ? records : []).slice(0, MAX_MODEL_HISTORY);
    window.localStorage.setItem(MODEL_HISTORY_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function addModelHistoryRecord(record) {
    const records = loadModelHistory();
    const nextRecord = {
      ...record,
      id: record?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: record?.at || new Date().toISOString(),
    };
    saveModelHistory([nextRecord, ...records]);
    renderModelHistory();
  }

  function formatHistoryTime(value) {
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch (error) {
      return "--";
    }
  }

  function statusLabel(status, mock) {
    if (status === "success") return mock ? "Mock 成功" : "调用成功";
    if (status === "fallback") return "已回退";
    if (status === "local") return "本地生成";
    return "调用失败";
  }

  function modelHistoryAdvice(message) {
    const source = String(message || "");
    if (!source || /处理建议/.test(source)) return "";

    if (/HTTP\s*401|invalid api key|unauthorized|\b2049\b/i.test(source)) {
      return "处理建议：API Key 无效或账号区域不匹配，请检查当前厂商的 API Key、Base URL 和账号区域。";
    }

    if (/valid homepage JSON|不是首页\s*JSON|JSON/i.test(source) && /AI response|homepage|首页|JSON/i.test(source)) {
      return "处理建议：模型有响应，但没有按首页配置 JSON 返回；已自动回退本地方案。可以重试一次、降低 Temperature，或切到更稳定的结构化输出模型。";
    }

    if (/无法连接本地后端代理|Failed to fetch|NetworkError|fetch/i.test(source)) {
      return "处理建议：请用 npm start 启动本地代理，并从 http://127.0.0.1:5174 打开页面后再生成。";
    }

    return "";
  }

  function stripHistoryEndpoint(message) {
    return String(message || "")
      .replace(/\s*·\s*(?:\/api\/home-ai\/complete|\/api\/home-ai\/test|https?:\/\/\S+)\s*$/i, "")
      .trim();
  }

  function cleanHistorySegment(message) {
    return stripHistoryEndpoint(message).replace(/\s*·\s*$/, "").trim();
  }

  function parseMarkedHistoryMessage(message) {
    const source = stripHistoryEndpoint(message);
    const markerMap = [
      { key: "detail", marker: "模型返回片段：" },
      { key: "advice", marker: "处理建议：" },
    ];
    const markers = markerMap
      .map((item) => ({ ...item, index: source.indexOf(item.marker) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index);

    if (!markers.length) {
      return { summary: compactHistorySummary(source), advice: "", detail: "" };
    }

    const parsed = {
      summary: cleanHistorySegment(source.slice(0, markers[0].index)),
      advice: "",
      detail: "",
    };

    markers.forEach((item, index) => {
      const start = item.index + item.marker.length;
      const end = markers[index + 1]?.index ?? source.length;
      const value = cleanHistorySegment(source.slice(start, end));
      parsed[item.key] = item.key === "advice" && value ? `${item.marker}${value}` : value;
    });

    return parsed;
  }

  function compactHistorySummary(message) {
    return stripHistoryEndpoint(message)
      .replace(/\s*·\s*(模型返回片段：|处理建议：)[\s\S]*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function modelHistoryDisplay(record) {
    const raw = String(record.message || record.prompt || "").trim();
    const parsed = parseMarkedHistoryMessage(raw);
    const advice = parsed.advice || (["fallback", "failed"].includes(record.status) ? modelHistoryAdvice(raw) : "");

    return {
      summary: compactHistorySummary(parsed.summary || raw),
      advice,
      detail: parsed.detail,
    };
  }

  function renderModelHistory() {
    if (!els.modelCallHistory) return;

    const records = loadModelHistory();
    const previewRecords = records.slice(0, MODEL_HISTORY_PREVIEW_LIMIT);
    if (!previewRecords.length) {
      els.modelCallHistory.innerHTML = '<p class="empty-history">暂无调用记录</p>';
      return;
    }

    els.modelCallHistory.innerHTML = previewRecords
      .map((record) => {
        const display = modelHistoryDisplay(record);
        const title = [display.summary, display.advice].filter(Boolean).join(" ");
        return `
          <article class="model-call-item" data-call-status="${escapeHtml(record.status || "unknown")}" tabindex="0" title="${escapeHtml(title)}">
            <div>
              <strong>${escapeHtml(record.provider || "本地规则")} / ${escapeHtml(record.model || "--")}</strong>
              <span>${escapeHtml(statusLabel(record.status, record.mock))} · ${escapeHtml(formatHistoryTime(record.at))}</span>
            </div>
            <small>${escapeHtml(record.durationMs ? `${record.durationMs}ms` : callModeLabel(record.callMode || "local"))}</small>
            <p class="model-call-summary">${escapeHtml(display.summary)}</p>
            ${display.advice ? `<p class="model-call-advice">${escapeHtml(display.advice)}</p>` : ""}
            ${
              display.detail
                ? `<details class="model-call-details"><summary>查看模型返回片段</summary><pre>${escapeHtml(display.detail)}</pre></details>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  }

  function ensureModelConfigModal() {
    let modal = document.querySelector("[data-model-config-modal]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "ai-model-modal";
    modal.dataset.modelConfigModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="ai-model-modal-backdrop" data-model-config-close></div>
      <section class="ai-model-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-model-dialog-title">
        <header>
          <div>
            <span class="section-kicker">LLM SETTINGS</span>
            <h2 id="ai-model-dialog-title">首页 AI 大模型配置</h2>
            <p>这里选择首页生成使用的大模型。前端只提交需求和配置，真实请求由本地后端代理转发，避免页面直接跨域调用模型接口。</p>
          </div>
          <button class="ai-model-close" type="button" data-model-config-close aria-label="关闭">×</button>
        </header>

        <div class="ai-model-provider-grid" data-model-provider-list></div>

        <form class="ai-model-form" data-model-config-form>
          <label>
            <span>模型 ID</span>
            <input data-model-config-field="model" list="ai-model-options" autocomplete="off" />
            <datalist id="ai-model-options" data-model-option-list></datalist>
          </label>
          <label>
            <span>API Base URL</span>
            <input data-model-config-field="baseUrl" autocomplete="off" />
          </label>
          <label>
            <span>接口路径</span>
            <input data-model-config-field="endpoint" autocomplete="off" />
          </label>
          <label>
            <span>调用协议</span>
            <input data-model-config-field="apiMode" autocomplete="off" />
          </label>
          <label>
            <span>调用方式</span>
            <select data-model-config-field="callMode">
              <option value="local">本地规则生成</option>
              <option value="serverProxy">后端代理调用</option>
            </select>
          </label>
          <label>
            <span>后端代理接口</span>
            <input data-model-config-field="proxyEndpoint" autocomplete="off" />
          </label>
          <label>
            <span>API Key</span>
            <input data-model-config-field="apiKey" type="password" autocomplete="off" />
          </label>
          <label>
            <span>Temperature</span>
            <input data-model-config-field="temperature" type="number" min="0" max="2" step="0.1" />
          </label>
          <label>
            <span>最大输出 Tokens</span>
            <input data-model-config-field="maxOutputTokens" type="number" min="512" max="12000" step="256" />
          </label>
        </form>

        <div class="ai-model-config-note" data-model-config-note></div>

        <footer>
          <button type="button" data-model-config-reset>恢复当前厂商预设</button>
          <button type="button" data-model-config-test>测试连通性</button>
          <button class="primary" type="button" data-model-config-save>保存配置</button>
        </footer>
      </section>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll("[data-model-config-close]").forEach((button) => {
      button.addEventListener("click", closeModelConfigModal);
    });

    modal.querySelector("[data-model-config-save]")?.addEventListener("click", () => {
      aiModelConfig = saveModelConfig(readModelConfigForm());
      editingModelConfig = sanitizeModelConfig(aiModelConfig);
      renderModelConfigSummary();
      renderModelHistory();
      closeModelConfigModal();
      showToast(`已选择 ${providerPreset(aiModelConfig.provider).name} / ${aiModelConfig.model}`);
    });

    modal.querySelector("[data-model-config-form]")?.addEventListener("input", () => {
      editingModelConfig = readModelConfigForm();
      modelTestState = { tone: "", message: "配置已修改，保存后用于生成；测试会使用当前表单值" };
      renderModelConfigNote();
    });

    modal.querySelector("[data-model-config-form]")?.addEventListener("change", () => {
      editingModelConfig = readModelConfigForm();
      modelTestState = { tone: "", message: "配置已修改，保存后用于生成；测试会使用当前表单值" };
      renderModelConfigNote();
    });

    modal.querySelector("[data-model-config-test]")?.addEventListener("click", testModelConnection);

    modal.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    modal.querySelector("[data-model-config-reset]")?.addEventListener("click", () => {
      const current = readModelConfigForm();
      const preset = providerPreset(current.provider);
      editingModelConfig = sanitizeModelConfig({
        ...preset,
        callMode: current.callMode,
        proxyEndpoint: current.proxyEndpoint,
        apiKey: current.apiKey,
        apiKeys: current.apiKeys,
        temperature: DEFAULT_MODEL_CONFIG.temperature,
        maxOutputTokens: DEFAULT_MODEL_CONFIG.maxOutputTokens,
      });
      modelTestState = { tone: "", message: "已恢复预设，保存后生效" };
      renderModelConfigModal();
    });

    return modal;
  }

  function readModelConfigForm() {
    const modal = ensureModelConfigModal();
    const fieldValue = (name) => modal.querySelector(`[data-model-config-field="${name}"]`)?.value || "";
    return sanitizeModelConfig({
      ...(editingModelConfig || aiModelConfig),
      model: fieldValue("model"),
      baseUrl: fieldValue("baseUrl"),
      endpoint: fieldValue("endpoint"),
      apiMode: fieldValue("apiMode"),
      callMode: fieldValue("callMode"),
      proxyEndpoint: fieldValue("proxyEndpoint"),
      apiKey: fieldValue("apiKey"),
      temperature: fieldValue("temperature"),
      maxOutputTokens: fieldValue("maxOutputTokens"),
    });
  }

  function renderModelConfigNote() {
    const modal = document.querySelector("[data-model-config-modal]");
    if (!modal) return;

    const config = sanitizeModelConfig(editingModelConfig || aiModelConfig);
    const preset = providerPreset(config.provider);
    const note = modal.querySelector("[data-model-config-note]");
    if (!note) return;

    note.innerHTML = `
      <b>${escapeHtml(preset.name)} · ${escapeHtml(config.model)}</b>
      <p>${escapeHtml(preset.note)}</p>
      <dl>
        <div><dt>密钥状态</dt><dd>${escapeHtml(maskedApiKey(config.apiKey))}</dd></div>
        <div><dt>运行状态</dt><dd>${escapeHtml(callModeLabel(config.callMode))}</dd></div>
        <div><dt>调用地址</dt><dd>${escapeHtml(`${config.baseUrl}${config.endpoint}`)}</dd></div>
        <div><dt>测试状态</dt><dd data-model-test-status data-tone="${escapeHtml(modelTestState.tone || "")}">${escapeHtml(modelTestState.message || "尚未测试")}</dd></div>
      </dl>
      <small>保存后配置会保留在当前浏览器；测试连通性会用当前表单值做一次后端握手，不需要先生成首页。</small>
    `;
  }

  function renderModelConfigModal() {
    const modal = ensureModelConfigModal();
    const config = sanitizeModelConfig(editingModelConfig || aiModelConfig);
    const preset = providerPreset(config.provider);
    const providerList = modal.querySelector("[data-model-provider-list]");
    const optionList = modal.querySelector("[data-model-option-list]");
    const setField = (name, value) => {
      const field = modal.querySelector(`[data-model-config-field="${name}"]`);
      if (field) field.value = value;
    };

    providerList.innerHTML = Object.values(AI_MODEL_PRESETS)
      .map(
        (item) => `
          <button class="${item.provider === config.provider ? "active" : ""}" type="button" data-model-provider="${item.provider}">
            <span>${escapeHtml(item.name)}</span>
            <strong>${escapeHtml(item.model)}</strong>
            <small>${escapeHtml(item.badge)}</small>
          </button>
        `,
      )
      .join("");

    providerList.querySelectorAll("[data-model-provider]").forEach((button) => {
      button.addEventListener("click", () => {
        const current = readModelConfigForm();
        const nextPreset = providerPreset(button.dataset.modelProvider);
        editingModelConfig = sanitizeModelConfig({
          ...nextPreset,
          callMode: current.callMode,
          proxyEndpoint: current.proxyEndpoint,
          apiKey: current.provider === nextPreset.provider ? current.apiKey : current.apiKeys?.[nextPreset.provider] || "",
          apiKeys: current.apiKeys,
          temperature: current.temperature,
          maxOutputTokens: current.maxOutputTokens,
        });
        modelTestState = { tone: "", message: "已切换厂商，保存后生效" };
        renderModelConfigModal();
      });
    });

    optionList.innerHTML = preset.models.map((model) => `<option value="${escapeHtml(model)}"></option>`).join("");
    const temperatureField = modal.querySelector('[data-model-config-field="temperature"]');
    if (temperatureField) {
      temperatureField.min = config.provider === "minimax" ? "0.01" : "0";
      temperatureField.max = config.provider === "minimax" ? "1" : "2";
      temperatureField.step = config.provider === "minimax" ? "0.01" : "0.1";
    }
    const maxTokensField = modal.querySelector('[data-model-config-field="maxOutputTokens"]');
    if (maxTokensField) {
      maxTokensField.max = config.provider === "minimax" ? String(MINIMAX_MAX_COMPLETION_TOKENS) : "12000";
      maxTokensField.step = config.provider === "minimax" ? "128" : "256";
    }
    setField("model", config.model);
    setField("baseUrl", config.baseUrl);
    setField("endpoint", config.endpoint);
    setField("apiMode", config.apiMode);
    setField("callMode", config.callMode);
    setField("proxyEndpoint", config.proxyEndpoint);
    setField("apiKey", config.apiKey);
    setField("temperature", String(config.temperature));
    setField("maxOutputTokens", String(config.maxOutputTokens));

    renderModelConfigNote();
  }

  function testSuccessMessage(payload) {
    const label = [payload.providerName || providerPreset(payload.provider).name, payload.model].filter(Boolean).join(" / ");
    const latency = payload.durationMs ? `${payload.durationMs}ms` : "已响应";
    const url = payload.url || `${payload.baseUrl || ""}${payload.endpoint || ""}`;
    return `连通成功 · ${label} · ${latency} · ${url}`;
  }

  async function testModelConnection() {
    const modal = ensureModelConfigModal();
    const button = modal.querySelector("[data-model-config-test]");
    const config = readModelConfigForm();
    editingModelConfig = config;
    modelTestState = { tone: "loading", message: "正在测试连通性..." };
    renderModelConfigNote();
    if (button) button.disabled = true;

    try {
      const payload = await requestAiProxy(config, "test", { modelConfig: aiRequestModelConfigFrom(config) });

      modelTestState = { tone: "success", message: testSuccessMessage(payload) };
      addModelHistoryRecord({
        id: payload.callRecord?.id,
        action: "connectivity-test",
        serverCallId: payload.callRecord?.id,
        providerId: config.provider,
        provider: payload.providerName || providerPreset(config.provider).name,
        model: payload.model || config.model,
        callMode: config.callMode,
        apiMode: config.apiMode,
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        proxyEndpoint: config.proxyEndpoint,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        status: "success",
        durationMs: payload.durationMs,
        prompt: "连通性测试",
        message: payload.message || payload.url || "连通成功",
      });
      showToast("大模型连通性测试成功");
    } catch (error) {
      const message = errorMessage(error, 320);
      modelTestState = { tone: "error", message };
      addModelHistoryRecord({
        action: "connectivity-test",
        serverCallId: error.proxyPayload?.callRecord?.id,
        providerId: config.provider,
        provider: providerPreset(config.provider).name,
        model: config.model,
        callMode: config.callMode,
        apiMode: config.apiMode,
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        proxyEndpoint: config.proxyEndpoint,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        status: "failed",
        prompt: "连通性测试",
        message,
      });
      showToast("大模型连通性测试失败");
    } finally {
      if (button) button.disabled = false;
      renderModelConfigNote();
    }
  }

  function openModelConfigModal() {
    editingModelConfig = sanitizeModelConfig(aiModelConfig);
    modelTestState = { tone: "", message: "尚未测试" };
    const modal = ensureModelConfigModal();
    renderModelConfigModal();
    modal.hidden = false;
    window.setTimeout(() => modal.querySelector("[data-model-config-field=\"model\"]")?.focus(), 0);
  }

  function closeModelConfigModal() {
    const modal = document.querySelector("[data-model-config-modal]");
    if (modal) modal.hidden = true;
    editingModelConfig = null;
  }

  function initModelConfig() {
    renderModelConfigSummary();

    document.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-model-config-open]");
      if (!openButton) return;
      event.preventDefault();
      openModelConfigModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModelConfigModal();
    });
  }

  function setAiBusy(isBusy, label = "生成预览") {
    const buttons = [els.generate, els.regenerateIntelligence, els.regenerate].filter(Boolean);
    buttons.forEach((button) => {
      button.disabled = Boolean(isBusy);
      button.classList.toggle("is-loading", Boolean(isBusy));
    });

    if (els.generate) {
      if (els.generate.classList.contains("ai-send-button")) {
        els.generate.setAttribute("aria-label", isBusy ? label : "生成预览");
        els.generate.title = isBusy ? label : "生成预览";
        return;
      }

      if (!els.generate.dataset.defaultLabel) els.generate.dataset.defaultLabel = els.generate.textContent.trim();
      els.generate.textContent = isBusy ? label : els.generate.dataset.defaultLabel;
    }
  }

  function aiRequestModelConfigFrom(value) {
    const config = sanitizeModelConfig(value);
    return {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
      apiMode: config.apiMode,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      apiKey: config.apiKey,
    };
  }

  function aiRequestModelConfig() {
    return aiRequestModelConfigFrom(aiModelConfig);
  }

  function aiRequestContext() {
    return {
      currentConfig: home.normalizeConfig(currentConfig),
      defaultConfig: home.DEFAULT_CONFIG,
      features: home.FEATURES,
      moduleStyleOptions: home.MODULE_STYLE_OPTIONS,
      moduleVariantOptions: home.MODULE_VARIANT_OPTIONS,
      schema: home.HOMEPAGE_CONFIG_JSON_SCHEMA,
    };
  }

  function aiGenerationLabel(config) {
    const provider = providerPreset(config.provider);
    return `${provider.name} / ${config.model}`;
  }

  function errorMessage(error, limit = 320) {
    return String(error?.message || error || "大模型调用失败").slice(0, limit);
  }

  function modelProxyAdvice(message, details = {}) {
    const source = `${message || ""} ${details.providerStatus || ""} ${details.providerCode || ""}`;

    if (Number(details.providerStatus) === 401 || /HTTP\s*401|invalid api key|unauthorized|\b2049\b/i.test(source)) {
      if (details.provider === "deepseek" || /DeepSeek/i.test(`${details.providerName || ""} ${details.model || ""}`)) {
        return "处理建议：DeepSeek API Key 无效或未配置，请在模型配置里填写 DEEPSEEK_API_KEY 对应密钥；Base URL 使用 https://api.deepseek.com。";
      }
      if (details.provider === "minimax" || /MiniMax/i.test(`${details.providerName || ""} ${details.model || ""}`)) {
        return `处理建议：API Key 无效或账号区域不匹配，请在模型配置里重新填写 MiniMax API Key；CN 账号使用 ${MINIMAX_CN_BASE_URL}，国际账号使用 ${MINIMAX_GLOBAL_BASE_URL}。`;
      }
      return `处理建议：API Key 无效或账号区域不匹配，请在模型配置里重新填写 MiniMax API Key；CN 账号使用 ${MINIMAX_CN_BASE_URL}，国际账号使用 ${MINIMAX_GLOBAL_BASE_URL}。`;
    }

    if (/valid homepage JSON|AI response did not contain valid homepage JSON/i.test(source)) {
      return "处理建议：模型有响应，但没有按首页配置 JSON 返回；已自动回退本地方案。可以重试一次、降低 Temperature，或切到更稳定的结构化输出模型。";
    }

    return "";
  }

  function proxyErrorMessage(payload, response) {
    const details = payload?.details || {};
    const attempts = Array.isArray(details.attempts) ? details.attempts : [];
    const triedBaseUrls = [...new Set(attempts.map((item) => item.baseUrl).filter(Boolean))];
    const parts = [payload?.error || `大模型代理返回 ${response.status}`];

    if (details.providerStatus) parts.push(`HTTP ${details.providerStatus}`);
    if (details.providerCode) parts.push(`code ${details.providerCode}`);
    if (details.providerName || details.model) {
      parts.push([details.providerName || details.provider, details.model].filter(Boolean).join(" / "));
    }
    if (triedBaseUrls.length > 1) parts.push(`已尝试 ${triedBaseUrls.join(" -> ")}`);
    if (details.rawTextSnippet) parts.push(`模型返回片段：${String(details.rawTextSnippet).slice(0, 240)}`);

    const message = parts.filter(Boolean).join(" · ");
    return [message, modelProxyAdvice(message, details)].filter(Boolean).join(" · ");
  }

  function proxyEndpointForAction(proxyEndpoint, action) {
    const fallback = action === "test" ? "/api/home-ai/test" : DEFAULT_MODEL_CONFIG.proxyEndpoint;
    const value = String(proxyEndpoint || DEFAULT_MODEL_CONFIG.proxyEndpoint).trim() || DEFAULT_MODEL_CONFIG.proxyEndpoint;
    if (action !== "test") return value;

    if (/^https?:\/\//i.test(value)) {
      try {
        const target = new URL(value);
        target.pathname = target.pathname.replace(/\/complete\/?$/i, "/test");
        if (!/\/test\/?$/i.test(target.pathname)) target.pathname = "/api/home-ai/test";
        return target.toString();
      } catch (error) {
        return fallback;
      }
    }

    const next = value.replace(/\/complete\/?$/i, "/test");
    return next === value ? fallback : next;
  }

  function proxyEndpointPath(endpoint, action) {
    const fallback = action === "test" ? "/api/home-ai/test" : "/api/home-ai/complete";
    try {
      return new URL(endpoint, "http://127.0.0.1").pathname || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function proxyEndpointCandidates(config, action) {
    const primary = proxyEndpointForAction(config.proxyEndpoint, action);
    const path = proxyEndpointPath(primary, action);
    const candidates = [primary];
    const currentHost = window.location.hostname || "127.0.0.1";
    const localHosts = [...new Set([currentHost, "127.0.0.1", "localhost"])];

    if (!/^https?:\/\//i.test(primary)) {
      ["5174", "5184"].forEach((port) => {
        localHosts.forEach((host) => candidates.push(`http://${host}:${port}${path}`));
      });
    }

    return [...new Set(candidates)];
  }

  function fetchFailureMessage(error, endpoints) {
    const base = String(error?.message || error || "Failed to fetch");
    return `无法连接本地后端代理：${base}。请确认是用 npm start 启动并从 http://127.0.0.1:5174 打开页面。已尝试 ${endpoints.join(" -> ")}`;
  }

  async function requestAiProxy(config, action, payload) {
    const endpoints = proxyEndpointCandidates(config, action);
    let lastMessage = "";

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => null);

        if (response.ok && data?.ok !== false) return data;

        const message = proxyErrorMessage(data, response);
        lastMessage = `${message} · ${endpoint}`;
        if (![404, 405, 501].includes(response.status)) {
          const fatal = new Error(lastMessage);
          fatal.fatalProxyResponse = true;
          fatal.proxyPayload = data;
          throw fatal;
        }
      } catch (error) {
        if (error?.fatalProxyResponse) throw error;
        lastMessage = error instanceof TypeError ? fetchFailureMessage(error, endpoints) : String(error?.message || error);
        continue;
      }
    }

    throw new Error(lastMessage || fetchFailureMessage("Failed to fetch", endpoints));
  }

  async function generateConfigFromModel(prompt, options = {}) {
    const config = sanitizeModelConfig(aiModelConfig);
    if (config.callMode !== "serverProxy") {
      return {
        config: home.promptToConfig(prompt, options.variant || 0),
        usedModel: false,
        label: "本地规则",
      };
    }

    const payload = await requestAiProxy(config, "complete", {
        prompt,
        variant: options.variant || 0,
        modelConfig: aiRequestModelConfig(),
        context: aiRequestContext(),
      });

    const aiConfig = {
      ...(payload.config || {}),
      aiSummary:
        payload.config?.aiSummary ||
        `已通过 ${aiGenerationLabel(config)} 生成首页蓝图，并完成前端安全标准化。`,
    };

    return {
      config: home.optimizeConfig(aiConfig, { prompt }),
      usedModel: true,
      label: aiGenerationLabel(config),
      mock: Boolean(payload.mock),
      callRecord: payload.callRecord || null,
    };
  }

  async function generateConfigWithFallback(prompt, options = {}) {
    const startedAt = Date.now();
    const requestConfig = sanitizeModelConfig(aiModelConfig);
    const provider = providerPreset(requestConfig.provider);

    try {
      const result = await generateConfigFromModel(prompt, options);
      addModelHistoryRecord({
        id: result.callRecord?.id,
        action: "homepage-generate",
        serverCallId: result.callRecord?.id,
        providerId: requestConfig.provider,
        provider: result.usedModel ? provider.name : "本地规则",
        model: result.usedModel ? requestConfig.model : "promptToConfig",
        callMode: requestConfig.callMode,
        apiMode: requestConfig.apiMode,
        baseUrl: requestConfig.baseUrl,
        endpoint: requestConfig.endpoint,
        proxyEndpoint: requestConfig.proxyEndpoint,
        temperature: requestConfig.temperature,
        maxOutputTokens: requestConfig.maxOutputTokens,
        variant: options.variant || 0,
        status: result.usedModel ? "success" : "local",
        mock: Boolean(result.mock),
        durationMs: Date.now() - startedAt,
        prompt: String(prompt || "").slice(0, 1200),
        message: result.config?.name || result.label,
      });

      if (result.usedModel) {
        showToast(result.mock ? "已通过代理 mock 生成首页方案" : `已通过 ${result.label} 生成首页方案`);
      }
      return result.config;
    } catch (error) {
      const fallback = home.promptToConfig(prompt, options.variant || 0);
      fallback.aiSummary = `大模型调用失败，已使用本地安全方案回退：${errorMessage(error, 220)}`;
      addModelHistoryRecord({
        action: "homepage-generate",
        serverCallId: error.proxyPayload?.callRecord?.id,
        providerId: requestConfig.provider,
        provider: provider.name,
        model: requestConfig.model,
        callMode: requestConfig.callMode,
        apiMode: requestConfig.apiMode,
        baseUrl: requestConfig.baseUrl,
        endpoint: requestConfig.endpoint,
        proxyEndpoint: requestConfig.proxyEndpoint,
        temperature: requestConfig.temperature,
        maxOutputTokens: requestConfig.maxOutputTokens,
        variant: options.variant || 0,
        status: "fallback",
        durationMs: Date.now() - startedAt,
        prompt: String(prompt || "").slice(0, 1200),
        message: errorMessage(error, 700),
      });
      showToast(`大模型调用失败，已回退本地方案`);
      return fallback;
    }
  }

  function buildSchemeOptions() {
    schemeOptions = home.generateSchemeOptions(promptValue(), 4);
    activeSchemeIndex = 0;
    selectedSuggestion = schemeOptions[0] || null;
    renderSchemeOptions();
  }

  function renderSchemeOptions() {
    if (!els.schemeOptions) return;

    els.schemeOptions.innerHTML = schemeOptions
      .map((config, index) => {
        const normalized = home.normalizeConfig(config);
        return `
          <button class="scheme-card intake-scheme-card${index === activeSchemeIndex ? " active" : ""}" type="button" data-scheme-index="${index}">
            <span>建议 ${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(normalized.name)}</strong>
            <small>${escapeHtml(normalized.aiSummary)}</small>
            <i>${escapeHtml(home.themeLabel(normalized.themePreset || normalized.theme))} · ${escapeHtml(home.layoutLabel(normalized.layoutPreset))}</i>
          </button>
        `;
      })
      .join("");

    els.schemeOptions.querySelectorAll("[data-scheme-index]").forEach((button) => {
      button.addEventListener("click", () => {
        activeSchemeIndex = Number(button.dataset.schemeIndex || 0);
        const config = home.normalizeConfig(schemeOptions[activeSchemeIndex]);
        selectedSuggestion = config;
        if (els.prompt) els.prompt.value = config.aiSummary;
        savePrompt();
        renderSchemeOptions();
        updateStatus(`已选择：${config.name}`, false);
      });
    });
  }

  function generatePreview(config) {
    const normalized = home.saveDraft(config);
    savePrompt();
    currentConfig = normalized;
    window.location.href = "./home-layout-preview.html";
  }

  function renderModuleOutline() {
    if (!els.moduleOutline) return;

    const config = home.normalizeConfig(currentConfig);
    const slotLabels = { hero: "12 栅格", main: "主内容 8 栅格", rail: "右侧信息 4 栅格" };

    els.moduleOutline.innerHTML = config.layout
      .map((block, index) => {
        return `
          <article class="module-outline-item">
            <b>${String(index + 1).padStart(2, "0")}</b>
            <div>
              <strong>${escapeHtml(home.featureLabel(block.component))}</strong>
              <small>${escapeHtml(slotLabels[block.slot] || block.slot)}</small>
              <p><span>${escapeHtml(block.component)}</span>${block.module?.variant ? `<span>${escapeHtml(block.module.variant)}</span>` : ""}</p>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderPagePresetControls() {
    if (!els.pagePresetControls) return;

    const config = home.normalizeConfig(currentConfig);
    const presets = [
      { id: "classic", label: "标准工作台", prompt: "标准工作台首页，资产模块、快捷入口、广告、交易账号、邀请链接按常规顺序展示，视觉强度中等。" },
      { id: "asset", label: "资产优先", prompt: "资产优先首页，首屏突出总资产、钱包余额、入金出金和账户安全感，整体专业清晰。" },
      { id: "vip", label: "高净值黑金", prompt: "高净值 VIP 黑金风格，首屏突出资产、入金和广告轮播图，交易账号列表放下方，整体更大气。" },
      { id: "growth", label: "活动增长", prompt: "活动增长首页，突出交易大赛、奖池、入金转化和快速操作，把广告轮播做成首屏。" },
      { id: "trader", label: "专业交易", prompt: "专业交易客户首页，突出交易账号、持仓订单、MT5 和账户状态，信息密度更高。" },
      { id: "newbie", label: "新客开户", prompt: "新客户开户引导，突出开户进度、KYC、首次入金和开真实账号、开模拟账号、绑定账号。" },
    ];

    const activeLabel = {
      standardDashboard: "classic",
      assetFirst: "asset",
      vipService: "vip",
      conversionFirst: config.heroFocus === "risk_notice" ? "newbie" : "growth",
      tradingPro: "trader",
    }[config.layoutPreset];

    els.pagePresetControls.innerHTML = presets
      .map(
        (preset) => `
          <button class="${preset.id === activeLabel ? "active" : ""}" type="button" data-page-preset="${preset.id}" data-preset-prompt="${escapeHtml(preset.prompt)}">
            ${escapeHtml(preset.label)}
          </button>
        `,
      )
      .join("");

    els.pagePresetControls.querySelectorAll("[data-page-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextConfig = home.promptToConfig(button.dataset.presetPrompt || "");
        setConfig(nextConfig, `已切换：${button.textContent.trim()}`, { saveDraft: true });
      });
    });
  }

  function renderModuleStyleControls() {
    if (!els.moduleStyleControls) return;

    const config = home.normalizeConfig(currentConfig);
    const modules = visibleModules(config);

    els.moduleStyleControls.innerHTML = modules
      .map((moduleId) => {
        const options = home.MODULE_VARIANT_OPTIONS[moduleId] || [];
        const activeVariant = config.modules?.[moduleId]?.variant || options[0]?.id || "";
        const choices = options
          .map((option) => {
            const active = activeVariant === option.id;
            return `
              <button class="${active ? "active" : ""}" type="button" data-variant-module="${moduleId}" data-variant-id="${option.id}">
                <strong>${escapeHtml(option.label)}</strong>
                <small>${escapeHtml(option.description)}</small>
              </button>
            `;
          })
          .join("");

        return `
          <article class="module-style-card">
            <header>
              <span>${escapeHtml(home.PROTOCOL_MODULES?.[moduleId]?.label || moduleId)}</span>
              <b>${escapeHtml(options.find((option) => option.id === activeVariant)?.label || "")}</b>
            </header>
            <div>${choices}</div>
          </article>
        `;
      })
      .join("");

    els.moduleStyleControls.querySelectorAll("[data-variant-module]").forEach((button) => {
      button.addEventListener("click", () => {
        const moduleId = button.dataset.variantModule;
        const variantId = button.dataset.variantId;
        setConfig(
          {
            ...currentConfig,
            modules: {
              ...currentConfig.modules,
              [moduleId]: { variant: variantId },
            },
          },
          "模块变体已更新",
          { saveDraft: true },
        );
        showToast("模块变体已更新");
      });
    });
  }

  function renderSegmentButtons(group, value, options) {
    return `
      <div class="setting-segment" role="group" aria-label="${escapeHtml(group)}">
        ${options
          .map(
            (option) => `
              <button class="${option.value === value ? "active" : ""}" type="button" data-setting-group="${escapeHtml(group)}" data-setting-value="${escapeHtml(option.value)}">
                ${escapeHtml(option.label)}
              </button>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderToggleButton(group, value, enabledLabel = "开启", disabledLabel = "关闭") {
    return renderSegmentButtons(group, value ? "true" : "false", [
      { value: "true", label: enabledLabel },
      { value: "false", label: disabledLabel },
    ]);
  }

  function settingRow(label, controlHtml) {
    return `
      <div class="module-setting-row">
        <span>${escapeHtml(label)}</span>
        ${controlHtml}
      </div>
    `;
  }

  function updateModuleSetting(path, value) {
    const nextSettings = JSON.parse(JSON.stringify(currentConfig.moduleSettings));
    const parts = path.split(".");
    let target = nextSettings;

    parts.slice(0, -1).forEach((part) => {
      target[part] = target[part] && typeof target[part] === "object" ? target[part] : {};
      target = target[part];
    });

    const key = parts[parts.length - 1];
    if (value === "true") target[key] = true;
    else if (value === "false") target[key] = false;
    else if (/^\d+$/.test(value)) target[key] = Number(value);
    else target[key] = value;

    setConfig(
      {
        ...currentConfig,
        moduleSettings: nextSettings,
      },
      "模块配置已更新",
      { saveDraft: true },
    );
    showToast("模块配置已更新");
  }

  function renderModuleSettingControls() {
    if (!els.moduleSettingControls) return;

    const config = home.normalizeConfig(currentConfig);
    const settings = config.moduleSettings;
    const countOptions = [3, 4, 5, 6, 7, 8].map((count) => ({ value: String(count), label: String(count) }));

    els.moduleSettingControls.innerHTML = `
      <article class="module-setting-card">
        <header><span>广告轮播图</span><b>${settings.adCarousel.enabled ? "已开启" : "已关闭"}</b></header>
        ${settingRow("模块状态", renderToggleButton("adCarousel.enabled", settings.adCarousel.enabled))}
      </article>

      <article class="module-setting-card">
        <header><span>快捷入口</span><b>${settings.quickActions.count} 个</b></header>
        ${settingRow("模块状态", renderToggleButton("quickActions.enabled", settings.quickActions.enabled))}
        ${settingRow("入口数量", renderSegmentButtons("quickActions.count", String(settings.quickActions.count), countOptions))}
        ${settingRow(
          "展示方式",
          renderSegmentButtons("quickActions.display", settings.quickActions.display, [
            { value: "iconText", label: "icon+文案" },
            { value: "iconOnly", label: "仅 icon" },
            { value: "hoverText", label: "hover 文案" },
          ]),
        )}
      </article>

      <article class="module-setting-card">
        <header><span>钱包模块</span><b>${settings.wallet.placement === "standalone" ? "独立展示" : "聚合到资产"}</b></header>
        ${settingRow("模块状态", renderToggleButton("wallet.enabled", settings.wallet.enabled))}
        ${settingRow(
          "展示位置",
          renderSegmentButtons("wallet.placement", settings.wallet.placement, [
            { value: "mergedWithAssets", label: "聚合" },
            { value: "standalone", label: "独立" },
          ]),
        )}
        ${settingRow("资金按钮", renderToggleButton("wallet.showFundActions", settings.wallet.showFundActions, "展示", "不展示"))}
      </article>

      <article class="module-setting-card">
        <header><span>资产模块</span><b>${settings.assets.showFundActions ? "带资金按钮" : "纯资产展示"}</b></header>
        ${settingRow("模块状态", renderToggleButton("assets.enabled", settings.assets.enabled))}
        ${settingRow("资金按钮", renderToggleButton("assets.showFundActions", settings.assets.showFundActions, "展示", "不展示"))}
      </article>

      <article class="module-setting-card">
        <header><span>邀请链接</span><b>信息显隐</b></header>
        ${settingRow("模块状态", renderToggleButton("referral.enabled", settings.referral.enabled))}
        ${settingRow("打开数", renderToggleButton("referral.showClicks", settings.referral.showClicks, "显示", "隐藏"))}
        ${settingRow("邀请注册数", renderToggleButton("referral.showRegistrations", settings.referral.showRegistrations, "显示", "隐藏"))}
        ${settingRow("交易账号数", renderToggleButton("referral.showTradingAccounts", settings.referral.showTradingAccounts, "显示", "隐藏"))}
        ${settingRow("推广链接", renderToggleButton("referral.showPromoLink", settings.referral.showPromoLink, "显示", "隐藏"))}
        ${settingRow("邀请码", renderToggleButton("referral.showInviteCode", settings.referral.showInviteCode, "显示", "隐藏"))}
        ${settingRow("二维码", renderToggleButton("referral.showQrCode", settings.referral.showQrCode, "显示", "隐藏"))}
      </article>

      <article class="module-setting-card">
        <header><span>交易账号</span><b>${settings.tradingAccounts.grouping === "separated" ? "真实/模拟分开" : "合并展示"}</b></header>
        ${settingRow("模块状态", renderToggleButton("tradingAccounts.enabled", settings.tradingAccounts.enabled))}
        ${settingRow("真实账号", renderToggleButton("tradingAccounts.realEnabled", settings.tradingAccounts.realEnabled, "显示", "隐藏"))}
        ${settingRow("模拟账号", renderToggleButton("tradingAccounts.demoEnabled", settings.tradingAccounts.demoEnabled, "显示", "隐藏"))}
        ${settingRow(
          "组合方式",
          renderSegmentButtons("tradingAccounts.grouping", settings.tradingAccounts.grouping, [
            { value: "combined", label: "合并" },
            { value: "separated", label: "分开" },
          ]),
        )}
        ${settingRow(
          "展示方式",
          renderSegmentButtons("tradingAccounts.viewMode", settings.tradingAccounts.viewMode, [
            { value: "switchable", label: "可切换" },
            { value: "card", label: "固定卡片" },
            { value: "list", label: "固定列表" },
          ]),
        )}
      </article>

      <article class="module-setting-card">
        <header><span>开户</span><b>${settings.openAccount.placement === "insideTradingAccounts" ? "结合交易账号" : "独立模块"}</b></header>
        ${settingRow("模块状态", renderToggleButton("openAccount.enabled", settings.openAccount.enabled))}
        ${settingRow("开真实账号", renderToggleButton("openAccount.real", settings.openAccount.real, "显示", "隐藏"))}
        ${settingRow("开模拟账号", renderToggleButton("openAccount.demo", settings.openAccount.demo, "显示", "隐藏"))}
        ${settingRow("绑定账号", renderToggleButton("openAccount.bind", settings.openAccount.bind, "显示", "隐藏"))}
        ${settingRow(
          "展示位置",
          renderSegmentButtons("openAccount.placement", settings.openAccount.placement, [
            { value: "insideTradingAccounts", label: "结合账号" },
            { value: "standalone", label: "独立" },
          ]),
        )}
      </article>
    `;

    els.moduleSettingControls.querySelectorAll("[data-setting-group]").forEach((button) => {
      button.addEventListener("click", () => {
        updateModuleSetting(button.dataset.settingGroup, button.dataset.settingValue);
      });
    });
  }

  document.querySelectorAll("[data-suggestion-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      if (els.prompt) els.prompt.value = button.dataset.suggestionPrompt || "";
      interpretationRound = 0;
      selectedSuggestion = null;
      savePrompt();
      setConfig(home.promptToConfig(promptValue(), interpretationRound), "已套用建议");
      els.prompt?.focus();
    });
  });

  els.generate?.addEventListener("click", async () => {
    savePrompt();
    setAiBusy(true, "正在生成...");
    try {
      const config = await generateConfigWithFallback(promptValue(), { variant: interpretationRound });
      generatePreview(config);
    } finally {
      setAiBusy(false);
    }
  });

  els.random?.addEventListener("click", () => {
    generatePreview(home.randomConfig(promptValue()));
  });

  els.regenerateIntelligence?.addEventListener("click", async () => {
    interpretationRound += 1;
    selectedSuggestion = null;
    savePrompt();
    setAiBusy(true, "正在解读...");
    try {
      const config = await generateConfigWithFallback(promptValue(), { variant: interpretationRound });
      setConfig(config, "已重新解读文案", { saveDraft: Boolean(els.previewPage) });
      showToast("已重新解读文案");
    } finally {
      setAiBusy(false);
    }
  });

  els.regenerate?.addEventListener("click", async () => {
    interpretationRound += 1;
    setAiBusy(true, "正在生成...");
    try {
      const prompt = window.localStorage.getItem(PROMPT_KEY) || "";
      const config = await generateConfigWithFallback(prompt, { variant: interpretationRound });
      setConfig(config, "已重新生成草稿", { saveDraft: true });
      showToast("已重新生成首页方案");
    } finally {
      setAiBusy(false);
    }
  });

  els.publish?.addEventListener("click", () => {
    currentConfig = home.saveConfig(currentConfig);
    home.saveDraft(currentConfig);
    renderSummary();
    renderIntelligenceSummary();
    renderDecisionReasons();
    renderVariantSummary();
    renderModuleOutline();
    renderPagePresetControls();
    renderModuleStyleControls();
    renderModuleSettingControls();
    applyPreview(true);
    updateStatus("已发布到首页", true);
    showToast("首页配置已发布");
  });

  els.reset?.addEventListener("click", () => {
    currentConfig = home.resetConfig();
    home.clearDraft();
    renderSummary();
    renderIntelligenceSummary();
    renderDecisionReasons();
    renderVariantSummary();
    renderModuleOutline();
    renderPagePresetControls();
    renderModuleStyleControls();
    renderModuleSettingControls();
    applyPreview(true);
    updateStatus("已恢复默认", true);
    showToast("已恢复默认首页");
  });

  els.prompt?.addEventListener("input", () => {
    interpretationRound = 0;
    selectedSuggestion = null;
    savePrompt();
    window.clearTimeout(renderIntelligenceSummary.timer);
    renderIntelligenceSummary.timer = window.setTimeout(() => {
      setConfig(home.promptToConfig(promptValue(), interpretationRound), "已完成文案解读");
    }, 260);
  });

  els.preview?.addEventListener("load", () => applyPreview(false));

  initModelConfig();
  renderModelHistory();
  restorePrompt();

  if (els.intakePage) {
    setConfig(home.promptToConfig(promptValue(), interpretationRound), "已完成文案解读");
  }

  if (els.previewPage) {
    initPreviewSizing();
    renderSummary();
    renderIntelligenceSummary();
    renderDecisionReasons();
    renderVariantSummary();
    renderModuleOutline();
    renderPagePresetControls();
    renderModuleStyleControls();
    renderModuleSettingControls();
    updateStatus("草稿预览", false);
  }
})();

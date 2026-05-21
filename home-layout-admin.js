(function () {
  const home = window.HomePersonalization;

  if (!home) return;

  const PROMPT_KEY = "forexcrm.home.personalization.prompt";
  const ACTIVE_GENERATION_JOB_KEY = "forexcrm.home.ai.activeGenerationJob";
  const PREVIEW_SIZE_KEY = "forexcrm.home.preview.size";
  const PREVIEW_COLOR_MODE_KEY = "forexcrm.home.preview.colorMode";
  const RENDER_MODE_KEY = "forexcrm.home.ai.render.mode";
  const modelSettings = window.ForexCRMModelSettings;
  const MODEL_CONFIG_KEY = modelSettings?.STORAGE_KEY || "forexcrm.ai.model.config";
  const MODEL_HISTORY_KEY = "forexcrm.home.ai.call.history";
  const SUGGESTION_HISTORY_KEY = "forexcrm.home.ai.suggestion.history";
  const MAX_MODEL_HISTORY = 120;
  const MODEL_HISTORY_PREVIEW_LIMIT = 5;
  const BACKGROUND_JOB_POLL_MS = 1100;
  const BACKGROUND_JOB_MAX_WAIT_MS = 20 * 60 * 1000;
  const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
  const MINIMAX_CN_TYPED_ALIAS_BASE_URL = "https://api.minimaxi.cn/v1";
  const MINIMAX_GLOBAL_BASE_URL = "https://api.minimax.io/v1";
  const MINIMAX_MAX_COMPLETION_TOKENS = 2048;
  const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1";
  const KIMI_GLOBAL_BASE_URL = "https://api.moonshot.ai/v1";
  const KIMI_BASE_URL = KIMI_CN_BASE_URL;
  const KIMI_DEFAULT_MODEL = "kimi-k2.6";
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
  const GEMINI_MODEL_ALIASES = {
    "gemini 3 flash": "gemini-3-flash-preview",
    "gemini 3 pro preview": "gemini-3.1-pro-preview",
    "gemini 3 pro preview customtools": "gemini-3.1-pro-preview-customtools",
    "gemini 3 pro preview custom tools": "gemini-3.1-pro-preview-customtools",
    "gemini 3 1 pro preview custom tools": "gemini-3.1-pro-preview-customtools",
  };
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
  const RENDER_MODE_OPTIONS = {
    config: {
      label: "组件化",
      summary: "稳定模式：AI 输出配置，由首页组件和积木渲染。",
    },
    aiHtml: {
      label: "AI HTML",
      summary: "自由模式：模型参考组件库生成 HTML/CSS，系统做安全清洗、质量门禁和动作修正。",
    },
    skeletonHtml: {
      label: "骨架填充",
      summary: "装配模式：先生成首页骨架和模块占位，再按 slot 逐个生成组件，支持局部重生和锁定定稿。",
    },
    compare: {
      label: "双方案",
      summary: "对比模式：同时保存组件化方案和 AI HTML 视觉方案。",
    },
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
      note: `适合中文业务语境。CN 站点官方 API Base URL 是 ${MINIMAX_CN_BASE_URL}，不是 ${MINIMAX_CN_TYPED_ALIAS_BASE_URL}；如旧配置填了 ${MINIMAX_GLOBAL_BASE_URL} 会自动切回国内入口。MiniMax OpenAI 兼容接口输出上限为 ${MINIMAX_MAX_COMPLETION_TOKENS}，首页蓝图会使用短 prompt 和紧凑 JSON。`,
    },
    kimi: {
      provider: "kimi",
      name: "Kimi",
      badge: "OpenAI Compatible",
      model: KIMI_DEFAULT_MODEL,
      models: [KIMI_DEFAULT_MODEL, "kimi-k2.5", "kimi-k2-thinking", "moonshot-v1-128k"],
      baseUrl: KIMI_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MOONSHOT_API_KEY",
      note: `适合中文长文本理解、运营需求摘要和首页方案整理；默认使用 ${KIMI_DEFAULT_MODEL} 与国内入口 ${KIMI_CN_BASE_URL}。K2.6/K2.5 关闭 thinking 时固定使用 temperature=0.6，避免参数冲突。`,
    },
    deepseek: {
      provider: "deepseek",
      name: "DeepSeek",
      badge: "OpenAI Compatible",
      model: "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "deepseek-v4-pro"],
      baseUrl: DEEPSEEK_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "DEEPSEEK_API_KEY",
      note: "DeepSeek V4 官方 API 模型。首页生成默认用 V4-Flash 提升稳定性；V4-Pro 仍可手动选择，代理会关闭 thinking 并在超时后降级到 Flash。",
    },
    gemini: {
      provider: "gemini",
      name: "Gemini",
      badge: "OpenAI Compatible",
      model: GEMINI_DEFAULT_MODEL,
      models: GEMINI_TEXT_MODELS,
      baseUrl: GEMINI_OPENAI_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "GEMINI_API_KEY",
      note: `Google Gemini API 的 OpenAI 兼容接口。可选择 Gemini 2.5、Gemini 3 Flash Preview、Gemini 3.1 Flash-Lite 和 Gemini 3.1 Pro Preview 文本模型；Base URL 使用 ${GEMINI_OPENAI_BASE_URL}。`,
    },
  };
  const PROVIDER_ORDER = ["gemini", "deepseek", "kimi", "minimax", "openai", "claude"];

  const DEFAULT_MODEL_CONFIG = {
    ...AI_MODEL_PRESETS.openai,
    callMode: "serverProxy",
    proxyEndpoint: "/api/home-ai/complete",
    temperature: 0.4,
    maxOutputTokens: 6000,
    apiKey: "",
    apiKeys: {},
  };

  const els = {
    intakePage: document.querySelector("[data-ai-intake-page]"),
    previewPage: document.querySelector("[data-preview-page]"),
    composer: document.querySelector(".ai-chat-composer"),
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
    previewColorModeButtons: [...document.querySelectorAll("[data-preview-color-mode]")],
    previewSizeMeta: document.querySelector("[data-preview-size-meta]"),
    previewFullscreen: document.querySelector("[data-preview-fullscreen]"),
    schemeOptions: document.querySelector("[data-scheme-options]"),
    intelligenceSummary: document.querySelector("[data-intelligence-summary]"),
    status: document.querySelector("[data-config-status]"),
    summaryName: document.querySelector("[data-summary-name]"),
    summary: document.querySelector("[data-ai-summary]"),
    layout: document.querySelector("[data-summary-layout]"),
    theme: document.querySelector("[data-summary-theme]"),
    renderModeSummary: document.querySelector("[data-summary-render]"),
    density: document.querySelector("[data-summary-density]"),
    strength: document.querySelector("[data-summary-strength]"),
    hero: document.querySelector("[data-summary-hero]"),
    governanceSummary: document.querySelector("[data-governance-summary]"),
    aestheticScorePanel: document.querySelector("[data-aesthetic-score-panel]"),
    aestheticScoreValue: document.querySelector("[data-aesthetic-score-value]"),
    aestheticScoreStatus: document.querySelector("[data-aesthetic-score-status]"),
    aestheticScoreCategories: document.querySelector("[data-aesthetic-score-categories]"),
    aestheticScoreIssues: document.querySelector("[data-aesthetic-score-issues]"),
    aestheticScoreReferences: document.querySelector("[data-aesthetic-score-references]"),
    aestheticScoreRefresh: document.querySelector("[data-aesthetic-score-refresh]"),
    aestheticScoreSave: document.querySelector("[data-aesthetic-score-save]"),
    aestheticScoreImprove: document.querySelector("[data-aesthetic-score-improve]"),
    aestheticManualScore: document.querySelector("[data-aesthetic-manual-score]"),
    aestheticManualScoreInput: document.querySelector("[data-aesthetic-manual-score-input]"),
    aestheticManualScoreOutput: document.querySelector("[data-aesthetic-manual-score-output]"),
    aestheticDecisionButtons: [...document.querySelectorAll("[data-aesthetic-decision]")],
    aestheticScoreNote: document.querySelector("[data-aesthetic-score-note]"),
    aestheticEvidenceStatus: document.querySelector("[data-aesthetic-evidence-status]"),
    skeletonWorkflow: document.querySelector("[data-skeleton-workflow]"),
    decisionReasons: document.querySelector("[data-decision-reasons]"),
    variantSummary: document.querySelector("[data-variant-summary]"),
    moduleOutline: document.querySelector("[data-module-outline]"),
    pagePresetControls: document.querySelector("[data-page-preset-controls]"),
    moduleStyleControls: document.querySelector("[data-module-style-controls]"),
    moduleSettingControls: document.querySelector("[data-module-setting-controls]"),
    modelConfigOpen: [...document.querySelectorAll("[data-model-config-open]")],
    modelConfigSummary: [...document.querySelectorAll("[data-model-config-summary]")],
    modelCallHistory: document.querySelector("[data-model-call-history]"),
    suggestionPanel: document.querySelector("[data-ai-suggestions]"),
    suggestionNote: document.querySelector("[data-suggestion-note]"),
    generateSuggestions: document.querySelector("[data-ai-generate-suggestions]"),
    refreshSuggestions: document.querySelector("[data-refresh-suggestions]"),
    suggestionButtons: [...document.querySelectorAll("[data-suggestion-prompt]")],
    renderModeButtons: [...document.querySelectorAll("[data-render-mode-button]")],
    renderModeNotes: [...document.querySelectorAll("[data-render-mode-note]")],
    generationModeButtons: [...document.querySelectorAll("[data-generation-mode-button]")],
    generationPanels: [...document.querySelectorAll("[data-generation-panel]")],
    guidedChoices: [...document.querySelectorAll("[data-guided-choice]")],
    guidedGenerate: document.querySelector("[data-guided-generate]"),
    guidedSync: document.querySelector("[data-guided-sync]"),
    guidedSummary: document.querySelector("[data-guided-summary]"),
    guidedSummaryTitle: document.querySelector("[data-guided-summary-title]"),
    guidedNote: document.querySelector("[data-guided-note]"),
    guidedThemeCustom: document.querySelector("[data-guided-theme-custom]"),
    json: document.querySelector("[data-config-json]"),
    toast: document.querySelector("[data-admin-toast]"),
  };

  let currentConfig = els.previewPage ? home.loadDraft() : home.loadConfig();
  let schemeOptions = [];
  let activeSchemeIndex = 0;
  let selectedSuggestion = null;
  let interpretationRound = 0;
  let activePreviewSize = "web";
  let activePreviewColorMode = "light";
  let renderModeSetting = loadRenderModeSetting();
  let aiModelConfig = loadModelConfig();
  let editingModelConfig = null;
  let providerRuntimeStatus = {};
  let modelTestState = { tone: "", message: "尚未测试" };
  let suggestionRound = 0;
  let suggestionCards = [];
  let fallbackComponentLibrary = null;
  let skeletonFillRunning = false;
  let skeletonAutoStarted = false;
  let skeletonSlotPromptContext = null;
  let aestheticScoreTimer = 0;
  let aestheticScoreSignature = "";
  let aestheticScoreState = { pending: false, report: null, record: null, error: "" };
  let aestheticManualDecision = "approve";
  let aestheticManualScoreTouched = false;

  const SKELETON_COMPONENT_PROMPT_PRESETS = [
    { label: "更扁平", prompt: "整体更扁平，减少内层卡片和厚边框，用清晰的标题、指标行和主按钮层级。" },
    { label: "更紧凑", prompt: "压缩模块高度和留白，保留核心字段，减少重复说明，让信息更适合客户端首页扫描。" },
    { label: "卡片式", prompt: "改成卡片式表达，真实账号/模拟账号或关键指标要分组清楚，不要像普通表格。" },
    { label: "列表式", prompt: "改成更清爽的列表/行项目结构，字段横向可读，减少卡片堆叠。" },
    { label: "突出图表", prompt: "突出趋势图或图表容器，指标作为辅助，不要把图表挤在角落。" },
    { label: "减少指标", prompt: "减少指标数量，只保留最关键的业务字段和一个主操作，避免模块内部重点太多。" },
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uniqueList(values) {
    return [...new Set((Array.isArray(values) ? values.flat(Infinity) : [values]).filter(Boolean))];
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

  function skeletonSlotActionLabel(action, hasComponent = false) {
    if (action === "style") return "换样式";
    if (action === "regenerate") return hasComponent ? "重生成" : "生成组件";
    return "调整模块";
  }

  function skeletonComponentBrief(component) {
    if (!component) return null;
    return {
      id: component.id || "",
      name: component.name || "",
      family: component.family || "",
      size: component.size || "",
      sourceType: component.sourceType || "",
      referenceComponentId: component.referenceComponentId || "",
      visibleText: fallbackComponentVisibleText(component).slice(0, 220),
      layoutHints: Array.isArray(component.layoutHints) ? component.layoutHints.slice(0, 5) : [],
      dataRequirements: Array.isArray(component.dataRequirements) ? component.dataRequirements.slice(0, 6) : [],
    };
  }

  function skeletonComponentSignature(component) {
    return String(component?.html || "")
      .replace(/class=(["'])(.*?)\1/gi, 'class=""')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 720);
  }

  function skeletonComponentSourceLabel(component) {
    if (!component) return "未生成";
    if (component.sourceType === "brick-fallback") return "积木兜底";
    if (component.sourceType === "local-fallback") return "本地兜底";
    if (component.sourceType === "mock-component-ai") return "Mock 组件";
    if (component.sourceType === "component-ai") return "AI 组件";
    return component.sourceType || "组件";
  }

  function ensureSkeletonComponentPromptModal() {
    let modal = document.querySelector("[data-skeleton-component-modal]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "skeleton-component-modal";
    modal.dataset.skeletonComponentModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="skeleton-component-modal-backdrop" data-skeleton-component-modal-close></div>
      <form class="skeleton-component-dialog" role="dialog" aria-modal="true" aria-labelledby="skeleton-component-dialog-title" data-skeleton-component-form>
        <header>
          <div>
            <span data-skeleton-component-kicker>单模块调整</span>
            <h2 id="skeleton-component-dialog-title" data-skeleton-component-title>调整当前模块</h2>
            <p data-skeleton-component-summary></p>
          </div>
          <button class="skeleton-component-close" type="button" data-skeleton-component-modal-close aria-label="关闭">×</button>
        </header>
        <div class="skeleton-component-meta" data-skeleton-component-meta></div>
        <div class="skeleton-component-presets" data-skeleton-component-presets>
          ${SKELETON_COMPONENT_PROMPT_PRESETS.map((item) => `<button type="button" data-skeleton-component-preset="${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</button>`).join("")}
        </div>
        <label class="skeleton-component-prompt-field">
          <span>补充 prompt</span>
          <textarea data-skeleton-component-prompt rows="5" maxlength="1200" placeholder="例如：不要表格，改成真实账号和模拟账号两张卡；字段少一点，主按钮更明显。"></textarea>
        </label>
        <footer>
          <button type="button" data-skeleton-component-modal-close>取消</button>
          <button class="primary" type="submit" data-skeleton-component-submit>确认调整</button>
        </footer>
      </form>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-skeleton-component-modal-close]").forEach((button) => {
      button.addEventListener("click", closeSkeletonComponentPromptModal);
    });
    modal.querySelector("[data-skeleton-component-presets]")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-skeleton-component-preset]");
      if (!button) return;
      const prompt = button.dataset.skeletonComponentPreset || "";
      const textarea = modal.querySelector("[data-skeleton-component-prompt]");
      const current = textarea?.value.trim() || "";
      if (textarea) {
        textarea.value = current ? `${current}\n${prompt}` : prompt;
        textarea.focus();
      }
    });
    modal.querySelector("[data-skeleton-component-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitSkeletonComponentPrompt();
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSkeletonComponentPromptModal();
    });
    return modal;
  }

  function openSkeletonComponentPromptModal(slotId, action = "regenerate") {
    if (!isSkeletonPreviewConfig()) return;
    const scheme = skeletonSchemeFor(currentConfig);
    const slot = scheme.slots.find((item) => item.id === slotId);
    if (!slot) return;

    const component = scheme.slotComponents?.[slotId] || null;
    const hasComponent = Boolean(component?.html || component?.id);
    const modal = ensureSkeletonComponentPromptModal();
    const label = slot.label || home.featureLabel(slot.id);
    skeletonSlotPromptContext = { slotId, action };

    modal.querySelector("[data-skeleton-component-title]").textContent = `${skeletonSlotActionLabel(action, hasComponent)}：${label}`;
    modal.querySelector("[data-skeleton-component-summary]").textContent = [
      slot.sectionTitle || slot.sectionType || "slot",
      skeletonSlotFamily(slot.id),
      skeletonSlotSize(slot),
    ]
      .filter(Boolean)
      .join(" · ");
    modal.querySelector("[data-skeleton-component-meta]").innerHTML = `
      <span><b>当前组件</b>${escapeHtml(component?.name || "未生成")}</span>
      <span><b>来源</b>${escapeHtml(skeletonComponentSourceLabel(component))}</span>
      <span><b>状态</b>${escapeHtml(skeletonStatusLabel(slot.status))}</span>
    `;
    const textarea = modal.querySelector("[data-skeleton-component-prompt]");
    if (textarea) textarea.value = "";
    const submit = modal.querySelector("[data-skeleton-component-submit]");
    if (submit) submit.textContent = action === "style" ? "按要求换样式" : hasComponent ? "按要求重生成" : "生成组件";
    modal.hidden = false;
    document.body.classList.add("skeleton-component-modal-open");
    window.setTimeout(() => textarea?.focus(), 0);
  }

  function closeSkeletonComponentPromptModal() {
    const modal = document.querySelector("[data-skeleton-component-modal]");
    if (modal) modal.hidden = true;
    document.body.classList.remove("skeleton-component-modal-open");
    skeletonSlotPromptContext = null;
  }

  function submitSkeletonComponentPrompt() {
    const context = skeletonSlotPromptContext;
    if (!context) return;
    const modal = ensureSkeletonComponentPromptModal();
    const userPrompt = (modal.querySelector("[data-skeleton-component-prompt]")?.value || "").trim();
    const { slotId, action } = context;
    closeSkeletonComponentPromptModal();
    skeletonAutoStarted = true;
    generateSkeletonSlot(slotId, action, { userPrompt });
  }

  function normalizeRenderMode(value, fallback = "config") {
    return RENDER_MODE_OPTIONS[value] ? value : fallback;
  }

  function loadRenderModeSetting() {
    try {
      return normalizeRenderMode(window.localStorage.getItem(RENDER_MODE_KEY), "config");
    } catch (error) {
      return "config";
    }
  }

  function saveRenderModeSetting(mode) {
    const normalized = normalizeRenderMode(mode);
    renderModeSetting = normalized;
    try {
      window.localStorage.setItem(RENDER_MODE_KEY, normalized);
    } catch (error) {
      // The current in-memory choice still applies if storage is unavailable.
    }
    renderRenderModeControls();
    return normalized;
  }

  function renderModeLabel(mode) {
    return RENDER_MODE_OPTIONS[normalizeRenderMode(mode)]?.label || mode;
  }

  function currentGenerationRenderMode() {
    return normalizeRenderMode(renderModeSetting);
  }

	  function activePreviewRenderMode(config = currentConfig) {
	    const normalized = home.normalizeConfig(config);
	    if (normalized.activeRenderMode === "skeletonHtml" && normalized.skeletonHtmlScheme?.enabled) return "skeletonHtml";
	    return normalized.activeRenderMode === "aiHtml" && normalized.htmlScheme?.enabled ? "aiHtml" : "config";
	  }

	  function aiHtmlSourceInfo(config = currentConfig) {
	    const normalized = home.normalizeConfig(config);
	    const scheme = normalized.htmlScheme;
	    if (!scheme?.enabled) {
	      return { label: "AI HTML 未启用", tone: "off", detail: "", reason: "" };
	    }
	    const reason = scheme.fallbackReason || scheme.correctionNotes?.[0] || "";
	    if (scheme.mock) return { label: "Mock 预览", tone: "mock", detail: reason || "HOME_AI_MOCK=true 或 mock 预览，未调用真实模型。", reason };
	    if (scheme.sourceType === "local-fallback") return { label: "本地规则生成", tone: "fallback", detail: reason || "本地规则兜底生成，不是模型真实生成结果。", reason };
	    if (scheme.sourceType === "brick-library-backed") return { label: "积木保底", tone: "fallback", detail: reason || "模型 HTML 失败或质量门禁未通过，已用高分积木装配预览。", reason };
	    if (scheme.isFallback) return { label: "Fallback 预览", tone: "fallback", detail: reason || "模型失败或质量门禁未通过后降级。", reason };
	    if (scheme.sourceType === "model-repair") return { label: "模型生成", tone: "model", detail: "模型修正版 HTML，已通过安全清洗和质量门禁。", reason };
	    if (scheme.sourceType === "model/free-html") return { label: "模型生成", tone: "model", detail: "模型自由 HTML，已通过安全清洗和质量门禁。", reason };
	    return { label: "模型生成", tone: "model", detail: scheme.sourceType || "AI HTML", reason };
	  }

	  function renderPreviewSourceBadge(config = currentConfig) {
	    if (!els.previewStage) return;
	    let badge = els.previewStage.querySelector("[data-ai-html-source-badge]");
	    if (!badge) {
	      badge = document.createElement("span");
	      badge.className = "ai-html-source-badge";
	      badge.dataset.aiHtmlSourceBadge = "";
	      const tools = els.previewStage.querySelector(".preview-stage-tools");
	      if (tools) tools.prepend(badge);
	    }
	    const normalized = home.normalizeConfig(config);
	    const info = aiHtmlSourceInfo(normalized);
	    const shouldShow = normalized.htmlScheme?.enabled && normalized.activeRenderMode === "aiHtml";
	    badge.hidden = !shouldShow;
	    badge.dataset.tone = info.tone;
	    badge.textContent = info.label;
	    badge.title = info.detail;
	    els.previewStage.dataset.aiHtmlSourceTone = shouldShow ? info.tone : "off";
	  }

		  function renderRenderModeControls() {
    const normalizedConfig = home.normalizeConfig(currentConfig);
    const generationMode = currentGenerationRenderMode();
    const activePreviewMode = activePreviewRenderMode(normalizedConfig);
    const canPreviewHtml = Boolean(normalizedConfig.htmlScheme?.enabled);
    const canPreviewSkeleton = Boolean(normalizedConfig.skeletonHtmlScheme?.enabled || normalizedConfig.skeletonHtmlEnabled);

    els.renderModeButtons.forEach((button) => {
      const mode = normalizeRenderMode(button.dataset.renderModeButton, "config");
      const isPreviewControl = Boolean(button.closest("[data-preview-render-mode-controls]"));
      const active = isPreviewControl ? activePreviewMode === mode : generationMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      if (isPreviewControl && mode === "aiHtml") {
        button.disabled = !canPreviewHtml;
        button.title = canPreviewHtml ? "切换到 AI HTML 预览" : "当前草稿还没有 AI HTML 方案";
      }
      if (isPreviewControl && mode === "skeletonHtml") {
        button.disabled = !canPreviewSkeleton;
        button.title = canPreviewSkeleton ? "切换到骨架填充预览" : "当前草稿还没有骨架填充方案";
      }
    });

    els.renderModeNotes.forEach((note) => {
      const mode = note.closest("[data-preview-render-mode-controls]") ? activePreviewMode : generationMode;
      const option = RENDER_MODE_OPTIONS[mode] || RENDER_MODE_OPTIONS.config;
      const qualitySuffix =
        normalizedConfig.htmlScheme?.enabled && Number.isFinite(Number(normalizedConfig.htmlScheme.qualityScore))
          ? ` · 质量 ${normalizedConfig.htmlScheme.qualityScore}/100`
          : "";
	      const htmlSuffix = normalizedConfig.htmlScheme?.enabled
	        ? ` · ${aiHtmlSourceInfo(normalizedConfig).label}：${normalizedConfig.htmlScheme.name}${qualitySuffix}`
	        : "";
	      note.textContent = `${option.summary}${htmlSuffix}`;
	    });
	    renderPreviewSourceBadge(normalizedConfig);
	  }

	  function localAiHtmlScheme(config, prompt, reason = "本地生成") {
	    const normalized = home.normalizeConfig(config);
	    const title = escapeHtml(normalized.name || "AI 首页视觉方案");
	    const theme = escapeHtml(normalized.themePreset || normalized.theme || "default");
	    const source = String(prompt || "");
	    const text = `${source.toLowerCase()} ${source}`;
	    const intent = normalized.pageIntent?.primaryIntent || normalized.brickTrace?.intent || "standard";
	    const wants = (pattern) => pattern.test(text);
	    const required = [
	      ["asset_overview", "资产概览", /asset_overview|资产概览|账户摘要|余额合计|总资产|交易账号余额/],
	      ["onboarding_guide", "开户引导", /onboarding_guide|开户引导|KYC|kyc|开户流程|创建真实账户|开真实账户|首次入金|新客|已注册未开户/],
	      ["quick_actions", "快捷入口", /quick_actions|快捷入口|快捷操作|立即开户|入金|联系客服/],
	      ["trading_accounts_list", "交易账号列表", /trading_accounts_list|交易账号|交易账户|真实账号|模拟账号|MT5|mt5/],
	      ["wallet_list", "钱包列表/卡片", /wallet_list|钱包列表|钱包卡片|多币种钱包|币种钱包|wallet list|wallet cards/i],
	      ["promo_banner", "活动权益", /promo_banner|活动权益|活动|入金奖励|权益/],
	      ["pamm_products", "PAMM 条件", /pamm|PAMM|pamm_products|资管产品/],
	      ["referral_link_card", "推广链接", /referral_link_card|推广链接|邀请链接|开户链接|注册链接|邀请码|referral/],
	      ["app_download", "下载入口", /app_download|APP 下载|app下载|下载入口|MT5 下载|mt5 下载/],
	      ["support_contact", "在线客服", /support_contact|客服|在线客服|客户经理|联系客服/],
	      ["faq_section", "FAQ", /faq|FAQ|常见问题|问题解答/],
	      ["risk_disclosure", "风险提示", /risk_disclosure|风险提示|风险披露|合规|杠杆风险/],
	    ].filter(([id, , pattern]) => wants(pattern) || ["asset_overview", "quick_actions", "trading_accounts_list"].includes(id) || (intent === "onboarding" && id === "onboarding_guide"));
	    const has = (id) => required.some(([block]) => block === id);
	    const hero =
	      intent === "onboarding" || has("onboarding_guide")
	        ? `<header class="ai-html-local-hero ai-html-local-onboarding"><div><span>开户引导</span><h1>完成真实账户开户准备</h1><p>KYC、开真实账户和首次入金按步骤推进。</p><a data-home-action="openAccount" href="#open-account">立即开户</a></div><ol><li>KYC 状态</li><li>开真实账户</li><li>首次入金准备</li></ol></header>`
	        : intent === "trader"
	          ? `<header class="ai-html-local-hero ai-html-local-trader"><div><span>交易工作台</span><h1>${title}</h1><p>账号状态、账户表现、持仓入口和 MT5 操作优先。</p></div><nav><a data-home-action="positions" href="#positions">持仓</a><a data-home-action="orders" href="#orders">订单</a><a data-home-action="downloadMt5" href="#download">MT5</a></nav></header>`
	          : `<header class="ai-html-local-hero"><div><span>本地规则生成</span><h1>${title}</h1><p>按当前首页意图生成可预览的本地 HTML 兜底方案。</p></div><a data-home-action="deposit" href="#deposit">入金</a></header>`;
	    const section = (id, label, markup) => (has(id) ? `<section class="ai-html-local-card" data-ai-html-module="${escapeHtml(id)}"><header><span>${escapeHtml(id)}</span><strong>${escapeHtml(label)}</strong></header>${markup}</section>` : "");
	    const html = `
	      <section class="ai-html-page ai-html-local-page" data-ai-html-theme="${theme}" data-ai-html-source="local-fallback">
	        ${hero}
	        <main class="ai-html-local-flow">
	          ${section("asset_overview", "账户摘要", `<div class="ai-html-local-metrics"><b>Sample 余额合计 125,430.80 USD</b><b>钱包余额 18,920.00</b><b>交易账号余额 106,510.80</b></div>`)}
	          ${section("onboarding_guide", "KYC / 开真实账户 / 首次入金", `<ol class="ai-html-local-steps"><li>KYC 状态来自 CRM</li><li>立即开户为主 CTA</li><li>首次入金准备</li></ol><a data-home-action="openAccount" href="#open-account">立即开户</a>`)}
	          ${section("quick_actions", "下一步操作", `<nav class="ai-html-local-actions"><a data-home-action="openAccount" href="#open-account">立即开户</a><a data-home-action="deposit" href="#deposit">入金</a><a data-home-action="accounts" href="#accounts">交易账号</a><a data-home-action="contactSupport" href="#support">客服</a></nav>`)}
	          ${section("wallet_list", "钱包列表/卡片", `<div class="ai-html-local-wallets"><b>USD · 12,430.00</b><b>EUR · 8,920.00</b><b>USDT · 21,600.00</b></div>`)}
	          ${section("promo_banner", "活动权益", `<p>Sample 活动权益，正式内容来自后台活动配置。</p><a data-home-action="deposit" href="#deposit">查看权益</a>`)}
	          ${section("pamm_products", "PAMM 条件展示", `<div class="ai-html-local-list"><b>稳健策略 A · Sample 风险中低</b><b>平衡策略 B · Sample 风险中</b></div>`)}
	          ${section("trading_accounts_list", "交易账号列表", `<div class="ai-html-local-accounts"><b>Live 80010 · MT5 · Equity Sample 12,726.40</b><b>Demo 90021 · MT5 · Equity Sample 51,280.60</b></div>`)}
	          ${section("referral_link_card", "推广链接", `<p>https://example.com/register?code=SAMPLE</p><a data-home-action="copyLink" href="#copy">复制推广链接</a>`)}
	          ${section("app_download", "下载入口", `<p>APP 下载 / MT5 下载入口来自后台配置。</p><a data-home-action="downloadApp" href="#download">打开下载</a>`)}
	          ${section("support_contact", "在线客服", `<p>服务时间、在线状态和客户经理入口来自后台。</p><a data-home-action="contactSupport" href="#support">联系客服</a>`)}
	          ${section("faq_section", "FAQ 常见问题", `<details open><summary>如何完成开户？</summary><p>完成 KYC 后创建真实账户，并准备首次入金。</p></details>`)}
	          ${section("risk_disclosure", "风险提示", `<p>外汇和差价合约交易涉及高风险，杠杆可能放大亏损。</p>`)}
	        </main>
	      </section>
	    `;
	    return {
	      enabled: true,
	      name: `${normalized.name || "AI 首页"} HTML 版`.slice(0, 56),
	      summary: `${reason}的本地 AI HTML fallback 预览，不代表模型真实生成结果。`.slice(0, 220),
	      visualBrief: "本地 fallback 会按开户引导、交易工作台或活动增长意图选择不同骨架。",
	      moduleUnderstanding: {
	        pageIntent: normalized.pageIntent?.label || normalized.pageIntent?.primaryIntent || "本地规则生成",
	        visualGoal: "用本地 HTML fallback 验证首屏层级、动作入口和业务模块承接。",
	        layoutDirection: intent === "onboarding" ? "开户 Banner + KYC / 开户 / 首次入金流程 + 承接模块。" : "按当前意图组织首屏、动作和账号区。",
	        moduleStrategy: "参考现有首页模块契约生成本地兜底方案。",
	      },
	      requiredModules: required.map(([, label]) => label),
	      moduleMapping: Object.fromEntries(required.map(([id, label]) => [label, `data-ai-html-module="${id}" 区域承接。`])),
      componentReferences: [
        { componentId: "asset-overview-vip-hero", family: "AssetOverview", module: "asset_overview", reason: "参考主金额和指标层级。" },
        { componentId: "wallet-list-tiles", family: "WalletList", module: "wallet_list", reason: "参考多币种钱包卡片结构。" },
        { componentId: "account-performance-pro-chart", family: "AccountPerformance", module: "trading_account_highlight", reason: "参考趋势表现结构。" },
        { componentId: "trading-accounts-separated-list", family: "TradingAccounts", module: "trading_accounts_list", reason: "参考账号环境值与账号列表字段。" },
      ],
      designNotes: ["本地 fallback 只用于兜底，真实 AI HTML 会经过组件库参考和质量门禁。"],
      dataBindings: ["totalAssets", "walletBalance", "tradingAccountBalance", "quickActionList", "tradingAccounts"],
	      implementationContract: required.map(([id, label]) => ({
	        module: id,
	        label,
	        family: {
	          asset_overview: "AssetOverview",
	          onboarding_guide: "OnboardingProgress",
	          quick_actions: "QuickActions",
	          wallet_list: "WalletList",
	          trading_accounts_list: "TradingAccounts",
	          promo_banner: "PromotionBanner",
	          pamm_products: "PammProducts",
	          referral_link_card: "ReferralLinkCard",
	          app_download: "AppDownload",
	          support_contact: "SupportContact",
	          faq_section: "FaqSection",
	          risk_disclosure: "RiskDisclosure",
	        }[id] || id,
	        dataFields: ["sampleData", "backendBinding"],
	        states: ["demo", "ready"],
	        actions: id === "onboarding_guide" ? ["openAccount", "deposit"] : id === "quick_actions" ? ["openAccount", "deposit", "accounts", "contactSupport"] : ["view"],
	        interactions: [`${label} 使用独立区域承接，不只是标题。`],
	        renderEvidence: [`data-ai-html-module="${id}" 可见。`],
	      })),
	      qualityScore: 84,
	      qualityStatus: "local-fallback",
      qualityIssues: [],
      aestheticChecks: ["使用首页主题 token。", "保留关键动作和交易账号信息。"],
      safetyStatus: "local-sanitized",
      safetyNotes: ["本地 HTML 草稿不包含脚本，只用于验证双模式渲染链路。"],
	      generationPipeline: "local-fallback",
	      correctionStatus: "fallback",
	      sourceType: "local-fallback",
	      isFallback: true,
	      fallbackReason: reason,
	      modelAttempted: false,
	      mock: false,
	      correctionNotes: ["当前是本地 fallback，不代表大模型自由生成结果。"],
	      generatedAt: new Date().toISOString(),
	      html,
	      css: `
	        :host{display:block;color:var(--home-text,#172033);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
	        .ai-html-page{display:grid;gap:14px;padding:16px;background:var(--home-bg,#f6f8fb)}.ai-html-page *{box-sizing:border-box}.ai-html-local-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:end;padding:22px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg,#fff)}.ai-html-local-onboarding{grid-template-columns:minmax(0,.9fr) minmax(280px,1.1fr)}.ai-html-local-trader{grid-template-columns:minmax(0,1fr) minmax(260px,.8fr);background:var(--home-surface-soft,#f8fbff)}.ai-html-local-hero div,.ai-html-local-hero ol{display:grid;gap:10px}.ai-html-page h1{margin:0;font-size:32px;line-height:1.08}.ai-html-page p{margin:0;color:var(--home-text-muted,#64748b);line-height:1.6}.ai-html-page span{color:var(--home-primary,#2563eb);font-size:12px;font-weight:950}.ai-html-page a{min-height:42px;display:inline-grid;place-items:center;width:max-content;padding:0 14px;border:1px solid var(--home-button-border,#1d4ed8);border-radius:var(--home-radius-sm,8px);background:var(--home-button-bg,#2563eb);color:var(--home-button-text,#fff);font-weight:950;text-decoration:none}.ai-html-local-hero ol,.ai-html-local-steps{grid-template-columns:repeat(3,minmax(0,1fr));margin:0;padding:0;list-style:none}.ai-html-local-hero li,.ai-html-local-steps li{padding:12px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff);font-weight:900}.ai-html-local-hero nav,.ai-html-local-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ai-html-local-flow{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}.ai-html-local-card{grid-column:span 6;display:grid;gap:12px;padding:18px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg,#fff)}.ai-html-local-card[data-ai-html-module="wallet_list"],.ai-html-local-card[data-ai-html-module="trading_accounts_list"],.ai-html-local-card[data-ai-html-module="risk_disclosure"]{grid-column:1/-1}.ai-html-local-card header{display:flex;justify-content:space-between;gap:12px}.ai-html-local-metrics,.ai-html-local-list,.ai-html-local-accounts,.ai-html-local-wallets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ai-html-local-list,.ai-html-local-accounts{grid-template-columns:repeat(2,minmax(0,1fr))}.ai-html-local-card b{padding:10px;border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff);color:var(--home-text,#172033)}details{padding:10px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}
	        @media(max-width:860px){.ai-html-local-hero,.ai-html-local-onboarding,.ai-html-local-trader,.ai-html-local-hero ol,.ai-html-local-steps,.ai-html-local-hero nav,.ai-html-local-actions,.ai-html-local-metrics,.ai-html-local-list,.ai-html-local-accounts,.ai-html-local-wallets{grid-template-columns:1fr}.ai-html-local-flow{grid-template-columns:1fr}.ai-html-local-card{grid-column:1/-1}.ai-html-page h1{font-size:28px}.ai-html-page a{width:100%}}
	      `,
	    };
	  }

  function attachRenderModeToConfig(config, prompt, options = {}) {
    const mode = normalizeRenderMode(options.renderMode || currentGenerationRenderMode());
    const next = {
      ...config,
      renderMode: mode,
      htmlGenerationEnabled: mode === "aiHtml" || mode === "compare",
      skeletonHtmlEnabled: mode === "skeletonHtml",
    };
    if ((mode === "aiHtml" || mode === "compare") && !next.htmlScheme?.enabled) {
      next.htmlScheme = localAiHtmlScheme(next, prompt, options.reason || "本地 fallback");
    }
    if (mode === "skeletonHtml") {
      next.skeletonHtmlScheme = home.buildSkeletonHtmlScheme(next, {
        reason: "第一步只生成骨架和模块占位，等待逐 slot 填充。",
        sourceType: "local-skeleton",
        status: "pending-fill",
      });
    }
    if (mode === "skeletonHtml" && next.skeletonHtmlScheme?.enabled) next.activeRenderMode = "skeletonHtml";
    else next.activeRenderMode = mode === "aiHtml" && next.htmlScheme?.enabled ? "aiHtml" : "config";
    return next;
  }

  function labelDensity(density) {
    return {
      compact: "紧凑",
      comfortable: "舒适",
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

  function normalizePreviewColorMode(mode) {
    return mode === "dark" ? "dark" : "light";
  }

  function setPreviewColorMode(mode, options = {}) {
    if (!els.previewPage) return;

    activePreviewColorMode = normalizePreviewColorMode(mode);
    els.previewPage.dataset.previewColorMode = activePreviewColorMode;
    els.previewColorModeButtons.forEach((button) => {
      const isActive = button.dataset.previewColorMode === activePreviewColorMode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (options.persist !== false) {
      window.localStorage.setItem(PREVIEW_COLOR_MODE_KEY, activePreviewColorMode);
    }

    if (options.apply !== false) applyPreview(false);
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

  function initPreviewColorMode() {
    if (!els.previewPage || !els.previewColorModeButtons.length) return;

    setPreviewColorMode(window.localStorage.getItem(PREVIEW_COLOR_MODE_KEY) || "light", { persist: false, apply: false });
    els.previewColorModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setPreviewColorMode(button.dataset.previewColorMode || "light");
      });
    });
  }

  function applyPreview(allowReload = false) {
    if (!els.preview) return;
    const previewConfig = els.previewPage ? { ...currentConfig, colorMode: activePreviewColorMode } : currentConfig;

    try {
      const frameWindow = els.preview.contentWindow;

      if (frameWindow?.HomePersonalization && frameWindow.document?.body) {
        frameWindow.HomePersonalization.applyConfig(previewConfig, frameWindow.document);
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
	    if (els.renderModeSummary) {
	      const sourceInfo = aiHtmlSourceInfo(config);
	      const suffix = config.htmlScheme?.enabled ? ` / ${sourceInfo.label} · ${config.htmlScheme.name}` : "";
	      els.renderModeSummary.textContent = `${renderModeLabel(config.activeRenderMode || "config")}${suffix}`;
	      els.renderModeSummary.title = config.htmlScheme?.enabled ? sourceInfo.detail : "";
	    }
    if (els.density) els.density.textContent = labelDensity(config.density);
    if (els.strength) els.strength.textContent = labelStrength(config.personalizationStrength);
    if (els.hero) els.hero.textContent = home.featureLabel(config.heroFocus);
    if (els.governanceSummary) {
      const prompt = window.localStorage.getItem(PROMPT_KEY) || promptValue();
      const governance =
        typeof home.evaluatePageGovernance === "function"
          ? home.evaluatePageGovernance(config, prompt)
          : config.pageGovernance || null;
      const issues = Array.isArray(governance?.issues) ? governance.issues.filter(Boolean) : [];
      const score = Number.isFinite(Number(governance?.score)) ? Number(governance.score) : 0;
      const tone = score >= 90 && issues.length === 0 ? "pass" : score >= 75 ? "warn" : "fail";

      els.governanceSummary.dataset.tone = tone;
      els.governanceSummary.innerHTML = `
        <span>页面质检</span>
        <strong>${escapeHtml(governance?.label || "通用首页契约")} · ${escapeHtml(score)} 分</strong>
        <small>${escapeHtml(issues.length ? `待优化：${issues.slice(0, 2).join(" / ")}` : "主目标、CTA 去重和模块层级通过")}</small>
      `;
    }
	    if (els.json) els.json.textContent = JSON.stringify(config, null, 2);
	    renderPreviewSourceBadge(config);
	  }

  function aestheticStatusLabel(status) {
    return (
      {
        publishable: "可发布",
        "needs-polish": "需打磨",
        "needs-repair": "需返修",
        fallback: "兜底",
        excellent: "优秀",
        good: "良好",
        fair: "一般",
        weak: "偏弱",
      }[status] || status || "待评分"
    );
  }

  function aestheticTone(score, status) {
    const value = Number(score);
    if (status === "fallback" || value < 60) return "fail";
    if (status === "needs-repair" || value < 75) return "warn";
    if (value >= 86 || status === "publishable") return "pass";
    return "warn";
  }

  function aestheticConfigSignature(config) {
    const normalized = home.normalizeConfig(config);
    return JSON.stringify({
      prompt: window.localStorage.getItem(PROMPT_KEY) || "",
      name: normalized.name,
      layoutPreset: normalized.layoutPreset,
      themePreset: normalized.themePreset || normalized.theme,
      activeRenderMode: normalized.activeRenderMode || normalized.renderMode || "config",
      sections: normalized.sections,
      brickPlan: (normalized.brickPlan || []).map((brick) => ({
        id: brick.brickId || brick.id,
        component: brick.component || brick.feature,
        zone: brick.zone,
        morph: brick.morphHint,
      })),
      componentMorphs: normalized.componentMorphs,
      htmlQualityScore: normalized.htmlScheme?.qualityScore || null,
      htmlQualityStatus: normalized.htmlScheme?.qualityStatus || "",
    });
  }

  function normalizeAestheticManualScore(value, fallback = 88) {
    const score = Number(value);
    const next = Number.isFinite(score) ? score : fallback;
    return Math.max(0, Math.min(100, Math.round(next)));
  }

  function aestheticDecisionForScore(score) {
    const value = normalizeAestheticManualScore(score);
    if (value >= 80) return "approve";
    if (value <= 59) return "reject";
    return "neutral";
  }

  function aestheticRatingFromScore(score) {
    return Math.max(1, Math.min(5, Math.round(normalizeAestheticManualScore(score) / 20) || 1));
  }

  function syncAestheticManualScore(report, options = {}) {
    if (!els.aestheticManualScoreInput) return;
    const score = normalizeAestheticManualScore(report?.score, normalizeAestheticManualScore(els.aestheticManualScoreInput.value));
    if (options.force || !aestheticManualScoreTouched) {
      els.aestheticManualScoreInput.value = String(score);
      aestheticManualDecision = aestheticDecisionForScore(score);
    }
    renderAestheticManualControls();
  }

  function renderAestheticManualControls() {
    if (!els.aestheticManualScore) return;
    const score = normalizeAestheticManualScore(els.aestheticManualScoreInput?.value, aestheticScoreState.report?.score || 88);
    if (els.aestheticManualScoreOutput) els.aestheticManualScoreOutput.textContent = String(score);
    els.aestheticDecisionButtons.forEach((button) => {
      const active = button.dataset.aestheticDecision === aestheticManualDecision;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (els.aestheticEvidenceStatus && !aestheticScoreState.feedbackRecord) {
      els.aestheticEvidenceStatus.textContent = "保存时会带上当前首页代码快照。";
    }
  }

  function trimAestheticEvidenceText(value, limit = 24000) {
    return String(value || "").trim().slice(0, limit);
  }

  function previewCodeEvidence(config = currentConfig) {
    const normalized = home.normalizeConfig(config);
    let frameDocument = null;
    let frameLocation = "";
    try {
      frameDocument = els.preview?.contentDocument || els.preview?.contentWindow?.document || null;
      frameLocation = els.preview?.contentWindow?.location?.href || "";
    } catch (error) {
      frameDocument = null;
    }

    const root =
      frameDocument?.querySelector(".client-home-page") ||
      frameDocument?.querySelector(".client-shell") ||
      frameDocument?.body ||
      null;
    const renderedHtml = trimAestheticEvidenceText(root?.outerHTML || "", 50000);
    const htmlScheme = normalized.htmlScheme?.enabled ? normalized.htmlScheme : null;
    const skeletonScheme = normalized.skeletonHtmlScheme?.enabled ? normalized.skeletonHtmlScheme : null;

    return {
      captureType: "code",
      capturedAt: new Date().toISOString(),
      pageUrl: frameLocation || els.preview?.src || "",
      renderMode: activePreviewRenderMode(normalized),
      previewSize: activePreviewSize,
      colorMode: activePreviewColorMode,
      summary: [
        normalized.name,
        renderModeLabel(activePreviewRenderMode(normalized)),
        home.themeLabel?.(normalized.themePreset || normalized.theme) || normalized.themePreset || normalized.theme,
        renderedHtml ? "已捕获 iframe DOM" : "已捕获配置代码",
      ]
        .filter(Boolean)
        .join(" · "),
      code: {
        renderedHtml,
        configJson: trimAestheticEvidenceText(JSON.stringify(normalized, null, 2), 50000),
        aiHtml: trimAestheticEvidenceText(htmlScheme?.html || "", 30000),
        aiCss: trimAestheticEvidenceText(htmlScheme?.css || "", 30000),
        skeletonHtml: skeletonScheme ? trimAestheticEvidenceText(JSON.stringify(skeletonScheme, null, 2), 24000) : "",
      },
    };
  }

  function aestheticManualDimensions() {
    const categories = Array.isArray(aestheticScoreState.report?.categories) ? aestheticScoreState.report.categories : [];
    return Object.fromEntries(
      categories
        .map((category) => [String(category.key || category.label || "").trim(), Math.max(0, Math.min(10, Math.round((Number(category.score) || 0) / 10)))])
        .filter(([key]) => key),
    );
  }

  function aestheticPreferenceSignals(score, decision, evidence) {
    const categories = Array.isArray(aestheticScoreState.report?.categories) ? aestheticScoreState.report.categories : [];
    return [
      `人工审美分 ${score}/100`,
      decision === "approve" ? "保留类似首页结构和视觉层级" : "",
      decision === "reject" ? "避免类似首页结构和视觉层级" : "",
      evidence?.code?.renderedHtml ? "评分证据包含当前首页 DOM 代码快照" : "评分证据包含当前首页配置代码",
      ...categories.slice(0, 4).map((category) => `${category.label || category.key} 机器参考 ${normalizeAestheticManualScore(category.score)}/100`),
    ]
      .filter(Boolean)
      .slice(0, 10);
  }

  function renderAestheticScorePanel() {
    if (!els.aestheticScorePanel) return;

    const { pending, report, error } = aestheticScoreState;
    const score = Number(report?.score);
    const tone = pending ? "pending" : error ? "fail" : Number.isFinite(score) ? aestheticTone(score, report?.status) : "pending";
    els.aestheticScorePanel.dataset.tone = tone;

    if (els.aestheticScoreValue) els.aestheticScoreValue.textContent = pending ? "..." : Number.isFinite(score) ? String(Math.round(score)) : "--";
    if (els.aestheticScoreStatus) {
      els.aestheticScoreStatus.textContent = pending
        ? "正在检查首屏焦点、组件库复用、模块层级和响应式安全。"
        : error
          ? `评分失败：${error}`
          : report
            ? `${aestheticStatusLabel(report.status)} · ${report.issues?.[0] || "已生成可追踪的视觉质量报告。"}`
            : "等待评分。";
    }

    const categories = Array.isArray(report?.categories) ? report.categories : [];
    if (els.aestheticScoreCategories) {
      els.aestheticScoreCategories.innerHTML = categories
        .slice(0, 6)
        .map((category) => {
          const categoryScore = Math.max(0, Math.min(100, Math.round(Number(category.score) || 0)));
          return `
            <div class="aesthetic-score-bar">
              <span>${escapeHtml(category.label || category.key || "评分项")}</span>
              <strong>${categoryScore}</strong>
              <i style="--score:${categoryScore}%"></i>
            </div>
          `;
        })
        .join("");
    }

    const issues = Array.isArray(report?.issues) ? report.issues : [];
    const suggestions = Array.isArray(report?.suggestions) ? report.suggestions : [];
    if (els.aestheticScoreIssues) {
      const items = [...issues.slice(0, 2), ...suggestions.slice(0, 2).map((item) => `建议：${item}`)];
      els.aestheticScoreIssues.innerHTML = items.length
        ? items.map((item) => `<small>${escapeHtml(item)}</small>`).join("")
        : report
          ? "<small>暂无明显问题，可以继续用候选生成做风格探索。</small>"
          : "";
    }

    const references = Array.isArray(report?.componentReferences) ? report.componentReferences : [];
    if (els.aestheticScoreReferences) {
      els.aestheticScoreReferences.innerHTML = references.length
        ? references
            .slice(0, 4)
            .map((item) => `<span>${escapeHtml(item.name || item.id || "组件参考")} · ${escapeHtml(item.family || "")}</span>`)
            .join("")
        : report
          ? "<span>未命中足够组件库参考</span>"
          : "";
    }

    renderAestheticManualControls();
  }

  async function scoreCurrentPreview(options = {}) {
    if (!els.previewPage || !els.aestheticScorePanel) return null;

    const config = home.normalizeConfig(currentConfig);
    const signature = aestheticConfigSignature(config);
    if (!options.force && aestheticScoreSignature === signature && aestheticScoreState.report) {
      renderAestheticScorePanel();
      return aestheticScoreState.report;
    }

    aestheticScoreState = {
      pending: true,
      report: aestheticScoreState.report,
      record: aestheticScoreState.record,
      feedbackRecord: aestheticScoreState.feedbackRecord || null,
      error: "",
    };
    renderAestheticScorePanel();

    try {
      const response = await requestJsonEndpoint("/api/home-ai/aesthetic-score", {
        action: options.action || "preview-score",
        prompt: window.localStorage.getItem(PROMPT_KEY) || promptValue(),
        config,
        source: options.source || "preview",
        label: config.name,
        message: config.aiSummary,
        renderMode: config.activeRenderMode || config.renderMode || "config",
        providerId: aiModelConfig.provider,
        provider: providerPreset(aiModelConfig.provider).name,
        model: aiModelConfig.model,
      });
      aestheticScoreSignature = signature;
      aestheticScoreState = {
        pending: false,
        report: response.report || null,
        record: response.record || null,
        feedbackRecord: null,
        error: "",
      };
      syncAestheticManualScore(response.report);
      renderAestheticScorePanel();
      return response.report || null;
    } catch (error) {
      aestheticScoreState = {
        pending: false,
        report: aestheticScoreState.report,
        record: aestheticScoreState.record,
        feedbackRecord: aestheticScoreState.feedbackRecord || null,
        error: errorMessage(error, 180),
      };
      renderAestheticScorePanel();
      return null;
    }
  }

  async function saveManualAestheticFeedback() {
    if (!els.previewPage || !els.aestheticScoreSave) return;

    const config = home.normalizeConfig(currentConfig);
    const manualScore = normalizeAestheticManualScore(els.aestheticManualScoreInput?.value, aestheticScoreState.report?.score || 88);
    const decision = aestheticManualDecision || aestheticDecisionForScore(manualScore);
    const note = String(els.aestheticScoreNote?.value || "").trim();
    const prompt = window.localStorage.getItem(PROMPT_KEY) || promptValue();
    const previousLabel = els.aestheticScoreSave.textContent.trim();

    els.aestheticScoreSave.disabled = true;
    els.aestheticScoreSave.classList.add("is-loading");
    els.aestheticScoreSave.textContent = "保存中";
    if (els.aestheticEvidenceStatus) els.aestheticEvidenceStatus.textContent = "正在整理当前首页代码快照...";

    try {
      if (!aestheticScoreState.record || !aestheticScoreState.report) {
        await scoreCurrentPreview({ force: true, action: "manual-feedback-score", source: "preview-feedback" });
      }

      const evidence = previewCodeEvidence(config);
      const machineScore = Number.isFinite(Number(aestheticScoreState.report?.score)) ? Math.round(Number(aestheticScoreState.report.score)) : null;
      const response = await requestJsonEndpoint("/api/home-ai/feedback", {
        prompt,
        source: "preview-manual-score",
        scoreRecordId: aestheticScoreState.record?.id || "",
        candidateGroupId: aestheticScoreState.record?.candidateGroupId || "",
        candidateIndex: aestheticScoreState.record?.candidateIndex ?? null,
        decision,
        rating: aestheticRatingFromScore(manualScore),
        note,
        tags: [config.themePreset || config.theme, config.layoutPreset, config.pageIntent?.primaryIntent || config.brickTrace?.intent].filter(Boolean),
        preferenceSignals: aestheticPreferenceSignals(manualScore, decision, evidence),
        pageIntent: config.pageIntent?.primaryIntent || config.brickTrace?.intent || "",
        visualStyle: config.themePreset || config.theme || "",
        score: manualScore,
        manualScore,
        machineScore,
        manualDimensions: aestheticManualDimensions(),
        evidence,
        config,
      });

      aestheticScoreState = { ...aestheticScoreState, feedbackRecord: response.record || null };
      if (els.aestheticEvidenceStatus) {
        els.aestheticEvidenceStatus.textContent = response.record
          ? `已保存到 AI 审美记忆：人工 ${manualScore}/100，证据为首页代码快照。`
          : `已保存人工 ${manualScore}/100。`;
      }
      renderAestheticScorePanel();
      updateStatus("人工审美评分已保存，后续生成会参考", true);
      showToast("人工评分已保存，AI 下次会参考");
    } catch (error) {
      if (els.aestheticEvidenceStatus) els.aestheticEvidenceStatus.textContent = `保存失败：${errorMessage(error, 140)}`;
      showToast(`人工评分保存失败：${errorMessage(error, 160)}`);
    } finally {
      els.aestheticScoreSave.disabled = false;
      els.aestheticScoreSave.classList.remove("is-loading");
      els.aestheticScoreSave.textContent = previousLabel || "保存我的评分";
    }
  }

  function scheduleAestheticScore(options = {}) {
    if (!els.previewPage || !els.aestheticScorePanel) return;
    window.clearTimeout(aestheticScoreTimer);
    aestheticScoreTimer = window.setTimeout(() => {
      scoreCurrentPreview(options);
    }, options.delay ?? 360);
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
            <small>${escapeHtml([item.variant, item.referenceName ? `参考 ${item.referenceName}` : ""].filter(Boolean).join(" · "))}</small>
          </article>
        `,
      )
      .join("");
  }

  function setConfig(config, statusText, options = {}) {
    currentConfig = home.normalizeConfig(config);
    aestheticScoreState = { pending: false, report: null, record: null, feedbackRecord: null, error: "" };
    aestheticManualScoreTouched = false;
    if (options.saveDraft) home.saveDraft(currentConfig);
    renderSummary();
    renderIntelligenceSummary();
    renderDecisionReasons();
    renderVariantSummary();
    renderModuleOutline();
    renderPagePresetControls();
    renderModuleStyleControls();
    renderModuleSettingControls();
    renderRenderModeControls();
    renderSkeletonWorkflow();
    applyPreview(true);
    maybeStartSkeletonWorkflow();
    scheduleAestheticScore({ action: "preview-change-score", source: "preview", delay: 420 });
    updateStatus(statusText || "草稿预览", false);
  }

  function isSkeletonPreviewConfig(config = currentConfig) {
    const normalized = home.normalizeConfig(config);
    return normalized.activeRenderMode === "skeletonHtml" && normalized.skeletonHtmlScheme?.enabled;
  }

  function skeletonStatusLabel(status) {
    return {
      "pending-fill": "待填充",
      generating: "生成中",
      filled: "已填充",
      locked: "已锁定",
      failed: "失败",
      review: "待定稿",
      final: "已定稿",
    }[status] || "待填充";
  }

  function skeletonSlotFamily(slotId) {
    const map = {
      welcome_header: "WelcomeHeader",
      asset_overview: "AssetOverview",
      wallet_balance: "WalletBalance",
      wallet_list: "WalletList",
      fund_actions: "FundActions",
      fundActions: "FundActions",
      quick_actions: "QuickActions",
      open_account_actions: "OpenAccount",
      openAccountActions: "OpenAccount",
      onboarding_guide: "OnboardingProgress",
      user_kyc_rail: "UserKycRail",
      trading_account_highlight: "AccountPerformance",
      trading_accounts_list: "TradingAccounts",
      create_account_form: "CreateAccountForm",
      pamm_products: "PammProducts",
      copytrading_signals: "CopytradingSignals",
      promo_banner: "PromotionBanner",
      ad_carousel: "PromotionBanner",
      referral_link_card: "ReferralLinkCard",
      referralLink: "ReferralLinkCard",
      risk_disclosure: "RiskDisclosure",
      risk_notice: "RiskDisclosure",
      faq_section: "FaqSection",
      support_contact: "SupportContact",
      app_download: "AppDownload",
    };
    return map[slotId] || "ClientHomeAtoms";
  }

  function skeletonSlotSize(slot = {}) {
    const id = slot.id || slot.slot || "";
    if (["trading_accounts_list", "wallet_list", "copytrading_signals"].includes(id)) return "3x2";
    if (["asset_overview", "promo_banner", "ad_carousel", "risk_disclosure"].includes(id)) return "3x1";
    if (slot.sectionType === "hero" || slot.sectionType === "full") return "3x1";
    if (slot.sectionType === "rail") return "1x1";
    return "2x1";
  }

  function skeletonComponentMatchesSlotFamily(component, family) {
    if (!component?.family || !family) return false;
    if (component.family === family) return true;
    return family === "ClientHomeAtoms" && component.family === "ClientHomeAtoms";
  }

  function skeletonSchemeFor(config = currentConfig) {
    const normalized = home.normalizeConfig(config);
    if (normalized.skeletonHtmlScheme?.enabled) return normalized.skeletonHtmlScheme;
    return home.buildSkeletonHtmlScheme(normalized, {
      reason: "第一步只生成骨架和模块占位，等待逐 slot 填充。",
      sourceType: "local-skeleton",
      status: "pending-fill",
    });
  }

  function skeletonDesignContractFor(config = currentConfig) {
    const normalized = home.normalizeConfig(config);
    return (
      normalized.skeletonHtmlScheme?.designContract ||
      (typeof home.buildSkeletonDesignContract === "function" ? home.buildSkeletonDesignContract(normalized) : null) ||
      {}
    );
  }

  function skeletonDesignContractBrief(config = currentConfig) {
    const contract = skeletonDesignContractFor(config);
    return typeof home.skeletonDesignContractPrompt === "function" ? home.skeletonDesignContractPrompt(contract) : compactPromptJson(contract, 900);
  }

  function skeletonStageFor(slots, explicitStatus = "") {
    if (explicitStatus === "final") return "final";
    if (slots.some((slot) => slot.status === "generating")) return "generating";
    if (slots.length && slots.every((slot) => ["filled", "locked", "final"].includes(slot.status))) return "review";
    if (slots.some((slot) => ["filled", "locked", "failed"].includes(slot.status))) return "filled";
    return "pending-fill";
  }

  function withSkeletonSlotUpdate(config, slotId, slotPatch = {}, componentPatch, logPatch = null, schemePatch = {}) {
    const normalized = home.normalizeConfig(config);
    const baseScheme = skeletonSchemeFor(normalized);
    const slotKey = String(slotId || "").trim();
    const slotComponents = { ...(baseScheme.slotComponents || {}) };
    if (componentPatch === null) delete slotComponents[slotKey];
    else if (componentPatch) {
      slotComponents[slotKey] = {
        ...(slotComponents[slotKey] || {}),
        ...componentPatch,
        slot: slotKey,
      };
    }

    const slots = baseScheme.slots.map((slot) => {
      if (slot.id !== slotKey) return slot;
      const component = slotComponents[slotKey];
      return {
        ...slot,
        ...slotPatch,
        status: slotPatch.status || (component?.locked ? "locked" : component?.html ? "filled" : slot.status),
        componentId: component?.id || slotPatch.componentId || slot.componentId || "",
        filledAt: slotPatch.filledAt || (component?.html ? new Date().toISOString() : slot.filledAt || ""),
        locked: Boolean(slotPatch.locked ?? component?.locked ?? slot.locked),
      };
    });
    const logEntry = logPatch
      ? {
          slot: slotKey,
          label: slots.find((slot) => slot.id === slotKey)?.label || slotKey,
          action: logPatch.action || "generate",
          moduleId: slots.find((slot) => slot.id === slotKey)?.moduleId || "",
          variant: slots.find((slot) => slot.id === slotKey)?.variant || "",
          at: new Date().toISOString(),
        }
      : null;

    return home.normalizeConfig({
      ...normalized,
      renderMode: "skeletonHtml",
      activeRenderMode: "skeletonHtml",
      skeletonHtmlEnabled: true,
      skeletonHtmlScheme: {
        ...baseScheme,
        ...schemePatch,
        status: schemePatch.status || skeletonStageFor(slots, baseScheme.status),
        slots,
        slotComponents,
        slotRegenerationLog: logEntry ? [...(baseScheme.slotRegenerationLog || []), logEntry].slice(-20) : baseScheme.slotRegenerationLog || [],
      },
    });
  }

  function withSkeletonSchemeStatus(config, status) {
    const normalized = home.normalizeConfig(config);
    const baseScheme = skeletonSchemeFor(normalized);
    const finalSlots = status === "final" ? baseScheme.slots.map((slot) => ({ ...slot, status: "final", locked: true })) : baseScheme.slots;
    const slotComponents = { ...(baseScheme.slotComponents || {}) };
    if (status === "final") {
      Object.keys(slotComponents).forEach((slot) => {
        slotComponents[slot] = { ...slotComponents[slot], locked: true };
      });
    }
    return home.normalizeConfig({
      ...normalized,
      renderMode: "skeletonHtml",
      activeRenderMode: "skeletonHtml",
      skeletonHtmlEnabled: true,
      skeletonHtmlScheme: {
        ...baseScheme,
        status,
        slots: finalSlots,
        slotComponents,
      },
    });
  }

  function prepareConfigForPublish(config) {
    let next = home.normalizeConfig(config);
    const mode = next.activeRenderMode || next.renderMode || "config";
    if (mode === "skeletonHtml" && next.skeletonHtmlScheme?.enabled) {
      next = withSkeletonSchemeStatus(next, "final");
    } else if (mode === "aiHtml" && next.htmlScheme?.enabled) {
      next = home.normalizeConfig({
        ...next,
        renderMode: "aiHtml",
        activeRenderMode: "aiHtml",
        htmlGenerationEnabled: true,
      });
    } else {
      next = home.normalizeConfig({
        ...next,
        activeRenderMode: "config",
      });
    }
    const publishMode = next.activeRenderMode || next.renderMode || "config";
    return home.normalizeConfig({
      ...next,
      publishedAt: new Date().toISOString(),
      publishedRenderMode: publishMode,
      publishedRenderModeLabel: renderModeLabel(publishMode),
    });
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

  async function requestJsonEndpoint(path, payload) {
    const endpoints = localApiEndpointCandidates(path);
    let lastMessage = "";
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
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

  async function loadFallbackComponentLibrary() {
    if (Array.isArray(fallbackComponentLibrary)) return fallbackComponentLibrary;
    const endpoints = localApiEndpointCandidates("/home-component-library.json");
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { method: "GET" });
        if (!response.ok) continue;
        const data = await response.json().catch(() => null);
        fallbackComponentLibrary = Array.isArray(data?.components)
          ? data.components.filter((component) => component && typeof component === "object" && component.html && component.css)
          : [];
        return fallbackComponentLibrary;
      } catch (error) {
        // Try the next local/static endpoint.
      }
    }
    fallbackComponentLibrary = [];
    return fallbackComponentLibrary;
  }

  function fallbackComponentSizeParts(size, fallback = "2x1") {
    const normalized = String(size || fallback).trim().toLowerCase().replace(/[×*]/g, "x");
    const match = normalized.match(/^([1-9]\d?)x([1-9]\d?)$/);
    return match ? { columns: Number(match[1]) || 2, rows: Number(match[2]) || 1, value: normalized } : fallbackComponentSizeParts(fallback, "2x1");
  }

  function fallbackComponentSizeDistance(firstSize, secondSize) {
    const first = fallbackComponentSizeParts(firstSize);
    const second = fallbackComponentSizeParts(secondSize);
    return Math.abs(first.columns - second.columns) + Math.abs(first.rows - second.rows);
  }

  function fallbackComponentScore(component, fallback = 5) {
    const score = Number(component?.score);
    if (!Number.isFinite(score)) return fallback;
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  function fallbackComponentReferenceTier(component) {
    const score = fallbackComponentScore(component, 5);
    if (score >= 8) return "strong";
    if (score >= 6) return "moderate";
    return "blocked";
  }

  function fallbackComponentReferencePriority(component) {
    const tier = fallbackComponentReferenceTier(component);
    if (tier === "strong") return 260;
    if (tier === "moderate") return 72;
    return -10000;
  }

  function fallbackComponentCanReference(component) {
    return fallbackComponentReferenceTier(component) !== "blocked";
  }

  function fallbackComponentSearchText(component) {
    return [
      component.id,
      component.name,
      component.family,
      component.size,
      component.description,
      component.sourcePrompt,
      ...(Array.isArray(component.tags) ? component.tags : []),
      ...(Array.isArray(component.layoutHints) ? component.layoutHints : []),
      ...(Array.isArray(component.dataRequirements) ? component.dataRequirements : []),
    ]
      .join(" ")
      .toLowerCase();
  }

  function fallbackComponentMatchesSlotFamily(component, family) {
    if (!family) return true;
    if (component.family === family) return true;
    const haystack = fallbackComponentSearchText(component);
    if (family === "CopytradingSignals") {
      return component.family === "ClientHomeAtoms" && /copytrading|copy trading|信号源|signals?|跟单/i.test(haystack);
    }
    if (family === "PammProducts") {
      return component.family === "ClientHomeAtoms" && /pamm|资管|产品推荐|策略产品|managed|portfolio/i.test(haystack);
    }
    return false;
  }

  function fallbackComponentVisibleText(component) {
    return String(component?.html || "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function rankedFallbackComponentsForSlot(components, slot, action, config = currentConfig) {
    const normalized = home.normalizeConfig(config);
    const slotId = slot.id || slot.slot || "";
    const family = skeletonSlotFamily(slotId);
    const size = skeletonSlotSize(slot);
    const brick = skeletonBrickForSlot(slot, normalized);
    const referenceIds = new Set(
      [
        brick?.referenceComponentId,
        ...(Array.isArray(normalized.componentReferences)
          ? normalized.componentReferences
              .filter((reference) => reference?.family === family || reference?.module === family || reference?.component === slotId)
              .map((reference) => reference.componentId || reference.id)
          : []),
      ]
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    );
    const promptText = [slot.label, slot.sectionTitle, slotId, brick?.brickName, brick?.reason, action].filter(Boolean).join(" ").toLowerCase();
    const referenceableComponents = components.filter(fallbackComponentCanReference);
    const sameFamily = referenceableComponents.filter((component) => fallbackComponentMatchesSlotFamily(component, family));
    const pool = sameFamily.length ? sameFamily : family === "ClientHomeAtoms" ? referenceableComponents.filter((component) => component.family === "ClientHomeAtoms") : [];
    const candidates = pool.length ? pool : [];
    return candidates
      .filter(fallbackComponentCanReference)
      .map((component, index) => {
        const haystack = fallbackComponentSearchText(component);
        const promptHits = promptText
          .split(/\s+|[，,。；;、]/)
          .filter((word) => word.length >= 2 && haystack.includes(word)).length;
        const referenceScore = referenceIds.has(component.id) ? 160 : 0;
        const familyScore = component.family === family ? 100 : fallbackComponentMatchesSlotFamily(component, family) ? 46 : 0;
        const exactSizeScore = component.size === size ? 36 : 0;
        const sizeScore = Math.max(0, 28 - fallbackComponentSizeDistance(component.size, size) * 7);
        const userScore = fallbackComponentScore(component, 5);
        return {
          component,
          score: fallbackComponentReferencePriority(component) + referenceScore + familyScore + exactSizeScore + sizeScore + promptHits * 8 + userScore * 4 - index * 0.01,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function selectedFallbackComponentFromLibrary(components, slot, action, config = currentConfig) {
    return rankedFallbackComponentsForSlot(components, slot, action, config).map((item) => item.component)[0] || null;
  }

  async function skeletonHighScoreReferenceContext(slot, action, config = currentConfig) {
    const components = await loadFallbackComponentLibrary();
    return rankedFallbackComponentsForSlot(components, slot, action, config)
      .slice(0, 6)
      .map(({ component }) => ({
        type: "skeleton-slot-high-score",
        componentId: component.id || "",
        family: component.family || skeletonSlotFamily(slot.id),
        name: component.name || component.id || "高分积木",
        size: component.size || skeletonSlotSize(slot),
        score: fallbackComponentScore(component, 5),
        visibleText: fallbackComponentVisibleText(component).slice(0, 240),
        description: String(component.description || "").slice(0, 180),
        layoutHints: Array.isArray(component.layoutHints) ? component.layoutHints.slice(0, 4) : [],
        dataRequirements: Array.isArray(component.dataRequirements) ? component.dataRequirements.slice(0, 4) : [],
      }));
  }

  function isStrictWelcomeHeaderPrompt(slot, userPrompt = "") {
    if ((slot.id || slot.slot) !== "welcome_header") return false;
    const text = String(userPrompt || "");
    const hasWelcomeCue = /姓名|客户姓名|用户名|昵称|问候|欢迎|最近登录|上次登录|last\s*login|login\s*time/i.test(text);
    const hasLimitCue = /只要求|只需要|只放|只展示|只显示|只保留|仅|只要|不要.{0,24}(营销|开户|入金|资产|KYC|认证|引导|钱包|总资产)/i.test(text);
    return hasWelcomeCue && (hasLimitCue || /最近登录|上次登录|last\s*login|login\s*time/i.test(text));
  }

  async function brickFallbackSlotComponent(slot, action, error = null, options = {}) {
    if (isStrictWelcomeHeaderPrompt(slot, options.userPrompt)) return localFallbackSlotComponent(slot, action, error, options);
    const components = await loadFallbackComponentLibrary();
    const selected = selectedFallbackComponentFromLibrary(components, slot, action);
    if (!selected) return localFallbackSlotComponent(slot, action, error);
    const size = skeletonSlotSize(slot);
    const reason = error
      ? `模型生成失败，已引用积木库「${selected.name || selected.id}」：${errorMessage(error, 120)}`
      : `已引用积木库「${selected.name || selected.id}」作为组件级兜底。`;
    return {
      ...selected,
      slot: slot.id || slot.slot || "",
      size: selected.size || size,
      sourceType: "brick-fallback",
      fallbackReason: reason,
      fallbackMode: "high-score-same-brick-micro-tune",
      fallbackContract: "高分积木同款保底：保留原组件 HTML/CSS 主结构，只做主题 token、响应式、动作绑定、文案和尺寸适配微调。",
      referenceComponentId: selected.id || "",
      referenceComponentName: selected.name || "",
      referenceFamily: selected.family || skeletonSlotFamily(slot.id),
      referenceScore: fallbackComponentScore(selected, 5),
      referenceTier: fallbackComponentReferenceTier(selected),
      requestedSize: size,
      generatedAt: new Date().toISOString(),
      layoutHints: [...(Array.isArray(selected.layoutHints) ? selected.layoutHints : []), `requested-size:${size}`].slice(0, 8),
    };
  }

  function localFallbackSlotComponent(slot, action, error = null, options = {}) {
    const label = slot.label || home.featureLabel(slot.id);
    const rootClass = `skeleton-local-${String(slot.id || "slot").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    const reason = action === "style" ? "已切换备用样式" : "内容待生成";
    if (isStrictWelcomeHeaderPrompt(slot, options.userPrompt)) {
      return {
        id: `${slot.id}-local-${Date.now().toString(36)}`,
        slot: slot.id,
        name: "极简欢迎登录条",
        family: "WelcomeHeader",
        size: skeletonSlotSize(slot),
        sourceType: "local-fallback",
        generatedAt: new Date().toISOString(),
        description: error ? `严格欢迎头部兜底：${errorMessage(error, 120)}` : "只展示客户姓名、问候语和最近登录时间的欢迎头部",
        html: `
          <section class="${rootClass}" aria-label="欢迎头部">
            <div>
              <strong>早安，张明</strong>
              <span>欢迎回来</span>
            </div>
            <p><small>最近登录时间</small><b>2026-05-20 09:41</b></p>
          </section>
        `,
        css: `
          .${rootClass}{min-height:128px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg,#fff);color:var(--home-text,#172033)}
          .${rootClass} *{box-sizing:border-box}
          .${rootClass} div{display:grid;gap:6px}
          .${rootClass} strong{color:var(--home-text-strong,#0f172a);font-size:26px;font-weight:950;letter-spacing:0}
          .${rootClass} span,.${rootClass} small{color:var(--home-text-muted,#64748b);font-size:13px;font-weight:850}
          .${rootClass} p{display:grid;gap:5px;min-width:220px;margin:0;padding:12px 14px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}
          .${rootClass} b{color:var(--home-text-strong,#0f172a);font-size:15px;font-weight:950}
          @media(max-width:720px){.${rootClass}{align-items:stretch;flex-direction:column}.${rootClass} p{min-width:0;width:100%}}
        `,
        dataRequirements: ["customerName", "greeting", "lastLoginAt"],
      };
    }
    if (slot.id === "risk_disclosure" || slot.id === "risk_notice") {
      return {
        id: `${slot.id}-local-${Date.now().toString(36)}`,
        slot: slot.id,
        name: "风险披露提示条",
        family: "RiskDisclosure",
        size: skeletonSlotSize(slot),
        sourceType: "local-fallback",
        generatedAt: new Date().toISOString(),
        description: error ? `模型生成失败后的风险提示兜底：${errorMessage(error, 120)}` : "本地风险提示兜底组件",
        html: `
          <article class="${rootClass}" role="note" aria-label="风险提示">
            <header><span>Risk Disclosure</span><strong>风险提示</strong></header>
            <div>
              <p><b>杠杆风险</b><small>杠杆交易可能放大亏损，交易前请确认自身风险承受能力。</small></p>
              <p><b>保证金风险</b><small>市场快速波动时可能触发追加保证金或强制平仓。</small></p>
              <p><b>合规披露</b><small>正式风险披露、地区限制和条款链接以后台合规配置为准。</small></p>
            </div>
          </article>
        `,
        css: `
          .${rootClass}{display:grid;gap:12px;min-height:144px;padding:16px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff);color:var(--home-text,#172033)}
          .${rootClass} header{display:flex;align-items:center;justify-content:space-between;gap:10px}
          .${rootClass} span{color:var(--home-primary,#2563eb);font-size:11px;font-weight:950;text-transform:uppercase}
          .${rootClass} strong{color:var(--home-text-strong,#0f172a);font-size:18px;font-weight:950}
          .${rootClass} div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
          .${rootClass} p{display:grid;gap:5px;margin:0;padding:10px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg,#fff)}
          .${rootClass} b{font-size:13px}
          .${rootClass} small{color:var(--home-text-muted,#64748b);font-size:12px;line-height:1.5}
          @media(max-width:720px){.${rootClass} div{grid-template-columns:1fr}}
        `,
      };
    }
    if (slot.id === "support_contact") {
      return {
        id: `${slot.id}-local-${Date.now().toString(36)}`,
        slot: slot.id,
        name: "在线客服服务卡",
        family: "SupportContact",
        size: skeletonSlotSize(slot),
        sourceType: "local-fallback",
        generatedAt: new Date().toISOString(),
        description: error ? `模型生成失败后的在线客服兜底：${errorMessage(error, 120)}` : "本地在线客服兜底组件",
        html: `
          <article class="${rootClass}" aria-label="在线客服">
            <header>
              <strong>在线客服</strong>
              <span>服务状态</span>
            </header>
            <div class="support-fields">
              <p><small>服务时间</small><b>后台配置</b></p>
              <p><small>在线状态</small><b>接口同步</b></p>
              <p><small>客户经理</small><b>待分配</b></p>
            </div>
            <section>
              <small>最近工单</small>
              <b>#CS-1024 出金审核咨询</b>
              <span>处理中 · 预计 24h 内回复</span>
            </section>
            <footer>
              <a data-home-action="contactSupport" href="#support">联系客服</a>
              <a data-home-action="supportCenter" href="#support-center">帮助中心</a>
            </footer>
          </article>
        `,
        css: `
          .${rootClass}{display:grid;gap:12px;min-height:168px;padding:16px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg,#fff);color:var(--home-text,#172033)}
          .${rootClass} *{box-sizing:border-box}
          .${rootClass} header{display:flex;align-items:center;justify-content:space-between;gap:12px}
          .${rootClass} header strong{color:var(--home-text-strong,#0f172a);font-size:18px;font-weight:950}
          .${rootClass} header span{padding:4px 8px;border-radius:var(--home-radius-sm,8px);background:var(--home-primary-soft,#eff6ff);color:var(--home-primary,#2563eb);font-size:11px;font-weight:950}
          .${rootClass} .support-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .${rootClass} p,.${rootClass} section{display:grid;gap:5px;margin:0;padding:10px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}
          .${rootClass} small{color:var(--home-text-muted,#64748b);font-size:11px;font-weight:850}
          .${rootClass} b{min-width:0;overflow:hidden;color:var(--home-text-strong,#0f172a);font-size:13px;font-weight:950;text-overflow:ellipsis;white-space:nowrap}
          .${rootClass} section span{color:var(--home-text-muted,#64748b);font-size:12px}
          .${rootClass} footer{display:flex;gap:8px;flex-wrap:wrap}
          .${rootClass} a{min-height:34px;display:inline-flex;align-items:center;justify-content:center;padding:0 12px;border:1px solid var(--home-button-border,var(--home-primary,#2563eb));border-radius:var(--home-radius-sm,8px);background:var(--home-button-bg,var(--home-primary,#2563eb));color:var(--home-button-text,#fff);font-size:12px;font-weight:950;text-decoration:none}
          .${rootClass} a + a{border-color:var(--home-border,#dbe4ef);background:var(--home-surface,#fff);color:var(--home-text,#172033)}
          @media(max-width:720px){.${rootClass} .support-fields{grid-template-columns:1fr}.${rootClass} a{width:100%}}
        `,
      };
    }
    return {
      id: `${slot.id}-local-${Date.now().toString(36)}`,
      slot: slot.id,
      name: `${label}组件`,
      family: skeletonSlotFamily(slot.id),
      size: skeletonSlotSize(slot),
      sourceType: "local-fallback",
      generatedAt: new Date().toISOString(),
      description: error ? `模型生成失败后的本地兜底：${errorMessage(error, 120)}` : reason,
      html: `
        <article class="${rootClass}">
          <header><span>${escapeHtml(reason)}</span><strong>${escapeHtml(label)}</strong></header>
          <div>
            <b>${escapeHtml(slot.sectionTitle || "首页模块")}</b>
            <small>${escapeHtml(slot.id)} · ${escapeHtml(slot.variant || slot.sectionType || "slot")}</small>
          </div>
        </article>
      `,
      css: `
        .${rootClass}{display:grid;gap:10px;min-height:124px;padding:14px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg,#fff);color:var(--home-text,#172033)}
        .${rootClass} header{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .${rootClass} span{color:var(--home-primary,#2563eb);font-size:11px;font-weight:950}
        .${rootClass} strong{font-size:16px;font-weight:950}
        .${rootClass} div{display:grid;gap:6px;padding:10px;border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}
        .${rootClass} b{font-size:13px}
        .${rootClass} small{color:var(--home-text-muted,#64748b);font-size:12px}
      `,
    };
  }

  function compactPromptText(value, fallback = "", limit = 220) {
    const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
    return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3))}...` : text;
  }

  function compactPromptJson(value, limit = 520) {
    if (!value) return "";
    try {
      const text = JSON.stringify(value);
      return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3))}...` : text;
    } catch (error) {
      return "";
    }
  }

  function compactPromptSettingValue(value) {
    if (Array.isArray(value)) return value.slice(0, 8).map((item) => compactPromptSettingValue(item));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => ["string", "number", "boolean"].includes(typeof item) || Array.isArray(item))
        .slice(0, 10)
        .map(([key, item]) => [key, Array.isArray(item) ? item.slice(0, 8) : item]),
    );
  }

  function skeletonSlotSettingKeys(slotId) {
    return {
      welcome_header: ["welcome"],
      asset_overview: ["assets", "wallet"],
      wallet_balance: ["wallet", "assets"],
      wallet_list: ["wallet", "assets"],
      fund_actions: ["fundActions", "assets"],
      quick_actions: ["quickActions"],
      promo_banner: ["promoHighlight", "adCarousel"],
      ad_carousel: ["promoHighlight", "adCarousel"],
      referral_link_card: ["referralLinkCard", "referral"],
      onboarding_guide: ["openAccount", "userKycRail"],
      user_kyc_rail: ["userKycRail", "openAccount"],
      trading_account_highlight: ["tradingAccounts", "accountPerformance"],
      trading_accounts_list: ["tradingAccounts", "openAccount"],
      create_account_form: ["openAccount", "createAccount"],
      pamm_products: ["pamm"],
      copytrading_signals: ["copytrading"],
      risk_disclosure: ["riskDisclosure", "riskNotice"],
      risk_notice: ["riskDisclosure", "riskNotice"],
      faq_section: ["faq"],
      support_contact: ["supportContact"],
      app_download: ["appDownload"],
    }[slotId] || [];
  }

  function skeletonRelatedSettings(slot, config) {
    const settings = config.moduleSettings && typeof config.moduleSettings === "object" ? config.moduleSettings : {};
    const summary = {};
    skeletonSlotSettingKeys(slot.id).forEach((key) => {
      if (settings[key] === undefined) return;
      summary[key] = compactPromptSettingValue(settings[key]);
    });
    return Object.keys(summary).length ? summary : null;
  }

  function skeletonBrickForSlot(slot, config) {
    const bricks = Array.isArray(config.brickPlan) ? config.brickPlan : [];
    const slotId = slot.id || slot.slot || "";
    const family = skeletonSlotFamily(slotId);
    const exact = bricks.find((brick) => [brick?.component, brick?.feature, brick?.slot].includes(slotId));
    if (exact) return exact;
    return bricks.find((brick) => family !== "ClientHomeAtoms" && brick?.family === family) || null;
  }

  function skeletonPageBrief(config = currentConfig) {
    const normalized = home.normalizeConfig(config);
    return [
      `页面摘要：${compactPromptText(normalized.aiSummary || normalized.name, "专业 ForexCRM 用户端首页", 180)}`,
      `页面框架：${compactPromptText(normalized.layoutPreset || normalized.pageStory || "standard", "standard", 64)} / ${compactPromptText(normalized.themePreset || normalized.theme, "default", 64)} / ${compactPromptText(normalized.density, "balanced", 40)}`,
      normalized.heroFocus ? `首屏重心：${home.featureLabel(normalized.heroFocus)}` : "",
      skeletonDesignContractBrief(normalized),
      "全局边界：不要编造收益、下载链接、联系方式、活动规则或后台未提供数据；整体保持克制、专业、可嵌入金融客户端。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function skeletonSlotObjective(slot) {
    return {
      welcome_header: "生成轻量欢迎头部，优先体现客户姓名、问候和最近登录/当前时间；除非管理员明确要求，不要扩展成开户、入金、资产或营销引导。",
      asset_overview: "生成账户概览组件，聚焦总资产、钱包余额、交易账号余额或可用资金，缺失数据用占位或隐藏。",
      wallet_balance: "生成钱包余额摘要，突出币种、可用余额、冻结/处理中状态和资金动作入口。",
      wallet_list: "生成多币种钱包列表或表格，字段密度清楚，币种、余额、状态和操作入口要分层。",
      fund_actions: "生成资金操作组件，入金、出金、内部转账等主次清楚，不要扩展成完整资产页。",
      quick_actions: "生成快捷入口组件，4-10 个操作可扫描，主操作突出，其余入口保持统一 icon 或 icon+文字节奏。",
      promo_banner: "生成活动或公告承接组件，只展示后台已有活动/公告占位，不虚构奖池、倒计时或奖励规则。",
      ad_carousel: "生成活动或公告承接组件，只展示后台已有活动/公告占位，不虚构奖池、倒计时或奖励规则。",
      referral_link_card: "生成推广链接卡片，围绕开户链接、邀请码、复制/分享动作和可选基础统计，不生成完整代理中心。",
      onboarding_guide: "生成开户/认证引导组件，体现 KYC、开真实账户、首次入金等步骤、状态和下一步 CTA。",
      user_kyc_rail: "生成 CRM 账户 KYC 状态组件，只展示当前状态、审核提示和提交/重新提交入口。",
      trading_account_highlight: "生成账号表现组件，左侧账号信息和右侧 7D/30D 净值或 PnL 趋势容器要清楚。",
      trading_accounts_list: "生成交易账号列表组件，真实账号和模拟账号都要可见，支持列表或卡片但字段不要堆叠混乱。",
      create_account_form: "生成创建交易账号表单组件，平台、账号类型、币种、杠杆和创建按钮完整。",
      pamm_products: "生成 PAMM 产品推荐组件，产品收益、规模、风险和曲线都以接口字段或占位表达，不与 CopyTrading 混合。",
      copytrading_signals: "生成 CopyTrading 信号源推荐组件，信号源、收益、回撤、风险和趋势图容器独立呈现。",
      risk_disclosure: "生成合规风险提示组件，聚焦杠杆、保证金、亏损风险和后台合规文案占位。",
      risk_notice: "生成合规风险提示组件，聚焦杠杆、保证金、亏损风险和后台合规文案占位。",
      faq_section: "生成 FAQ 组件，问题和答案来自平台配置或 demo 占位，适合低干扰辅助区域。",
      support_contact: "生成在线客服/客户经理组件，包含服务时间、在线状态或工单/帮助中心入口。",
      app_download: "生成 APP / MT5 下载入口组件，二维码、平台入口和下载状态以后台配置或占位表达。",
    }[slot.id] || "生成当前 slot 对应的真实业务组件，内容要服务当前模块，不要扩展成无关首页区块。";
  }

  function compactSkeletonDesignContract(contract = {}) {
    const tokens = contract.tokens && typeof contract.tokens === "object" ? contract.tokens : {};
    const chromePolicy = contract.chromePolicy && typeof contract.chromePolicy === "object" ? contract.chromePolicy : {};
    return {
      id: compactPromptText(contract.id, "ops-console", 48),
      label: compactPromptText(contract.label, "账户运营控制台契约", 80),
      personality: compactPromptText(contract.personality, "", 48),
      tone: compactPromptText(contract.tone, "", 120),
      surface: compactPromptText(contract.surface, "", 180),
      density: compactPromptText(contract.density, "balanced", 32),
      theme: compactPromptText(contract.theme, "blueFinance", 48),
      tokens: {
        cardRadius: compactPromptText(tokens.cardRadius, "8px", 24),
        buttonRadius: compactPromptText(tokens.buttonRadius, "8px", 24),
        sectionGap: compactPromptText(tokens.sectionGap, "14px", 24),
        cardPadding: compactPromptText(tokens.cardPadding, "16px", 24),
        cardShadow: compactPromptText(tokens.cardShadow, "none", 80),
      },
      componentRules: (Array.isArray(contract.componentRules) ? contract.componentRules : []).slice(0, 4),
      ctaRules: (Array.isArray(contract.ctaRules) ? contract.ctaRules : []).slice(0, 3),
      moduleGrammar: compactPromptText(contract.moduleGrammar, "", 180),
      differenceRule: compactPromptText(contract.differenceRule, "", 180),
      chromePolicy: {
        mode: compactPromptText(chromePolicy.mode, "cardedDashboard", 40),
        sectionChrome: compactPromptText(chromePolicy.sectionChrome, "group", 32),
        defaultSlotChrome: compactPromptText(chromePolicy.defaultSlotChrome, "contained", 32),
        componentBoundary: compactPromptText(chromePolicy.componentBoundary, "component-contained", 48),
        promptRule: compactPromptText(chromePolicy.promptRule, "", 180),
      },
    };
  }

  function compactSkeletonPagePlan(config = {}) {
    const plan = config.pagePlan && typeof config.pagePlan === "object" ? config.pagePlan : {};
    const visualHierarchy = {};
    Object.entries(plan.visualHierarchy && typeof plan.visualHierarchy === "object" ? plan.visualHierarchy : {})
      .slice(0, 14)
      .forEach(([key, value]) => {
        visualHierarchy[key] = Number(value) || 0;
      });
    const moduleRoles = {};
    Object.entries(plan.moduleRoles && typeof plan.moduleRoles === "object" ? plan.moduleRoles : {})
      .slice(0, 14)
      .forEach(([key, value]) => {
        const role = value && typeof value === "object" ? value : {};
        moduleRoles[key] = {
          role: compactPromptText(role.role, "", 24),
          weight: Number(role.weight) || visualHierarchy[key] || 0,
        };
      });
    const compositionGroups = (Array.isArray(plan.compositionGroups) ? plan.compositionGroups : [])
      .slice(0, 4)
      .map((group) => ({
        id: compactPromptText(group?.id, "", 48),
        title: compactPromptText(group?.title, "", 60),
        role: compactPromptText(group?.role, "", 28),
        surface: compactPromptText(group?.surface, "", 40),
        modules: Array.isArray(group?.modules) ? group.modules.slice(0, 8) : [],
        visualWeight: Number(group?.visualWeight) || 0,
        guidance: compactPromptText(group?.guidance, "", 140),
      }))
      .filter((group) => group.id || group.modules.length);
    return {
      pageGoal: compactPromptText(plan.pageGoal, "", 40),
      primaryCta: compactPromptText(plan.primaryCta || plan.primaryAction?.label, "", 80),
      mainVisual: compactPromptText(plan.mainVisual, "", 48),
      layoutStrategy: compactPromptText(plan.layoutStrategy, "", 48),
      compositionGroups,
      visualHierarchy,
      moduleRoles,
      compositionRules: (Array.isArray(plan.compositionRules) ? plan.compositionRules : []).slice(0, 6),
    };
  }

  function skeletonParentGroupForSlot(slotId, pagePlan = {}) {
    const group = (Array.isArray(pagePlan.compositionGroups) ? pagePlan.compositionGroups : []).find((item) =>
      Array.isArray(item.modules) && item.modules.includes(slotId),
    );
    if (!group) return null;
    return {
      id: group.id,
      title: group.title,
      role: group.role,
      surface: group.surface,
      modules: group.modules,
      guidance: group.guidance,
    };
  }

  function skeletonSlotSurfaceBehavior(slot = {}, pagePlan = {}) {
    const chrome = compactPromptText(slot.chrome || "contained", "contained", 32);
    const role = compactPromptText(pagePlan.moduleRoles?.[slot.id]?.role, "", 24);
    const weight = Number(pagePlan.visualHierarchy?.[slot.id] || pagePlan.moduleRoles?.[slot.id]?.weight || 0);
    if (["bare", "inline", "flat"].includes(chrome) || role === "support" || role === "decision" || (weight > 0 && weight < 70)) {
      return "content-fragment";
    }
    if (chrome === "featured") return "featured-main-path";
    if (chrome === "tableSurface") return "shared-workbench-surface";
    if (chrome === "legalStrip") return "legal-strip";
    if (chrome === "rail") return "side-rail";
    return "contained-surface";
  }

  function compactSkeletonHighScoreReferences(references, strictWelcome = false) {
    if (strictWelcome) return [];
    return (Array.isArray(references) ? references : [])
      .slice(0, 4)
      .map((item) => ({
        componentId: compactPromptText(item.componentId, "", 80),
        family: compactPromptText(item.family, "", 48),
        name: compactPromptText(item.name, "", 60),
        size: compactPromptText(item.size, "", 16),
        score: item.score,
        visibleText: compactPromptText(item.visibleText, "", 160),
        description: compactPromptText(item.description, "", 120),
        layoutHints: Array.isArray(item.layoutHints) ? item.layoutHints.slice(0, 3) : [],
        dataRequirements: Array.isArray(item.dataRequirements) ? item.dataRequirements.slice(0, 3) : [],
      }));
  }

  function skeletonAdjacentSlotBrief(slot, config = currentConfig) {
    const scheme = skeletonSchemeFor(config);
    const slots = Array.isArray(scheme.slots) ? scheme.slots : [];
    const index = slots.findIndex((item) => item.id === slot.id);
    if (index < 0) return { previous: null, next: null };
    const toBrief = (item) =>
      item
        ? {
            id: item.id,
            label: item.label || home.featureLabel(item.id),
            sectionType: item.sectionType || "",
          }
        : null;
    return {
      previous: toBrief(slots[index - 1]),
      next: toBrief(slots[index + 1]),
    };
  }

  function skeletonSlotHardRules(slot, strictWelcome = false) {
    return [
      "只生成当前 slot 的组件 HTML/CSS，不重排整页骨架，不改其他模块。",
      "不要把完整 sections、skeletonHtml 或其他 slot 的 HTML/CSS 放进单组件 prompt，也不要在组件 UI 里渲染管理员提示词。",
      "CSS 必须优先使用 var(--home-*) 和 var(--home-skeleton-contract-*) token；不要为当前 slot 单独发明随机品牌色、渐变、厚阴影或大圆角。",
      "模块外壳由 pageDesign.designContract.chromePolicy 和 slotContract.chrome 决定；bare/inline/flat 不要自带完整卡片外框，contained/featured/tableSurface 才允许轻量外壳。",
      "页面外壳和 parentGroup 负责整体感；当前 slot 应继承父级表面、标题语言和按钮层级，优先用分割线、指标行、列表、图表区或内联按钮衔接。",
      "support/decision/低权重 slot 必须降噪：不要生成大标题、大背景、厚边框、强阴影、强主按钮或完整独立卡片。",
      "不要重复 sectionTitle 或 parentGroup 标题；除非 slot 是 primary/featured，否则组件标题保持短小、低干扰。",
      "生成 HTML 时优先把 title、metrics、actions、list/chart 当作当前 slot 的内容片段；不要每个 slot 都重复大标题区、厚边框、白卡片和强阴影。",
      "组件库评分规则：8-10 分强参考，6-7 分适度参考，5 分及以下禁止参考。",
      "结构要求：至少体现一种明确组件工艺，例如指标带、状态条、步骤连接、趋势图容器、操作坞、表格/列表、左右分栏或紧凑信息流。",
      slot.id === "risk_disclosure" || slot.id === "risk_notice"
        ? "风险提示硬性要求：只能生成风险披露、杠杆风险、保证金风险、亏损风险、合规说明；不要生成资产概览、账户余额、入金、开户或营销活动组件。"
        : "",
      slot.id === "support_contact"
        ? "在线客服硬性要求：生成在线客服 serviceCard，必须包含服务时间、在线状态或客户经理、工单/帮助中心、联系客服主按钮；不要显示页面摘要、当前步骤、slot 等管理员提示词；不要生成账户余额、KYC、开户或钱包组件。"
        : "",
      strictWelcome
        ? "欢迎头部硬性要求：只展示客户姓名/昵称、问候语、最近登录时间三类信息；不要生成身份认证、真实账户、首次入金、总资产、钱包余额、营销活动、下一步 CTA 或操作按钮。"
        : "",
    ].filter(Boolean);
  }

  function skeletonSlotPromptContract(slot, action, highScoreReferences = [], options = {}) {
    const normalized = home.normalizeConfig(currentConfig);
    const userPrompt = compactPromptText(options.userPrompt, "", 900);
    const existingBrief = skeletonComponentBrief(options.existingComponent);
    const actionText =
      action === "style"
        ? "更换一种明显不同的组件样式"
        : existingBrief
          ? "重生成这个 slot 的组件内部呈现"
          : "生成这个 slot 的完整组件";
    const brick = skeletonBrickForSlot(slot, normalized);
    const relatedSettings = skeletonRelatedSettings(slot, normalized);
    const strictWelcome = isStrictWelcomeHeaderPrompt(slot, userPrompt);
    const references = compactSkeletonHighScoreReferences(highScoreReferences, strictWelcome);
    const designContract = compactSkeletonDesignContract(skeletonDesignContractFor(normalized));
    const pagePlan = compactSkeletonPagePlan(normalized);
    const parentGroup = skeletonParentGroupForSlot(slot.id, pagePlan);
    const roleInfo = pagePlan.moduleRoles?.[slot.id] || {};
    const originalSlotPrompt = compactPromptText(
      options.existingComponent?.originalSlotPrompt || options.existingComponent?.sourcePrompt || `${slot.label || home.featureLabel(slot.id)}：${skeletonSlotObjective(slot)}`,
      "",
      900,
    );
    return {
      contractVersion: "skeleton-slot-v2",
      pageDesign: {
        summary: compactPromptText(normalized.aiSummary || normalized.name, "专业 ForexCRM 用户端首页", 180),
        layoutPreset: compactPromptText(normalized.layoutPreset || normalized.pageStory || "standard", "standard", 64),
        themePreset: compactPromptText(normalized.themePreset || normalized.theme, "default", 64),
        density: compactPromptText(normalized.density || designContract.density, "balanced", 40),
        heroFocus: normalized.heroFocus ? home.featureLabel(normalized.heroFocus) : "",
        designContract,
        pagePlan,
      },
      slotContract: {
        id: slot.id,
        label: slot.label || home.featureLabel(slot.id),
        family: skeletonSlotFamily(slot.id),
        size: skeletonSlotSize(slot),
        sectionTitle: slot.sectionTitle || slot.sectionId || "首页区域",
        sectionType: slot.sectionType || "full",
        variant: slot.variant || "",
        morph: slot.morph || "",
        chrome: compactPromptText(slot.chrome || "contained", "contained", 32),
        role: compactPromptText(roleInfo.role, "", 24),
        visualWeight: Number(pagePlan.visualHierarchy?.[slot.id] || roleInfo.weight || 0),
        parentGroup,
        surfaceBehavior: skeletonSlotSurfaceBehavior(slot, pagePlan),
        action: actionText,
        objective: skeletonSlotObjective(slot),
        brickIntent: brick ? compactPromptText([brick.brickName || brick.brickId, brick.reason].filter(Boolean).join(" - "), "", 220) : "",
        relatedSettings,
        adjacentSlots: skeletonAdjacentSlotBrief(slot, normalized),
      },
      originalSlotPrompt,
      userPrompt,
      currentComponentSummary: existingBrief || null,
      currentReferences: references,
      hardRules: skeletonSlotHardRules(slot, strictWelcome),
    };
  }

  function skeletonSlotPromptFromContract(contract = {}) {
    const slot = contract.slotContract || {};
    return [
      "骨架 HTML 单 slot 生成契约 v2:",
      "只填充当前 slot。全页一致性来自 pageDesign.designContract；当前组件要求来自 slotContract。",
      "全局设计契约:",
      compactPromptJson(contract.pageDesign, 1200),
      "",
      "页面布局计划:",
      compactPromptJson(contract.pageDesign?.pagePlan, 1000),
      "",
      "当前模块 brief:",
      compactPromptJson(slot, 1200),
      contract.originalSlotPrompt ? `原始生成基线：${contract.originalSlotPrompt}` : "",
      contract.userPrompt ? `管理员补充 prompt（当前 slot 最高优先级）：${contract.userPrompt}` : "",
      contract.currentComponentSummary ? `当前已有组件摘要：${compactPromptJson(contract.currentComponentSummary, 620)}` : "",
      contract.currentReferences?.length ? `当前 slot 优先参考的高分积木：${compactPromptJson(contract.currentReferences, 860)}` : "当前 slot 暂无显式高分积木参考时，也必须遵守同 family 积木语言和设计治理。",
      "",
      "输出要求:",
      "生成真实业务字段、清晰按钮层级、专业金融客户端质感；不要只显示模块名或通用占位。",
      "参考同 family 积木的字段密度、按钮层级、状态标签、卡片比例和响应式方式，生成新的漂亮变体；不要照抄积木，也不要只换颜色。",
      ...(Array.isArray(contract.hardRules) ? contract.hardRules : []),
      contract.currentComponentSummary ? "差异要求：当前已有组件不能原样返回；HTML/CSS 必须在 DOM 结构、字段组织、密度、主次层级或交互区排布上至少一处明显不同。" : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function skeletonSlotPrompt(slot, action, highScoreReferences = [], options = {}) {
    return skeletonSlotPromptFromContract(skeletonSlotPromptContract(slot, action, highScoreReferences, options));
  }

  function applySkeletonSlotPromptMetadata(component, promptContract, promptText, userPrompt = "", existingComponent = null) {
    if (!component || typeof component !== "object") return component;
    const originalSlotPrompt = compactPromptText(existingComponent?.originalSlotPrompt || component.originalSlotPrompt || promptContract?.originalSlotPrompt || promptText, "", 1200);
    return {
      ...component,
      sourcePrompt: compactPromptText(component.sourcePrompt || originalSlotPrompt || promptText, "", 1200),
      originalSlotPrompt,
      slotPromptContractSummary: compactPromptJson(promptContract, 1800),
      lastAdjustmentPrompt: compactPromptText(userPrompt, "", 500),
    };
  }

  async function generateSkeletonSlot(slotId, action = "regenerate", options = {}) {
    if (!isSkeletonPreviewConfig()) return;
    const scheme = skeletonSchemeFor(currentConfig);
    const slot = scheme.slots.find((item) => item.id === slotId);
    if (!slot) return;
    if ((slot.locked || slot.status === "locked" || slot.status === "final") && action !== "unlock") {
      showToast("该模块已锁定，先解锁再重生成");
      return;
    }
    if (action === "lock" || action === "unlock") {
      const locked = action === "lock";
      const component = scheme.slotComponents?.[slotId] || null;
      const next = withSkeletonSlotUpdate(
        currentConfig,
        slotId,
        { status: locked ? "locked" : component?.html ? "filled" : "pending-fill", locked },
        component ? { ...component, locked } : undefined,
        { action },
        { status: locked ? scheme.status : skeletonStageFor(scheme.slots) },
      );
      setConfig(next, locked ? "模块已锁定" : "模块已解锁", { saveDraft: true });
      showToast(locked ? "模块已锁定" : "模块已解锁");
      return;
    }
    if (slot.status === "generating") {
      showToast("该模块正在生成中，请稍候");
      return;
    }

    setConfig(withSkeletonSlotUpdate(currentConfig, slotId, { status: "generating" }, undefined, null, { status: "generating" }), `正在生成：${slot.label}`, { saveDraft: true });
    const userPrompt = compactPromptText(options.userPrompt, "", 900);
    let slotPromptContract = null;
    let slotPrompt = "";
    try {
      const existing = scheme.slotComponents?.[slotId];
      const family = skeletonSlotFamily(slotId);
      const size = skeletonSlotSize(slot);
      const scoreContext = await skeletonHighScoreReferenceContext(slot, action, currentConfig);
      slotPromptContract = skeletonSlotPromptContract(slot, action, scoreContext, { userPrompt, existingComponent: existing });
      slotPrompt = skeletonSlotPromptFromContract(slotPromptContract);
      const currentComponentSummary = skeletonComponentBrief(existing);
      const currentHtmlSignature = skeletonComponentSignature(existing);
      const excludeComponentIds = [
        existing?.id,
        existing?.referenceComponentId,
        existing?.componentId,
      ]
        .map((id) => String(id || "").trim())
        .filter(Boolean);
      const shouldEditExisting =
        Boolean(existing?.id) &&
        (action === "style" || action === "regenerate") &&
        skeletonComponentMatchesSlotFamily(existing, family);
      const payload = shouldEditExisting
        ? {
            componentId: existing.id,
            component: existing,
            instruction: [
              slotPrompt,
              action === "style"
                ? "请保持业务能力不变，但重做视觉层级、排版、密度或结构；优先参考上面的高分积木，不要只换颜色。"
                : "请以当前组件为业务基稿，重做内部结构、DOM 排列、密度和视觉层级；不要只换标题、颜色或边框。",
              currentHtmlSignature ? `当前 HTML 签名禁止原样复用：${currentHtmlSignature}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            originalSlotPrompt: slotPromptContract.originalSlotPrompt,
            pageDesignContract: slotPromptContract.pageDesign,
            slotContract: slotPromptContract.slotContract,
            slotPromptContract,
            adjustmentPrompt: userPrompt,
            currentComponentSummary,
            currentHtmlSignature,
            excludeComponentIds,
            designContract: skeletonDesignContractFor(currentConfig),
            scoreContext,
            modelConfig: aiRequestModelConfig(),
          }
        : {
            prompt: [
              slotPrompt,
              currentComponentSummary ? `需要避开的当前组件：${compactPromptJson(currentComponentSummary, 720)}` : "",
              currentHtmlSignature ? `当前 HTML 签名禁止原样复用：${currentHtmlSignature}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            family,
            size,
            originalSlotPrompt: slotPromptContract.originalSlotPrompt,
            pageDesignContract: slotPromptContract.pageDesign,
            slotContract: slotPromptContract.slotContract,
            slotPromptContract,
            adjustmentPrompt: userPrompt,
            currentComponentSummary,
            currentHtmlSignature,
            excludeComponentIds,
            designContract: skeletonDesignContractFor(currentConfig),
            scoreContext,
            modelConfig: aiRequestModelConfig(),
          };
      const result = await requestJsonEndpoint(shouldEditExisting ? "/api/home-components/edit" : "/api/home-components/generate", payload);
      const resultComponent = result.component || (await brickFallbackSlotComponent(slot, action, null, { userPrompt }));
      const component = applySkeletonSlotPromptMetadata({
        ...resultComponent,
        slot: slotId,
        chrome: slot.chrome || resultComponent.chrome || "contained",
        sourceType: resultComponent.sourceType || (result.localFallback ? "fallback-component-ai" : result.mock ? "mock-component-ai" : "component-ai"),
        fallbackReason: result.fallbackReason || resultComponent.fallbackReason || "",
        provider: result.provider || "",
        model: result.model || "",
        generatedAt: new Date().toISOString(),
      }, slotPromptContract, slotPrompt, userPrompt, existing);
      const next = withSkeletonSlotUpdate(
        currentConfig,
        slotId,
        { status: "filled", locked: false, filledAt: new Date().toISOString() },
        component,
        { action: action === "style" ? "style" : "regenerate" },
      );
      setConfig(next, result.localFallback || component.sourceType === "brick-fallback" ? `已引用积木兜底：${slot.label}` : `已生成：${slot.label}`, { saveDraft: true });
    } catch (error) {
      const fallback = await brickFallbackSlotComponent(slot, action, error, { userPrompt });
      const fallbackWithPrompt = applySkeletonSlotPromptMetadata({ ...fallback, chrome: slot.chrome || fallback.chrome || "contained" }, slotPromptContract, slotPrompt, userPrompt, scheme.slotComponents?.[slotId]);
      const next = withSkeletonSlotUpdate(
        currentConfig,
        slotId,
        { status: "filled", locked: false, filledAt: new Date().toISOString() },
        fallbackWithPrompt,
        { action: "fallback" },
      );
      const fallbackLabel = fallbackWithPrompt.sourceType === "brick-fallback" ? "积木兜底" : "本地兜底";
      setConfig(next, `模型生成失败，已使用${fallbackLabel}：${slot.label}`, { saveDraft: true });
      showToast(`模块生成失败，已${fallbackLabel}：${slot.label}`);
    }
  }

  async function fillSkeletonSlotsSequentially(options = {}) {
    if (skeletonFillRunning || !isSkeletonPreviewConfig()) return;
    skeletonFillRunning = true;
    try {
      const scheme = skeletonSchemeFor(currentConfig);
      const slots = scheme.slots.filter((slot) => {
        const component = scheme.slotComponents?.[slot.id];
        const locked = slot.locked || slot.status === "locked" || slot.status === "final";
        return options.force || (!locked && !component?.html && slot.status !== "generating");
      });
      for (const slot of slots) {
        await generateSkeletonSlot(slot.id, options.force && scheme.slotComponents?.[slot.id] ? "style" : "regenerate");
      }
      const refreshedScheme = skeletonSchemeFor(currentConfig);
      if (refreshedScheme.slots.length && refreshedScheme.slots.every((slot) => ["filled", "locked", "final"].includes(slot.status))) {
        setConfig(withSkeletonSchemeStatus(currentConfig, "review"), "骨架组件已全部填充，等待定稿", { saveDraft: true });
        showToast("骨架组件已全部填充");
      }
    } finally {
      skeletonFillRunning = false;
      renderSkeletonWorkflow();
    }
  }

  function maybeStartSkeletonWorkflow() {
    if (!els.previewPage || skeletonAutoStarted || !isSkeletonPreviewConfig()) return;
    const scheme = skeletonSchemeFor(currentConfig);
    const hasPending = scheme.slots.some((slot) => !slot.locked && !scheme.slotComponents?.[slot.id]?.html);
    if (!hasPending || scheme.status === "final") return;
    skeletonAutoStarted = true;
    window.setTimeout(() => fillSkeletonSlotsSequentially(), 450);
  }

  function renderSkeletonWorkflow() {
    if (!els.skeletonWorkflow) return;
    if (!isSkeletonPreviewConfig()) {
      els.skeletonWorkflow.hidden = true;
      els.skeletonWorkflow.innerHTML = "";
      return;
    }

    const scheme = skeletonSchemeFor(currentConfig);
    const filled = scheme.slots.filter((slot) => scheme.slotComponents?.[slot.id]?.html).length;
    const locked = scheme.slots.filter((slot) => slot.locked || slot.status === "locked" || slot.status === "final").length;
    const generatingSlots = scheme.slots.filter((slot) => slot.status === "generating");
    const totalSlots = scheme.slots.length;
    const progressPercent = totalSlots ? Math.min(100, Math.round(((filled + (generatingSlots.length ? 0.45 : 0)) / totalSlots) * 100)) : 0;
    const isRunning = skeletonFillRunning || generatingSlots.length > 0 || scheme.status === "generating";
    const activeSlot =
      generatingSlots[0] ||
      scheme.slots.find((slot) => {
        const lockedSlot = slot.locked || slot.status === "locked" || slot.status === "final";
        return !lockedSlot && !scheme.slotComponents?.[slot.id]?.html;
      });
    const activeLabel = activeSlot?.label || (filled >= totalSlots ? "全部模块" : "下一模块");
    const progressLabel = isRunning
      ? `正在生成：${activeLabel}`
      : filled >= totalSlots
        ? "全部 slot 已填充，可以定稿"
        : `待生成：${activeLabel}`;
    els.skeletonWorkflow.hidden = false;
    els.skeletonWorkflow.innerHTML = `
      <div class="studio-section-head">
        <span class="section-kicker">SKELETON</span>
        <h2>骨架装配</h2>
      </div>
      <div class="skeleton-workflow-meter" data-status="${escapeHtml(scheme.status || "pending-fill")}" data-running="${isRunning ? "true" : "false"}">
        <div class="skeleton-workflow-count">
          <strong>${filled}/${scheme.slots.length}</strong>
          <span>${escapeHtml(skeletonStatusLabel(scheme.status))} · 锁定 ${locked}</span>
        </div>
        <small>${progressPercent}%</small>
      </div>
      <div class="skeleton-workflow-progress" data-running="${isRunning ? "true" : "false"}" role="progressbar" aria-label="骨架生成进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}">
        <i style="width: ${progressPercent}%"></i>
      </div>
      <p class="skeleton-workflow-current" data-status="${isRunning ? "generating" : escapeHtml(scheme.status || "pending-fill")}">${escapeHtml(progressLabel)}</p>
      <div class="skeleton-workflow-actions">
        <button class="${isRunning ? "is-loading" : ""}" type="button" data-skeleton-fill-all ${isRunning ? "disabled" : ""}>${isRunning ? "填充中" : "继续填充"}</button>
        <button type="button" data-skeleton-reset ${isRunning ? "disabled" : ""}>重置组件</button>
        <button class="primary" type="button" data-skeleton-finalize ${isRunning || filled < scheme.slots.length ? "disabled" : ""}>定稿</button>
      </div>
      <div class="skeleton-slot-list">
        ${scheme.slots
          .map((slot, index) => {
            const component = scheme.slotComponents?.[slot.id];
            const status = slot.locked || slot.status === "final" ? "locked" : component?.html ? slot.status || "filled" : slot.status || "pending-fill";
            const detail = status === "generating" ? "模型正在生成组件..." : `${slot.sectionTitle || slot.sectionType || "slot"} · ${component?.name || slot.id}`;
            return `
              <article class="skeleton-slot-row" data-status="${escapeHtml(status)}" aria-busy="${status === "generating" ? "true" : "false"}">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>${escapeHtml(slot.label || home.featureLabel(slot.id))}</strong>
                  <small>${escapeHtml(detail)}</small>
                </div>
                <b>${escapeHtml(skeletonStatusLabel(status))}</b>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
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

  const AI_SUGGESTION_SCENES = [
    { id: "new-user-onboarding-prompt", label: "新客三步提示语", summary: "适合不知道怎么描述开户旅程的客户", prompt: "请生成一个新用户 Onboarding 首页，主线是 KYC 状态、创建真实账户、首次入金三步；标题和视觉可以大胆包装成“3步成为交易大师”或类似新客旅程。KYC 只展示当前 CRM 账户状态，状态可能是未提交、待审、通过、拒绝。请让 AI 按意图选择任务流、精美路径卡、原路径条或横向旅程，图标要精致、有完成下一步的欲望，不要固定成三等分方格，也不要编造金额、收益或活动奖励。", tags: ["kyc", "conversion"] },
    { id: "account-type-benefit-prompt", label: "账户类型与优势提示语", summary: "把真实账户、模拟账户和账户权益说清楚", prompt: "请生成一个账户类型与优势首页，说明真实账户、模拟账户和绑定账号各自适合什么场景；账户优势只使用后台已配置字段，例如账户类型、点差、杠杆、平台、入金门槛或服务权益，没有数据就用占位或隐藏。", tags: ["account", "trade"] },
    { id: "ib-referral-card-prompt", label: "推广链接提示语", summary: "推广链接、邀请码、复制动作和基础统计", prompt: "请生成一个代理/IB 用户首页，重点使用 referral_link_card 积木；推广链接模块要参考积木块已有字段，再引申出自己的样式，例如链接优先、邀请码优先、分享按钮或基础统计。不要生成返佣、团队层级、下级客户或完整代理中心。", tags: ["ib", "referral"] },
    { id: "professional-trader-workbench-prompt", label: "专业交易工作台提示语", summary: "适合交易型客户的账户与持仓入口", prompt: "请生成一个专业交易客户首页，首屏突出交易账号状态、账户表现图表、持仓入口和 MT5 操作入口；所有交易成本、PnL、保证金和图表数据都必须来自接口，缺失时用占位，不要写死具体数值。", tags: ["trade", "account"] },
    { id: "asset-overview-prompt", label: "资产概览提示语", summary: "适合以资产、钱包和交易账号为主的首页", prompt: "请生成一个资产概览首页，首屏展示总资产、钱包和交易账号摘要；模块顺序要像成熟券商客户端，资产概览、快捷入口、交易账号列表层级清楚。不要新增后台没有的资产字段。", tags: ["asset", "wallet"] },
    { id: "deposit-conversion-prompt", label: "首次入金提示语", summary: "适合已开户但还没有入金的客户", prompt: "请生成一个首次入金转化首页，目标是让已开户未入金客户看清下一步；可以用入金引导、资金状态、客服协助和交易账号承接，但奖励、手续费、到账时间必须来自后台活动或支付通道数据。", tags: ["deposit", "conversion"] },
    { id: "campaign-landing-prompt", label: "活动承接提示语", summary: "适合已有活动配置的首页方案", prompt: "请生成一个活动承接首页，前提是租户后台已经配置活动内容；用 promo_banner 或公告承接活动曝光，用快捷入口和交易账号承接转化。不要虚构奖池、倒计时、报名条件或奖励规则。", tags: ["growth", "campaign"] },
    { id: "copytrading-prompt", label: "跟单推荐提示语", summary: "适合租户开启 CopyTrading 的首页", prompt: "请生成一个 CopyTrading 首页，使用 copytrading_signals 独立模块展示信号源推荐；收益率、总收益、回撤、风险和曲线都必须来自接口，并用折线或面积曲线表达趋势，不要把 PAMM 和 CopyTrading 合并。", tags: ["insight", "conversion"] },
    { id: "pamm-products-prompt", label: "PAMM 产品提示语", summary: "适合租户开启 PAMM 的产品推荐", prompt: "请生成一个 PAMM 产品推荐首页，使用 pamm_products 独立模块展示产品列表或排行；产品名称、收益、规模、风险和曲线均来自接口，缺少数据时隐藏对应指标。不要和 CopyTrading 信号源混在一起。", tags: ["asset", "insight"] },
    { id: "risk-disclosure-prompt", label: "风险提示提示语", summary: "适合需要合规与保证金提醒的页面", prompt: "请生成一个风险提示首页，重点是保证金提醒、风险披露和客服入口；风险披露正式内容使用后台合规文案，放在底部或低干扰区域；如果暂无后台数据，Demo 预览生成参考风险提示文案用于展示。不要把风险提示做成夸张营销卡，也不要暗示稳赚。", tags: ["risk", "trade"] },
    { id: "mobile-compact-prompt", label: "移动端紧凑提示语", summary: "适合手机端优先、少滚动的首页", prompt: "请生成一个移动端优先首页，首屏单列，保留资产概览、当前 KYC/开户状态、快捷入口和交易账号摘要；模块高度要克制，避免大面积横幅和重复按钮。所有内容来自后台或接口。", tags: ["mobile", "conversion"] },
    { id: "brand-trust-prompt", label: "品牌可信首页提示语", summary: "适合白标券商或成熟品牌调性", prompt: "请生成一个品牌可信首页，整体像成熟券商客户端，首屏强调资产安全感、账户状态、快捷入口和客服承接；不要虚构隔离资金、监管资质、在线客服状态或服务时间。", tags: ["brand", "conversion"] },
    { id: "retention-prompt", label: "老用户唤醒提示语", summary: "适合沉睡用户或回访用户", prompt: "请生成一个老用户唤醒首页，先展示账户状态和可继续完成的下一步，再给出快捷入口、客服协助和交易账号摘要；如果没有后台返场权益或活动，不要编造优惠券、赠金或有效期。", tags: ["retention", "account"] },
    { id: "funding-status-prompt", label: "出入金状态提示语", summary: "适合资金流程透明的首页", prompt: "请生成一个资金状态追踪首页，展示入金、出金或钱包状态的当前进度；通道、预计时间、成功率和订单金额都必须来自支付接口，没有数据时只显示状态占位和客服入口。", tags: ["asset", "deposit"] },
  ];

  const GUIDED_REQUIRED_MODULE_IDS = ["accountOverview", "quickActions", "tradingAccounts", "openingFlow"];
  function isGuidedRequiredModule(value) {
    return GUIDED_REQUIRED_MODULE_IDS.includes(value);
  }

  function ensureGuidedRequiredModules(values) {
    return uniqueList([GUIDED_REQUIRED_MODULE_IDS, Array.isArray(values) ? values : [values].filter(Boolean)]);
  }

  const GUIDED_PROMPT_COPY = {
    level: {
      basic: "基础版，保留首屏和核心说明",
      growth: "增长版，在基础能力上加入活动权益、按钮和转化承接",
      pro: "专业版，加入账号、资产、推广链接、数据指标或更完整的运营模块",
    },
    layoutDensity: {
      compact: "紧凑布局：压缩模块高度、留白和说明文字，提高首屏信息密度，适合高频操作和移动端优先首页",
      balanced: "均衡布局：模块间距适中，兼顾信息完整和阅读舒适，适合默认客户端首页",
      spacious: "宽松布局：增加留白和模块呼吸感，降低同屏信息密度，适合品牌感、高净值或需要高级感的首页",
    },
    designStyle: {
      minimalClean: "克制清爽：使用 1 个品牌主色加中性色，少量状态色，卡片边界轻，留白和信息层级优先，避免装饰性背景和过多色块",
      colorfulEnergy: "标准丰富：使用品牌主色、1-2 个辅助色和清晰状态色，允许轻量色块、图标底色和模块分区，让首页更有层次但仍保持金融专业感",
      flatFresh: "丰富层次：增加色彩层级、模块背景、标签和数据强调，允许重点模块使用更明显的图形化区域，适合需要更强视觉识别的首页",
      refinedPolish: "运营高亮：突出 Banner、活动、CTA 和关键运营模块，使用更高对比的强调色、权益标签和视觉焦点，但不编造活动数据或下载/联系方式",
    },
    modules: {
      welcomeModule: "欢迎模块：必须在页面的第一栏，展示见客户姓名、问候",
      heroBanner: "首页 Banner / 广告轮播：多张广告轮播图，需要具备自动切换和下一张控制；用 promo_banner 作为首页积木承接",
      accountOverview: "账户概览：使用 asset_overview 展示账户摘要，包含账户余额，钱包余额，交易账号余额，单位：USD，可以参考积木块",
      quickActions: "快捷入口：展示操作入口，4-10个快捷入口位置，icon或者icon+文字，样式可自行发挥",
      openingFlow: "新手 Onboarding 引导：KYC -> 开真实账户 -> 首次入金 -> 首次交易，帮助新用户完成基础流程，其中首次交易可要可不要",
      accountBenefits: "交易表现：说明真实账户的交易表现，左右结构。左侧展示真实交易账号的基础信息，右侧展示净值折线图(7d、30d)",
      walletList: "钱包列表/卡片：使用 wallet_list 独立模块展示多币种钱包卡片，只展示钱包货币、币种图标和钱包余额，不把多币种明细塞到账户概览",
      kycGuide: "CRM 账户 KYC 状态：未提交、待审、通过、拒绝；只展示当前状态,未提交时补充展示去提交按钮，拒绝是展示再次提交",
      pammProducts: "PAMM 产品推荐区，独立的 pamm_products 模块，，展示PAMM产品名称、收益率、收益率折线图。仅在租户开启 PAMM 且接口返回产品时展示,演示界面可制造数据，风格可参考币安",
      copyTrading: "CopyTrading 信号源推荐区，使用独立的 copytrading_signals 模块，展示信号源名称、收益率、总收益(USD)、最大回撤、收益率折线图仅在租户开启 CopyTrading 且接口返回信号源时展示，演示界面可制造数据，风格可参考币安",
      rewardActivity: "奖励活动专题区，使用活动 Banner、奖励权益、参与步骤和活动 CTA 承接转化",
      referralLink: "推广链接：参考 ReferralLinkCard 积木字段，链接、邀请码优先展示、二维码，数据统计可要可不要",
      tradingAccounts: "交易账号列表：必须同时包含真实交易账号和模拟交易账号的列表，列表可参考交易账号积木块，列表或卡片形式皆可",
      faq: "FAQ 常见问题：展示一些平台设置的常见问题，demo 可以放 4-10 条",
      riskDisclosure: "风险提示：展示一段风险解释的文案",
    },
    theme: {
      blueFinance: "蓝色金融，清爽专业",
      blackGold: "黑金高净值，高端稳重",
      lightGold: "浅金活动，适合营销权益",
      minimalWhite: "极简白，扁平，清爽克制",
      darkTech: "暗色科技，交易终端感",
      emeraldTrust: "翡翠信任，适合资金安全和合规信任表达",
      cobaltTeal: "钴蓝青绿，适合国际科技金融感",
      crimsonPromo: "赤红活动，适合强转化营销活动",
      graphiteSilver: "石墨银，适合成熟券商和机构质感",
    },
    tone: {
      professional: "专业稳健",
      conversion: "营销转化",
      beginner: "新手友好",
      campaign: "活动促销",
      premium: "高净值客户导向",
      ib: "代理招募导向",
    },
  };

  const GUIDED_CANONICAL_TARGETS = {
    welcomeModule: ["welcome_header"],
    heroBanner: ["promo_banner"],
    accountOverview: ["asset_overview"],
    quickActions: ["quick_actions"],
    openingFlow: ["onboarding_guide"],
    accountBenefits: ["trading_account_highlight"],
    walletList: ["wallet_list"],
    kycGuide: ["onboarding_guide"],
    pammProducts: ["pamm_products"],
    copyTrading: ["copytrading_signals"],
    rewardActivity: ["promo_banner"],
    referralLink: ["referral_link_card"],
    tradingAccounts: ["trading_accounts_list"],
    faq: ["faq_section"],
    riskDisclosure: ["risk_disclosure"],
  };

  function setGenerationMode(mode) {
    const nextMode = mode === "guided" ? "guided" : "quick";
    document.body.dataset.generationMode = nextMode;
    els.generationModeButtons.forEach((button) => {
      const active = button.dataset.generationModeButton === nextMode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.generationPanels.forEach((panel) => {
      const active = panel.dataset.generationPanel === nextMode;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function guidedButtonsFor(group) {
    return els.guidedChoices.filter((button) => button.dataset.guidedGroup === group);
  }

  function setGuidedActive(button, active) {
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function setGuidedGroupValues(group, values) {
    const buttons = guidedButtonsFor(group);
    const normalizedValues = group === "modules" ? ensureGuidedRequiredModules(values) : Array.isArray(values) ? values : [values].filter(Boolean);
    const nextValues = new Set(normalizedValues);
    buttons.forEach((button) => {
      const isRequiredModule = group === "modules" && button.dataset.guidedRequired === "true";
      setGuidedActive(button, isRequiredModule || nextValues.has(button.dataset.guidedValue));
    });

    if (!buttons.some((button) => button.classList.contains("active")) && buttons[0]) {
      setGuidedActive(buttons[0], true);
    }
  }

  function refreshGuidedThemeCustomState() {
    if (!els.guidedThemeCustom) return;
    const hasCustomTheme = Boolean((els.guidedThemeCustom.value || "").trim());
    els.guidedThemeCustom.dataset.guidedCustomActive = hasCustomTheme ? "true" : "false";
    els.guidedThemeCustom.closest(".guided-freeform-field")?.classList.toggle("active", hasCustomTheme);
  }

  function selectedGuidedValues(group) {
    const values = guidedButtonsFor(group)
      .filter((button) => button.classList.contains("active"))
      .map((button) => button.dataset.guidedValue)
      .filter(Boolean);
    return group === "modules" ? ensureGuidedRequiredModules(values) : values;
  }

  function selectedGuidedValue(group) {
    return selectedGuidedValues(group)[0] || guidedButtonsFor(group)[0]?.dataset.guidedValue || "";
  }

  function guidedLabel(group, value) {
    const button = guidedButtonsFor(group).find((item) => item.dataset.guidedValue === value);
    if (button?.dataset.guidedLabel) return button.dataset.guidedLabel;
    return value || "未选择";
  }

  function guidedPromptCopy(group, value) {
    return GUIDED_PROMPT_COPY[group]?.[value] || guidedLabel(group, value);
  }

  function hasGuidedAccountOverview(modules) {
    return (Array.isArray(modules) ? modules : []).includes("accountOverview");
  }

  function readGuidedState() {
    const state = {
      audience: selectedGuidedValues("audience"),
      level: selectedGuidedValue("level"),
      layoutDensity: selectedGuidedValue("layoutDensity"),
      modules: selectedGuidedValues("modules"),
      assetFields: selectedGuidedValues("assetFields"),
      designStyle: selectedGuidedValue("designStyle"),
      theme: selectedGuidedValue("theme"),
      themeCustom: (els.guidedThemeCustom?.value || "").trim(),
      tone: selectedGuidedValue("tone"),
      note: (els.guidedNote?.value || "").trim(),
    };

    if (!state.audience.length) state.audience = [guidedButtonsFor("audience")[0]?.dataset.guidedValue].filter(Boolean);
    if (!state.layoutDensity) state.layoutDensity = "balanced";
    if (!state.modules.length) state.modules = [guidedButtonsFor("modules")[0]?.dataset.guidedValue].filter(Boolean);
    if (!state.assetFields.length) state.assetFields = ["total", "wallet", "tradingAccount"];
    return state;
  }

  function guidedChoiceDescriptor(group, value) {
    return {
      id: value,
      label: guidedLabel(group, value),
      instruction: guidedPromptCopy(group, value),
    };
  }

  function buildGuidedAiIntake() {
    const state = readGuidedState();
    const allModules = state.modules.map((value) => {
      return {
        ...guidedChoiceDescriptor("modules", value),
        canonicalTargets: GUIDED_CANONICAL_TARGETS[value] || [],
      };
    });
    const modules = allModules;
    const canonicalMustHave = uniqueList([
      modules.map((module) => module.canonicalTargets || []),
    ]);
    const accountOverviewEnabled = hasGuidedAccountOverview(state.modules);
    const visibleAssetFields = accountOverviewEnabled ? state.assetFields : [];
    const heroFocus = canonicalMustHave[0] || "";

    return {
      source: "guided-builder",
      audience: state.audience.map((value) => guidedChoiceDescriptor("audience", value)),
      level: guidedChoiceDescriptor("level", state.level),
      layoutDensity: guidedChoiceDescriptor("layoutDensity", state.layoutDensity),
      density: state.layoutDensity,
      designStyle: guidedChoiceDescriptor("designStyle", state.designStyle),
      modules,
      theme: {
        ...guidedChoiceDescriptor("theme", state.theme),
        themePreset: state.theme,
        customInput: state.themeCustom,
      },
      tone: guidedChoiceDescriptor("tone", state.tone),
      moduleSettings: {
        assets: {
          enabled: accountOverviewEnabled,
          visibleFields: visibleAssetFields,
          showAccountBreakdown: visibleAssetFields.includes("tradingAccount"),
          showWalletBreakdown: visibleAssetFields.includes("wallet"),
        },
      },
      canonical: {
        primaryIntent: "",
        layoutPreset: "",
        heroFocus: heroFocus && canonicalMustHave.includes(heroFocus) ? heroFocus : canonicalMustHave[0] || heroFocus,
        mustHave: canonicalMustHave,
      },
      note: state.note,
    };
  }

  function guidedModuleCountText(optionalModules) {
    const optionalCount = Array.isArray(optionalModules) ? optionalModules.length : 0;
    return `必选 ${GUIDED_REQUIRED_MODULE_IDS.length} 项 · 选填 ${optionalCount} 项`;
  }

  function buildGuidedPrompt() {
    const state = readGuidedState();
    const requiredModules = GUIDED_REQUIRED_MODULE_IDS.map((value) => guidedPromptCopy("modules", value));
    const optionalModuleIds = state.modules.filter((value) => !isGuidedRequiredModule(value));
    const optionalModules = optionalModuleIds.map((value) => guidedPromptCopy("modules", value));
    const designInstruction = guidedPromptCopy("designStyle", state.designStyle);
    const layoutInstruction = guidedPromptCopy("layoutDensity", state.layoutDensity);
    const visualInstruction = state.themeCustom
      ? `${guidedPromptCopy("theme", state.theme)}；自定义色值或风格文案：${state.themeCustom}`
      : guidedPromptCopy("theme", state.theme);
    const parts = [
      "请为 ForexCRM 用户端首页生成可发布的首页方案",
      `分级：${guidedPromptCopy("level", state.level)}`,
      `页面布局：${layoutInstruction}`,
      `首页样式丰富度：${designInstruction}`,
      `视觉：${visualInstruction}`,
      `语气：${guidedPromptCopy("tone", state.tone)}`,
      `必选模块（不可撤销）：${requiredModules.join("、")}`,
      "交易账号模块必须同时包含真实交易账号和模拟交易账号",
      `选填模块：${optionalModules.length ? optionalModules.join("、") : "无"}`,
      "允许在白名单内重排 sections、brickPlan、模块变体和密度，优先让所选模块和分级决定首屏",
      "不要编造收益、下载链接、后台未提供的数据或未选择的辅助模块",
    ].filter(Boolean);

    if (state.note) parts.push(`补充要求：${state.note}`);
    return parts.join("。");
  }

  function guidedAssetFieldsFromIntake(guidedIntake) {
    const fields = guidedIntake?.moduleSettings?.assets?.visibleFields;
    const valid = new Set(["total", "wallet", "tradingAccount"]);
    return (Array.isArray(fields) ? fields : [])
      .map((field) => String(field || "").trim())
      .filter((field, index, list) => valid.has(field) && list.indexOf(field) === index)
      .slice(0, 3);
  }

  function guidedIntakeHasModule(guidedIntake, moduleId) {
    return (Array.isArray(guidedIntake?.modules) ? guidedIntake.modules : []).some((module) => module?.id === moduleId);
  }

  const GUIDED_EXPLICIT_ONLY_SLOTS = new Set([
    "wallet_list",
    "promo_banner",
    "pamm_products",
    "copytrading_signals",
    "referral_link_card",
    "announcements",
    "market_news",
    "risk_disclosure",
    "faq_section",
    "support_contact",
    "app_download",
  ]);

  const GUIDED_SLOT_ALIASES = {
    walletList: "wallet_list",
    promoHighlight: "promo_banner",
    adCarousel: "promo_banner",
    pammProducts: "pamm_products",
    copytradingSummary: "copytrading_signals",
    referralLinkCard: "referral_link_card",
    marketInsight: "market_news",
    riskNotice: "risk_disclosure",
    faq: "faq_section",
    faqSection: "faq_section",
  };

  const GUIDED_EXPLICIT_SLOT_SETTINGS = {
    promo_banner: ["promoHighlight", "adCarousel"],
    pamm_products: ["pamm"],
    copytrading_signals: ["copytrading"],
    referral_link_card: ["referralLinkCard"],
    announcements: ["announcements"],
    market_news: ["marketNews"],
    risk_disclosure: ["riskDisclosure"],
    faq_section: ["faq"],
    support_contact: ["supportContact"],
    app_download: ["appDownload"],
  };

  const GUIDED_EXPLICIT_SLOT_MODULES = {
    wallet_list: ["WalletList"],
    promo_banner: ["PromotionBanner", "AdCarousel"],
    pamm_products: ["PammProducts"],
    copytrading_signals: ["CopytradingSignals"],
    referral_link_card: ["ReferralLinkCard"],
    announcements: ["Announcements"],
    market_news: ["MarketNews", "MarketInsight"],
    risk_disclosure: ["RiskDisclosure"],
    faq_section: ["FaqSection"],
    support_contact: ["SupportContact"],
    app_download: ["AppDownload"],
  };

  const GUIDED_EXPLICIT_SLOT_STYLES = {
    wallet_list: ["walletList"],
    promo_banner: ["promo_banner", "promoHighlight", "adCarousel"],
    pamm_products: ["pamm_products"],
    copytrading_signals: ["copytrading_signals"],
    referral_link_card: ["referral_link_card"],
    announcements: ["announcements"],
    market_news: ["market_news", "marketInsight"],
    risk_disclosure: ["risk_disclosure"],
    faq_section: ["faq_section"],
    support_contact: ["support_contact"],
    app_download: ["app_download"],
  };

  function guidedCanonicalConfigSlot(value) {
    const slot = String(value || "").trim();
    if (!slot) return "";
    if (home.FEATURES?.[slot]) return slot;
    return GUIDED_SLOT_ALIASES[slot] || "";
  }

  function guidedExplicitSlotSet(guidedIntake) {
    const slots = new Set();
    (Array.isArray(guidedIntake?.modules) ? guidedIntake.modules : []).forEach((module) => {
      (Array.isArray(module?.canonicalTargets) ? module.canonicalTargets : []).forEach((target) => {
        const slot = guidedCanonicalConfigSlot(target);
        if (slot) slots.add(slot);
      });
    });
    return slots;
  }

  function removeUnguidedExplicitSlots(config, guidedIntake) {
    if (!guidedIntake) return;
    const allowed = guidedExplicitSlotSet(guidedIntake);
    const blocked = new Set([...GUIDED_EXPLICIT_ONLY_SLOTS].filter((slot) => !allowed.has(slot)));
    const allowedSlot = (value) => {
      const slot = guidedCanonicalConfigSlot(value);
      return !slot || !blocked.has(slot);
    };

    config.sections = (Array.isArray(config.sections) ? config.sections : [])
      .map((section) => ({
        ...section,
        slots: (Array.isArray(section.slots) ? section.slots : []).filter(allowedSlot),
      }))
      .filter((section) => section.slots.length);

    config.layout = (Array.isArray(config.layout) ? config.layout : []).filter((item) => allowedSlot(item?.component));
    if (!config.layout.length) delete config.layout;

    config.brickPlan = (Array.isArray(config.brickPlan) ? config.brickPlan : []).filter(
      (brick) => allowedSlot(brick?.component) && allowedSlot(brick?.feature),
    );

    config.moduleSettings = config.moduleSettings && typeof config.moduleSettings === "object" ? config.moduleSettings : {};
    blocked.forEach((slot) => {
      (GUIDED_EXPLICIT_SLOT_SETTINGS[slot] || []).forEach((key) => {
        config.moduleSettings[key] = { ...(config.moduleSettings[key] || {}), enabled: false };
      });
      (GUIDED_EXPLICIT_SLOT_MODULES[slot] || []).forEach((key) => {
        if (config.modules && typeof config.modules === "object") delete config.modules[key];
      });
      (GUIDED_EXPLICIT_SLOT_STYLES[slot] || []).forEach((key) => {
        if (config.moduleStyles && typeof config.moduleStyles === "object") delete config.moduleStyles[key];
      });
    });

    if (!allowedSlot(config.heroFocus)) {
      config.heroFocus = config.sections?.[0]?.slots?.[0] || "asset_overview";
    }
  }

  const GUIDED_SLOT_ORDER = [
    "welcome_header",
    "promo_banner",
    "copytrading_signals",
    "onboarding_guide",
    "asset_overview",
    "wallet_list",
    "quick_actions",
    "pamm_products",
    "referral_link_card",
    "announcements",
    "market_news",
    "faq_section",
    "support_contact",
    "app_download",
    "trading_account_highlight",
    "trading_accounts_list",
    "risk_disclosure",
  ];

  const GUIDED_SLOT_SECTIONS = {
    welcome_header: { id: "guided-welcome", type: "hero", title: "欢迎" },
    promo_banner: { id: "guided-hero", type: "split", title: "首屏重点" },
    copytrading_signals: { id: "guided-hero", type: "split", title: "首屏重点" },
    onboarding_guide: { id: "guided-hero", type: "split", title: "首屏重点" },
    asset_overview: { id: "guided-overview", type: "split", title: "账户概览" },
    wallet_list: { id: "guided-wallets", type: "full", title: "钱包列表" },
    quick_actions: { id: "guided-actions", type: "split", title: "快捷操作" },
    pamm_products: { id: "guided-products", type: "split", title: "产品推荐" },
    referral_link_card: { id: "guided-growth", type: "split", title: "增长工具" },
    announcements: { id: "guided-content", type: "split", title: "公告资讯" },
    market_news: { id: "guided-content", type: "split", title: "公告资讯" },
    faq_section: { id: "guided-help", type: "split", title: "帮助与下载" },
    support_contact: { id: "guided-help", type: "split", title: "帮助与下载" },
    app_download: { id: "guided-help", type: "split", title: "帮助与下载" },
    trading_account_highlight: { id: "guided-account-performance", type: "split", title: "账户表现" },
    trading_accounts_list: { id: "guided-trading-accounts", type: "full", title: "交易账号" },
    risk_disclosure: { id: "guided-risk-disclosure", type: "full", title: "风险提示" },
  };

  function guidedCanonicalSlot(value) {
    const slot = String(value || "").trim();
    return home.FEATURES?.[slot] ? slot : "";
  }

  function guidedRequiredSlots(guidedIntake) {
    const slots = [];
    const explicitSlots = guidedExplicitSlotSet(guidedIntake);
    const addSlot = (slot) => {
      const canonical = guidedCanonicalSlot(slot);
      if (canonical && !slots.includes(canonical)) slots.push(canonical);
    };

    (Array.isArray(guidedIntake?.modules) ? guidedIntake.modules : []).forEach((module) => {
      (Array.isArray(module?.canonicalTargets) ? module.canonicalTargets : []).forEach(addSlot);
    });
    (Array.isArray(guidedIntake?.canonical?.mustHave) ? guidedIntake.canonical.mustHave : []).forEach((value) => {
      const slot = guidedCanonicalSlot(value);
      if (!slot) return;
      if (GUIDED_EXPLICIT_ONLY_SLOTS.has(slot) && !explicitSlots.has(slot)) return;
      addSlot(slot);
    });
    if (guidedIntake?.moduleSettings?.assets?.enabled) addSlot("asset_overview");

    return slots.sort((a, b) => {
      const indexA = GUIDED_SLOT_ORDER.includes(a) ? GUIDED_SLOT_ORDER.indexOf(a) : GUIDED_SLOT_ORDER.length;
      const indexB = GUIDED_SLOT_ORDER.includes(b) ? GUIDED_SLOT_ORDER.indexOf(b) : GUIDED_SLOT_ORDER.length;
      return indexA - indexB;
    });
  }

  function ensureGuidedSlot(config, slot, sectionSeed = GUIDED_SLOT_SECTIONS[slot]) {
    const sections = Array.isArray(config.sections) ? config.sections : [];
    if (sections.some((section) => Array.isArray(section.slots) && section.slots.includes(slot))) return;

    config.sections = sections;
    const seed = sectionSeed || { id: `guided-${slot.replace(/_/g, "-")}`, type: "split", title: home.featureLabel?.(slot) || slot };
    const existing = config.sections.find((section) => section.id === seed.id);
    if (existing) {
      existing.slots = [...new Set([...(Array.isArray(existing.slots) ? existing.slots : []), slot])];
      return;
    }

    const nextSection = { ...seed, slots: [slot] };
    if (slot === "welcome_header") config.sections.unshift(nextSection);
    else config.sections.push(nextSection);
  }

  function mergeGuidedSetting(config, group, updates) {
    config.moduleSettings = config.moduleSettings && typeof config.moduleSettings === "object" ? config.moduleSettings : {};
    config.moduleSettings[group] = {
      ...(config.moduleSettings[group] && typeof config.moduleSettings[group] === "object" ? config.moduleSettings[group] : {}),
      ...updates,
    };
  }

  function enableGuidedSlot(config, slot, assetFields) {
    const modules = config.modules && typeof config.modules === "object" ? config.modules : {};
    const styles = config.moduleStyles && typeof config.moduleStyles === "object" ? config.moduleStyles : {};
    config.modules = modules;
    config.moduleStyles = styles;

    if (slot === "asset_overview") {
      const fields = assetFields.length ? assetFields : ["total", "wallet", "tradingAccount"];
      mergeGuidedSetting(config, "assets", {
        enabled: true,
        visibleFields: fields,
        showAccountBreakdown: fields.includes("tradingAccount"),
        showWalletBreakdown: fields.includes("wallet"),
      });
      mergeGuidedSetting(config, "wallet", {
        enabled: fields.includes("wallet"),
        placement: fields.includes("wallet") ? "mergedWithAssets" : config.moduleSettings.wallet?.placement || "mergedWithAssets",
        showFundActions: false,
      });
      modules.AssetOverview = modules.AssetOverview || { variant: "standard" };
      styles.balanceTotal = styles.balanceTotal || "command";
    }

    if (slot === "quick_actions") {
      mergeGuidedSetting(config, "quickActions", {
        enabled: true,
        count: Math.max(Number(config.moduleSettings.quickActions?.count) || 0, 4),
        display: config.moduleSettings.quickActions?.display || "iconText",
        actions: Array.isArray(config.moduleSettings.quickActions?.actions) ? config.moduleSettings.quickActions.actions : [],
      });
      modules.QuickActions = modules.QuickActions || { variant: "gridCards" };
      styles.quickActions = styles.quickActions || "matrix";
    }

    if (slot === "wallet_list") {
      mergeGuidedSetting(config, "wallet", {
        enabled: true,
        placement: "standalone",
        showFundActions: false,
      });
      mergeGuidedSetting(config, "assets", {
        enabled: true,
        wallets: Array.isArray(config.moduleSettings.assets?.wallets) && config.moduleSettings.assets.wallets.length
          ? config.moduleSettings.assets.wallets
          : ["USD", "EUR", "USDT"],
      });
      modules.WalletList = modules.WalletList || { variant: "walletTiles" };
      styles.walletList = styles.walletList || "wallet-tiles";
    }

    if (slot === "onboarding_guide") {
      mergeGuidedSetting(config, "openAccount", { enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" });
      modules.OnboardingProgress = modules.OnboardingProgress || { variant: "missionBoard" };
      styles.onboardingProgress = styles.onboardingProgress || "mission-board";
    }

    if (slot === "trading_account_highlight") {
      mergeGuidedSetting(config, "tradingAccounts", { enabled: true, realEnabled: true, demoEnabled: true });
      modules.AccountPerformance = modules.AccountPerformance || { variant: "proChart" };
      styles.accountPerformance = styles.accountPerformance || "pro-chart";
    }

    if (slot === "trading_accounts_list") {
      mergeGuidedSetting(config, "tradingAccounts", { enabled: true, realEnabled: true, demoEnabled: true });
      modules.TradingAccounts = modules.TradingAccounts || { variant: "separatedList" };
      styles.tradingAccounts = styles.tradingAccounts || "dense-cards";
    }

    if (slot === "promo_banner") {
      mergeGuidedSetting(config, "promoHighlight", { enabled: true });
      mergeGuidedSetting(config, "adCarousel", { enabled: true });
      modules.PromotionBanner = modules.PromotionBanner || { variant: "imageBanner" };
      styles.promoHighlight = styles.promoHighlight || "clean";
      styles.adCarousel = styles.adCarousel || "clean";
      styles.promo_banner = styles.promo_banner || "clean";
    }

    if (slot === "pamm_products") {
      mergeGuidedSetting(config, "pamm", { enabled: true });
      modules.PammProducts = modules.PammProducts || { variant: "yieldChartCards" };
      styles.pamm_products = styles.pamm_products || "yield-chart-cards";
    }

    if (slot === "copytrading_signals") {
      mergeGuidedSetting(config, "copytrading", { enabled: true });
      modules.CopytradingSignals = modules.CopytradingSignals || { variant: "curveCards" };
      styles.copytrading_signals = styles.copytrading_signals || "curve-cards";
    }

    if (slot === "referral_link_card") {
      mergeGuidedSetting(config, "referralLinkCard", { enabled: true, showPromoLink: true, showInviteCode: true });
      modules.ReferralLinkCard = modules.ReferralLinkCard || { variant: "compactCard" };
      styles.referral_link_card = styles.referral_link_card || "compact-card";
    }

    if (slot === "announcements") {
      mergeGuidedSetting(config, "announcements", { enabled: true });
      modules.Announcements = modules.Announcements || { variant: "list" };
      styles.announcements = styles.announcements || "list";
    }

    if (slot === "market_news") {
      mergeGuidedSetting(config, "marketNews", { enabled: true });
      modules.MarketNews = modules.MarketNews || { variant: "feed" };
      styles.market_news = styles.market_news || "feed";
    }

    if (slot === "risk_disclosure") {
      mergeGuidedSetting(config, "riskDisclosure", { enabled: true, demoFallback: true });
      modules.RiskDisclosure = modules.RiskDisclosure || { variant: "legalStrip" };
      styles.risk_disclosure = "legal-strip";
    }

    if (slot === "faq_section") {
      mergeGuidedSetting(config, "faq", { enabled: true });
      modules.FaqSection = modules.FaqSection || { variant: "accordion" };
      styles.faq_section = styles.faq_section || "accordion";
    }

    if (slot === "support_contact") {
      mergeGuidedSetting(config, "supportContact", { enabled: true });
      modules.SupportContact = modules.SupportContact || { variant: "serviceCard" };
      styles.support_contact = styles.support_contact || "service-card";
    }

    if (slot === "app_download") {
      mergeGuidedSetting(config, "appDownload", { enabled: true });
      modules.AppDownload = modules.AppDownload || { variant: "qrCard" };
      styles.app_download = styles.app_download || "qr-card";
    }
  }

  function applyGuidedOverridesToConfig(config, guidedIntake) {
    const next = JSON.parse(JSON.stringify(config || {}));
    const assetFields = guidedAssetFieldsFromIntake(guidedIntake);
    const accountOverviewEnabled = Boolean(guidedIntake?.moduleSettings?.assets?.enabled || guidedIntakeHasModule(guidedIntake, "accountOverview"));
    const customThemeInput = String(guidedIntake?.theme?.customInput || "").trim();
    const themePreset = String(guidedIntake?.theme?.themePreset || guidedIntake?.theme?.id || "").trim();
    const density = String(guidedIntake?.density || guidedIntake?.layoutDensity?.id || "").trim();
    const requiredSlots = guidedRequiredSlots(guidedIntake);

    if (home.THEMES?.[themePreset]) {
      next.themePreset = themePreset;
      next.theme = themePreset;
    }
    if (customThemeInput) {
      next.themeCustom = { input: customThemeInput };
    }
    if (["compact", "balanced", "spacious"].includes(density)) {
      next.density = density;
    }

    if (accountOverviewEnabled && assetFields.length) {
      next.moduleSettings = next.moduleSettings && typeof next.moduleSettings === "object" ? next.moduleSettings : {};
      next.moduleSettings.assets = {
        ...(next.moduleSettings.assets || {}),
        enabled: true,
        visibleFields: assetFields,
        showAccountBreakdown: assetFields.includes("tradingAccount"),
        showWalletBreakdown: assetFields.includes("wallet"),
      };
      next.moduleSettings.wallet = {
        ...(next.moduleSettings.wallet || {}),
        enabled: assetFields.includes("wallet"),
        placement: assetFields.includes("wallet") ? "mergedWithAssets" : next.moduleSettings.wallet?.placement || "mergedWithAssets",
        showFundActions: false,
      };
      next.modules = { ...(next.modules || {}), AssetOverview: next.modules?.AssetOverview || { variant: "standard" } };
      next.moduleStyles = { ...(next.moduleStyles || {}), balanceTotal: next.moduleStyles?.balanceTotal || "command" };
      next.brickPlan = Array.isArray(next.brickPlan) ? next.brickPlan : [];
      if (!next.brickPlan.some((brick) => brick?.component === "asset_overview")) {
        next.brickPlan.unshift({
          brickId: "assetOverview.flexible",
          brickName: "账户概览",
          family: "AssetOverview",
          feature: "asset_overview",
          component: "asset_overview",
          size: "2x1",
          zone: "hero",
          reason: "引导式选择要求展示账户概览。",
        });
      }
      ensureGuidedSlot(next, "asset_overview");
    }

    requiredSlots.forEach((slot) => {
      ensureGuidedSlot(next, slot);
      enableGuidedSlot(next, slot, assetFields);
    });
    removeUnguidedExplicitSlots(next, guidedIntake);

    if (requiredSlots.length) {
      delete next.layout;
    }

    return home.normalizeConfig(next);
  }

  function renderGuidedSummary() {
    if (!els.guidedSummary) return;

    const state = readGuidedState();
    const optionalModules = state.modules.filter((value) => !isGuidedRequiredModule(value));
    const themeLabel = state.themeCustom || guidedLabel("theme", state.theme);
    const rows = [
      ["分级", guidedLabel("level", state.level)],
      ["布局", guidedLabel("layoutDensity", state.layoutDensity)],
      ["样式", guidedLabel("designStyle", state.designStyle)],
      ["风格", `${themeLabel} · ${guidedLabel("tone", state.tone)}`],
      ["模块", guidedModuleCountText(optionalModules)],
    ];

    if (els.guidedSummaryTitle) els.guidedSummaryTitle.textContent = "首页配置方案";
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
    savePrompt();

    if (options.switchMode) setGenerationMode("quick");
    if (options.updateConfig !== false) {
      setConfig(applyGuidedOverridesToConfig(home.promptToConfig(prompt, interpretationRound), buildGuidedAiIntake()), "已写入引导配置");
    }
    if (options.updateSuggestions !== false) {
      suggestionCards = buildSuggestionCards();
      renderSuggestionCards("已按引导配置更新推荐");
    }
    if (options.toast) showToast("已写入快速输入");
    return prompt;
  }

  function initGuidedBuilder() {
    if (!els.guidedChoices.length) return;

    els.guidedChoices.forEach((button) => {
      if (button.dataset.guidedRequired === "true") {
        setGuidedActive(button, true);
        button.setAttribute("aria-disabled", "true");
      }
      button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
      button.addEventListener("click", () => {
        const group = button.dataset.guidedGroup;
        const value = button.dataset.guidedValue;
        const isMultiple = button.hasAttribute("data-guided-multiple");

        if (group === "modules" && button.dataset.guidedRequired === "true") {
          setGuidedActive(button, true);
          showToast("必选模块不可撤销");
          renderGuidedSummary();
          return;
        }

        if (isMultiple) {
          const willActivate = !button.classList.contains("active");
          setGuidedActive(button, willActivate);
          const activeInGroup = guidedButtonsFor(group).filter((item) => item.classList.contains("active"));
          if (!activeInGroup.length) setGuidedActive(button, true);
        } else {
          setGuidedGroupValues(group, value);
        }

        renderGuidedSummary();
      });
    });

    els.generationModeButtons.forEach((button) => {
      button.addEventListener("click", () => setGenerationMode(button.dataset.generationModeButton));
    });

    els.guidedNote?.addEventListener("input", renderGuidedSummary);
    els.guidedThemeCustom?.addEventListener("input", () => {
      refreshGuidedThemeCustomState();
      renderGuidedSummary();
    });
    els.guidedSync?.addEventListener("click", () => syncGuidedPromptToQuick({ switchMode: true, toast: true }));
    els.guidedGenerate?.addEventListener("click", async () => {
      interpretationRound += 1;
      const guidedIntake = buildGuidedAiIntake();
      const guidedPrompt = syncGuidedPromptToQuick({ updateConfig: false });
      setAiBusy(true, aiBusyLabel("正在生成引导方案"));
      let shouldResetBusy = true;
      try {
        const config = await generateConfigWithFallback(guidedPrompt, {
          variant: interpretationRound,
          distinctFrom: currentConfig,
          inputMode: "guided",
          guidedIntake,
        });
        generatePreview(applyGuidedOverridesToConfig(config, guidedIntake));
        shouldResetBusy = false;
      } finally {
        if (shouldResetBusy) setAiBusy(false);
      }
    });

    refreshGuidedThemeCustomState();
    renderGuidedSummary();
    setGenerationMode("quick");
  }

  function readSuggestionHistory() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SUGGESTION_HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(-AI_SUGGESTION_SCENES.length) : [];
    } catch (error) {
      return [];
    }
  }

  function writeSuggestionHistory(ids) {
    window.localStorage.setItem(SUGGESTION_HISTORY_KEY, JSON.stringify([...new Set(ids)].slice(-AI_SUGGESTION_SCENES.length)));
  }

  function rememberSuggestionCards(cards) {
    const existing = readSuggestionHistory();
    writeSuggestionHistory(existing.concat(cards.map((card) => card.id || card.label)));
  }

  function suggestionScore(scene, text) {
    const source = String(text || "").toLowerCase();
    const keywordMap = {
      vip: ["vip", "高净值", "黑金", "大气", "服务"],
      asset: ["资产", "钱包", "余额", "入金", "出金"],
      trade: ["交易", "mt4", "mt5", "持仓", "订单", "pnl"],
      account: ["账号", "账户", "真实", "模拟"],
      kyc: ["kyc", "开户", "实名", "认证"],
      conversion: ["转化", "开户", "入金", "下一步"],
      growth: ["活动", "增长", "赛事", "奖池", "banner"],
      campaign: ["活动", "广告", "轮播", "优惠"],
      ib: ["ib", "代理", "邀请", "二维码", "渠道"],
      wallet: ["钱包", "币种", "资金"],
      retention: ["留存", "召回", "沉睡", "唤醒"],
      risk: ["风险", "风控", "保证金", "预警"],
      mobile: ["移动", "手机", "单列"],
      brand: ["品牌", "白标", "可信"],
      insight: ["洞察", "数据", "表现", "分析"],
      deposit: ["入金", "首存", "充值"],
    };

    return scene.tags.reduce((score, tag) => {
      const words = keywordMap[tag] || [];
      return score + words.filter((word) => source.includes(word)).length * 10;
    }, 0);
  }

  function buildSuggestionPrompt(scene, index) {
    const endings = [
      "这是给客户参考的首页提示语案例，不是页面数据脚本；请只把业务意图和模块结构写清楚。",
      "请优先使用积木块组合，让首屏、操作区和账号区有清晰层级；真实数值必须来自后台或接口。",
      "不要只换颜色，要调整模块位置、密度和视觉表达；没有数据的字段请用占位或隐藏。",
      "客户看到的是可编辑提示语案例，不要在提示语里编造金额、收益、人数、奖池、时效或客服状态。",
    ];
    const ending = endings[(suggestionRound + index) % endings.length];
    return `${scene.prompt} ${ending} 推荐编号 ${scene.id || scene.label}-${suggestionRound}-${index}，生成页面时需避免重复上一版模块顺序和布局骨架。`;
  }

  function buildSuggestionCards(options = {}) {
    if (!els.suggestionPanel) return [];

    const text = options.usePrompt === false ? "" : promptValue();
    const recentIds = new Set(readSuggestionHistory());
    const ranked = AI_SUGGESTION_SCENES
      .map((scene, index) => ({
        ...scene,
        index,
        score: suggestionScore(scene, text) + (recentIds.has(scene.id) ? -1000 : 0),
      }))
      .sort((a, b) => b.score - a.score || ((a.index + suggestionRound) % AI_SUGGESTION_SCENES.length) - ((b.index + suggestionRound) % AI_SUGGESTION_SCENES.length));

    let pool = ranked.filter((scene) => !recentIds.has(scene.id));
    if (pool.length < 6) {
      writeSuggestionHistory([]);
      pool = ranked.map((scene) => ({ ...scene, score: Math.max(0, scene.score) }));
    }

    const offset = (suggestionRound * 3) % Math.max(1, pool.length);
    const rotated = pool.slice(offset).concat(pool.slice(0, offset));
    const cards = rotated.slice(0, 6).map((scene, index) => ({
      ...scene,
      prompt: buildSuggestionPrompt(scene, index),
    }));
    rememberSuggestionCards(cards);
    return cards;
  }

  function renderSuggestionCards(statusText = "推荐可直接套用的首页提示语案例") {
    if (!els.suggestionPanel) return;

    const oldCards = [...els.suggestionPanel.querySelectorAll("[data-suggestion-prompt]")];
    oldCards.forEach((button) => button.remove());
    suggestionCards = suggestionCards.length ? suggestionCards : buildSuggestionCards();
    if (els.suggestionNote) els.suggestionNote.textContent = statusText;

    els.suggestionPanel.insertAdjacentHTML(
      "beforeend",
      suggestionCards
        .map(
          (scene) => `
            <button type="button" data-suggestion-prompt="${escapeHtml(scene.prompt)}">
              <b>${escapeHtml(scene.label)}</b>
              <small>${escapeHtml(scene.summary)}</small>
            </button>
          `,
        )
        .join(""),
    );

    els.suggestionButtons = [...els.suggestionPanel.querySelectorAll("[data-suggestion-prompt]")];
  }

  function applySuggestionPrompt(button) {
    if (els.prompt) els.prompt.value = button.dataset.suggestionPrompt || "";
    interpretationRound += 1;
    selectedSuggestion = null;
    savePrompt();
    const previewConfig = home.promptToConfig(promptValue(), interpretationRound, currentConfig);
    setConfig(previewConfig, "已写入推荐提示语，可继续编辑或生成预览");
    renderSuggestionCards("已套用提示语，可继续编辑");
    showToast("已写入提示语案例");
    els.prompt?.focus();
  }

  function providerPreset(provider) {
    return AI_MODEL_PRESETS[provider] || AI_MODEL_PRESETS.openai;
  }

  function canonicalModelKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function modelIdFromValue(provider, value) {
    const preset = providerPreset(provider);
    const raw = String(value || "").trim();
    if (!raw) return preset.model;
    const knownModels = preset.models || [preset.model];
    if (knownModels.includes(raw)) return raw;

    const key = canonicalModelKey(raw);
    const inferredProvider = providerIdFromValue(raw);
    if (inferredProvider && inferredProvider !== preset.provider) return preset.model;
    const known = knownModels.find((model) => canonicalModelKey(model) === key);
    if (known) return known;
    if (preset.provider === "gemini" && GEMINI_MODEL_ALIASES[key]) return GEMINI_MODEL_ALIASES[key];
    return raw;
  }

  function providerIdFromValue(value) {
    const source = String(value || "").trim().toLowerCase();
    if (!source) return "";

    const exact = PROVIDER_ORDER.find((provider) => source === provider || source === providerPreset(provider).name.toLowerCase());
    if (exact) return exact;

    if (/generativelanguage\.googleapis\.com|\bgemini[-_\s]/i.test(source)) return "gemini";
    if (/api\.deepseek\.com|\bdeepseek[-_\s]/i.test(source)) return "deepseek";
    if (/api\.moonshot\.(?:cn|ai)|\bkimi[-_\s]|\bmoonshot[-_\s]/i.test(source)) return "kimi";
    if (/api\.minimax(?:i)?\.(?:com|cn|io)|\bminimax[-_\s]/i.test(source)) return "minimax";
    if (/anthropic\.com|\bclaude[-_\s]/i.test(source)) return "claude";
    if (/api\.openai\.com|\bgpt[-_\s]|\bo[0-9]/i.test(source)) return "openai";

    return PROVIDER_ORDER.find((provider) => source.includes(provider) || source.includes(providerPreset(provider).name.toLowerCase())) || "";
  }

  function inferProviderFromConfig(source = {}) {
    const raw = source && typeof source === "object" ? source : {};
    const explicit = providerIdFromValue(raw.provider || raw.providerId || raw.providerName || raw.name);
    const inferred = providerIdFromValue([raw.model, raw.baseUrl, raw.endpoint, raw.apiMode].filter(Boolean).join(" "));
    if (explicit && !(explicit === "openai" && inferred && inferred !== "openai")) return explicit;
    return inferred || explicit || "openai";
  }

  function isKimiFixedTemperatureModel(model) {
    return /^kimi-k2\.(?:6|5)\b/i.test(String(model || ""));
  }

  function kimiTemperatureForModel(model) {
    return isKimiFixedTemperatureModel(model) ? 0.6 : 1;
  }

  function normalizeModelTemperature(provider, value, model = "") {
    if (provider === "kimi") return kimiTemperatureForModel(model);
    if (!Number.isFinite(value)) return DEFAULT_MODEL_CONFIG.temperature;
    if (provider === "minimax") return Math.min(Math.max(value, 0.01), 1);
    return Math.min(Math.max(value, 0), 2);
  }

  function normalizeModelBaseUrl(provider, value) {
    const baseUrl = String(value || "").trim().replace(/\/+$/, "");
    if (!["minimax", "kimi", "gemini"].includes(provider)) return baseUrl;

    try {
      const target = new URL(baseUrl);
      if (provider === "minimax" && ["api.minimaxi.cn", "api.minimax.io"].includes(target.hostname)) return MINIMAX_CN_BASE_URL;
      if (provider === "kimi" && target.hostname === "api.moonshot.ai") return KIMI_CN_BASE_URL;
      if (provider === "gemini" && target.hostname === "generativelanguage.googleapis.com") {
        if (target.pathname === "/" || target.pathname === "/v1beta" || target.pathname === "/v1beta/openai/") return GEMINI_OPENAI_BASE_URL;
      }
    } catch (error) {
      return baseUrl;
    }

    if (provider === "minimax") return [MINIMAX_CN_TYPED_ALIAS_BASE_URL, MINIMAX_GLOBAL_BASE_URL].includes(baseUrl) ? MINIMAX_CN_BASE_URL : baseUrl;
    if (provider === "gemini") return baseUrl === "https://generativelanguage.googleapis.com/v1beta/openai/" ? GEMINI_OPENAI_BASE_URL : baseUrl;
    return baseUrl === KIMI_GLOBAL_BASE_URL ? KIMI_CN_BASE_URL : baseUrl;
  }

  function sanitizeModelConfig(config) {
    const source = config && typeof config === "object" ? config : {};
    const inferredProvider = inferProviderFromConfig(source);
    const preset = providerPreset(inferredProvider);
    const apiKeys = {
      ...(DEFAULT_MODEL_CONFIG.apiKeys || {}),
      ...(source.apiKeys && typeof source.apiKeys === "object" ? source.apiKeys : {}),
    };
    const merged = {
      ...DEFAULT_MODEL_CONFIG,
      ...preset,
      ...source,
    };

    const model = modelIdFromValue(preset.provider, merged.model || preset.model || DEFAULT_MODEL_CONFIG.model);
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
      temperature: normalizeModelTemperature(preset.provider, temperature, model),
      maxOutputTokens: Number.isFinite(maxOutputTokens)
        ? Math.min(Math.max(Math.round(maxOutputTokens), preset.provider === "minimax" ? 512 : 6000), preset.provider === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 12000)
        : preset.provider === "minimax"
          ? MINIMAX_MAX_COMPLETION_TOKENS
          : DEFAULT_MODEL_CONFIG.maxOutputTokens,
      apiKey,
      apiKeys,
    };
  }

  function loadModelConfig() {
    if (modelSettings) return sanitizeModelConfig(modelSettings.loadModelConfig());
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_CONFIG_KEY) || "null");
      return sanitizeModelConfig(saved || DEFAULT_MODEL_CONFIG);
    } catch (error) {
      return sanitizeModelConfig(DEFAULT_MODEL_CONFIG);
    }
  }

  function saveModelConfig(config) {
    const normalized = sanitizeModelConfig(config);
    if (modelSettings) {
      modelSettings.saveModelConfig(normalized, { source: "home-layout-admin" });
    } else {
      window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(normalized));
    }
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

  function modelConfigWasSaved() {
    try {
      return Boolean(window.localStorage.getItem(MODEL_CONFIG_KEY));
    } catch (error) {
      return false;
    }
  }

  function providerStatus(provider) {
    return providerRuntimeStatus[provider] || {};
  }

  function providerHasServerKey(provider) {
    return Boolean(providerStatus(provider).hasServerKey);
  }

  function modelKeyStatusLabel(config) {
    const normalized = sanitizeModelConfig(config);
    if (normalized.apiKey) return maskedApiKey(normalized.apiKey);

    const status = providerStatus(normalized.provider);
    if (status.hasServerKey) {
      return `服务端已配置 ${status.serverKeyEnv || providerPreset(normalized.provider).apiKeyLabel}`;
    }

    return "未填写";
  }

  function applyServerConfiguredProvider() {
    if (modelConfigWasSaved() || providerHasServerKey(aiModelConfig.provider)) return false;

    const provider = ["deepseek", "minimax", "kimi", "openai", "claude"].find(providerHasServerKey);
    if (!provider) return false;

    aiModelConfig = sanitizeModelConfig({
      ...providerPreset(provider),
      callMode: "serverProxy",
      proxyEndpoint: DEFAULT_MODEL_CONFIG.proxyEndpoint,
      apiKey: "",
      apiKeys: aiModelConfig.apiKeys,
      temperature: DEFAULT_MODEL_CONFIG.temperature,
      maxOutputTokens: provider === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : DEFAULT_MODEL_CONFIG.maxOutputTokens,
    });
    return true;
  }

  async function refreshProviderRuntimeStatus() {
    try {
      const response = await fetch("/api/home-ai/providers", { headers: { accept: "application/json" } });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.providers) return;

      providerRuntimeStatus = Object.fromEntries(
        Object.entries(payload.providers).map(([provider, item]) => [
          provider,
          {
            hasServerKey: Boolean(item?.hasServerKey),
            serverKeyEnv: String(item?.serverKeyEnv || ""),
            keyEnv: Array.isArray(item?.keyEnv) ? item.keyEnv : [],
          },
        ]),
      );

      applyServerConfiguredProvider();
      renderModelConfigSummary();

      const modal = document.querySelector("[data-model-config-modal]");
      if (modal && !modal.hidden) renderModelConfigModal();
    } catch (error) {
      providerRuntimeStatus = {};
    }
  }

  function renderModelConfigSummary() {
    if (!els.modelConfigSummary.length) return;

    const config = sanitizeModelConfig(aiModelConfig);
    const preset = providerPreset(config.provider);
    const modelLabel = `${preset.name} / ${config.model}`;

    els.modelConfigSummary.forEach((target) => {
      const summaryLabel = target.dataset.modelConfigLabel || "当前模型";
      const buttonLabel = target.dataset.modelConfigButton || "配置";
      target.innerHTML = `
        <div>
          <span>${escapeHtml(summaryLabel)}</span>
          <strong title="${escapeHtml(modelLabel)}">${escapeHtml(modelLabel)}</strong>
        </div>
        <button type="button" data-model-config-open>${escapeHtml(buttonLabel)}</button>
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
	    if (status === "mock") return "Mock 预览";
	    if (status === "success") return mock ? "Mock 成功" : "调用成功";
	    if (status === "fallback") return "已回退";
	    if (status === "local") return "本地生成";
	    return "调用失败";
	  }

		  function historySourceSummary(record) {
		    const snapshot = record.configSnapshot || {};
		    const sourceType = record.htmlSourceType || snapshot.htmlSourceType || "";
		    const pipeline = record.htmlPipeline || snapshot.htmlPipeline || "";
		    const quality = record.htmlQualityStatus || snapshot.htmlQualityStatus || "";
		    const reason = record.htmlFallbackReason || snapshot.htmlFallbackReason || "";
		    const isMock = Boolean(record.mock || record.status === "mock" || snapshot.htmlMock);
		    const modelGenerated = serverHtmlLooksModelGenerated({ sourceType, pipeline, qualityStatus: quality });
		    const isFallback = !modelGenerated && Boolean(record.status === "fallback" || snapshot.htmlIsFallback || record.htmlIsFallback);
		    if (!sourceType && !pipeline && !isMock && !isFallback) return "";
		    const label = isMock ? "Mock 预览" : sourceType === "brick-library-backed" ? "积木保底" : sourceType === "local-fallback" ? "本地规则生成" : isFallback ? "Fallback 预览" : "模型生成";
		    return [label, sourceType, pipeline, quality, reason].filter(Boolean).join(" · ");
		  }

  function inputModeLabel(mode) {
    return mode === "guided" ? "引导式" : "快速输入";
  }

  function modelHistoryAdvice(message) {
    const source = String(message || "");
    if (!source || /处理建议/.test(source)) return "";

    if (/HTTP\s*401|invalid api key|unauthorized|\b2049\b/i.test(source)) {
      return "处理建议：API Key 无效或账号区域不匹配，请检查当前厂商的 API Key、Base URL 和账号区域。";
    }

    if (/valid homepage JSON|不是首页\s*JSON|JSON/i.test(source) && /AI response|homepage|首页|JSON/i.test(source)) {
      return "处理建议：模型有响应，但没有按首页配置 JSON 返回；已自动回退本地方案。代理会对 MiniMax 使用短 patch JSON，AI HTML 预览由 MiniMax 配置蓝图驱动装配；Kimi 使用短 prompt 和正确的 completion token 参数，仍失败时可以降低 Temperature 后重试。";
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
		        const snapshot = record.configSnapshot || {};
		        const structure = [snapshot.intent, snapshot.layoutPreset, snapshot.strategy].filter(Boolean).join(" · ");
		        const htmlSource = historySourceSummary(record);
		        return `
		          <article class="model-call-item" data-call-status="${escapeHtml(record.status || "unknown")}" tabindex="0" title="${escapeHtml(title)}">
	            <div>
	              <strong>${escapeHtml(record.provider || "本地规则")} / ${escapeHtml(record.model || "--")}</strong>
	              <span>${escapeHtml(statusLabel(record.status, record.mock))} · ${escapeHtml(inputModeLabel(record.inputMode))} · ${escapeHtml(formatHistoryTime(record.at))}</span>
	            </div>
	            <small>${escapeHtml(record.durationMs ? `${record.durationMs}ms` : callModeLabel(record.callMode || "local"))}</small>
		            <p class="model-call-summary">${escapeHtml(display.summary)}</p>
		            ${structure ? `<p class="model-call-summary">${escapeHtml(structure)}</p>` : ""}
		            ${htmlSource ? `<p class="model-call-source">${escapeHtml(htmlSource)}</p>` : ""}
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
            <select data-model-config-field="model" data-model-option-list></select>
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
        <div><dt>密钥状态</dt><dd>${escapeHtml(modelKeyStatusLabel(config))}</dd></div>
        <div><dt>运行状态</dt><dd>${escapeHtml(callModeLabel(config.callMode))}</dd></div>
        <div><dt>调用地址</dt><dd>${escapeHtml(`${config.baseUrl}${config.endpoint}`)}</dd></div>
        <div><dt>测试状态</dt><dd data-model-test-status data-tone="${escapeHtml(modelTestState.tone || "")}">${escapeHtml(modelTestState.message || "尚未测试")}</dd></div>
      </dl>
      <small>${escapeHtml(providerHasServerKey(config.provider) && !config.apiKey ? "服务端已从 .env 加载这个厂商的 Key，输入框可留空；保存只记录厂商、模型和调用参数。" : "保存后配置会保留在当前浏览器；测试连通性会用当前表单值做一次后端握手，不需要先生成首页。")}</small>
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
        (item) => {
          const serverKeyText = providerHasServerKey(item.provider) ? " · 服务端Key已配置" : "";
          return `
          <button class="${item.provider === config.provider ? "active" : ""}" type="button" data-model-provider="${item.provider}">
            <span>${escapeHtml(item.name)}</span>
            <strong>${escapeHtml(item.model)}</strong>
            <small>${escapeHtml(`${item.badge}${serverKeyText}`)}</small>
          </button>
        `;
        },
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

    optionList.innerHTML = [...new Set([config.model, ...(preset.models || [])])]
      .map((model) => `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`)
      .join("");
    const temperatureField = modal.querySelector('[data-model-config-field="temperature"]');
    if (temperatureField) {
      const kimiTemperature = config.provider === "kimi" ? kimiTemperatureForModel(config.model) : null;
      temperatureField.min = config.provider === "minimax" ? "0.01" : config.provider === "kimi" ? String(kimiTemperature) : "0";
      temperatureField.max = config.provider === "minimax" ? "1" : config.provider === "kimi" ? String(kimiTemperature) : "2";
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
    if (modelSettings?.openModelPicker) {
      modelSettings.openModelPicker({
        title: "选择首页生成模型",
        description: "这里只选择当前想用的模型。API Key、Base URL、Endpoint 等大模型信息请到统一配置页维护，保存过的 Key 会自动沿用。",
        activeConfig: aiModelConfig,
        providerStatus: providerRuntimeStatus,
        source: "home-layout-admin",
        saveLabel: "用于首页生成",
        onSave: (config) => {
          aiModelConfig = sanitizeModelConfig(config);
          renderModelConfigSummary();
          renderModelHistory();
          showToast(`已选择 ${providerPreset(aiModelConfig.provider).name} / ${aiModelConfig.model}`);
        },
      });
      return;
    }
    editingModelConfig = sanitizeModelConfig(aiModelConfig);
    modelTestState = { tone: "", message: "尚未测试" };
    const modal = ensureModelConfigModal();
    renderModelConfigModal();
    modal.hidden = false;
    window.setTimeout(() => modal.querySelector("[data-model-config-field=\"model\"]")?.focus(), 0);
  }

  function closeModelConfigModal() {
    if (modelSettings?.closeModelPicker) modelSettings.closeModelPicker();
    const modal = document.querySelector("[data-model-config-modal]");
    if (modal) modal.hidden = true;
    editingModelConfig = null;
  }

  function initModelConfig() {
    renderModelConfigSummary();
    refreshProviderRuntimeStatus();

    window.addEventListener("forexcrm:model-config-change", (event) => {
      if (!event.detail?.config) return;
      aiModelConfig = sanitizeModelConfig(event.detail.config);
      renderModelConfigSummary();
    });

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
    const busy = Boolean(isBusy);
    const buttons = [els.generate, els.regenerateIntelligence, els.regenerate].filter(Boolean);
    buttons.forEach((button) => {
      button.disabled = busy;
      button.classList.toggle("is-loading", busy);
    });

    els.modelConfigOpen.forEach((button) => {
      button.disabled = busy;
    });
    els.suggestionButtons.forEach((button) => {
      button.disabled = busy;
    });
    els.renderModeButtons.forEach((button) => {
      if (!button.closest("[data-preview-render-mode-controls]")) button.disabled = busy;
    });
    [els.generateSuggestions, els.refreshSuggestions].filter(Boolean).forEach((button) => {
      button.disabled = busy;
    });
    [els.aestheticScoreRefresh, els.aestheticScoreSave, els.aestheticScoreImprove].filter(Boolean).forEach((button) => {
      button.disabled = busy;
    });
    if (els.aestheticManualScoreInput) els.aestheticManualScoreInput.disabled = busy;
    if (els.aestheticScoreNote) els.aestheticScoreNote.readOnly = busy;
    els.generationModeButtons.forEach((button) => {
      button.disabled = busy;
    });
    els.guidedChoices.forEach((button) => {
      button.disabled = busy;
    });
    [els.guidedGenerate, els.guidedSync].filter(Boolean).forEach((button) => {
      button.disabled = busy;
      button.classList.toggle("is-loading", busy);
    });
    if (els.guidedGenerate) {
      if (!els.guidedGenerate.dataset.defaultLabel) els.guidedGenerate.dataset.defaultLabel = els.guidedGenerate.textContent.trim();
      const defaultLabel = els.guidedGenerate.dataset.defaultLabel || "生成预览";
      els.guidedGenerate.textContent = busy ? "正在生成" : defaultLabel;
      els.guidedGenerate.setAttribute("aria-busy", busy ? "true" : "false");
      els.guidedGenerate.setAttribute("aria-label", busy ? label : defaultLabel);
      els.guidedGenerate.title = busy ? label : defaultLabel;
    }
    if (els.reset) els.reset.disabled = busy;
    if (els.prompt) els.prompt.readOnly = busy;
    if (els.guidedNote) els.guidedNote.readOnly = busy;
    if (els.guidedThemeCustom) els.guidedThemeCustom.readOnly = busy;
    if (els.intakePage) els.intakePage.classList.toggle("is-generating", busy);
    if (els.composer) {
      els.composer.classList.toggle("is-generating", busy);
      els.composer.setAttribute("aria-busy", busy ? "true" : "false");
      if (busy) els.composer.dataset.loadingLabel = label;
      else delete els.composer.dataset.loadingLabel;
    }
    if (els.status) {
      els.status.classList.toggle("is-loading", busy);
      els.status.setAttribute("aria-live", "polite");
      if (busy) {
        els.status.dataset.previousLabel = els.status.textContent.trim();
        els.status.dataset.pendingLabel = label;
        updateStatus(label, false);
      } else if (els.status.dataset.pendingLabel) {
        if (els.status.textContent.trim() === els.status.dataset.pendingLabel) {
          updateStatus(els.status.dataset.previousLabel || "等待输入", false);
        }
        delete els.status.dataset.previousLabel;
        delete els.status.dataset.pendingLabel;
      }
    }

    if (els.generate) {
      if (els.generate.classList.contains("ai-send-button")) {
        els.generate.setAttribute("aria-label", busy ? label : "生成预览");
        els.generate.title = busy ? label : "生成预览";
        return;
      }

      if (!els.generate.dataset.defaultLabel) els.generate.dataset.defaultLabel = els.generate.textContent.trim();
      els.generate.textContent = busy ? label : els.generate.dataset.defaultLabel;
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

  function aiRequestContext(options = {}) {
    const context = {
      currentConfig: home.normalizeConfig(currentConfig),
      defaultConfig: home.DEFAULT_CONFIG,
      features: home.FEATURES,
      bricks: home.HOME_BRICKS,
      moduleStyleOptions: home.MODULE_STYLE_OPTIONS,
      moduleVariantOptions: home.MODULE_VARIANT_OPTIONS,
      schema: home.HOMEPAGE_CONFIG_JSON_SCHEMA,
    };

	    if (options.inputMode) context.inputMode = options.inputMode;
	    if (options.guidedIntake) context.guidedIntake = options.guidedIntake;
    if (options.renderMode) context.renderMode = normalizeRenderMode(options.renderMode);
    if (context.renderMode === "skeletonHtml") {
      const designContract = skeletonDesignContractFor(currentConfig);
      context.skeletonDesignContract = designContract;
      context.skeletonGenerationRules = [
        "先让 designGenome/pageStory/layoutPreset 形成整页叙事差异，再生成 slot。",
        "同一个骨架方案里的所有 slot 必须继承 skeletonDesignContract 的 token、CTA 和组件语法。",
        "多方案之间必须改变首屏重心、section 顺序和核心模块 morph，不能只换颜色或文案。",
      ];
    }
	    return context;
	  }

  function aiGenerationLabel(config) {
    const provider = providerPreset(config.provider);
    return `${provider.name} / ${config.model}`;
  }

  function aiBusyLabel(baseLabel = "正在生成") {
    const config = sanitizeModelConfig(aiModelConfig);
    if (config.callMode !== "serverProxy") return `${baseLabel}（本地规则）`;
    return `${baseLabel}：${aiGenerationLabel(config)}`;
  }

  function errorMessage(error, limit = 320) {
    return String(error?.message || error || "大模型调用失败").slice(0, limit);
  }

  function providerAuthAdvice(details = {}, message = "") {
    const identity = `${details.provider || ""} ${details.providerName || ""} ${details.model || ""} ${message || ""}`;
    if (details.provider === "deepseek" || /DeepSeek/i.test(identity)) {
      return "处理建议：DeepSeek API Key 无效或未配置，请在模型配置里填写 DEEPSEEK_API_KEY 对应密钥；Base URL 使用 https://api.deepseek.com。";
    }
    if (details.provider === "gemini" || /Gemini|Google/i.test(identity)) {
      return `处理建议：Gemini API Key 无效或未配置，请在模型配置里填写 GEMINI_API_KEY 或 GOOGLE_API_KEY；Base URL 使用 ${GEMINI_OPENAI_BASE_URL}。`;
    }
    if (details.provider === "kimi" || /Kimi|Moonshot|moonshot/i.test(identity)) {
      return `处理建议：Kimi / Moonshot API Key 无效或未配置，请在模型配置里填写 MOONSHOT_API_KEY 或 KIMI_API_KEY 对应密钥；Base URL 使用国内入口 ${KIMI_CN_BASE_URL}。`;
    }
    if (details.provider === "minimax" || /MiniMax/i.test(identity)) {
      return `处理建议：API Key 无效或账号区域不匹配，请在模型配置里重新填写 MiniMax API Key；国内入口使用 ${MINIMAX_CN_BASE_URL}。`;
    }
    return "处理建议：API Key 无效或账号区域不匹配，请检查当前厂商的 API Key、Base URL 和账号区域。";
  }

  function modelProxyAdvice(message, details = {}) {
    const source = `${message || ""} ${details.providerStatus || ""} ${details.providerCode || ""}`;

    if (Number(details.providerStatus) === 401 || /HTTP\s*401|invalid api key|unauthorized|\b2049\b/i.test(source)) {
      return providerAuthAdvice(details, source);
    }

    if (details.provider === "kimi" && /invalid temperature|only\s+0\.6|temperature/i.test(source)) {
      return `处理建议：Kimi K2.6/K2.5 关闭 thinking 时只能使用 temperature=0.6；当前版本会自动修正，并使用国内入口 ${KIMI_CN_BASE_URL}。`;
    }

    if (/valid homepage JSON|AI response did not contain (?:a )?valid (?:homepage )?JSON(?: object)?/i.test(source)) {
      if (details.likelyTruncated || /length|max_tokens/i.test(String(details.finishReason || ""))) {
        if (details.provider === "minimax") {
          return "处理建议：MiniMax 输出达到 2048 上限导致截断；代理已改用首页短 patch JSON，并在 AI HTML 模式下跳过长自由 HTML，改为按 MiniMax 配置蓝图装配安全预览。仍失败时请降低 Temperature 或切到 Kimi/DeepSeek/Gemini 这类更高输出上限模型。";
        }
        if (details.provider === "gemini") {
          return "处理建议：Gemini 已连通，但当前模型输出过长被截断；代理会改用短 patch JSON，并在 Pro 返回不可解析 JSON 时自动降级到 gemini-2.5-flash 重试。仍失败时请把 Temperature 保持在 0.4 左右。";
        }
        return "处理建议：模型返回了 JSON 开头，但输出可能被截断；已自动回退本地方案。Kimi 会使用 max_completion_tokens；仍失败时请把 Max output tokens 保持在 6000 以上并降低 Temperature。";
      }
      if (details.provider === "gemini") {
        return "处理建议：Gemini 有响应但没有形成完整 JSON；代理会使用更短的首页 patch/组件 JSON prompt，并在 Pro 失败时自动切到 gemini-2.5-flash 重试。";
      }
      return "处理建议：模型有响应，但没有按首页配置 JSON 返回；已自动回退本地方案。可以重试一次、降低 Temperature，或切到更稳定的结构化输出模型。";
    }

    if (/timed out|timeout|超时/i.test(source)) {
      return "处理建议：模型连通正常，但首页蓝图生成超过代理等待时间；MiniMax/Kimi/Gemini 已改用短 prompt，Kimi 会关闭 thinking 并使用 max_completion_tokens，Gemini Flash 会关闭 thinking，Kimi 旧模型会自动尝试当前默认模型，DeepSeek Pro 会自动降级到 Flash。仍失败时再回退本地方案。";
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
    if (details.finishReason) parts.push(`finish: ${details.finishReason}`);
    if (details.likelyTruncated) parts.push("疑似输出被截断");
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

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function jobEndpointForCompleteEndpoint(endpoint) {
    const target = new URL(endpoint, window.location.href);
    target.pathname = target.pathname.replace(/\/complete\/?$/i, "/jobs");
    if (!/\/jobs\/?$/i.test(target.pathname)) target.pathname = "/api/home-ai/jobs";
    target.search = "";
    return target.toString();
  }

  function readActiveGenerationJob() {
    try {
      const raw = window.localStorage.getItem(ACTIVE_GENERATION_JOB_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function saveActiveGenerationJob(job) {
    window.localStorage.setItem(ACTIVE_GENERATION_JOB_KEY, JSON.stringify(job));
  }

  function clearActiveGenerationJob(jobId = "") {
    const current = readActiveGenerationJob();
    if (!jobId || current?.jobId === jobId) {
      window.localStorage.removeItem(ACTIVE_GENERATION_JOB_KEY);
    }
  }

  async function pollBackgroundGenerationJob(statusUrl, jobId) {
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
        const error = new Error(job.error?.message || "后台生成失败");
        error.proxyPayload = {
          details: job.error?.details || null,
          callRecord: job.error?.callRecord || null,
        };
        throw error;
      }

      const current = readActiveGenerationJob();
      if (current?.jobId === jobId) {
        saveActiveGenerationJob({ ...current, status: job.status || "running", updatedAt: Date.now() });
      }
      await sleep(BACKGROUND_JOB_POLL_MS);
    }

    throw new Error("后台生成等待超时");
  }

  async function requestBackgroundGeneration(config, payload) {
    const endpoints = proxyEndpointCandidates(config, "complete").map(jobEndpointForCompleteEndpoint);
    let lastMessage = "";

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => null);

        if (response.ok && data?.ok !== false && data?.jobId) {
          const statusUrl = new URL(data.job?.statusPath || `/api/home-ai/jobs/${data.jobId}`, endpoint).toString();
          saveActiveGenerationJob({
            jobId: data.jobId,
            statusUrl,
	            prompt: payload.prompt || "",
	            variant: payload.variant || 0,
	            pageRunId: payload.pageRunId || "",
	            renderMode: payload.renderMode || "config",
            inputMode: payload.inputMode || "quick",
            modelConfig: payload.modelConfig || null,
            startedAt: Date.now(),
            updatedAt: Date.now(),
          });
          try {
            return await pollBackgroundGenerationJob(statusUrl, data.jobId);
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

  function fetchFailureMessage(error, endpoints) {
    const base = String(error?.message || error || "Failed to fetch");
    return `无法连接本地后端代理：${base}。请确认是用 npm start 启动并从 http://127.0.0.1:5174 打开页面。已尝试 ${endpoints.join(" -> ")}`;
  }

  async function requestDirectAiProxy(config, action, payload) {
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

	  async function requestAiProxy(config, action, payload) {
	    if (action === "complete") {
	      try {
	        return await requestBackgroundGeneration(config, payload);
      } catch (error) {
        if (error?.backgroundJobStarted) throw error;
        return await requestDirectAiProxy(config, action, payload);
      }
    }
	    return await requestDirectAiProxy(config, action, payload);
	  }

	  function pageRunHash(value) {
	    return String(value || "")
	      .split("")
	      .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261)
	      .toString(16);
	  }

	  function createPageRunId(prompt, options = {}) {
	    const seed = [prompt, options.inputMode || "quick", options.renderMode || currentGenerationRenderMode(), options.variant || 0, Date.now()].join("|");
	    return `page-${Date.now().toString(36)}-${pageRunHash(seed).slice(0, 8)}`;
	  }

		  async function generateConfigFromModel(prompt, options = {}) {
		    const config = sanitizeModelConfig(aiModelConfig);
	      const renderMode = normalizeRenderMode(options.renderMode || currentGenerationRenderMode());
	    if (config.callMode !== "serverProxy") {
	      return {
        config: attachRenderModeToConfig(home.promptToConfig(prompt, options.variant || 0), prompt, { renderMode, reason: "本地规则生成" }),
	        usedModel: false,
	        label: "本地规则",
	      };
	    }

		    const payload = await requestAiProxy(config, "complete", {
		      pageRunId: options.pageRunId || createPageRunId(prompt, { ...options, renderMode }),
		      prompt,
		      variant: options.variant || 0,
	        renderMode,
	      inputMode: options.inputMode || "quick",
	      modelConfig: aiRequestModelConfig(),
	      context: aiRequestContext({
	        inputMode: options.inputMode || "quick",
	        guidedIntake: options.guidedIntake || null,
          renderMode,
	      }),
	    });
    const usedProvider = providerPreset(payload.provider || config.provider);
    const usedModel = payload.model || config.model;

	    const aiConfig = {
	      generationMode: "brick-v2",
	      ...(payload.config || {}),
        renderMode: payload.renderMode || renderMode,
        activeRenderMode: payload.activeRenderMode || (renderMode === "aiHtml" ? "aiHtml" : renderMode === "skeletonHtml" ? "skeletonHtml" : "config"),
        htmlGenerationEnabled: renderMode === "aiHtml" || renderMode === "compare",
        skeletonHtmlEnabled: renderMode === "skeletonHtml",
        ...(payload.htmlScheme ? { htmlScheme: payload.htmlScheme } : {}),
	      aiSummary:
	        payload.config?.aiSummary ||
	        `已通过 ${usedProvider.name} / ${usedModel} 生成首页蓝图，并完成前端安全标准化。`,
	    };
	    const normalizedConfig = home.normalizeConfig(
        attachRenderModeToConfig(aiConfig, prompt, { renderMode, reason: `${usedProvider.name} fallback` }),
      );

	      return {
	        config: normalizedConfig,
	        usedModel: true,
	        label: `${usedProvider.name} / ${usedModel}`,
	        mock: Boolean(payload.mock),
	        htmlScheme: normalizedConfig.htmlScheme?.enabled ? normalizedConfig.htmlScheme : null,
		      callRecord: payload.callRecord || null,
		    };
	  }

		  function summarizeHomepageConfig(config) {
		    const normalized = home.normalizeConfig(config || {});
		    return {
	      name: normalized.name,
	      layoutPreset: normalized.layoutPreset,
	      themePreset: normalized.themePreset || normalized.theme,
			      density: normalized.density,
		      designGenome: normalized.designGenome,
		      pageStory: normalized.pageStory,
		      heroFocus: normalized.heroFocus,
	          renderMode: normalized.activeRenderMode || "config",
	          htmlScheme: normalized.htmlScheme?.enabled ? normalized.htmlScheme.name : "",
	          htmlSourceType: normalized.htmlScheme?.enabled ? normalized.htmlScheme.sourceType || "" : "",
	          htmlIsFallback: Boolean(normalized.htmlScheme?.enabled && normalized.htmlScheme.isFallback),
	          htmlMock: Boolean(normalized.htmlScheme?.enabled && normalized.htmlScheme.mock),
	          htmlQualityStatus: normalized.htmlScheme?.enabled ? normalized.htmlScheme.qualityStatus || "" : "",
	          htmlFallbackReason: normalized.htmlScheme?.enabled ? normalized.htmlScheme.fallbackReason || "" : "",
			      intent: normalized.brickTrace?.intent || "",
	      strategy: normalized.brickTrace?.strategy || normalized.compositionStrategy || "",
		      brickIds: normalized.brickPlan.map((item) => item.brickId || item.feature).filter(Boolean),
		      sections: normalized.sections.map((section) => `${section.type}:${section.slots.join("+")}`),
		      firstScreen: normalized.sections.slice(0, 2).map((section) => `${section.type}:${section.slots.join("+")}`),
		      morphs: Object.keys(normalized.componentMorphs || {})
		        .map((moduleId) => `${moduleId}:${normalized.componentMorphs[moduleId]?.morphId || normalized.componentMorphs[moduleId]?.morph || ""}`)
		        .filter(Boolean),
			          htmlPipeline: normalized.htmlScheme?.enabled ? normalized.htmlScheme.generationPipeline || normalized.htmlScheme.sourceType || "" : "",
			    };
			  }

		  function homepageHistoryFinalPage(config) {
		    const normalized = home.normalizeConfig(config || {});
		    const htmlScheme = normalized.htmlScheme?.enabled ? normalized.htmlScheme : null;
		    const skeletonScheme = normalized.skeletonHtmlScheme?.enabled ? normalized.skeletonHtmlScheme : null;
		    return {
		      configJson: normalized,
		      aiHtml: htmlScheme?.html || "",
		      aiCss: htmlScheme?.css || "",
		      htmlScheme,
		      skeletonHtmlScheme: skeletonScheme,
		    };
		  }

		  function homepageConfigLooksSame(firstConfig, secondConfig) {
	    if (!firstConfig || !secondConfig) return false;
	    const first = summarizeHomepageConfig(firstConfig);
	    const second = summarizeHomepageConfig(secondConfig);
	    const firstBricks = new Set(first.brickIds);
	    const secondBricks = new Set(second.brickIds);
		    const overlap = [...secondBricks].filter((brickId) => firstBricks.has(brickId)).length;
		    const maxSize = Math.max(firstBricks.size, secondBricks.size, 1);
		    const sameSections = first.sections.join("|") === second.sections.join("|");
		    const sameFirstScreen = first.firstScreen.join("|") === second.firstScreen.join("|");
		    const sameNarrative = first.designGenome === second.designGenome || first.pageStory === second.pageStory;
		    const sameHero = first.heroFocus === second.heroFocus;
		    const morphOverlap = second.morphs.filter((morph) => first.morphs.includes(morph)).length;
		    const morphSimilarity = morphOverlap / Math.max(first.morphs.length, second.morphs.length, 1);

		    return (
		      first.layoutPreset === second.layoutPreset &&
		      sameNarrative &&
		      (sameSections || (sameFirstScreen && sameHero)) &&
		      overlap / maxSize >= 0.72 &&
		      morphSimilarity >= 0.64
		    );
		  }

		  function findDistinctLocalConfig(prompt, referenceConfig, startVariant = 0) {
		    let fallback = null;
		    for (let offset = 1; offset <= 7; offset += 1) {
		      const candidate = home.promptToConfig(prompt, startVariant + offset);
	      fallback = candidate;
	      if (!homepageConfigLooksSame(referenceConfig, candidate)) return candidate;
	    }
		    return fallback || home.promptToConfig(prompt, startVariant + 1);
		  }

		  function serverHtmlLooksModelGenerated(value = {}) {
		    const sourceType = String(value.sourceType || value.htmlSourceType || "").toLowerCase();
		    const pipeline = String(value.pipeline || value.htmlPipeline || value.generationPipeline || "").toLowerCase();
		    const quality = String(value.qualityStatus || value.htmlQualityStatus || "").toLowerCase();
		    if (sourceType === "brick-library-backed" || pipeline.includes("brick-backed") || pipeline.includes("config-backed")) return false;
		    if (sourceType.startsWith("model/") || sourceType === "model-repair") return true;
		    if (pipeline.includes("free-html") && !pipeline.includes("fallback")) return true;
		    return ["passed", "publishable"].includes(quality) && !sourceType.includes("fallback") && !pipeline.includes("fallback");
		  }

		  function isRealModelAiHtmlScheme(configOrScheme = {}) {
		    const scheme = configOrScheme.htmlScheme?.enabled ? configOrScheme.htmlScheme : configOrScheme;
		    if (!scheme?.enabled) return false;
		    if (scheme.mock || scheme.isFallback || scheme.sourceType === "local-fallback") return false;
		    return serverHtmlLooksModelGenerated(scheme);
		  }

		  function ensureDistinctHomepageConfig(prompt, config, options = {}) {
		    if (isRealModelAiHtmlScheme(config)) return config;
		    if (!options.distinctFrom || !homepageConfigLooksSame(options.distinctFrom, config)) return config;

		    const distinct = findDistinctLocalConfig(prompt, options.distinctFrom, options.variant || 0);
	    const normalized = home.normalizeConfig(distinct);
	    normalized.aiSummary = `检测到上一版首页结构过近，已自动切换到「${normalized.name}」并重排积木。`;
	    return normalized;
	  }

	  async function generateConfigWithFallback(prompt, options = {}) {
		    const startedAt = Date.now();
	    const requestConfig = sanitizeModelConfig(aiModelConfig);
	    const provider = providerPreset(requestConfig.provider);
	    const inputMode = options.inputMode === "guided" ? "guided" : "quick";
	    const renderMode = normalizeRenderMode(options.renderMode || currentGenerationRenderMode());
	    const pageRunId = options.pageRunId || createPageRunId(prompt, { ...options, inputMode, renderMode });

			    try {
			      const result = await generateConfigFromModel(prompt, { ...options, renderMode, pageRunId });
			      const finalConfig = attachRenderModeToConfig(ensureDistinctHomepageConfig(prompt, result.config, options), prompt, { renderMode, reason: result.label });
		      const htmlInfo = aiHtmlSourceInfo(finalConfig);
		      const serverRecord = result.callRecord || {};
		      const htmlIsFallback =
		        typeof serverRecord.htmlIsFallback === "boolean" ? serverRecord.htmlIsFallback : Boolean(finalConfig.htmlScheme?.isFallback);
		      const historyMock = typeof serverRecord.mock === "boolean" ? serverRecord.mock : Boolean(result.mock);
		      const historyStatus =
		        serverRecord.status || (historyMock ? "mock" : htmlIsFallback ? "fallback" : result.usedModel ? "success" : "local");
	      addModelHistoryRecord({
		        id: result.callRecord?.id,
	        action: "homepage-generate",
	        pageRunId: serverRecord.pageRunId || pageRunId,
	        serverCallId: result.callRecord?.id,
        providerId: result.callRecord?.providerId || requestConfig.provider,
        provider: result.usedModel ? result.callRecord?.provider || provider.name : "本地规则",
        model: result.usedModel ? result.callRecord?.model || requestConfig.model : "promptToConfig",
        callMode: requestConfig.callMode,
        apiMode: requestConfig.apiMode,
        baseUrl: requestConfig.baseUrl,
        endpoint: requestConfig.endpoint,
        proxyEndpoint: requestConfig.proxyEndpoint,
        temperature: requestConfig.temperature,
        maxOutputTokens: requestConfig.maxOutputTokens,
        inputMode,
        variant: options.variant || 0,
	        status: historyStatus,
	        mock: historyMock,
	        htmlSourceType: serverRecord.htmlSourceType || finalConfig.htmlScheme?.sourceType || "",
	        htmlPipeline: serverRecord.htmlPipeline || finalConfig.htmlScheme?.generationPipeline || "",
	        htmlIsFallback,
	        htmlFallbackReason: serverRecord.htmlFallbackReason || finalConfig.htmlScheme?.fallbackReason || "",
		        htmlQualityStatus: serverRecord.htmlQualityStatus || finalConfig.htmlScheme?.qualityStatus || "",
			        durationMs: Date.now() - startedAt,
			        prompt: String(prompt || "").slice(0, 1200),
			        businessProfile: serverRecord.businessProfile || null,
			        message: htmlIsFallback || historyMock ? `${finalConfig?.name || result.label} · ${htmlInfo.label}：${htmlInfo.detail}` : finalConfig?.name || result.label,
				        configSnapshot: { ...summarizeHomepageConfig(finalConfig), renderMode: finalConfig.activeRenderMode, htmlScheme: finalConfig.htmlScheme?.enabled ? finalConfig.htmlScheme.name : "" },
				        finalPage: homepageHistoryFinalPage(finalConfig),
				      });

      if (result.usedModel) {
        showToast(result.mock ? "已通过代理 mock 生成首页方案" : `已通过 ${result.label} 生成首页方案`);
      }
      clearActiveGenerationJob();
	      return finalConfig;
	    } catch (error) {
      clearActiveGenerationJob();
		      const fallback = attachRenderModeToConfig(ensureDistinctHomepageConfig(prompt, home.promptToConfig(prompt, options.variant || 0), options), prompt, { renderMode, reason: "大模型失败后本地回退" });
		      fallback.aiSummary = `大模型调用失败，已使用本地安全方案回退：${errorMessage(error, 220)}`;
	      const fallbackInfo = aiHtmlSourceInfo(fallback);
	      addModelHistoryRecord({
	        action: "homepage-generate",
	        pageRunId: error.proxyPayload?.callRecord?.pageRunId || pageRunId,
	        serverCallId: error.proxyPayload?.callRecord?.id,
        providerId: requestConfig.provider,
        provider: provider.name,
        model: error.proxyPayload?.callRecord?.model || requestConfig.model,
        callMode: requestConfig.callMode,
        apiMode: requestConfig.apiMode,
        baseUrl: requestConfig.baseUrl,
        endpoint: requestConfig.endpoint,
        proxyEndpoint: requestConfig.proxyEndpoint,
        temperature: requestConfig.temperature,
        maxOutputTokens: requestConfig.maxOutputTokens,
        inputMode,
        variant: options.variant || 0,
	        status: "fallback",
	        htmlSourceType: fallback.htmlScheme?.sourceType || "",
	        htmlPipeline: fallback.htmlScheme?.generationPipeline || "",
	        htmlIsFallback: Boolean(fallback.htmlScheme?.isFallback),
	        htmlFallbackReason: fallback.htmlScheme?.fallbackReason || fallbackInfo.detail || "",
	        htmlQualityStatus: fallback.htmlScheme?.qualityStatus || "",
			        durationMs: Date.now() - startedAt,
		        prompt: String(prompt || "").slice(0, 1200),
		        businessProfile: error.proxyPayload?.callRecord?.businessProfile || null,
		        message: errorMessage(error, 700),
			        configSnapshot: { ...summarizeHomepageConfig(fallback), renderMode: fallback.activeRenderMode, htmlScheme: fallback.htmlScheme?.enabled ? fallback.htmlScheme.name : "" },
			        finalPage: homepageHistoryFinalPage(fallback),
			      });
      showToast(`大模型调用失败，已回退本地方案`);
      return fallback;
    }
  }

  async function generateBetterAestheticCandidate() {
    if (!els.previewPage || !els.aestheticScoreImprove) return;

    interpretationRound += 1;
    const prompt = window.localStorage.getItem(PROMPT_KEY) || promptValue();
    const config = home.normalizeConfig(currentConfig);
    const renderMode = normalizeRenderMode(config.renderMode || config.activeRenderMode || currentGenerationRenderMode());
    const previousLabel = els.aestheticScoreImprove.textContent.trim();

    els.aestheticScoreImprove.disabled = true;
    els.aestheticScoreImprove.classList.add("is-loading");
    els.aestheticScoreImprove.textContent = "优选中";
    setAiBusy(true, aiBusyLabel("正在优选候选"));
    updateStatus("正在生成 3 个候选并按审美评分排序", false);

    try {
      const response = await requestJsonEndpoint("/api/home-ai/candidates", {
        prompt,
        variant: interpretationRound,
        count: 3,
        renderMode,
        modelConfig: aiRequestModelConfig(),
        context: aiRequestContext({ inputMode: "quick", renderMode }),
      });
      const candidates = Array.isArray(response.candidates) ? response.candidates : [];
      const best = candidates
        .filter((candidate) => candidate?.config)
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];

      if (!best) throw new Error("候选生成没有返回可应用方案");

      const next = home.normalizeConfig(best.config);
      next.aiSummary = [
        next.aiSummary,
        `已从 ${candidates.length} 个候选中选择审美评分 ${Math.round(Number(best.score) || 0)} 分的方案。`,
      ]
        .filter(Boolean)
        .join(" ");
      setConfig(next, `已应用更优候选：${Math.round(Number(best.score) || 0)} 分`, { saveDraft: true });
      showToast(`已应用更优候选：${Math.round(Number(best.score) || 0)} 分`);
      scheduleAestheticScore({ force: true, action: "best-candidate-score", source: "candidate-best", delay: 80 });
    } catch (error) {
      updateStatus("候选优选失败，保留当前草稿", false);
      showToast(`候选优选失败：${errorMessage(error, 160)}`);
    } finally {
      els.aestheticScoreImprove.disabled = false;
      els.aestheticScoreImprove.classList.remove("is-loading");
      els.aestheticScoreImprove.textContent = previousLabel || "生成更优候选";
      setAiBusy(false);
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

  function configFromBackgroundResult(payload = {}, job = {}) {
    const requestConfig = sanitizeModelConfig(job.modelConfig || aiModelConfig);
    const renderMode = normalizeRenderMode(job.renderMode || payload.renderMode || currentGenerationRenderMode());
    const provider = providerPreset(payload.provider || requestConfig.provider);
    const usedModel = payload.model || requestConfig.model;
    const aiConfig = {
      generationMode: "brick-v2",
      ...(payload.config || {}),
      renderMode: payload.renderMode || renderMode,
      activeRenderMode: payload.activeRenderMode || (renderMode === "aiHtml" ? "aiHtml" : renderMode === "skeletonHtml" ? "skeletonHtml" : "config"),
      htmlGenerationEnabled: renderMode === "aiHtml" || renderMode === "compare",
      skeletonHtmlEnabled: renderMode === "skeletonHtml",
      ...(payload.htmlScheme ? { htmlScheme: payload.htmlScheme } : {}),
      aiSummary:
        payload.config?.aiSummary ||
        `已通过 ${provider.name} / ${usedModel} 在后台生成首页蓝图，并完成前端安全标准化。`,
    };

    return home.normalizeConfig(
      attachRenderModeToConfig(aiConfig, job.prompt || promptValue(), { renderMode, reason: `${provider.name} / ${usedModel}` }),
    );
  }

  async function resumeActiveGenerationJob() {
    const job = readActiveGenerationJob();
    if (!job?.jobId || !job.statusUrl) return;
    if (Date.now() - Number(job.startedAt || 0) > BACKGROUND_JOB_MAX_WAIT_MS) {
      clearActiveGenerationJob(job.jobId);
      return;
    }

    setAiBusy(true, "正在恢复后台首页生成...");
    updateStatus("后台生成仍在进行，正在接回结果...", false);
    try {
      const result = await pollBackgroundGenerationJob(job.statusUrl, job.jobId);
      clearActiveGenerationJob(job.jobId);
      const config = configFromBackgroundResult(result, job);
      showToast("后台首页生成已完成");
      generatePreview(config);
    } catch (error) {
      clearActiveGenerationJob(job.jobId);
      const fallback = attachRenderModeToConfig(home.promptToConfig(job.prompt || promptValue(), job.variant || 0), job.prompt || promptValue(), {
        renderMode: normalizeRenderMode(job.renderMode || currentGenerationRenderMode()),
        reason: "后台生成失败后本地回退",
      });
      fallback.aiSummary = `后台生成未能完成，已使用本地安全方案回退：${errorMessage(error, 180)}`;
      currentConfig = home.saveDraft(fallback);
      updateStatus("后台生成失败，已保留本地草稿", false);
      showToast("后台生成失败，已回退本地草稿");
    } finally {
      setAiBusy(false);
    }
  }

  function renderModuleOutline() {
    if (!els.moduleOutline) return;

    const config = home.normalizeConfig(currentConfig);
    const slotLabels = { hero: "首屏 12 栅格", main: "主内容 8 栅格", rail: "右侧信息 4 栅格", full: "整行 12 栅格" };

    els.moduleOutline.innerHTML = config.layout
      .map((block, index) => {
        return `
          <article class="module-outline-item">
            <b>${String(index + 1).padStart(2, "0")}</b>
            <div>
              <strong>${escapeHtml(home.featureLabel(block.component))}</strong>
              <small>${escapeHtml(slotLabels[block.slot] || block.slot)}</small>
              <p>
                <span>${escapeHtml(block.brickName || block.component)}</span>
                ${block.brickSize ? `<span>${escapeHtml(block.brickSize)}</span>` : ""}
                ${block.module?.variant ? `<span>${escapeHtml(block.module.variant)}</span>` : ""}
              </p>
              ${block.brickReason ? `<small>${escapeHtml(block.brickReason)}</small>` : ""}
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
      { id: "growth", label: "活动增长", prompt: "活动增长首页，首屏突出交易大赛；欢迎模块独占第一栏但要轻量，广告轮播做成首屏核心并独占一整栏，快捷入口保留 8 个，整体扁平化、轻快清晰，色调淡金色。真实交易账号列表用卡片形式，并在真实账号分区提供创建账号按钮；模拟账号列表用列表形式并提供同级创建账号按钮。不要把开户做成右侧大面板。" },
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
        <header><span>推广链接</span><b>${settings.referralLinkCard.enabled ? "代理可见" : "默认隐藏"}</b></header>
        ${settingRow("模块状态", renderToggleButton("referralLinkCard.enabled", settings.referralLinkCard.enabled))}
        ${settingRow("推广链接", renderToggleButton("referralLinkCard.showPromoLink", settings.referralLinkCard.showPromoLink, "显示", "隐藏"))}
        ${settingRow("邀请码", renderToggleButton("referralLinkCard.showInviteCode", settings.referralLinkCard.showInviteCode, "显示", "隐藏"))}
        ${settingRow("分享按钮", renderToggleButton("referralLinkCard.showShare", settings.referralLinkCard.showShare, "显示", "隐藏"))}
        ${settingRow("基础统计", renderToggleButton("referralLinkCard.showStats", settings.referralLinkCard.showStats, "显示", "隐藏"))}
        ${settingRow("注册转化率", renderToggleButton("referralLinkCard.showRegistrationRate", settings.referralLinkCard.showRegistrationRate, "显示", "隐藏"))}
        ${settingRow("开户转化率", renderToggleButton("referralLinkCard.showAccountRate", settings.referralLinkCard.showAccountRate, "显示", "隐藏"))}
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

	  els.suggestionPanel?.addEventListener("click", (event) => {
	    const button = event.target.closest("[data-suggestion-prompt]");
	    if (!button) return;
	    applySuggestionPrompt(button);
	  });

  els.aestheticScoreRefresh?.addEventListener("click", () => {
    scoreCurrentPreview({ force: true, action: "manual-preview-score", source: "preview-manual" });
  });

  els.aestheticManualScoreInput?.addEventListener("input", () => {
    aestheticManualScoreTouched = true;
    const score = normalizeAestheticManualScore(els.aestheticManualScoreInput.value);
    aestheticManualDecision = aestheticDecisionForScore(score);
    renderAestheticManualControls();
  });

  els.aestheticDecisionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      aestheticManualDecision = button.dataset.aestheticDecision || "neutral";
      renderAestheticManualControls();
    });
  });

  els.aestheticScoreSave?.addEventListener("click", () => {
    saveManualAestheticFeedback();
  });

  els.aestheticScoreImprove?.addEventListener("click", () => {
    generateBetterAestheticCandidate();
  });

	  els.renderModeButtons.forEach((button) => {
	    button.addEventListener("click", () => {
	      const mode = normalizeRenderMode(button.dataset.renderModeButton, "config");
	      if (button.closest("[data-preview-render-mode-controls]")) {
	        let nextConfig = { ...currentConfig, activeRenderMode: "config" };
	        if (mode === "aiHtml" && currentConfig.htmlScheme?.enabled) {
	          nextConfig = { ...nextConfig, activeRenderMode: "aiHtml" };
	        }
	        if (mode === "skeletonHtml") {
	          const normalized = home.normalizeConfig(currentConfig);
	          nextConfig = {
	            ...normalized,
	            renderMode: "skeletonHtml",
	            activeRenderMode: "skeletonHtml",
	            skeletonHtmlEnabled: true,
	            skeletonHtmlScheme: normalized.skeletonHtmlScheme?.enabled
	              ? normalized.skeletonHtmlScheme
	              : home.buildSkeletonHtmlScheme(normalized, {
	                  reason: "第一步只生成骨架和模块占位，等待逐 slot 填充。",
	                  sourceType: "local-skeleton",
	                  status: "pending-fill",
	                }),
	          };
	          skeletonAutoStarted = false;
	        }
	        setConfig(nextConfig, `已切换预览：${renderModeLabel(nextConfig.activeRenderMode)}`, { saveDraft: Boolean(els.previewPage) });
	        return;
	      }

      saveRenderModeSetting(mode);
	      showToast(`生成模式已切换为：${renderModeLabel(mode)}`);
	    });
	  });

  els.skeletonWorkflow?.addEventListener("click", (event) => {
    const fillAll = event.target.closest("[data-skeleton-fill-all]");
    const reset = event.target.closest("[data-skeleton-reset]");
    const finalize = event.target.closest("[data-skeleton-finalize]");
    if (fillAll) {
      skeletonAutoStarted = true;
      fillSkeletonSlotsSequentially({ force: false });
      return;
    }
    if (reset) {
      const scheme = skeletonSchemeFor(currentConfig);
      const next = home.normalizeConfig({
        ...currentConfig,
        renderMode: "skeletonHtml",
        activeRenderMode: "skeletonHtml",
        skeletonHtmlEnabled: true,
        skeletonHtmlScheme: {
          ...scheme,
          status: "pending-fill",
          slots: scheme.slots.map((slot) => ({ ...slot, status: "pending-fill", locked: false, componentId: "", filledAt: "" })),
          slotComponents: {},
        },
      });
      skeletonAutoStarted = false;
      setConfig(next, "已重置骨架组件", { saveDraft: true });
      return;
    }
    if (finalize) {
      if (finalize.disabled) return;
      const next = withSkeletonSchemeStatus(currentConfig, "final");
      setConfig(next, "骨架方案已定稿", { saveDraft: true });
      showToast("骨架方案已定稿");
    }
  });

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "home-skeleton-slot-action") return;
    const slot = String(event.data.slot || "").trim();
    if (!slot) return;
    const action = event.data.action || "regenerate";
    skeletonAutoStarted = true;
    if (action === "lock" || action === "unlock") {
      generateSkeletonSlot(slot, action);
      return;
    }
    openSkeletonComponentPromptModal(slot, action);
  });

	  els.generateSuggestions?.addEventListener("click", () => {
    suggestionRound += 1;
    suggestionCards = buildSuggestionCards();
    renderSuggestionCards("已生成一批提示语案例");
    showToast("已生成提示语案例");
  });

  els.refreshSuggestions?.addEventListener("click", () => {
    suggestionRound += 1;
    suggestionCards = buildSuggestionCards();
    renderSuggestionCards("已换一批提示语案例");
    showToast("已换一批提示语");
  });

  els.generate?.addEventListener("click", async () => {
    savePrompt();
    interpretationRound += 1;
    setAiBusy(true, aiBusyLabel("正在生成"));
    let shouldResetBusy = true;
    try {
      const config = await generateConfigWithFallback(promptValue(), { variant: interpretationRound, distinctFrom: currentConfig });
      generatePreview(config);
      shouldResetBusy = false;
    } finally {
      if (shouldResetBusy) setAiBusy(false);
    }
  });

	  els.random?.addEventListener("click", () => {
	    generatePreview(attachRenderModeToConfig(home.randomConfig(promptValue()), promptValue(), { reason: "随机方案" }));
	  });

	  els.regenerateIntelligence?.addEventListener("click", async () => {
	    interpretationRound += 1;
    selectedSuggestion = null;
    savePrompt();
	    setAiBusy(true, aiBusyLabel("正在解读"));
	    try {
	      const config = await generateConfigWithFallback(promptValue(), { variant: interpretationRound, distinctFrom: currentConfig });
	      setConfig(config, "已重新解读文案", { saveDraft: Boolean(els.previewPage) });
      showToast("已重新解读文案");
    } finally {
      setAiBusy(false);
    }
  });

	  els.regenerate?.addEventListener("click", async () => {
    interpretationRound += 1;
    setAiBusy(true, aiBusyLabel("正在生成"));
	    try {
	      const prompt = window.localStorage.getItem(PROMPT_KEY) || "";
	      const config = await generateConfigWithFallback(prompt, { variant: interpretationRound, distinctFrom: currentConfig });
      setConfig(config, "已重新生成草稿", { saveDraft: true });
      showToast("已重新生成首页方案");
    } finally {
      setAiBusy(false);
    }
  });

		  els.publish?.addEventListener("click", () => {
		    const publishConfig = prepareConfigForPublish(currentConfig);
		    const sourceInfo = aiHtmlSourceInfo(publishConfig);
		    const scheme = publishConfig.htmlScheme;
        const publishMode = publishConfig.activeRenderMode || publishConfig.renderMode || "config";
		    const needsSourceConfirm =
		      scheme?.enabled &&
		      publishMode === "aiHtml" &&
		      (scheme.isFallback || scheme.mock || scheme.sourceType === "local-fallback");
	    if (needsSourceConfirm) {
	      const confirmed = window.confirm(
	        `当前 AI HTML 是「${sourceInfo.label}」，不是模型真实生成结果。\n\n${sourceInfo.detail || "这是 mock/fallback/demo 预览。"}\n\n仍要发布到首页吗？`,
	      );
	      if (!confirmed) {
	        showToast("已取消发布");
	        return;
	      }
	    }
	    currentConfig = home.saveConfig(publishConfig);
    home.clearDraft();
    renderSummary();
    renderIntelligenceSummary();
    renderDecisionReasons();
    renderVariantSummary();
    renderModuleOutline();
    renderPagePresetControls();
	    renderModuleStyleControls();
	    renderModuleSettingControls();
	    renderRenderModeControls();
	    renderSkeletonWorkflow();
	    scheduleAestheticScore({ force: true, action: "publish-score", source: "preview-publish", delay: 160 });
	    applyPreview(true);
	    updateStatus("已发布到首页", true);
    showToast("首页配置已发布");
    if (els.previewPage) {
      window.setTimeout(() => {
        window.location.href = `./client-home.html?published=${Date.now()}`;
      }, 160);
    }
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
	    renderRenderModeControls();
	    renderSkeletonWorkflow();
	    scheduleAestheticScore({ force: true, action: "reset-score", source: "preview-reset", delay: 160 });
	    applyPreview(true);
    updateStatus("已恢复默认", true);
    showToast("已恢复默认首页");
  });

  els.prompt?.addEventListener("input", () => {
    interpretationRound = 0;
    selectedSuggestion = null;
    suggestionCards = buildSuggestionCards();
    renderSuggestionCards("已按当前文案更新推荐");
    savePrompt();
    window.clearTimeout(renderIntelligenceSummary.timer);
    renderIntelligenceSummary.timer = window.setTimeout(() => {
      setConfig(home.promptToConfig(promptValue(), interpretationRound), "已完成文案解读");
    }, 260);
  });

  els.preview?.addEventListener("load", () => {
    applyPreview(false);
    maybeStartSkeletonWorkflow();
  });

  initModelConfig();
  renderModelHistory();
  restorePrompt();
  initGuidedBuilder();
  suggestionCards = buildSuggestionCards();
  renderSuggestionCards();

  if (els.intakePage) {
    setConfig(home.promptToConfig(promptValue(), interpretationRound), "已完成文案解读");
    resumeActiveGenerationJob();
  }

  if (els.previewPage) {
    initPreviewSizing();
    initPreviewColorMode();
    renderSummary();
    renderIntelligenceSummary();
    renderDecisionReasons();
    renderVariantSummary();
    renderModuleOutline();
    renderPagePresetControls();
	    renderModuleStyleControls();
	    renderModuleSettingControls();
	    renderRenderModeControls();
	    renderSkeletonWorkflow();
	    renderAestheticScorePanel();
	    scheduleAestheticScore({ action: "preview-open-score", source: "preview-open", delay: 120 });
	    maybeStartSkeletonWorkflow();
	    updateStatus("草稿预览", false);
	  }
})();

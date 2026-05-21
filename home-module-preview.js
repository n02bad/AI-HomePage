(function () {
  const MODEL_CONFIG_KEY = "forexcrm.home.ai.model.config";
  const COMPONENT_CACHE_KEY = "forexcrm.home.ai.component.library";
  const COMPONENT_SCORE_KEY = "forexcrm.home.ai.component.scores";
  const COMPONENT_DELETED_KEY = "forexcrm.home.ai.component.deleted";
  const COMPOSITION_CACHE_KEY = "forexcrm.home.ai.component.composition";
  const MAX_COMPONENT_REFERENCE_BYTES = 4_500_000;
  const HOME_GRID_COLUMNS = 12;
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
      note: "适合生成稳定 JSON 蓝图、结构化组件定义和复杂首页策略。",
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
      note: `适合中文长文本理解、运营需求摘要和组件方案整理；默认使用 ${KIMI_DEFAULT_MODEL} 与国内入口 ${KIMI_CN_BASE_URL}。K2.6/K2.5 关闭 thinking 时固定使用 temperature=0.6，避免参数冲突。`,
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
      note: "DeepSeek V4 官方 API 模型。组件和首页生成默认用 V4-Flash 提升稳定性；V4-Pro 仍可手动选择，代理会关闭 thinking 并在超时后降级到 Flash。",
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
  const COMPONENT_SIZE_OPTIONS = [
    "1x1",
    "1x2",
    "2x1",
    "2x2",
    "3x1",
    "3x2",
    "4x1",
    "4x2",
    "4x3",
    "5x1",
    "5x2",
    "5x3",
  ];
  const COMPONENT_SIZE_PATTERN = /^([1-9]\d?)x([1-9]\d?)$/i;
  const COMPONENT_COMPLEX_FAMILIES = new Set(["TradingAccounts", "AccountPerformance", "WalletList", "CreateAccountForm"]);
  const COMPONENT_RICH_FAMILIES = new Set(["AssetOverview", "OnboardingProgress", "PromotionBanner", "RiskDisclosure", "QuickActions"]);
  const COMPONENT_FAMILY_ALIASES = {
    ReferralLink: "ReferralLinkCard",
    referralLink: "ReferralLinkCard",
    referral_link: "ReferralLinkCard",
  };
  const COMPONENT_COMPACT_FAMILIES = new Set(["UserKycRail", "ReferralLinkCard", "SupportContact", "AppDownload"]);

  const buttons = [...document.querySelectorAll("[data-brick-filter]")];
  const groups = [...document.querySelectorAll("[data-brick-group]")];
  const familyGroupMap = new Map(
    groups
      .map((group) => [group.querySelector(".brick-family-head span")?.textContent.trim(), group.dataset.brickGroup])
      .filter(([family, group]) => family && group),
  );

  const els = {
    prompt: document.querySelector("[data-ai-component-prompt]"),
    family: document.querySelector("[data-ai-component-family]"),
    size: document.querySelector("[data-ai-component-size]"),
    generate: document.querySelector("[data-ai-generate-component]"),
    referenceFile: document.querySelector("[data-ai-component-reference-file]"),
    referenceDropzone: document.querySelector("[data-ai-reference-dropzone]"),
    referencePreview: document.querySelector("[data-ai-reference-preview]"),
    referenceClear: document.querySelector("[data-ai-reference-clear]"),
    compose: document.querySelector("[data-ai-compose-home]"),
    status: document.querySelector("[data-ai-component-status]"),
    result: document.querySelector("[data-ai-component-result]"),
    resultTitle: document.querySelector("[data-ai-component-result-title]"),
    resultProvider: document.querySelector("[data-ai-component-result-provider]"),
    resultPreview: document.querySelector("[data-ai-component-result-preview]"),
    resultMeta: document.querySelector("[data-ai-component-result-meta]"),
    confirmSave: document.querySelector("[data-ai-component-confirm-save]"),
    revise: document.querySelector("[data-ai-component-revise]"),
    aiComponentModal: document.querySelector("[data-ai-component-modal]"),
    savedSection: document.querySelector("[data-saved-section]"),
    savedCount: document.querySelector("[data-saved-count]"),
    savedComponents: document.querySelector("[data-saved-components]"),
    compositionSection: document.querySelector("[data-composition-section]"),
    compositionName: document.querySelector("[data-composition-name]"),
    compositionSummary: document.querySelector("[data-composition-summary]"),
    compositionLayout: document.querySelector("[data-composition-layout]"),
    compositionPolish: document.querySelector("[data-composition-polish]"),
    modelSummary: document.querySelector("[data-component-model-summary]"),
    familyFilter: document.querySelector("[data-brick-family-filter]"),
    sizeFilter: document.querySelector("[data-brick-size-filter]"),
    scoreFilter: document.querySelector("[data-brick-score-filter]"),
    search: document.querySelector("[data-brick-search]"),
    filterCount: document.querySelector("[data-brick-filter-count]"),
    emptyState: document.querySelector("[data-brick-empty-state]"),
  };

  let savedComponents = [];
  let componentScores = loadComponentScores();
  let deletedComponentIds = loadDeletedComponentIds();
  let aiModelConfig = loadModelConfig();
  let editingModelConfig = null;
  let modelTestState = { tone: "", message: "组件生成会复用这套模型配置" };
  let componentEditorState = { componentId: "", busy: false };
  let componentVisualReference = null;
  let pendingComponentDraft = null;
  let pendingComponentMeta = null;
  const brickFilters = {
    group: "all",
    family: "all",
    size: "all",
    minScore: "all",
    search: "",
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(message, tone = "") {
    if (!els.status) return;
    els.status.textContent = message;
    els.status.dataset.tone = tone;
  }

  function setGenerateButtonLabel(label) {
    if (els.generate) els.generate.textContent = label;
  }

  function renderPendingComponentDraft() {
    const component = pendingComponentDraft;
    const meta = pendingComponentMeta || {};

    if (!component) {
      if (els.result) els.result.hidden = true;
      if (els.resultPreview) {
        els.resultPreview.innerHTML = "";
        if (els.resultPreview.shadowRoot) els.resultPreview.shadowRoot.innerHTML = "";
      }
      if (els.resultMeta) els.resultMeta.innerHTML = "";
      if (els.resultProvider) els.resultProvider.textContent = "";
      if (els.confirmSave) els.confirmSave.disabled = true;
      if (els.revise) els.revise.disabled = true;
      setGenerateButtonLabel("生成组件预览");
      return;
    }

    if (els.result) els.result.hidden = false;
    if (els.resultTitle) els.resultTitle.textContent = component.name || "AI 生成组件";
    if (els.resultProvider) els.resultProvider.textContent = meta.providerLabel || "";
    if (els.resultMeta) {
      els.resultMeta.innerHTML = `
        <span>${escapeHtml(component.family || "ClientHomeAtoms")}</span>
        <span>${escapeHtml(component.size || "auto")}</span>
        <span>${escapeHtml(`${normalizeComponentScore(component.score, 5)}/10`)}</span>
        <p>${escapeHtml(component.description || "")}</p>
      `;
    }
    renderComponentPreview(els.resultPreview, component);
    if (els.confirmSave) els.confirmSave.disabled = false;
    if (els.revise) els.revise.disabled = false;
    setGenerateButtonLabel("重新生成预览");
  }

  function setPendingComponentDraft(component, meta = {}) {
    pendingComponentDraft = component ? sanitizeComponentForClient(component) : null;
    pendingComponentMeta = component ? meta : null;
    renderPendingComponentDraft();
  }

  function clearPendingComponentDraft() {
    setPendingComponentDraft(null);
  }

  function revisePendingComponentDraft() {
    if (!pendingComponentDraft) return;
    setStatus(`当前结果尚未保存。可以修改组件需求后重新生成：${pendingComponentDraft.name}`, "mock");
    els.prompt?.focus();
  }

  async function confirmSavePendingComponent() {
    const component = pendingComponentDraft;
    if (!component) {
      setStatus("还没有待确认的组件，先生成组件预览。", "error");
      return;
    }

    if (els.confirmSave) els.confirmSave.disabled = true;
    if (els.revise) els.revise.disabled = true;
    if (els.generate) els.generate.disabled = true;
    setStatus(`正在保存确认后的组件：${component.name}...`);

    try {
      const data = await requestJson("/api/home-components/save", { component });
      const savedComponent = data.component || component;
      syncComponentLibraryFromResponse(data);
      cacheComponents([savedComponent], { restoreDeleted: true });
      renderSavedComponents();
      clearPendingComponentDraft();
      setStatus(`已确认保存：${savedComponent.name}，现在可以用于首页积木组合。`, "success");
    } catch (error) {
      cacheComponents([component], { restoreDeleted: true });
      renderSavedComponents();
      clearPendingComponentDraft();
      setStatus(`已保存到当前浏览器缓存；后端组件库同步失败：${error.message}`, "mock");
    } finally {
      if (els.generate) els.generate.disabled = false;
      renderPendingComponentDraft();
    }
  }

  function openAiComponentModal(options = {}) {
    const modal = els.aiComponentModal || document.querySelector("[data-ai-component-modal]");
    if (!modal) return;

    if (options.keepDraft !== true) clearPendingComponentDraft();
    if (els.prompt && options.prompt) els.prompt.value = options.prompt;
    if (els.family && options.family) els.family.value = canonicalComponentFamily(options.family);
    if (els.size && options.size) {
      const size = isAutoComponentSize(options.size) ? "auto" : normalizeComponentSizeValue(options.size, "2x1");
      ensureSizeOption(size);
      els.size.value = size;
    }
    if (options.status) setStatus(options.status, options.tone || "");
    else if (!els.status?.textContent?.trim()) setStatus("等待生成组件");

    modal.hidden = false;
    window.requestAnimationFrame(() => els.prompt?.focus());
  }

  function closeAiComponentModal() {
    const modal = els.aiComponentModal || document.querySelector("[data-ai-component-modal]");
    if (modal) modal.hidden = true;
  }

  function normalizeComponentScore(value, fallback = 5) {
    const score = Number(value);
    if (!Number.isFinite(score)) return fallback;
    return Math.min(10, Math.max(1, Math.round(score)));
  }

  function canonicalComponentFamily(value) {
    const family = String(value || "").trim();
    return COMPONENT_FAMILY_ALIASES[family] || family;
  }

  function loadComponentScores() {
    try {
      const data = JSON.parse(window.localStorage.getItem(COMPONENT_SCORE_KEY) || "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (error) {
      return {};
    }
  }

  function saveComponentScores() {
    window.localStorage.setItem(COMPONENT_SCORE_KEY, JSON.stringify(componentScores));
  }

  function mergeRemoteComponentScores(scores) {
    if (!scores || typeof scores !== "object" || Array.isArray(scores)) return false;
    let changed = false;
    Object.entries(scores).forEach(([key, value]) => {
      const scoreKey = String(key || "").trim();
      if (!scoreKey) return;
      const score = normalizeComponentScore(value, 5);
      if (componentScores[scoreKey] !== score) {
        componentScores[scoreKey] = score;
        changed = true;
      }
    });
    if (changed) saveComponentScores();
    return changed;
  }

  async function syncLocalComponentScoresToServer() {
    const scores = componentScores && typeof componentScores === "object" ? componentScores : {};
    if (!Object.keys(scores).length) return;
    try {
      const data = await requestJson("/api/home-components/score", { scores });
      mergeRemoteComponentScores(data.scores);
    } catch (error) {
      // File preview mode or a stopped backend can still use local scores.
    }
  }

  function loadDeletedComponentIds() {
    try {
      const data = JSON.parse(window.localStorage.getItem(COMPONENT_DELETED_KEY) || "[]");
      return new Set(Array.isArray(data) ? data.filter(Boolean).map(String) : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveDeletedComponentIds() {
    window.localStorage.setItem(COMPONENT_DELETED_KEY, JSON.stringify([...deletedComponentIds]));
  }

  function markComponentDeleted(componentId) {
    const id = String(componentId || "").trim();
    if (!id) return;
    deletedComponentIds.add(id);
    saveDeletedComponentIds();
  }

  function restoreDeletedComponent(componentId) {
    const id = String(componentId || "").trim();
    if (!id || !deletedComponentIds.has(id)) return;
    deletedComponentIds.delete(id);
    saveDeletedComponentIds();
  }

  function isComponentDeleted(componentId) {
    return deletedComponentIds.has(String(componentId || "").trim());
  }

  function componentScoreKey(componentOrId) {
    const id = typeof componentOrId === "string" ? componentOrId : componentOrId?.id;
    return id ? `component:${id}` : "";
  }

  function staticCardScoreKey(card) {
    return `static:${familyFromCard(card)}:${titleFromCard(card)}:${sizeFromCard(card)}`;
  }

  function scoreForKey(scoreKey, fallback = 5) {
    return normalizeComponentScore(componentScores[scoreKey], fallback);
  }

  function scoreForComponent(component) {
    const fallback = normalizeComponentScore(component?.score, 5);
    const scoreKey = componentScoreKey(component);
    return scoreKey ? scoreForKey(scoreKey, normalizeComponentScore(componentScores[component?.id], fallback)) : fallback;
  }

  function scoreTier(score) {
    if (score >= 8) return "high";
    if (score <= 4) return "low";
    return "mid";
  }

  function scoreOptions(score) {
    const selected = normalizeComponentScore(score);
    return Array.from({ length: 10 }, (_, index) => {
      const value = index + 1;
      return `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`;
    }).join("");
  }

  function scoreControl(scoreKey, score) {
    const normalized = normalizeComponentScore(score);
    return `
      <label class="brick-score-control" data-score-tier="${scoreTier(normalized)}" title="AI 会优先参考高分积木">
        <span>评分</span>
        <select data-brick-score-key="${escapeHtml(scoreKey)}" aria-label="积木评分，1 到 10 分">
          ${scoreOptions(normalized)}
        </select>
      </label>
    `;
  }

  function isAutoComponentSize(value) {
    return ["auto", "ai", "free"].includes(String(value || "").trim().toLowerCase());
  }

  function normalizeComponentSizeValue(value, fallback = "2x1") {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[×*]/g, "x");
    if (COMPONENT_SIZE_PATTERN.test(normalized)) return normalized;
    return fallback;
  }

  function ensureSizeOption(value, label) {
    if (!els.size) return;
    const rawValue = String(value || "").trim();
    const safeValue = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(rawValue) : rawValue.replace(/"/g, '\\"');
    if (!rawValue || els.size.querySelector(`option[value="${safeValue}"]`)) return;
    const option = document.createElement("option");
    option.value = rawValue;
    option.textContent = label || rawValue;
    els.size.insertBefore(option, els.size.querySelector('option[value="auto"]'));
  }

  function syncComponentSizeSelect() {
    if (!els.size) return;
    const current = els.size.value || "auto";
    els.size.innerHTML =
      COMPONENT_SIZE_OPTIONS.map((size) => `<option value="${size}">${size}</option>`).join("") +
      '<option value="auto">AI 自行发挥（按宽度/功能）</option>';
    ensureSizeOption(current);
    els.size.value = current;
    if (!els.size.value) els.size.value = "auto";
  }

  function componentSizeParts(value, fallback = "2x1") {
    const size = normalizeComponentSizeValue(value, fallback);
    const match = size.match(COMPONENT_SIZE_PATTERN);
    return {
      size,
      columns: match ? Number(match[1]) || 1 : 1,
      rows: match ? Number(match[2]) || 1 : 1,
    };
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function currentPageCanvasWidth() {
    const candidates = [".brick-library-shell", "[data-layout-main]", ".brick-preview-page", "body"];
    for (const selector of candidates) {
      const rect = document.querySelector(selector)?.getBoundingClientRect?.();
      if (rect?.width > 0) return Math.round(rect.width);
    }
    return Math.round(window.innerWidth || 0);
  }

  function maxComponentSizeUnitsForWidth(width) {
    if (width >= 1420) return 5;
    if (width >= 1160) return 4;
    if (width >= 900) return 3;
    if (width >= 680) return 2;
    return 1;
  }

  function componentHomeSpanForSize(size, fallback = 8) {
    const columns = componentSizeParts(size, "2x1").columns;
    if (columns >= 3) return HOME_GRID_COLUMNS;
    if (columns >= 2) return 8;
    if (columns >= 1) return 4;
    return fallback;
  }

  function componentRowRecipeForSpan(span) {
    if (span >= HOME_GRID_COLUMNS) return "12+0";
    if (span === 8) return "8+4";
    if (span === 6) return "6+6";
    return "4+8";
  }

  function countMatches(source, patterns) {
    const text = String(source || "").toLowerCase();
    return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
  }

  function inferComponentComplexity({ family, prompt, visualReference } = {}) {
    let score = 1;
    if (COMPONENT_RICH_FAMILIES.has(family)) score += 1;
    if (COMPONENT_COMPLEX_FAMILIES.has(family)) score += 2;
    if (COMPONENT_COMPACT_FAMILIES.has(family)) score -= 1;

    score += countMatches(prompt, [
      /列表|表格|明细|多币种|真实.*模拟|模拟.*真实|趋势|图表|曲线|工作台|流程|步骤|表单|筛选|tab|切换/i,
      /list|table|ledger|wallets|accounts|trend|chart|workflow|form|tabs|filters|dashboard|workbench/i,
      /kyc.*入金|入金.*kyc|开户.*入金|推广.*数据|返佣.*统计|风险.*保证金/i,
    ]);

    if (visualReference?.width && visualReference?.height) {
      const ratio = visualReference.width / Math.max(1, visualReference.height);
      if (ratio >= 1.6) score += 1;
      if (ratio <= 0.75) score += 1;
    }

    if (score >= 5) return "workbench";
    if (score >= 3) return "rich";
    if (score >= 2) return "standard";
    return "compact";
  }

  function sizeForAutoContext({ family, complexity, maxSizeUnits }) {
    const columns = clampNumber(maxSizeUnits, 1, 5);
    if (columns <= 1) return COMPONENT_COMPLEX_FAMILIES.has(family) || complexity === "workbench" ? "1x3" : "1x2";
    if (complexity === "workbench") return `${Math.min(columns, 5)}x${family === "CreateAccountForm" ? 3 : 2}`;
    if (complexity === "rich") return `${Math.min(columns, COMPONENT_COMPLEX_FAMILIES.has(family) ? 4 : 3)}x2`;
    if (complexity === "standard") return `${Math.min(columns, COMPONENT_COMPACT_FAMILIES.has(family) ? 2 : 3)}x1`;
    return COMPONENT_COMPACT_FAMILIES.has(family) ? "1x1" : `${Math.min(columns, 2)}x1`;
  }

  function allowedSizesForContext({ maxSizeUnits, complexity }) {
    const columns = clampNumber(maxSizeUnits, 1, 5);
    const maxRows = complexity === "workbench" ? 3 : complexity === "rich" ? 2 : 1;
    const sizes = COMPONENT_SIZE_OPTIONS.filter((size) => {
      const parts = componentSizeParts(size, "1x1");
      return parts.columns <= columns && parts.rows <= maxRows;
    });
    return sizes.length ? sizes : ["1x1"];
  }

  function componentLayoutContextForRequest({ family, prompt, selectedSize, visualReference } = {}) {
    const pageWidth = currentPageCanvasWidth();
    const maxSizeUnits = maxComponentSizeUnitsForWidth(pageWidth);
    const complexity = inferComponentComplexity({ family, prompt, visualReference });
    const recommendedSize = sizeForAutoContext({ family, complexity, maxSizeUnits });
    const allowedSizes = allowedSizesForContext({ maxSizeUnits, complexity });
    if (!allowedSizes.includes(recommendedSize)) allowedSizes.push(recommendedSize);
    const selectedMode = isAutoComponentSize(selectedSize) ? "auto" : "manual";
    const selectedSpan = componentHomeSpanForSize(selectedMode === "manual" ? selectedSize : recommendedSize);
    const recommendedSpan = componentHomeSpanForSize(recommendedSize);
    const allowedSpans = [...new Set(allowedSizes.map((size) => componentHomeSpanForSize(size)))].sort((a, b) => b - a);
    return {
      pageWidth,
      gridColumns: HOME_GRID_COLUMNS,
      maxColumns: HOME_GRID_COLUMNS,
      maxSizeUnits,
      gridUnit: "12栏首页栅格：1x=4/12栏，2x=8/12栏，3x及以上=12/12栏；移动端单列。",
      selectedMode,
      selectedSize: selectedMode === "manual" ? normalizeComponentSizeValue(selectedSize, "2x1") : "auto",
      selectedSpan,
      recommendedSize,
      recommendedSpan,
      allowedSizes,
      allowedSpans,
      rowRecipes: ["12+0", "8+4", "6+6", "4+8"],
      functionalComplexity: complexity,
      sizingPolicy:
        selectedMode === "auto"
          ? "按当前页面宽度与功能复杂度决定 size，并同步映射到 12 栏 desktopSpan；复杂列表、图表、表单和多步骤工作台可以放大。"
          : "用户手动选了尺寸；除非需求明确要求放大，否则优先尊重手动尺寸，并按 1x/2x/3x+ 映射 4/8/12 栏。",
    };
  }

  function generatedCardLayoutAttrs(size) {
    const parts = componentSizeParts(size, "2x1");
    const homeSpan = componentHomeSpanForSize(parts.size);
    const previewMinHeight = parts.rows >= 3 ? 360 : parts.rows >= 2 ? 280 : 210;
    return ` data-component-size="${escapeHtml(parts.size)}" data-component-grid-columns="${HOME_GRID_COLUMNS}" data-component-home-span="${homeSpan}" data-component-row-recipe="${escapeHtml(componentRowRecipeForSpan(homeSpan))}" style="--component-grid-span:${homeSpan};--component-home-span:${homeSpan};--component-preview-min:${previewMinHeight}px;"`;
  }

  function groupForFamily(family) {
    if (familyGroupMap.has(family)) return familyGroupMap.get(family);
    if (/WalletList|Form|Table|List/i.test(family)) return "table";
    if (/Atoms|Atom/i.test(family)) return "atom";
    if (/Asset|Quick|TradingAccounts|OpenAccount|Referral/i.test(family)) return "core";
    return "support";
  }

  function previewTextFromCard(card) {
    return [...card.querySelectorAll(".brick-canvas :is(strong, b, span, small, label, button, a, p, dt, dd)")]
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .slice(0, 24)
      .join(" / ");
  }

  function allBrickCards() {
    return [...document.querySelectorAll(".brick-family .brick-card, [data-saved-components] .brick-card")];
  }

  function syncCardMetadata(card) {
    if (!card) return null;
    const isGenerated = card.classList.contains("brick-generated-card");
    const family = canonicalComponentFamily(card.dataset.brickFamily || (isGenerated ? "" : familyFromCard(card)));
    const title = card.dataset.brickTitle || titleFromCard(card);
    const size = normalizeComponentSizeValue(card.dataset.brickSize || sizeFromCard(card), "2x1");
    const sizeParts = componentSizeParts(size, "2x1");
    const group = card.dataset.brickGroup || groupForFamily(family);
    const scoreKey = card.dataset.brickScoreKey || (isGenerated ? componentScoreKey(card.dataset.componentId) : staticCardScoreKey(card));
    const score = scoreForKey(scoreKey, isGenerated ? scoreForComponent(componentById(card.dataset.componentId)) : 5);

    card.dataset.brickFamily = family;
    card.dataset.brickTitle = title;
    card.dataset.brickSize = sizeParts.size;
    card.dataset.componentSize = sizeParts.size;
    const homeSpan = componentHomeSpanForSize(sizeParts.size);
    card.dataset.componentGridColumns = String(HOME_GRID_COLUMNS);
    card.dataset.componentHomeSpan = String(homeSpan);
    card.dataset.componentRowRecipe = componentRowRecipeForSpan(homeSpan);
    card.dataset.brickGroup = group;
    card.dataset.brickScoreKey = scoreKey;
    card.dataset.brickScore = String(score);
    card.style.setProperty("--component-grid-span", String(homeSpan));
    card.style.setProperty("--component-home-span", String(homeSpan));
    card.style.setProperty("--component-preview-min", `${sizeParts.rows >= 3 ? 340 : sizeParts.rows >= 2 ? 270 : 210}px`);
    card.dataset.brickSearchText = [title, family, size, group, previewTextFromCard(card)].join(" ").toLowerCase();
    card.querySelector(".brick-score-control")?.setAttribute("data-score-tier", scoreTier(score));
    return { family, title, size, group, scoreKey, score };
  }

  function syncAllCardMetadata() {
    allBrickCards().forEach(syncCardMetadata);
  }

  function uniqueCardValues(field) {
    syncAllCardMetadata();
    return [...new Set(allBrickCards().map((card) => card.dataset[field]).filter(Boolean))];
  }

  function sortedSizes(sizes) {
    return sizes.sort((a, b) => {
      const indexA = COMPONENT_SIZE_OPTIONS.indexOf(a);
      const indexB = COMPONENT_SIZE_OPTIONS.indexOf(b);
      if (indexA >= 0 && indexB >= 0) return indexA - indexB;
      if (indexA >= 0) return -1;
      if (indexB >= 0) return 1;
      return a.localeCompare(b);
    });
  }

  function updateFilterOptions() {
    const currentFamily = els.familyFilter?.value || "all";
    const currentSize = els.sizeFilter?.value || "all";
    const families = uniqueCardValues("brickFamily").sort((a, b) => a.localeCompare(b));
    const sizes = sortedSizes(uniqueCardValues("brickSize"));

    if (els.familyFilter) {
      els.familyFilter.innerHTML =
        '<option value="all">全部类型</option>' +
        families.map((family) => `<option value="${escapeHtml(family)}">${escapeHtml(family)}</option>`).join("");
      els.familyFilter.value = families.includes(currentFamily) ? currentFamily : "all";
      brickFilters.family = els.familyFilter.value;
    }

    if (els.sizeFilter) {
      els.sizeFilter.innerHTML =
        '<option value="all">全部尺寸</option>' +
        sizes.map((size) => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join("");
      els.sizeFilter.value = sizes.includes(currentSize) ? currentSize : "all";
      brickFilters.size = els.sizeFilter.value;
    }
  }

  function applyBrickFilters() {
    syncAllCardMetadata();
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.brickFilter === brickFilters.group);
    });

    const query = brickFilters.search.trim().toLowerCase();
    const minScore = brickFilters.minScore === "all" ? 0 : normalizeComponentScore(brickFilters.minScore, 1);
    let visibleCount = 0;
    let totalCount = 0;

    allBrickCards().forEach((card) => {
      const meta = syncCardMetadata(card);
      if (!meta) return;
      totalCount += 1;
      const visible =
        (brickFilters.group === "all" || meta.group === brickFilters.group) &&
        (brickFilters.family === "all" || meta.family === brickFilters.family) &&
        (brickFilters.size === "all" || meta.size === brickFilters.size) &&
        meta.score >= minScore &&
        (!query || card.dataset.brickSearchText.includes(query));

      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    groups.forEach((group) => {
      const groupCards = [...group.querySelectorAll(".brick-card")];
      const hasVisibleCard = groupCards.some((card) => !card.hidden);
      group.hidden = !hasVisibleCard;
    });

    if (els.savedSection) {
      const generatedCards = [...els.savedSection.querySelectorAll(".brick-card")];
      els.savedSection.hidden = !savedComponents.length || !generatedCards.some((card) => !card.hidden);
    }
    if (els.filterCount) els.filterCount.textContent = `${visibleCount} / ${totalCount}`;
    if (els.emptyState) els.emptyState.hidden = visibleCount > 0;
  }

  function setFilter(filter) {
    brickFilters.group = filter || "all";
    applyBrickFilters();
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
      callMode: "serverProxy",
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

  function aiRequestModelConfig(config = aiModelConfig) {
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

  function modelLabel(config = aiModelConfig) {
    const normalized = sanitizeModelConfig(config);
    return `${providerPreset(normalized.provider).name} / ${normalized.model}`;
  }

  function maskedApiKey(value) {
    const key = String(value || "");
    if (!key) return "未填写";
    if (key.length <= 10) return "已填写";
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  }

  function componentLooksGeneric(component) {
    const source = `${component?.name || ""} ${component?.description || ""} ${component?.html || ""}`;
    return /Primary Action|AI\s*样式|Lorem ipsum|Sample Component/i.test(source);
  }

  function stripEditorArtifacts(value) {
    return String(value || "").replace(/<small\b[^>]*data-ai-edit-note[^>]*>[\s\S]*?<\/small>/gi, "");
  }

  function componentTitleText(value) {
    return String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shouldRemoveComponentEyebrow(label, primaryTitle) {
    const labelText = componentTitleText(label);
    const titleText = componentTitleText(primaryTitle);
    if (!labelText || !titleText) return false;
    if (labelText.length > 80 || titleText.length > 120) return false;
    if (!/[A-Za-z\u4e00-\u9fff]/.test(titleText)) return false;
    if (/^\d+\s*\/\s*\d+$/i.test(titleText)) return false;
    if (/^[\d\s.,:+/%$€¥￥-]+$/i.test(titleText)) return false;
    return true;
  }

  function collapseDuplicateComponentTitles(value) {
    const titlePattern = "((?:<strong\\b[^>]*>|<h[1-4]\\b[^>]*>)[^<]{1,180}<\\/(?:strong|h[1-4])>)";
    const patterns = [
      new RegExp(`(<(?:section|article|div)\\b[^>]*>\\s*)<(span|small|label)\\b[^>]*>([^<]{1,100})<\\/\\2>\\s*${titlePattern}`, "gi"),
      new RegExp(`(<header\\b[^>]*>\\s*)<(span|small|label)\\b[^>]*>([^<]{1,100})<\\/\\2>\\s*${titlePattern}`, "gi"),
    ];

    return patterns.reduce(
      (html, pattern) =>
        html.replace(pattern, (match, prefix, tag, label, primaryTitle) =>
          shouldRemoveComponentEyebrow(label, primaryTitle) ? `${prefix}${primaryTitle}` : match,
        ),
      String(value || ""),
    );
  }

  function stripEditorCssArtifacts(value) {
    return String(value || "")
      .replace(/[^{}]*\.ai-edit-note[^{}]*\{[^{}]*\}/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function stripEditorTextArtifacts(value) {
    return String(value || "")
      .replace(/\s*已按「[^」]{0,300}」调整。?/g, "")
      .replace(/\s*AI\s*修改[:：][^。.!！?？]{0,300}[。.!！?？]?/gi, "")
      .replace(/\s*已改为带编号、状态和连接线的渐进式开户路径。?/g, "")
      .replace(/\s*标题已更新为[^。.!！?？]{1,120}[。.!！?？]?/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function sanitizeComponentForClient(component) {
    if (!component || typeof component !== "object") return component;
    const id = component.id || "";
    if (isComponentDeleted(id)) return null;
    const scoreKey = componentScoreKey(id);
    const localScore = scoreKey ? (componentScores[scoreKey] ?? componentScores[id]) : undefined;
    return {
      ...component,
      family: canonicalComponentFamily(component.family),
      score: normalizeComponentScore(localScore ?? component.score, 5),
      description: stripEditorTextArtifacts(component.description),
      html: collapseDuplicateComponentTitles(stripEditorArtifacts(component.html)),
      css: stripEditorCssArtifacts(component.css),
    };
  }

  function loadCachedComponents() {
    try {
      const data = JSON.parse(window.localStorage.getItem(COMPONENT_CACHE_KEY) || "[]");
      return Array.isArray(data)
        ? data.map(sanitizeComponentForClient).filter((component) => component?.id && !componentLooksGeneric(component) && !isComponentDeleted(component.id))
        : [];
    } catch (error) {
      return [];
    }
  }

  function cacheComponents(components, options = {}) {
    const source = options.replace ? (options.keepLocal ? loadCachedComponents() : []) : loadCachedComponents();
    const map = new Map(source.map((component) => [component.id, component]));
    components.forEach((component) => {
      const rawId = component && typeof component === "object" ? String(component.id || "").trim() : "";
      if (options.restoreDeleted && rawId) restoreDeletedComponent(rawId);
      if (rawId && isComponentDeleted(rawId)) return;
      const cleanComponent = sanitizeComponentForClient(component);
      if (cleanComponent?.id && !componentLooksGeneric(cleanComponent)) {
        if (isComponentDeleted(cleanComponent.id)) return;
        componentScores[componentScoreKey(cleanComponent)] = normalizeComponentScore(cleanComponent.score);
        map.set(cleanComponent.id, cleanComponent);
      }
    });
    const next = [...map.values()];
    saveComponentScores();
    window.localStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(next));
    savedComponents = next;
    return next;
  }

  function removeCachedComponent(componentId) {
    markComponentDeleted(componentId);
    const next = loadCachedComponents().filter((component) => component.id !== componentId);
    delete componentScores[componentScoreKey(componentId)];
    saveComponentScores();
    window.localStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(next));
    savedComponents = next;
    return next;
  }

  function syncComponentLibraryFromResponse(data) {
    mergeRemoteComponentScores(data?.scores);
    if (Array.isArray(data?.library?.components)) {
      mergeRemoteComponentScores(data.library.scores);
      cacheComponents(data.library.components, { replace: true });
      return true;
    }
    return false;
  }

  function proxyErrorMessage(data, response) {
    const details = data?.details || {};
    const attempts = Array.isArray(details.attempts) ? details.attempts : [];
    const triedBaseUrls = [...new Set(attempts.map((item) => item.baseUrl).filter(Boolean))];
    const parts = [data?.error || `HTTP ${response.status}`];

    if (details.providerStatus) parts.push(`HTTP ${details.providerStatus}`);
    if (details.providerCode) parts.push(`code ${details.providerCode}`);
    if (details.providerName || details.model) {
      parts.push([details.providerName || details.provider, details.model].filter(Boolean).join(" / "));
    }
    if (triedBaseUrls.length > 1) parts.push(`已尝试 ${triedBaseUrls.join(" -> ")}`);

    return parts.filter(Boolean).join(" · ");
  }

  async function requestJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(proxyErrorMessage(data, response));
    }
    return data;
  }

  function formatFileSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return "0 KB";
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(new Error("图片读取失败")));
      reader.readAsDataURL(file);
    });
  }

  function imageElementFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () => reject(new Error("图片无法解析，请换一张截图。")));
      image.src = dataUrl;
    });
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
  }

  function analyzeImageColors(image) {
    const canvas = document.createElement("canvas");
    const maxSide = 72;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height, 1));
    canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width || 1) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height || 1) * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return { dominantColors: [], brightness: "unknown" };
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const buckets = new Map();
    let lightness = 0;
    let counted = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const alpha = pixels[index + 3];
      if (alpha < 180) continue;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const key = [r, g, b].map((value) => Math.round(value / 32) * 32).join(",");
      buckets.set(key, (buckets.get(key) || 0) + 1);
      lightness += (r + g + b) / 3;
      counted += 1;
    }
    const dominantColors = [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => rgbToHex(...key.split(",").map(Number)));
    const averageLightness = counted ? lightness / counted : 128;
    return {
      dominantColors,
      brightness: averageLightness >= 190 ? "light" : averageLightness <= 80 ? "dark" : "balanced",
    };
  }

  function layoutHintForImage(width, height) {
    if (!width || !height) return "未知比例";
    const ratio = width / height;
    if (ratio >= 2.4) return "超宽横幅，适合 4x1/5x1 或首屏条幅积木";
    if (ratio >= 1.35) return "横向截图，适合左右分栏、指标带或宽卡积木";
    if (ratio <= 0.72) return "竖向截图，适合侧栏、表单或移动端卡片积木";
    return "接近方形，适合 1x1/2x2 信息卡或状态面板";
  }

  function renderVisualReferencePreview() {
    if (!els.referencePreview) return;
    if (!componentVisualReference) {
      els.referencePreview.hidden = true;
      els.referencePreview.innerHTML = "";
      if (els.referenceClear) els.referenceClear.hidden = true;
      return;
    }
    els.referencePreview.hidden = false;
    if (els.referenceClear) els.referenceClear.hidden = false;
    els.referencePreview.innerHTML = `
      <img src="${escapeHtml(componentVisualReference.dataUrl)}" alt="${escapeHtml(componentVisualReference.name)}" />
      <div>
        <strong>${escapeHtml(componentVisualReference.name)}</strong>
        <span>${escapeHtml(`${componentVisualReference.width}x${componentVisualReference.height} · ${formatFileSize(componentVisualReference.size)}`)}</span>
        <small>${escapeHtml(componentVisualReference.layoutHint)} · ${escapeHtml(componentVisualReference.dominantColors.join(" "))}</small>
      </div>
    `;
  }

  function clearVisualReference() {
    componentVisualReference = null;
    if (els.referenceFile) els.referenceFile.value = "";
    renderVisualReferencePreview();
    setStatus("已清除图片/截图参考。");
  }

  async function setVisualReferenceFromFile(file) {
    if (!file) return;
    if (!/^image\//i.test(file.type || "")) {
      setStatus("只能上传图片或截图文件。", "error");
      return;
    }
    if (file.size > MAX_COMPONENT_REFERENCE_BYTES) {
      setStatus(`图片不能超过 ${formatFileSize(MAX_COMPONENT_REFERENCE_BYTES)}，请压缩后再上传。`, "error");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const image = await imageElementFromDataUrl(dataUrl);
      const colors = analyzeImageColors(image);
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      componentVisualReference = {
        name: file.name || "组件视觉参考图",
        mime: file.type || "image/png",
        size: file.size,
        dataUrl,
        width,
        height,
        aspectRatio: width && height ? `${(width / height).toFixed(2)}:1` : "",
        layoutHint: layoutHintForImage(width, height),
        dominantColors: colors.dominantColors,
        brightness: colors.brightness,
        note: "用于 AI 生成积木时仿照版式、密度、控件层级和主色关系。",
      };
      renderVisualReferencePreview();
      setStatus(`已加入图片/截图参考：${componentVisualReference.name}`, "success");
    } catch (error) {
      componentVisualReference = null;
      renderVisualReferencePreview();
      setStatus(error.message || "图片参考读取失败。", "error");
    }
  }

  function visualReferenceForRequest() {
    if (!componentVisualReference) return null;
    return { ...componentVisualReference };
  }

  function renderModelSummary() {
    if (!els.modelSummary) return;
    const config = sanitizeModelConfig(aiModelConfig);
    const preset = providerPreset(config.provider);
    els.modelSummary.innerHTML = `
      <div>
        <span>共用首页 AI 模型</span>
        <strong>${escapeHtml(config.model)}</strong>
        <small>${escapeHtml(preset.name)} · ${escapeHtml(preset.badge)} · 后端代理调用</small>
        <p>${escapeHtml(`组件生成接口会把需求转给 ${config.baseUrl}${config.endpoint}`)}</p>
      </div>
      <button type="button" data-model-config-open>配置模型</button>
    `;
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
      <section class="ai-model-dialog" role="dialog" aria-modal="true" aria-labelledby="component-model-dialog-title">
        <header>
          <div>
            <span class="brick-kicker">LLM SETTINGS</span>
            <h2 id="component-model-dialog-title">首页/组件共用大模型配置</h2>
            <p>这里保存的配置会同时用于首页云生成、组件生成和组件编排；页面只提交需求，真实请求由本地后端代理转发。</p>
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

    modal.querySelector("[data-model-config-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    modal.querySelector("[data-model-config-form]")?.addEventListener("input", () => {
      editingModelConfig = readModelConfigForm();
      modelTestState = { tone: "", message: "配置已修改，保存后用于组件和首页生成" };
      renderModelConfigNote();
    });

    modal.querySelector("[data-model-config-form]")?.addEventListener("change", () => {
      editingModelConfig = readModelConfigForm();
      modelTestState = { tone: "", message: "配置已修改，保存后用于组件和首页生成" };
      renderModelConfigNote();
    });

    modal.querySelector("[data-model-config-reset]")?.addEventListener("click", () => {
      const current = readModelConfigForm();
      const preset = providerPreset(current.provider);
      editingModelConfig = sanitizeModelConfig({
        ...preset,
        apiKey: current.apiKey,
        apiKeys: current.apiKeys,
        temperature: DEFAULT_MODEL_CONFIG.temperature,
        maxOutputTokens: DEFAULT_MODEL_CONFIG.maxOutputTokens,
      });
      modelTestState = { tone: "", message: "已恢复预设，保存后生效" };
      renderModelConfigModal();
    });

    modal.querySelector("[data-model-config-test]")?.addEventListener("click", testModelConnection);

    modal.querySelector("[data-model-config-save]")?.addEventListener("click", () => {
      aiModelConfig = saveModelConfig(readModelConfigForm());
      editingModelConfig = sanitizeModelConfig(aiModelConfig);
      modelTestState = { tone: "success", message: `已保存 ${modelLabel(aiModelConfig)}` };
      renderModelSummary();
      renderModelConfigNote();
      setStatus(`已切换组件生成模型：${modelLabel(aiModelConfig)}`, "success");
      closeModelConfigModal();
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
        <div><dt>运行状态</dt><dd>后端代理调用</dd></div>
        <div><dt>调用地址</dt><dd>${escapeHtml(`${config.baseUrl}${config.endpoint}`)}</dd></div>
        <div><dt>测试状态</dt><dd data-model-test-status data-tone="${escapeHtml(modelTestState.tone || "")}">${escapeHtml(modelTestState.message || "尚未测试")}</dd></div>
      </dl>
      <small>保存后配置会写入与首页 AI 生成相同的浏览器配置 key；生成组件时会调用 /api/home-components/generate。</small>
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
    setField("apiKey", config.apiKey);
    setField("temperature", String(config.temperature));
    setField("maxOutputTokens", String(config.maxOutputTokens));
    renderModelConfigNote();
  }

  function openModelConfigModal() {
    editingModelConfig = sanitizeModelConfig(aiModelConfig);
    modelTestState = { tone: "", message: "组件生成会复用这套模型配置" };
    const modal = ensureModelConfigModal();
    renderModelConfigModal();
    modal.hidden = false;
  }

  function closeModelConfigModal() {
    const modal = document.querySelector("[data-model-config-modal]");
    if (modal) modal.hidden = true;
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
      const data = await requestJson("/api/home-ai/test", { modelConfig: aiRequestModelConfig(config) });
      const latency = data.durationMs ? `${data.durationMs}ms` : "已响应";
      modelTestState = { tone: "success", message: `连通成功 · ${modelLabel(config)} · ${latency}` };
    } catch (error) {
      modelTestState = { tone: "error", message: error.message };
    } finally {
      if (button) button.disabled = false;
      renderModelConfigNote();
    }
  }

  async function refreshLibrary() {
    const cached = loadCachedComponents();
    savedComponents = cached;

    try {
      const response = await fetch("/api/home-components/library", { headers: { accept: "application/json" } });
      const data = await response.json();
      if (data.ok && Array.isArray(data.components)) {
        mergeRemoteComponentScores(data.scores);
        savedComponents = cacheComponents(data.components, { replace: true });
        await syncLocalComponentScoresToServer();
      }
    } catch (error) {
      try {
        const response = await fetch("./home-component-library.json", { headers: { accept: "application/json" }, cache: "no-store" });
        const data = await response.json();
        if (Array.isArray(data.components)) {
          savedComponents = cacheComponents(data.components, { replace: true, keepLocal: true });
        } else {
          savedComponents = cached;
        }
      } catch (fallbackError) {
        savedComponents = cached;
      }
    }

    renderSavedComponents();
  }

  function familyFromCard(card) {
    return card?.closest(".brick-family")?.querySelector(".brick-family-head span")?.textContent.trim() || "ClientHomeAtoms";
  }

  function sizeFromCard(card) {
    return card?.querySelector(":scope > header b")?.textContent.trim() || "2x1";
  }

  function titleFromCard(card) {
    return card?.querySelector(":scope > header span")?.textContent.trim() || "首页业务小组件";
  }

  function promptFromCard(card) {
    const family = familyFromCard(card);
    const title = titleFromCard(card);
    const size = sizeFromCard(card);
    const span = componentHomeSpanForSize(size);
    const previewText = previewTextFromCard(card);

    return [
      `基于组件库里的「${title}」生成一个真实可用的 ForexCRM 首页积木组件。`,
      `模块归属 ${family}，推荐尺寸 ${size}，在 12 栏首页中对应 ${span}/12 栏。`,
      previewText ? `参考现有业务字段：${previewText}。` : "",
      "不要生成通用卡片，不要出现 Primary Action 或 AI 样式；必须保留真实业务字段、真实按钮文案和可嵌入首页的布局。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function highScoreReferenceContext(options = {}) {
    syncAllCardMetadata();
    const family = options.family || "";
    const size = normalizeComponentSizeValue(options.size || "", "");
    const query = String(options.prompt || "").toLowerCase();

    return allBrickCards()
      .map((card) => {
        const meta = syncCardMetadata(card);
        return {
          type: meta.group,
          family: meta.family,
          name: meta.title,
          size: meta.size,
          gridColumns: HOME_GRID_COLUMNS,
          desktopSpan: componentHomeSpanForSize(meta.size),
          rowRecipe: componentRowRecipeForSpan(componentHomeSpanForSize(meta.size)),
          score: meta.score,
          visibleText: previewTextFromCard(card).slice(0, 220),
          description: card.querySelector(".generated-meta p")?.textContent.trim() || "",
        };
      })
      .filter((item) => item.name)
      .map((item) => {
        const searchable = `${item.name} ${item.family} ${item.description} ${item.visibleText}`.toLowerCase();
        return {
          ...item,
          priority:
            item.score * 20 +
            (family && item.family === family ? 35 : 0) +
            (size && item.size === size ? 12 : 0) +
            (query && searchable.includes(query.slice(0, 18)) ? 8 : 0),
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8)
      .map(({ priority, ...item }) => item);
  }

  function enhanceStaticBrickCards() {
    document.querySelectorAll(".brick-family .brick-card:not(.brick-generated-card)").forEach((card) => {
      const header = card.querySelector(":scope > header");
      const sizeBadge = header?.querySelector("b");
      if (!header || !sizeBadge || header.querySelector("[data-ai-generate-from-card]")) return;

      let tools = header.querySelector(".brick-card-tools");
      if (!tools) {
        tools = document.createElement("div");
        tools.className = "brick-card-tools";
        header.appendChild(tools);
      }

      tools.appendChild(sizeBadge);
      syncCardMetadata(card);
      if (!tools.querySelector("[data-brick-score-key]")) {
        tools.insertAdjacentHTML("beforeend", scoreControl(card.dataset.brickScoreKey, scoreForKey(card.dataset.brickScoreKey)));
      }

      const button = document.createElement("button");
      button.className = "brick-ai-inline-generate";
      button.type = "button";
      button.dataset.aiGenerateFromCard = "true";
      button.textContent = "AI 生成";
      button.title = "用当前组件作为参考生成新 AI 积木";
      tools.appendChild(button);
    });
  }

  function generatedCard(component) {
    const score = scoreForComponent(component);
    const scoreKey = componentScoreKey(component);
    const group = groupForFamily(component.family);
    return `
      <article class="brick-card brick-generated-card"${generatedCardLayoutAttrs(component.size)} data-component-id="${escapeHtml(component.id)}" data-brick-family="${escapeHtml(component.family)}" data-brick-title="${escapeHtml(component.name)}" data-brick-size="${escapeHtml(normalizeComponentSizeValue(component.size, "2x1"))}" data-brick-group="${escapeHtml(group)}" data-brick-score-key="${escapeHtml(scoreKey)}" data-brick-score="${score}">
        <header>
          <span>${escapeHtml(component.name)}</span>
          <div class="brick-card-tools">
            <b>${escapeHtml(component.size)} · ${componentHomeSpanForSize(component.size)}/12</b>
            ${scoreControl(scoreKey, score)}
            <button class="brick-ai-inline-generate" type="button" data-ai-regenerate-component="${escapeHtml(component.id)}">再生成</button>
            <button class="brick-ai-secondary-action" type="button" data-ai-edit-component="${escapeHtml(component.id)}">编辑</button>
            <button class="brick-ai-danger-action" type="button" data-ai-delete-component="${escapeHtml(component.id)}">删除</button>
          </div>
        </header>
        <div class="brick-canvas">
          <div class="generated-preview-host" data-generated-preview="${escapeHtml(component.id)}"></div>
        </div>
        <div class="generated-meta">
          <span>${escapeHtml(component.family)}</span>
          <p>${escapeHtml(component.description || "")}</p>
        </div>
      </article>
    `;
  }

  function renderComponentPreview(host, component) {
    if (!host || !component) return;
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          color: #172033;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; }
        button { font: inherit; cursor: pointer; }
        a { color: inherit; text-decoration: none; }
        ${component.css || ""}
      </style>
      ${component.html || ""}
    `;
  }

  function renderGeneratedPreviews() {
    document.querySelectorAll("[data-generated-preview]").forEach((host) => {
      const component = savedComponents.find((item) => item.id === host.dataset.generatedPreview);
      if (!component) return;
      renderComponentPreview(host, component);
    });
  }

  function componentsByPriority(components = savedComponents) {
    return [...components].sort((a, b) => scoreForComponent(b) - scoreForComponent(a) || String(a.name || "").localeCompare(String(b.name || "")));
  }

  function renderSavedComponents() {
    if (!els.savedSection || !els.savedComponents) return;

    els.savedSection.hidden = savedComponents.length === 0;
    if (els.savedCount) els.savedCount.textContent = `${savedComponents.length} 个`;
    els.savedComponents.innerHTML = componentsByPriority(savedComponents).map(generatedCard).join("");
    renderGeneratedPreviews();
    updateFilterOptions();
    applyBrickFilters();
  }

  function componentById(componentId) {
    return savedComponents.find((component) => component.id === componentId);
  }

  function componentFamilyOptions(selectedFamily) {
    const families = new Set([selectedFamily, ...[...(els.family?.options || [])].map((option) => option.value)]);
    return [...families]
      .filter(Boolean)
      .map((family) => `<option value="${escapeHtml(family)}"${family === selectedFamily ? " selected" : ""}>${escapeHtml(family)}</option>`)
      .join("");
  }

  function isPresetComponentSize(size) {
    return COMPONENT_SIZE_OPTIONS.includes(normalizeComponentSizeValue(size, "2x1"));
  }

  function componentSizeOptions(selectedSize) {
    const normalized = normalizeComponentSizeValue(selectedSize, "2x1");
    const options = COMPONENT_SIZE_OPTIONS.map(
      (size) => `<option value="${size}"${size === normalized ? " selected" : ""}>${size}</option>`,
    );
    options.push(`<option value="custom"${isPresetComponentSize(normalized) ? "" : " selected"}>自定义尺寸</option>`);
    return options.join("");
  }

  function listToEditorText(value) {
    return Array.isArray(value) ? value.join("\n") : "";
  }

  function editorTextToList(value) {
    return String(value || "")
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function editorField(modal, fieldName) {
    return modal.querySelector(`[data-component-editor-field="${fieldName}"]`);
  }

  function editorSizeValue(modal, fallback = "2x1") {
    const preset = editorField(modal, "sizePreset")?.value || "";
    const custom = editorField(modal, "sizeCustom")?.value.trim() || "";
    const candidate = custom || (preset === "custom" ? "" : preset);
    return normalizeComponentSizeValue(candidate, fallback);
  }

  function renderComponentEditorSummary(modal, component) {
    const title = modal.querySelector("[data-component-editor-title]");
    const subtitle = modal.querySelector("[data-component-editor-subtitle]");
    const meta = modal.querySelector("[data-component-editor-meta]");
    if (title) title.textContent = `编辑：${component.name}`;
    if (subtitle) subtitle.textContent = `${component.family} · ${component.size} · 手动编辑，不会调用 AI`;
    if (meta) {
      meta.innerHTML = `
        <span>${escapeHtml(component.family)} · ${escapeHtml(component.size)}</span>
        <strong>${escapeHtml(component.name)}</strong>
        <p>${escapeHtml(component.description || "")}</p>
      `;
    }
  }

  function readComponentEditorDraft(modal = ensureComponentEditorModal()) {
    const component = componentById(componentEditorState.componentId);
    if (!component) return null;

    return {
      ...component,
      name: editorField(modal, "name")?.value.trim() || component.name,
      family: editorField(modal, "family")?.value || component.family,
      size: editorSizeValue(modal, component.size || "2x1"),
      description: editorField(modal, "description")?.value.trim() || "",
      tags: editorTextToList(editorField(modal, "tags")?.value),
      html: editorField(modal, "html")?.value || "",
      css: editorField(modal, "css")?.value || "",
      layoutHints: editorTextToList(editorField(modal, "layoutHints")?.value),
      dataRequirements: editorTextToList(editorField(modal, "dataRequirements")?.value),
    };
  }

  function renderComponentEditorPreview() {
    const modal = document.querySelector("[data-component-editor-modal]");
    if (!modal) return;
    const preview = modal.querySelector("[data-component-editor-preview]");
    const draft = readComponentEditorDraft(modal);
    if (draft) {
      renderComponentEditorSummary(modal, draft);
      renderComponentPreview(preview, draft);
    }
  }

  function handleComponentEditorFormChange(event) {
    const target = event.target;
    if (target?.matches?.('[data-component-editor-field="sizePreset"]') && target.value !== "custom") {
      const custom = editorField(ensureComponentEditorModal(), "sizeCustom");
      if (custom) custom.value = "";
    }
    renderComponentEditorPreview();
  }

  function ensureComponentEditorModal() {
    let modal = document.querySelector("[data-component-editor-modal]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "component-editor-modal";
    modal.dataset.componentEditorModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="component-editor-backdrop" data-component-editor-close></div>
      <section class="component-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="component-editor-title">
        <header>
          <div>
            <span class="brick-kicker">Component Editor</span>
            <h2 id="component-editor-title" data-component-editor-title>编辑积木组件</h2>
            <p data-component-editor-subtitle></p>
          </div>
          <button class="component-editor-close" type="button" data-component-editor-close aria-label="关闭">×</button>
        </header>

        <div class="component-editor-layout">
          <aside class="component-editor-preview-card">
            <div class="component-editor-meta" data-component-editor-meta></div>
            <div class="component-editor-preview" data-component-editor-preview></div>
          </aside>

          <section class="component-editor-panel" aria-label="组件手动编辑">
            <form class="component-editor-form" data-component-editor-form>
              <div class="component-editor-fields">
                <label>
                  组件名称
                  <input data-component-editor-field="name" />
                </label>
                <label>
                  模块归属
                  <select data-component-editor-field="family"></select>
                </label>
                <label>
                  积木尺寸
                  <div class="component-editor-size-control">
                    <select data-component-editor-field="sizePreset"></select>
                    <input data-component-editor-field="sizeCustom" placeholder="自定义，如 6x2" />
                  </div>
                  <small>可选常用尺寸，也可以输入任意 NxM。</small>
                </label>
                <label>
                  标签
                  <textarea data-component-editor-field="tags" rows="3" placeholder="一行一个标签，或用逗号分隔"></textarea>
                </label>
              </div>
              <label>
                描述
                <textarea data-component-editor-field="description" rows="3"></textarea>
              </label>
              <label>
                HTML
                <textarea class="code" data-component-editor-field="html" rows="8" spellcheck="false"></textarea>
              </label>
              <label>
                CSS
                <textarea class="code" data-component-editor-field="css" rows="8" spellcheck="false"></textarea>
              </label>
              <div class="component-editor-fields">
                <label>
                  布局提示
                  <textarea data-component-editor-field="layoutHints" rows="4" placeholder="一行一条"></textarea>
                </label>
                <label>
                  数据要求
                  <textarea data-component-editor-field="dataRequirements" rows="4" placeholder="一行一条"></textarea>
                </label>
              </div>
              <footer>
                <button type="button" data-component-editor-close>取消</button>
                <button class="primary" type="submit" data-component-editor-submit>保存修改</button>
              </footer>
            </form>
          </section>
        </div>
      </section>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll("[data-component-editor-close]").forEach((button) => {
      button.addEventListener("click", closeComponentEditorModal);
    });
    modal.querySelector("[data-component-editor-form]")?.addEventListener("submit", saveComponentEdit);
    modal.querySelector("[data-component-editor-form]")?.addEventListener("input", renderComponentEditorPreview);
    modal.querySelector("[data-component-editor-form]")?.addEventListener("change", handleComponentEditorFormChange);

    return modal;
  }

  function renderComponentEditorModal() {
    const modal = ensureComponentEditorModal();
    const component = componentById(componentEditorState.componentId);
    if (!component) {
      closeComponentEditorModal();
      return;
    }

    const preview = modal.querySelector("[data-component-editor-preview]");
    const submit = modal.querySelector("[data-component-editor-submit]");
    const form = modal.querySelector("[data-component-editor-form]");

    renderComponentEditorSummary(modal, component);

    if (editorField(modal, "family")) editorField(modal, "family").innerHTML = componentFamilyOptions(component.family);
    if (editorField(modal, "name")) editorField(modal, "name").value = component.name || "";
    if (editorField(modal, "family")) editorField(modal, "family").value = component.family || "ClientHomeAtoms";
    if (editorField(modal, "sizePreset")) editorField(modal, "sizePreset").innerHTML = componentSizeOptions(component.size);
    if (editorField(modal, "sizePreset")) editorField(modal, "sizePreset").value = isPresetComponentSize(component.size) ? normalizeComponentSizeValue(component.size, "2x1") : "custom";
    if (editorField(modal, "sizeCustom")) editorField(modal, "sizeCustom").value = isPresetComponentSize(component.size) ? "" : normalizeComponentSizeValue(component.size, "2x1");
    if (editorField(modal, "description")) editorField(modal, "description").value = component.description || "";
    if (editorField(modal, "tags")) editorField(modal, "tags").value = listToEditorText(component.tags);
    if (editorField(modal, "html")) editorField(modal, "html").value = component.html || "";
    if (editorField(modal, "css")) editorField(modal, "css").value = component.css || "";
    if (editorField(modal, "layoutHints")) editorField(modal, "layoutHints").value = listToEditorText(component.layoutHints);
    if (editorField(modal, "dataRequirements")) editorField(modal, "dataRequirements").value = listToEditorText(component.dataRequirements);

    renderComponentPreview(preview, component);

    if (form) {
      form.querySelectorAll("input, select, textarea, button").forEach((field) => {
        field.disabled = componentEditorState.busy;
      });
    }
    if (submit) {
      submit.disabled = componentEditorState.busy;
      submit.textContent = componentEditorState.busy ? "保存中..." : "保存修改";
    }
  }

  function openComponentEditor(componentId) {
    const component = componentById(componentId);
    if (!component) return;

    componentEditorState = {
      componentId,
      busy: false,
    };

    const modal = ensureComponentEditorModal();
    renderComponentEditorModal();
    modal.hidden = false;
    editorField(modal, "name")?.focus();
  }

  function closeComponentEditorModal() {
    const modal = document.querySelector("[data-component-editor-modal]");
    if (modal) modal.hidden = true;
  }

  async function saveComponentEdit(event) {
    event.preventDefault();
    const modal = ensureComponentEditorModal();
    const component = componentById(componentEditorState.componentId);
    const draft = readComponentEditorDraft(modal);

    if (!component || !draft || componentEditorState.busy) return;
    const sizeChanged = draft.size !== component.size;

    componentEditorState.busy = true;
    modal.querySelectorAll("input, select, textarea, button").forEach((field) => {
      field.disabled = true;
    });
    const submit = modal.querySelector("[data-component-editor-submit]");
    if (submit) submit.textContent = "保存中...";
    setStatus(`正在保存手动修改：${component.name}${sizeChanged ? `，尺寸 ${component.size} → ${draft.size}` : ""}...`);

    try {
      const data = await requestJson("/api/home-components/save", { component: draft });
      const savedComponent = data.component || draft;
      if (data.component) {
        cacheComponents([data.component], { restoreDeleted: true });
        componentEditorState.componentId = data.component.id;
      }
      renderSavedComponents();
      setStatus(`已保存手动修改：${savedComponent.name}${sizeChanged ? `，尺寸已改为 ${savedComponent.size}` : ""}`, "success");
    } catch (error) {
      cacheComponents([draft], { restoreDeleted: true });
      renderSavedComponents();
      setStatus(`已保存到当前浏览器缓存${sizeChanged ? `，尺寸已改为 ${draft.size}` : ""}；后端同步失败：${error.message}`, "mock");
    } finally {
      componentEditorState.busy = false;
      renderComponentEditorModal();
    }
  }

  function pruneCompositionComponent(componentId) {
    try {
      const composition = JSON.parse(window.localStorage.getItem(COMPOSITION_CACHE_KEY) || "null");
      if (!composition || !Array.isArray(composition.layout)) return;

      const nextLayout = composition.layout.filter((item) => item.componentId !== componentId);
      if (nextLayout.length === composition.layout.length) return;

      if (!nextLayout.length) {
        window.localStorage.removeItem(COMPOSITION_CACHE_KEY);
        if (els.compositionSection) els.compositionSection.hidden = true;
        return;
      }

      const nextComposition = { ...composition, layout: nextLayout, updatedAt: new Date().toISOString() };
      window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(nextComposition));
      renderComposition(nextComposition);
    } catch (error) {
      // Ignore invalid cached compositions.
    }
  }

  async function deleteComponent(componentId, trigger) {
    const component = componentById(componentId);
    if (!component) return;
    const confirmed = window.confirm(`删除已保存组件「${component.name}」？`);
    if (!confirmed) return;

    if (trigger) trigger.disabled = true;
    removeCachedComponent(componentId);
    pruneCompositionComponent(componentId);
    if (componentEditorState.componentId === componentId) closeComponentEditorModal();
    renderSavedComponents();
    setStatus(`已从当前页面删除：${component.name}，正在同步组件库...`);

    try {
      const data = await requestJson("/api/home-components/delete", { componentId });
      syncComponentLibraryFromResponse(data);
      setStatus(`已删除组件：${component.name}`, "success");
    } catch (error) {
      setStatus(`已从当前浏览器缓存删除：${component.name}。后端同步失败：${error.message}`, "mock");
    } finally {
      renderSavedComponents();
      if (trigger) trigger.disabled = false;
    }
  }

  function renderComposition(composition) {
    if (!composition || !els.compositionSection) return;

    const byId = new Map(savedComponents.map((component) => [component.id, component]));
    els.compositionSection.hidden = false;
    if (els.compositionName) els.compositionName.textContent = composition.name || "首页积木组合";
    if (els.compositionSummary) els.compositionSummary.textContent = composition.summary || "";
    if (els.compositionPolish) {
      els.compositionPolish.textContent = [composition.themeAdvice, composition.polishInstructions].filter(Boolean).join(" ");
    }
    if (els.compositionLayout) {
      els.compositionLayout.innerHTML = (composition.layout || [])
        .map((item) => {
          const component = byId.get(item.componentId);
          return `
            <article>
              <span>${escapeHtml(item.zone || "main")} · ${escapeHtml(item.size || "")}</span>
              <strong>${escapeHtml(component?.name || item.componentId)}</strong>
              <p>${escapeHtml(item.reason || "")}</p>
            </article>
          `;
        })
        .join("");
    }
  }

  async function refreshSavedComposition() {
    try {
      const savedComposition = JSON.parse(window.localStorage.getItem(COMPOSITION_CACHE_KEY) || "null");
      if (savedComposition) {
        renderComposition(savedComposition);
        return;
      }
    } catch (error) {
      // Ignore invalid cached compositions.
    }

    try {
      const response = await fetch("./home-component-compositions.json", { headers: { accept: "application/json" }, cache: "no-store" });
      const data = await response.json();
      const composition = Array.isArray(data.compositions) ? data.compositions[0] : null;
      if (composition) {
        window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(composition));
        renderComposition(composition);
      }
    } catch (error) {
      // Static composition suggestions are optional.
    }
  }

  async function generateComponent(options = {}) {
    const prompt = options.prompt || els.prompt?.value.trim() || "生成一个适合 ForexCRM 首页的专业组件。";
    const family = canonicalComponentFamily(options.family || els.family?.value || "ClientHomeAtoms");
    const rawSize = options.size || els.size?.value || "auto";
    const size = isAutoComponentSize(rawSize) ? "auto" : normalizeComponentSizeValue(rawSize, "2x1");
    const requestConfig = aiRequestModelConfig();
    const trigger = options.trigger || els.generate;

    if (els.prompt && options.prompt) els.prompt.value = options.prompt;
    if (els.family && options.family) els.family.value = canonicalComponentFamily(options.family);
    if (els.size && options.size) {
      ensureSizeOption(size);
      els.size.value = size;
    }

    const visualReference = visualReferenceForRequest();
    const layoutContext = componentLayoutContextForRequest({ family, prompt, selectedSize: size, visualReference });
    const autoSizeHint = size === "auto" ? `，页面宽度建议 ${layoutContext.recommendedSize}（${layoutContext.recommendedSpan}/12 栏）` : "";
    setStatus(`正在通过 ${modelLabel()} 生成组件${visualReference ? "，并仿照图片/截图参考" : ""}${autoSizeHint}...`);
    if (trigger) trigger.disabled = true;
    if (trigger !== els.generate && els.generate) els.generate.disabled = true;
    if (els.confirmSave) els.confirmSave.disabled = true;
    if (els.revise) els.revise.disabled = true;

    try {
      const data = await requestJson("/api/home-components/generate", {
        prompt,
        family,
        size,
        save: false,
        layoutContext,
        scoreContext: highScoreReferenceContext({ family, size: size === "auto" ? layoutContext.recommendedSize : size, prompt }),
        componentScore: normalizeComponentScore(options.componentScore, 5),
        visualReference,
        modelConfig: requestConfig,
      });
      const providerLabel = `${data.provider || requestConfig.provider} / ${data.model || requestConfig.model}`;
      setPendingComponentDraft(data.component, {
        providerLabel,
        localFallback: Boolean(data.localFallback),
        mock: Boolean(data.mock),
      });
      if (els.aiComponentModal?.hidden) openAiComponentModal({ keepDraft: true });
      setStatus(
        data.localFallback
          ? `模型输出非标准 JSON，已生成待确认兜底组件：${data.component.name} · 请确认保存或修改后重新生成。`
          : `已生成组件预览：${data.component.name} · 请确认保存或修改后重新生成。`,
        data.localFallback || data.mock ? "mock" : "success",
      );
    } catch (error) {
      setStatus(`${error.message}。如果还没有配置密钥，可以用 npm run start:mock 先演示完整链路。`, "error");
    } finally {
      if (trigger) trigger.disabled = false;
      if (trigger !== els.generate && els.generate) els.generate.disabled = false;
      renderPendingComponentDraft();
    }
  }

  function buildHomepagePrompt(composition) {
    const componentList = componentsByPriority(savedComponents)
      .map((component) => `${component.name}(${component.family}, ${component.size}, ${scoreForComponent(component)}/10): ${component.description}`)
      .join("\n");

    return [
      "请基于已保存的首页积木组件，生成一个美观、克制、专业的 ForexCRM 用户端首页草稿。",
      "要先搭积木，再调整布局美观度，首屏重点清晰，业务路径完整；评分高的积木优先作为结构和字段参考。",
      "",
      "已保存组件:",
      componentList || "暂无自定义组件，使用内置模块。",
      "",
      "AI 组合建议:",
      composition ? JSON.stringify(composition, null, 2) : "请自动组合。",
      "",
      "要求：资产、入金/出金、交易账号、开户入口、邀请或广告中至少保留主要业务路径。自定义组件目前作为设计参考，最终首页配置仍需使用已有白名单模块渲染。",
    ].join("\n");
  }

  async function composeHome() {
    if (!savedComponents.length) {
      setStatus("还没有已保存的 AI 组件，先生成并保存一个组件。", "error");
      return;
    }

    setStatus("正在用已保存组件生成首页组合...");
    els.compose.disabled = true;

    let composition = null;
    const requestConfig = aiRequestModelConfig();
    const prioritizedComponents = componentsByPriority(savedComponents);

    try {
      const compositionResult = await requestJson("/api/home-components/compose", {
        prompt: els.prompt?.value || "用已保存组件组合一个专业首页。",
        componentIds: prioritizedComponents.map((component) => component.id),
        componentScores: Object.fromEntries(prioritizedComponents.map((component) => [component.id, scoreForComponent(component)])),
        modelConfig: requestConfig,
      });
      composition = compositionResult.composition;
      window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(composition));
      renderComposition(composition);
    } catch (error) {
      composition = {
        name: "本地临时首页积木组合",
        summary: "大模型组合暂不可用，已按组件尺寸生成一个临时组合，配置密钥后可以重新生成。",
        layout: prioritizedComponents.slice(0, 8).map((component, index) => ({
          componentId: component.id,
          size: component.size,
          zone: index === 0 ? "hero" : component.size.startsWith("1x") ? "rail" : "main",
          reason: `${component.name} 评分 ${scoreForComponent(component)}/10，优先用于承接 ${component.family} 路径。`,
        })),
        themeAdvice: "保持当前蓝白金融风格。",
        polishInstructions: "首屏优先展示主业务模块，侧栏承载状态类组件，长表格放在页面下方。",
      };
      window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(composition));
      renderComposition(composition);
      setStatus("大模型组合暂不可用，已生成本地临时组合。配置密钥后可以重新生成。", "mock");
    }

    if (!window.HomePersonalization) {
      setStatus("组件组合已保存，但当前页面没有加载首页生成器。", "success");
      els.compose.disabled = false;
      return;
    }

    const prompt = buildHomepagePrompt(composition);
    try {
      const homeResult = await requestJson("/api/home-ai/complete", {
        prompt,
        modelConfig: requestConfig,
        context: {
          defaultConfig: window.HomePersonalization.DEFAULT_CONFIG,
          schema: window.HomePersonalization.HOMEPAGE_CONFIG_JSON_SCHEMA,
          features: window.HomePersonalization.FEATURES,
          moduleVariantOptions: window.HomePersonalization.MODULE_VARIANT_OPTIONS,
          moduleStyleOptions: window.HomePersonalization.MODULE_STYLE_OPTIONS,
          currentConfig: window.HomePersonalization.loadDraft(),
        },
      });
      window.HomePersonalization.saveDraft(homeResult.config);
      setStatus("首页草稿已生成并保存，可以打开首页预览查看。", homeResult.mock ? "mock" : "success");
    } catch (error) {
      const fallback = window.HomePersonalization.promptToConfig(prompt);
      window.HomePersonalization.saveDraft(fallback);
      setStatus("组件组合已保存；大模型首页美化未完成，已用本地规则生成临时草稿。配置密钥后可重新生成。", "mock");
    } finally {
      els.compose.disabled = false;
    }
  }

  async function updateBrickScore(scoreKey, value, card) {
    const score = normalizeComponentScore(value);
    if (!scoreKey) return;

    componentScores[scoreKey] = score;
    saveComponentScores();
    if (card) {
      card.dataset.brickScore = String(score);
      card.querySelector(".brick-score-control")?.setAttribute("data-score-tier", scoreTier(score));
    }

    const componentId = card?.dataset.componentId || (scoreKey.startsWith("component:") ? scoreKey.slice("component:".length) : "");
    let updatedComponent = null;
    if (componentId) {
      const component = componentById(componentId);
      if (component) {
        updatedComponent = { ...component, score, updatedAt: new Date().toISOString() };
        savedComponents = savedComponents.map((item) => (item.id === componentId ? updatedComponent : item));
        window.localStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(savedComponents));
      }
    }

    if (updatedComponent) {
      renderSavedComponents();
      setStatus(`评分已保存到当前浏览器：${score}/10，正在同步组件库...`);
      try {
        const data = await requestJson("/api/home-components/score", { scoreKey, score, componentId });
        mergeRemoteComponentScores(data.scores);
        if (data.component) cacheComponents([data.component], { restoreDeleted: true });
        else syncComponentLibraryFromResponse(data);
        renderSavedComponents();
        setStatus(`评分已同步到组件库：${score}/10，AI 会优先参考高分组件。`, "success");
      } catch (error) {
        setStatus(`评分已保存到当前浏览器：${score}/10；后端同步失败：${error.message}`, "mock");
      }
      return;
    }

    updateFilterOptions();
    applyBrickFilters();
    setStatus(`评分已保存到当前浏览器：${score}/10，正在同步组件库...`);
    try {
      const data = await requestJson("/api/home-components/score", { scoreKey, score });
      mergeRemoteComponentScores(data.scores);
      updateFilterOptions();
      applyBrickFilters();
      setStatus(`评分已同步到组件库：${score}/10，重启后仍会保留。`, "success");
    } catch (error) {
      setStatus(`评分已保存到当前浏览器：${score}/10；后端同步失败：${error.message}`, "mock");
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.brickFilter));
  });

  els.familyFilter?.addEventListener("change", () => {
    brickFilters.family = els.familyFilter.value || "all";
    applyBrickFilters();
  });

  els.sizeFilter?.addEventListener("change", () => {
    brickFilters.size = els.sizeFilter.value || "all";
    applyBrickFilters();
  });

  els.scoreFilter?.addEventListener("change", () => {
    brickFilters.minScore = els.scoreFilter.value || "all";
    applyBrickFilters();
  });

  els.search?.addEventListener("input", () => {
    brickFilters.search = els.search.value || "";
    applyBrickFilters();
  });

  document.addEventListener("change", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const scoreSelect = target?.closest("[data-brick-score-key]");
    if (!scoreSelect) return;
    updateBrickScore(scoreSelect.dataset.brickScoreKey, scoreSelect.value, scoreSelect.closest(".brick-card"));
  });

  els.referenceFile?.addEventListener("change", () => {
    setVisualReferenceFromFile(els.referenceFile.files?.[0]);
  });

  els.referenceDropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.referenceDropzone.dataset.dragging = "true";
  });

  els.referenceDropzone?.addEventListener("dragleave", () => {
    delete els.referenceDropzone.dataset.dragging;
  });

  els.referenceDropzone?.addEventListener("drop", (event) => {
    event.preventDefault();
    delete els.referenceDropzone.dataset.dragging;
    setVisualReferenceFromFile(event.dataTransfer?.files?.[0]);
  });

  els.aiComponentModal?.addEventListener("paste", (event) => {
    const imageItem = [...(event.clipboardData?.items || [])].find((item) => /^image\//i.test(item.type || ""));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (file) {
      event.preventDefault();
      setVisualReferenceFromFile(file);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.aiComponentModal?.hidden) closeAiComponentModal();
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const aiComponentClose = target?.closest("[data-ai-component-close]");
    if (aiComponentClose) {
      event.preventDefault();
      closeAiComponentModal();
      return;
    }

    const aiComponentOpen = target?.closest("[data-ai-component-open]");
    if (aiComponentOpen) {
      event.preventDefault();
      openAiComponentModal();
      return;
    }

    const referencePick = target?.closest("[data-ai-reference-pick]");
    if (referencePick) {
      event.preventDefault();
      els.referenceFile?.click();
      return;
    }

    const referenceClear = target?.closest("[data-ai-reference-clear]");
    if (referenceClear) {
      event.preventDefault();
      clearVisualReference();
      return;
    }

    const cardGenerateButton = target?.closest("[data-ai-generate-from-card]");
    if (cardGenerateButton) {
      event.preventDefault();
      const card = cardGenerateButton.closest(".brick-card");
      openAiComponentModal({
        prompt: promptFromCard(card),
        family: familyFromCard(card),
        size: sizeFromCard(card),
        status: `已带入「${titleFromCard(card)}」作为生成参考，可微调需求后生成。`,
      });
      return;
    }

    const regenerateButton = target?.closest("[data-ai-regenerate-component]");
    if (regenerateButton) {
      event.preventDefault();
      const component = savedComponents.find((item) => item.id === regenerateButton.dataset.aiRegenerateComponent);
      if (component) {
        generateComponent({
          prompt: [
            `重新生成「${component.name}」，做成真实可用的 ForexCRM 首页积木。`,
            component.sourcePrompt || component.description || "",
            "必须比当前版本更具体，包含真实业务字段和操作，不要 Primary Action，不要 AI 样式。",
          ]
            .filter(Boolean)
            .join("\n"),
          family: component.family,
          size: component.size,
          componentScore: scoreForComponent(component),
          trigger: regenerateButton,
        });
      }
      return;
    }

    const editButton = target?.closest("[data-ai-edit-component]");
    if (editButton) {
      event.preventDefault();
      openComponentEditor(editButton.dataset.aiEditComponent);
      return;
    }

    const deleteButton = target?.closest("[data-ai-delete-component]");
    if (deleteButton) {
      event.preventDefault();
      deleteComponent(deleteButton.dataset.aiDeleteComponent, deleteButton);
      return;
    }

    const trigger = target?.closest("[data-model-config-open]");
    if (!trigger) return;
    event.preventDefault();
    aiModelConfig = loadModelConfig();
    openModelConfigModal();
  });

  els.generate?.addEventListener("click", generateComponent);
  els.confirmSave?.addEventListener("click", confirmSavePendingComponent);
  els.revise?.addEventListener("click", revisePendingComponentDraft);
  els.compose?.addEventListener("click", composeHome);

  syncComponentSizeSelect();
  enhanceStaticBrickCards();
  updateFilterOptions();
  applyBrickFilters();
  renderVisualReferencePreview();
  renderModelSummary();
  refreshLibrary();
  refreshSavedComposition();
})();

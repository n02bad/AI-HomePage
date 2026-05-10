(function () {
  const home = window.HomePersonalization;

  if (!home) return;

  const PROMPT_KEY = "forexcrm.home.personalization.prompt";
  const PREVIEW_SIZE_KEY = "forexcrm.home.preview.size";
  const MODEL_CONFIG_KEY = "forexcrm.home.ai.model.config";
  const MODEL_HISTORY_KEY = "forexcrm.home.ai.call.history";
  const SUGGESTION_HISTORY_KEY = "forexcrm.home.ai.suggestion.history";
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
      model: "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "deepseek-v4-pro"],
      baseUrl: DEEPSEEK_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "DEEPSEEK_API_KEY",
      note: "DeepSeek V4 官方 API 模型。首页生成默认用 V4-Flash 提升稳定性；V4-Pro 仍可手动选择，代理会关闭 thinking 并在超时后降级到 Flash。",
    },
  };

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
    governanceSummary: document.querySelector("[data-governance-summary]"),
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
    generationModeButtons: [...document.querySelectorAll("[data-generation-mode-button]")],
    generationPanels: [...document.querySelectorAll("[data-generation-panel]")],
    guidedChoices: [...document.querySelectorAll("[data-guided-choice]")],
    guidedGenerate: document.querySelector("[data-guided-generate]"),
    guidedSync: document.querySelector("[data-guided-sync]"),
    guidedSummary: document.querySelector("[data-guided-summary]"),
    guidedSummaryTitle: document.querySelector("[data-guided-summary-title]"),
    guidedNote: document.querySelector("[data-guided-note]"),
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
  let suggestionRound = 0;
  let suggestionCards = [];

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

  const AI_SUGGESTION_SCENES = [
    { id: "vip-managed-account", label: "VIP 托管资产", summary: "$250k+ 净入金、专属经理、2 档服务费、季度收益", prompt: "高净值 VIP 托管资产首页，首屏突出 $250,000+ 净入金门槛、专属客户经理、季度收益率、2 档服务费和多币种资产；右侧放预约经理、入金和风险确认，交易账号列表下置。", tags: ["vip", "asset"] },
    { id: "pro-trader-cost", label: "专业交易成本", summary: "点差 0.2 起、佣金 $7/手、持仓 PnL、MT5 快捷操作", prompt: "专业交易客户首页，突出交易成本和执行效率：EURUSD 点差 0.2 起、佣金 $7/手、持仓 PnL、保证金占用、MT5 快捷操作；真实账号和模拟账号分开，整体像专业交易工作台。", tags: ["trade", "account"] },
    { id: "first-deposit-onboarding", label: "首存开户转化", summary: "$100 首存、KYC 3 步、预计 4 分钟、赠金 $30", prompt: "新客户开户转化首页，首屏突出 $100 首存门槛、KYC 3 步进度、预计 4 分钟完成、首存赠金 $30 和开真实/模拟/绑定账号三个动作；模块要有明确下一步。", tags: ["kyc", "conversion"] },
    { id: "trading-contest-prize", label: "交易大赛奖池", summary: "$50k 奖池、Top 20 榜单、报名 $500 入金、倒计时", prompt: "活动增长首页，首屏突出 $50,000 交易大赛奖池、Top 20 排行榜、报名需 $500 入金、倒计时和 8 个快捷入口；广告轮播独占一整栏，真实交易账号用卡片，模拟账号用列表。", tags: ["growth", "campaign"] },
    { id: "ib-referral-card", label: "IB 推广链接卡", summary: "推广链接、邀请码、复制按钮、可选基础统计", prompt: "IB 代理用户首页，允许展示轻量 referral_link_card，只展示推广链接、邀请码、复制推广链接按钮、复制邀请码按钮；如果接口有数据，可展示打开数、注册数、开户数、注册转化率和开户转化率。不要返佣、团队层级或完整代理数据区。", tags: ["ib", "referral"] },
    { id: "multi-currency-yield", label: "多币种资产收益", summary: "$84.6k 总资产、USD/EUR/USDT、7 日收益 +2.8%", prompt: "资产管理首页，突出 $84,600 总资产、USD/EUR/USDT 多币种钱包、7 日收益 +2.8%、入金出金、账户表现图表和交易账号列表；风格淡蓝、扁平、清爽专业。", tags: ["asset", "wallet"] },
    { id: "retention-reactivation-credit", label: "沉睡账户唤醒", summary: "14 天未交易、$20 返场券、3 步恢复、有效期 72h", prompt: "留存唤醒首页，面向 14 天未交易客户；首屏突出账户状态、$20 返场券、72 小时有效期、快捷入金和 3 步重新开始交易任务，广告位温和召回。", tags: ["retention", "account"] },
    { id: "margin-risk-shield", label: "保证金风控", summary: "保证金 138%、爆仓线 80%、亏损 -$1.2k、补保证金", prompt: "风险提醒首页，突出保证金比例 138%、爆仓线 80%、浮动亏损 -$1,200、账户风险等级、持仓提醒、资金保护和客服入口；视觉冷静可信，不要促销氛围。", tags: ["risk", "trade"] },
    { id: "mobile-fast-deposit", label: "移动端快速入金", summary: "Apple Pay、USDT TRC20、3 分钟到账、手续费 0%", prompt: "移动端优先首页，首屏单列突出 Apple Pay、USDT TRC20、3 分钟到账、0% 手续费、资产和 6 个高频快捷入口；交易账号压缩为轻量卡片，少滚动。", tags: ["mobile", "conversion"] },
    { id: "white-label-trust", label: "白标品牌可信度", summary: "隔离资金 $12M、99.99% 可用性、24/5 服务、开户 CTA", prompt: "白标品牌客户首页，突出隔离资金 $12M、99.99% 平台可用性、24/5 客服、资金安全、主推活动和开户转化；整体像成熟券商客户端。", tags: ["brand", "conversion"] },
    { id: "daily-pnl-insight", label: "每日 PnL 洞察", summary: "今日 +$860、胜率 58%、最大回撤 4.2%、下一步建议", prompt: "数据洞察首页，突出今日 PnL +$860、胜率 58%、最大回撤 4.2%、资金流向、交易习惯和下一步建议；适合客户每天判断账户健康度。", tags: ["insight", "trade"] },
    { id: "deposit-bonus-ladder", label: "入金奖励阶梯", summary: "$500/$2k/$10k 三档奖励、最高 $300、真实账号", prompt: "入金转化首页，首屏突出 $500/$2,000/$10,000 三档入金奖励、最高赠金 $300、钱包余额、入金入口和开真实账号；弱化复杂图表。", tags: ["deposit", "conversion"] },
    { id: "copy-trading-package", label: "跟单套餐推荐", summary: "月费 $19、高手收益 +12.4%、风险 3/5、订阅入口", prompt: "跟单套餐推荐首页，突出月费 $19、高手 30 日收益 +12.4%、风险等级 3/5、订阅入口、历史回撤和账户余额；适合推动客户从观察转为订阅。", tags: ["insight", "conversion"] },
    { id: "swap-fee-transparency", label: "隔夜费透明化", summary: "黄金 -$3.2/手、原油 -$1.1/手、费用预估、持仓提醒", prompt: "交易费用透明首页，突出黄金隔夜费 -$3.2/手、原油 -$1.1/手、点差、佣金、持仓费用预估和减少费用的下一步建议；适合专业交易客户。", tags: ["trade", "risk"] },
    { id: "funding-status-tracker", label: "出入金状态追踪", summary: "待处理 $5k、预计 15 分钟、通道成功率 97.6%", prompt: "资金状态追踪首页，突出待处理入金 $5,000、预计 15 分钟到账、通道成功率 97.6%、出金审核进度、多币种钱包和客服入口。", tags: ["asset", "deposit"] },
  ];

  const GUIDED_FIELD_LABELS = {
    intent: "首页目标",
    audience: "目标用户",
    level: "功能分级",
    modules: "页面模块",
    theme: "视觉主题",
    tone: "内容语气",
    cta: "主 CTA",
    note: "补充要求",
  };

  const GUIDED_PROMPT_COPY = {
    intent: {
      accountOpening: "开户引导，重点推动客户完成真实账户开户、KYC 和首次入金准备",
      promotionConversion: "推广转化，重点把访客导向留资咨询、权益领取或活动承接",
      newUserOnboarding: "新用户引导，重点让客户看清开户、认证、入金、交易的下一步",
      marketingCampaign: "营销推广，重点曝光运营活动、权益和主按钮转化",
      rewardActivity: "参与奖励活动，重点展示奖励规则、参与步骤和活动倒计时",
      ibRecruitment: "代理/IB 招募，重点展示推广链接、邀请码、合作流程和客户经理入口",
      depositConversion: "入金转化，重点推动已开户客户完成首存或追加入金",
      retention: "老用户唤醒，重点召回沉睡用户重新入金、交易或领取返场权益",
    },
    level: {
      basic: "基础版，保留首屏、主 CTA、核心说明、客服和风险提示",
      growth: "增长版，在基础能力上加入活动权益、FAQ、表单/按钮和转化承接",
      pro: "专业版，加入账号、资产、推广链接、数据指标或更完整的运营模块",
    },
    modules: {
      heroBanner: "首屏 Banner 和主 CTA",
      openingFlow: "开户流程与三步路径",
      accountBenefits: "账户优势、真实账户和模拟账户入口",
      kycGuide: "KYC 材料说明和认证状态",
      depositBonus: "入金奖励、首存门槛和赠金梯度",
      rewardRules: "活动规则、参与步骤、倒计时和权益说明",
      pammProducts: "PAMM 产品推荐区，使用独立的 pamm_products 模块，仅在租户开启 PAMM 且接口返回产品时展示",
      copyTrading: "CopyTrading 信号源推荐区，使用独立的 copytrading_signals 模块，仅在租户开启 CopyTrading 且接口返回信号源时展示",
      rewardActivity: "奖励活动专题区，使用活动 Banner、奖励权益、参与步骤和活动 CTA 承接转化",
      referralLink: "推广链接、邀请码、复制按钮和基础推广统计",
      appDownload: "APP 下载、MT5 下载或移动端交易入口",
      tradingAccounts: "交易账号列表、真实账号和模拟账号状态",
      customerService: "在线客服、客户经理或一对一协助入口",
      faq: "FAQ 常见问题",
      riskDisclosure: "风险提示与合规声明，不暗示稳赚",
    },
    theme: {
      blueFinance: "蓝色金融，清爽专业",
      blackGold: "黑金高净值，高端稳重",
      lightGold: "浅金活动，适合营销权益",
      minimalWhite: "极简白，清爽克制",
      darkTech: "暗色科技，交易终端感",
    },
    tone: {
      professional: "专业稳健",
      conversion: "营销转化",
      beginner: "新手友好",
      campaign: "活动促销",
      premium: "高净值客户导向",
      ib: "代理招募导向",
    },
    cta: {
      openAccount: "立即开户",
      claimReward: "领取奖励",
      depositNow: "立即入金",
      contactManager: "联系客户经理",
      joinCampaign: "参与活动",
      downloadApp: "下载 APP",
    },
  };

  const GUIDED_CANONICAL_TARGETS = {
    heroBanner: ["welcome_header", "promo_banner"],
    openingFlow: ["onboarding_guide"],
    accountBenefits: ["onboarding_guide", "trading_accounts_list"],
    kycGuide: ["onboarding_guide"],
    depositBonus: ["promo_banner", "asset_overview"],
    rewardRules: ["promo_banner", "announcements"],
    pammProducts: ["pamm_products"],
    copyTrading: ["copytrading_signals"],
    rewardActivity: ["promo_banner"],
    referralLink: ["referral_link_card"],
    appDownload: ["app_download"],
    tradingAccounts: ["trading_accounts_list"],
    customerService: ["support_contact"],
    faq: ["faq_section"],
    riskDisclosure: ["risk_disclosure"],
  };

  const GUIDED_INTENT_CANONICAL = {
    accountOpening: {
      primaryIntent: "onboarding",
      layoutPreset: "onboardingJourney",
      heroFocus: "onboarding_guide",
      mustHave: ["onboarding_guide", "quick_actions", "asset_overview", "trading_accounts_list"],
    },
    promotionConversion: {
      primaryIntent: "growth",
      layoutPreset: "magazineCampaign",
      heroFocus: "promo_banner",
      mustHave: ["promo_banner", "quick_actions", "asset_overview", "trading_accounts_list"],
    },
    newUserOnboarding: {
      primaryIntent: "onboarding",
      layoutPreset: "onboardingJourney",
      heroFocus: "onboarding_guide",
      mustHave: ["onboarding_guide", "quick_actions", "asset_overview"],
    },
    marketingCampaign: {
      primaryIntent: "growth",
      layoutPreset: "magazineCampaign",
      heroFocus: "promo_banner",
      mustHave: ["promo_banner", "quick_actions", "trading_accounts_list"],
    },
    rewardActivity: {
      primaryIntent: "growth",
      layoutPreset: "magazineCampaign",
      heroFocus: "promo_banner",
      mustHave: ["promo_banner", "quick_actions", "trading_accounts_list"],
    },
    ibRecruitment: {
      primaryIntent: "partner",
      layoutPreset: "accountOpsConsole",
      heroFocus: "referral_link_card",
      mustHave: ["referral_link_card", "quick_actions", "announcements", "trading_accounts_list"],
    },
    depositConversion: {
      primaryIntent: "deposit",
      layoutPreset: "conversionFirst",
      heroFocus: "asset_overview",
      mustHave: ["asset_overview", "quick_actions", "promo_banner", "trading_accounts_list"],
    },
    retention: {
      primaryIntent: "retention",
      layoutPreset: "onboardingJourney",
      heroFocus: "onboarding_guide",
      mustHave: ["onboarding_guide", "asset_overview", "quick_actions", "promo_banner"],
    },
  };

  const GUIDED_INTENT_DEFAULTS = {
    accountOpening: {
      audience: ["newVisitor", "registeredNoAccount"],
      level: "growth",
      modules: ["heroBanner", "openingFlow", "accountBenefits", "kycGuide", "customerService", "faq", "riskDisclosure"],
      theme: "blueFinance",
      tone: "professional",
      cta: "openAccount",
    },
    promotionConversion: {
      audience: ["newVisitor", "registeredNoAccount", "openedNoDeposit"],
      level: "growth",
      modules: ["heroBanner", "accountBenefits", "depositBonus", "rewardRules", "customerService", "faq", "riskDisclosure"],
      theme: "blueFinance",
      tone: "conversion",
      cta: "openAccount",
    },
    newUserOnboarding: {
      audience: ["newVisitor", "registeredNoAccount"],
      level: "basic",
      modules: ["heroBanner", "openingFlow", "kycGuide", "appDownload", "customerService", "faq", "riskDisclosure"],
      theme: "minimalWhite",
      tone: "beginner",
      cta: "openAccount",
    },
    marketingCampaign: {
      audience: ["newVisitor", "activityUser"],
      level: "growth",
      modules: ["heroBanner", "rewardActivity", "rewardRules", "depositBonus", "appDownload", "customerService", "riskDisclosure"],
      theme: "lightGold",
      tone: "campaign",
      cta: "joinCampaign",
    },
    rewardActivity: {
      audience: ["openedNoDeposit", "fundedUser", "activityUser"],
      level: "growth",
      modules: ["heroBanner", "rewardActivity", "rewardRules", "depositBonus", "tradingAccounts", "customerService", "riskDisclosure"],
      theme: "lightGold",
      tone: "campaign",
      cta: "claimReward",
    },
    ibRecruitment: {
      audience: ["ibUser", "highNetWorth"],
      level: "pro",
      modules: ["heroBanner", "referralLink", "accountBenefits", "customerService", "faq", "riskDisclosure"],
      theme: "blackGold",
      tone: "ib",
      cta: "contactManager",
    },
    depositConversion: {
      audience: ["openedNoDeposit", "fundedUser"],
      level: "growth",
      modules: ["heroBanner", "depositBonus", "tradingAccounts", "customerService", "faq", "riskDisclosure"],
      theme: "blueFinance",
      tone: "conversion",
      cta: "depositNow",
    },
    retention: {
      audience: ["dormantUser", "fundedUser"],
      level: "basic",
      modules: ["heroBanner", "depositBonus", "appDownload", "tradingAccounts", "customerService", "riskDisclosure"],
      theme: "minimalWhite",
      tone: "professional",
      cta: "depositNow",
    },
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
    const nextValues = new Set(Array.isArray(values) ? values : [values].filter(Boolean));
    buttons.forEach((button) => {
      setGuidedActive(button, nextValues.has(button.dataset.guidedValue));
    });

    if (!buttons.some((button) => button.classList.contains("active")) && buttons[0]) {
      setGuidedActive(buttons[0], true);
    }
  }

  function selectedGuidedValues(group) {
    return guidedButtonsFor(group)
      .filter((button) => button.classList.contains("active"))
      .map((button) => button.dataset.guidedValue)
      .filter(Boolean);
  }

  function selectedGuidedValue(group) {
    return selectedGuidedValues(group)[0] || guidedButtonsFor(group)[0]?.dataset.guidedValue || "";
  }

  function guidedLabel(group, value) {
    const button = guidedButtonsFor(group).find((item) => item.dataset.guidedValue === value);
    return button?.dataset.guidedLabel || value || "未选择";
  }

  function guidedPromptCopy(group, value) {
    return GUIDED_PROMPT_COPY[group]?.[value] || guidedLabel(group, value);
  }

  function guidedFreedomHint(intent) {
    return {
      accountOpening: "版式自由度：采用开户旅程、路径或任务流骨架，开户清单、开户面板和 KYC 下一步优先，资产概览不要抢首屏。",
      promotionConversion: "版式自由度：采用增长专题或活动封面骨架，首屏可以更像营销落地页，权益、主 CTA 和转化按钮优先。",
      newUserOnboarding: "版式自由度：采用新用户旅程、路径或任务流骨架，用步骤化结构替代标准资产工作台。",
      marketingCampaign: "版式自由度：采用活动封面、专题或大视觉骨架，活动 Banner、权益和参与动作优先，账号信息下移。",
      rewardActivity: "版式自由度：采用活动封面、专题或大视觉骨架，奖励规则、参与步骤、倒计时和领取奖励按钮优先。",
      ibRecruitment: "版式自由度：采用渠道增长专题骨架，推广链接、邀请码、复制动作和客户经理入口靠前。",
      depositConversion: "版式自由度：采用入金奖励阶梯骨架，赠金梯度、钱包余额、入金动作和开真实账号压进首屏。",
      retention: "版式自由度：采用召回任务流骨架，返场权益、账户状态、快捷入金和重新开始交易优先。",
    }[intent] || "版式自由度：允许重排模块顺序、首屏组件和页面密度，让结果明显区别于默认工作台。";
  }

  function applyGuidedDefaults(intent) {
    const defaults = GUIDED_INTENT_DEFAULTS[intent];
    if (!defaults) return;

    setGuidedGroupValues("audience", defaults.audience);
    setGuidedGroupValues("level", defaults.level);
    setGuidedGroupValues("modules", defaults.modules);
    setGuidedGroupValues("theme", defaults.theme);
    setGuidedGroupValues("tone", defaults.tone);
    setGuidedGroupValues("cta", defaults.cta);
  }

  function readGuidedState() {
    const state = {
      intent: selectedGuidedValue("intent"),
      audience: selectedGuidedValues("audience"),
      level: selectedGuidedValue("level"),
      modules: selectedGuidedValues("modules"),
      theme: selectedGuidedValue("theme"),
      tone: selectedGuidedValue("tone"),
      cta: selectedGuidedValue("cta"),
      note: (els.guidedNote?.value || "").trim(),
    };

    if (!state.audience.length) state.audience = [guidedButtonsFor("audience")[0]?.dataset.guidedValue].filter(Boolean);
    if (!state.modules.length) state.modules = [guidedButtonsFor("modules")[0]?.dataset.guidedValue].filter(Boolean);
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
    const canonicalIntent = GUIDED_INTENT_CANONICAL[state.intent] || {};
    const modules = state.modules.map((value) => ({
      ...guidedChoiceDescriptor("modules", value),
      canonicalTargets: GUIDED_CANONICAL_TARGETS[value] || [],
    }));
    const canonicalMustHave = uniqueList([
      canonicalIntent.mustHave || [],
      modules.map((module) => module.canonicalTargets || []),
    ]);

    return {
      source: "guided-builder",
      intent: {
        ...guidedChoiceDescriptor("intent", state.intent),
        canonicalIntent: canonicalIntent.primaryIntent || "",
      },
      audience: state.audience.map((value) => guidedChoiceDescriptor("audience", value)),
      level: guidedChoiceDescriptor("level", state.level),
      modules,
      theme: {
        ...guidedChoiceDescriptor("theme", state.theme),
        themePreset: state.theme,
      },
      tone: guidedChoiceDescriptor("tone", state.tone),
      cta: guidedChoiceDescriptor("cta", state.cta),
      canonical: {
        primaryIntent: canonicalIntent.primaryIntent || "",
        layoutPreset: canonicalIntent.layoutPreset || "",
        heroFocus: canonicalIntent.heroFocus || "",
        mustHave: canonicalMustHave,
      },
      freedomHint: guidedFreedomHint(state.intent),
      note: state.note,
    };
  }

  function summarizeGuidedValues(group, values) {
    return values.map((value) => guidedLabel(group, value)).join("、") || "未选择";
  }

  function buildGuidedPrompt() {
    const state = readGuidedState();
    const modules = state.modules.map((value) => guidedPromptCopy("modules", value));
    const audiences = state.audience.map((value) => guidedLabel("audience", value));
    const parts = [
      "请为 ForexCRM 用户端首页生成可发布的首页方案",
      `目标：${guidedPromptCopy("intent", state.intent)}`,
      `用户：${audiences.join("、")}`,
      `分级：${guidedPromptCopy("level", state.level)}`,
      `主 CTA：${guidedPromptCopy("cta", state.cta)}`,
      `视觉：${guidedPromptCopy("theme", state.theme)}`,
      `语气：${guidedPromptCopy("tone", state.tone)}`,
      `必须可见模块：${modules.join("、")}`,
      "允许在白名单内重排 sections、brickPlan、模块变体和密度，优先让目标决定首屏",
      "不要编造收益、客服在线状态、下载链接或后台未提供的数据",
    ];

    if (state.note) parts.push(`补充要求：${state.note}`);
    return parts.join("。");
  }

  function renderGuidedSummary() {
    if (!els.guidedSummary) return;

    const state = readGuidedState();
    const rows = [
      [GUIDED_FIELD_LABELS.intent, guidedLabel("intent", state.intent)],
      [GUIDED_FIELD_LABELS.audience, summarizeGuidedValues("audience", state.audience)],
      [GUIDED_FIELD_LABELS.level, guidedLabel("level", state.level)],
      [GUIDED_FIELD_LABELS.cta, guidedLabel("cta", state.cta)],
      [GUIDED_FIELD_LABELS.theme, guidedLabel("theme", state.theme)],
      [GUIDED_FIELD_LABELS.tone, guidedLabel("tone", state.tone)],
      [GUIDED_FIELD_LABELS.modules, summarizeGuidedValues("modules", state.modules)],
    ];

    if (state.note) rows.push([GUIDED_FIELD_LABELS.note, state.note]);
    if (els.guidedSummaryTitle) els.guidedSummaryTitle.textContent = `${guidedLabel("intent", state.intent)}方案`;
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
      setConfig(home.promptToConfig(prompt, interpretationRound), "已写入引导配置");
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
      button.setAttribute("aria-pressed", button.classList.contains("active") ? "true" : "false");
      button.addEventListener("click", () => {
        const group = button.dataset.guidedGroup;
        const value = button.dataset.guidedValue;
        const isMultiple = button.hasAttribute("data-guided-multiple");

        if (isMultiple) {
          const willActivate = !button.classList.contains("active");
          setGuidedActive(button, willActivate);
          const activeInGroup = guidedButtonsFor(group).filter((item) => item.classList.contains("active"));
          if (!activeInGroup.length) setGuidedActive(button, true);
        } else {
          setGuidedGroupValues(group, value);
          if (group === "intent") applyGuidedDefaults(value);
        }

        renderGuidedSummary();
      });
    });

    els.generationModeButtons.forEach((button) => {
      button.addEventListener("click", () => setGenerationMode(button.dataset.generationModeButton));
    });

    els.guidedNote?.addEventListener("input", renderGuidedSummary);
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
        generatePreview(config);
        shouldResetBusy = false;
      } finally {
        if (shouldResetBusy) setAiBusy(false);
      }
    });

    applyGuidedDefaults(selectedGuidedValue("intent"));
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
	      "保留这些价格、金额和指标作为页面内容，整体要明显区别于默认首页。",
	      "请优先使用积木块组合，让首屏、操作区和账号区有清晰层级，并呈现关键数字。",
	      "不要只换颜色，要调整模块位置、密度和视觉表达，至少保留 3 个可见数值。",
	      "客户看到的是生成后的页面，不要出现配置选择器，推荐内容要像真实运营方案。",
	    ];
	    const ending = endings[(suggestionRound + index) % endings.length];
	    return `独立生成目标：${scene.prompt}。${ending} 不沿用上一版模块顺序和布局骨架。本轮推荐编号 ${scene.id || scene.label}-${suggestionRound}-${index}，避免重复上一轮方案。`;
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

  function renderSuggestionCards(statusText = "根据当前文案生成可编辑场景") {
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

	  async function applySuggestionPrompt(button) {
	    if (els.prompt) els.prompt.value = button.dataset.suggestionPrompt || "";
	    interpretationRound += 1;
	    selectedSuggestion = null;
	    savePrompt();
	    setAiBusy(true, aiBusyLabel("正在套用推荐"));
	    try {
	      const config = await generateConfigWithFallback(promptValue(), {
	        variant: interpretationRound,
	        distinctFrom: currentConfig,
	      });
	      setConfig(config, "已套用 AI 推荐");
	      showToast("已生成一版不同首页");
	    } finally {
	      setAiBusy(false);
	      els.prompt?.focus();
	    }
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
	        const snapshot = record.configSnapshot || {};
	        const structure = [snapshot.intent, snapshot.layoutPreset, snapshot.strategy].filter(Boolean).join(" · ");
	        return `
	          <article class="model-call-item" data-call-status="${escapeHtml(record.status || "unknown")}" tabindex="0" title="${escapeHtml(title)}">
	            <div>
	              <strong>${escapeHtml(record.provider || "本地规则")} / ${escapeHtml(record.model || "--")}</strong>
	              <span>${escapeHtml(statusLabel(record.status, record.mock))} · ${escapeHtml(inputModeLabel(record.inputMode))} · ${escapeHtml(formatHistoryTime(record.at))}</span>
	            </div>
	            <small>${escapeHtml(record.durationMs ? `${record.durationMs}ms` : callModeLabel(record.callMode || "local"))}</small>
	            <p class="model-call-summary">${escapeHtml(display.summary)}</p>
	            ${structure ? `<p class="model-call-summary">${escapeHtml(structure)}</p>` : ""}
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
    [els.generateSuggestions, els.refreshSuggestions].filter(Boolean).forEach((button) => {
      button.disabled = busy;
    });
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
    if (els.reset) els.reset.disabled = busy;
    if (els.prompt) els.prompt.readOnly = busy;
    if (els.guidedNote) els.guidedNote.readOnly = busy;
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
      if (details.likelyTruncated || /length|max_tokens/i.test(String(details.finishReason || ""))) {
        return "处理建议：模型返回了 JSON 开头，但输出可能被截断；已自动回退本地方案。请把 Max output tokens 提高到 6000 以上，或切到更快/更稳定的结构化输出模型。";
      }
      return "处理建议：模型有响应，但没有按首页配置 JSON 返回；已自动回退本地方案。可以重试一次、降低 Temperature，或切到更稳定的结构化输出模型。";
    }

    if (/timed out|timeout|超时/i.test(source)) {
      return "处理建议：模型连通正常，但首页蓝图生成超过代理等待时间；DeepSeek Pro 会先自动降级到 Flash 重试，仍失败时再回退本地方案。可以保留 V4-Flash 默认模型，或使用更短的结构化 prompt。";
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
      inputMode: options.inputMode || "quick",
      modelConfig: aiRequestModelConfig(),
      context: aiRequestContext({
        inputMode: options.inputMode || "quick",
        guidedIntake: options.guidedIntake || null,
      }),
    });
    const usedProvider = providerPreset(payload.provider || config.provider);
    const usedModel = payload.model || config.model;

    const aiConfig = {
      generationMode: "brick-v2",
      ...(payload.config || {}),
      aiSummary:
        payload.config?.aiSummary ||
        `已通过 ${usedProvider.name} / ${usedModel} 生成首页蓝图，并完成前端安全标准化。`,
    };
    const normalizedConfig = home.normalizeConfig(aiConfig);

    return {
      config: normalizedConfig,
      usedModel: true,
      label: `${usedProvider.name} / ${usedModel}`,
      mock: Boolean(payload.mock),
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
	      intent: normalized.brickTrace?.intent || "",
	      strategy: normalized.brickTrace?.strategy || normalized.compositionStrategy || "",
	      brickIds: normalized.brickPlan.map((item) => item.brickId || item.feature).filter(Boolean),
	      sections: normalized.sections.map((section) => `${section.type}:${section.slots.join("+")}`),
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

	    return first.layoutPreset === second.layoutPreset && sameSections && overlap / maxSize >= 0.82;
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

	  function ensureDistinctHomepageConfig(prompt, config, options = {}) {
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

	    try {
	      const result = await generateConfigFromModel(prompt, options);
	      const finalConfig = ensureDistinctHomepageConfig(prompt, result.config, options);
	      addModelHistoryRecord({
	        id: result.callRecord?.id,
        action: "homepage-generate",
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
        status: result.usedModel ? "success" : "local",
        mock: Boolean(result.mock),
	        durationMs: Date.now() - startedAt,
	        prompt: String(prompt || "").slice(0, 1200),
	        message: finalConfig?.name || result.label,
	        configSnapshot: summarizeHomepageConfig(finalConfig),
	      });

      if (result.usedModel) {
        showToast(result.mock ? "已通过代理 mock 生成首页方案" : `已通过 ${result.label} 生成首页方案`);
      }
	      return finalConfig;
	    } catch (error) {
	      const fallback = ensureDistinctHomepageConfig(prompt, home.promptToConfig(prompt, options.variant || 0), options);
	      fallback.aiSummary = `大模型调用失败，已使用本地安全方案回退：${errorMessage(error, 220)}`;
      addModelHistoryRecord({
        action: "homepage-generate",
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
	        durationMs: Date.now() - startedAt,
	        prompt: String(prompt || "").slice(0, 1200),
	        message: errorMessage(error, 700),
	        configSnapshot: summarizeHomepageConfig(fallback),
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
      { id: "growth", label: "活动增长", prompt: "活动增长首页，首屏突出交易大赛；欢迎模块独占第一栏但要轻量，广告轮播做成首屏核心并独占一整栏，快捷入口保留 8 个，整体扁平化、轻快清晰，色调淡金色。真实交易账号列表用卡片形式，并在真实账号分区提供创建真实交易账号按钮；模拟账号列表用列表形式。不要把开户做成右侧大面板。" },
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
        <header><span>推广链接卡片</span><b>${settings.referralLinkCard.enabled ? "代理可见" : "默认隐藏"}</b></header>
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

	  els.generateSuggestions?.addEventListener("click", async () => {
	    suggestionRound += 1;
	    setAiBusy(true, aiBusyLabel("正在生成推荐"));
	    try {
	      const scenePool = buildSuggestionCards({ usePrompt: false });
	      const nextScene = scenePool[suggestionRound % Math.max(scenePool.length, 1)] || AI_SUGGESTION_SCENES[0];
	      const richPrompt = [
	        promptValue() || "根据 ForexCRM 客户首页业务，生成一套更有运营价值的首页方案。",
	        nextScene.prompt,
	        "请把推荐里的价格、金额、比例、时效或奖池数字真正放进首页模块，不要只做标题变化。",
	        "本次 AI 推荐需要和当前预览结构明显不同。",
	      ].join(" ");
	      const config = await generateConfigWithFallback(richPrompt, { variant: suggestionRound, distinctFrom: currentConfig });
	      const normalized = home.normalizeConfig(config);
	      const generatedScene = {
	        id: `ai-${nextScene.id || suggestionRound}-${Date.now()}`,
	        label: `AI 精修：${nextScene.label || normalized.name || "新方案"}`,
	        summary: `${nextScene.summary || home.themeLabel(normalized.themePreset || normalized.theme)} · ${home.layoutLabel(normalized.layoutPreset)}`,
	        prompt: `${richPrompt} 上一版「${normalized.name || "当前策略"}」仅作为对照，这次必须换模块顺序和布局骨架。`,
	        tags: nextScene.tags || ["insight"],
	      };
	      suggestionCards = [generatedScene, ...scenePool].slice(0, 6);
	      rememberSuggestionCards(suggestionCards);
	      renderSuggestionCards("已结合当前文案生成新推荐");
	      showToast("已生成一批 AI 推荐");
    } finally {
      setAiBusy(false);
    }
  });

  els.refreshSuggestions?.addEventListener("click", () => {
    suggestionRound += 1;
    suggestionCards = buildSuggestionCards();
    renderSuggestionCards("已换一批推荐场景");
    showToast("已换一批推荐");
  });

	  els.generate?.addEventListener("click", async () => {
	    savePrompt();
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
    generatePreview(home.randomConfig(promptValue()));
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
    suggestionCards = buildSuggestionCards();
    renderSuggestionCards("已按当前文案更新推荐");
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
  initGuidedBuilder();
  suggestionCards = buildSuggestionCards();
  renderSuggestionCards();

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

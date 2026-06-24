(function () {
  const home = window.HomePersonalization;
  const PROMPT_KEY = "forexcrm.home.personalization.prompt";
  const MODEL_CONFIG_KEY = "forexcrm.home.ai.model.config";
  const RENDER_MODE_KEY = "forexcrm.home.ai.render.mode";

  const DIMENSIONS = [
    { key: "firstScreenFocus", label: "首屏焦点" },
    { key: "informationHierarchy", label: "信息层级" },
    { key: "moduleBalance", label: "模块比例" },
    { key: "componentCraft", label: "组件工艺" },
    { key: "financialTone", label: "金融质感" },
    { key: "businessTruth", label: "业务真实" },
    { key: "responsive", label: "响应式" },
    { key: "visualConsistency", label: "视觉一致" },
    { key: "publishability", label: "可发布性" },
  ];

  const SCENARIO_TAGS = [
    "新客开户",
    "默认资产首页",
    "入金转化",
    "出金安全",
    "专业交易",
    "多账户管理",
    "CopyTrading",
    "PAMM 理财",
    "IB 推广",
    "返佣中心",
    "活动增长",
    "交易竞赛",
    "黑金 VIP",
    "风控合规",
    "白标资金安全",
    "客服帮助",
    "行情资讯",
    "本地化运营",
    "极简白",
    "暗色高端",
    "移动端优先",
  ];

  const els = {
    page: document.querySelector("[data-training-page]"),
    refresh: document.querySelector("[data-training-refresh]"),
    referenceCount: document.querySelector("[data-training-reference-count]"),
    sampleCount: document.querySelector("[data-training-sample-count]"),
    candidateCountStat: document.querySelector("[data-training-candidate-count]"),
    scoreCount: document.querySelector("[data-training-score-count]"),
    feedbackCount: document.querySelector("[data-training-feedback-count]"),
    tabButtons: [...document.querySelectorAll("[data-training-tab]")],
    tabPanels: [...document.querySelectorAll("[data-training-tab-panel]")],
    candidatePrompt: document.querySelector("[data-candidate-prompt]"),
    candidateCount: document.querySelector("[data-candidate-count]"),
    candidateRenderMode: document.querySelector("[data-candidate-render-mode]"),
    generateCandidates: document.querySelector("[data-generate-candidates]"),
    candidateStatus: document.querySelector("[data-candidate-status]"),
    candidateResults: document.querySelector("[data-candidate-results]"),
    scoreCurrent: document.querySelector("[data-score-current]"),
    saveCurrentGolden: document.querySelector("[data-save-current-golden]"),
    referenceFile: document.querySelector("[data-reference-file]"),
    referenceTags: document.querySelector("[data-reference-tags]"),
    referenceNote: document.querySelector("[data-reference-note]"),
    uploadReference: document.querySelector("[data-upload-reference]"),
    clearReferences: document.querySelector("[data-clear-references]"),
    referenceList: document.querySelector("[data-reference-list]"),
    contextList: document.querySelector("[data-context-list]"),
    previewSizeButtons: [...document.querySelectorAll("[data-preview-size]")],
    selectedReview: document.querySelector("[data-selected-review]"),
    manualScoreForm: document.querySelector("[data-manual-score-form]"),
    machineScore: document.querySelector("[data-machine-score]"),
    manualScore: document.querySelector("[data-manual-score]"),
    manualScoreOutput: document.querySelector("[data-manual-score-output]"),
    dimensionSliders: document.querySelector("[data-dimension-sliders]"),
    decisionButtons: [...document.querySelectorAll("[data-review-decision]")],
    feedbackNote: document.querySelector("[data-feedback-note]"),
    clearFeedback: document.querySelector("[data-clear-feedback]"),
    feedbackList: document.querySelector("[data-feedback-list]"),
    goldenLibrary: document.querySelector("[data-golden-library]"),
    openVisualGoldenModal: document.querySelector("[data-open-visual-golden-modal]"),
    openCurrentGoldenModal: document.querySelector("[data-open-current-golden-modal]"),
    trainingModal: document.querySelector("[data-training-modal]"),
    modalTitle: document.querySelector("[data-training-modal-title]"),
    modalSubtitle: document.querySelector("[data-training-modal-subtitle]"),
    modalCloseButtons: [...document.querySelectorAll("[data-close-training-modal]")],
    modalViews: [...document.querySelectorAll("[data-modal-view]")],
    goldenLibraryReset: document.querySelector("[data-golden-library-reset]"),
    sampleFilterScenario: document.querySelector("[data-sample-filter-scenario]"),
    sampleFilterType: document.querySelector("[data-sample-filter-type]"),
    sampleFilterMinScore: document.querySelector("[data-sample-filter-min-score]"),
    sampleFilterMaxScore: document.querySelector("[data-sample-filter-max-score]"),
    sampleFilterIntent: document.querySelector("[data-sample-filter-intent]"),
    sampleFilterTheme: document.querySelector("[data-sample-filter-theme]"),
    sampleLibraryList: document.querySelector("[data-sample-library-list]"),
    goldenFile: document.querySelector("[data-golden-file]"),
    analyzeGoldenFiles: document.querySelector("[data-analyze-golden-files]"),
    goldenAnalysisStatus: document.querySelector("[data-golden-analysis-status]"),
    goldenAnalysisSummary: document.querySelector("[data-golden-analysis-summary]"),
    goldenName: document.querySelector("[data-golden-name]"),
    referenceUpgradeSelect: document.querySelector("[data-reference-upgrade-select]"),
    goldenPrompt: document.querySelector("[data-golden-prompt]"),
    goldenPageIntent: document.querySelector("[data-golden-page-intent]"),
    goldenThemePreset: document.querySelector("[data-golden-theme-preset]"),
    goldenVisualStyle: document.querySelector("[data-golden-visual-style]"),
    goldenScenarioTags: document.querySelector("[data-golden-scenario-tags]"),
    goldenApplicable: document.querySelector("[data-golden-applicable]"),
    goldenHumanScore: document.querySelector("[data-golden-human-score]"),
    goldenHumanScoreOutput: document.querySelector("[data-golden-human-score-output]"),
    goldenDimensions: document.querySelector("[data-golden-dimensions]"),
    goldenWhyGood: document.querySelector("[data-golden-why-good]"),
    goldenWhyBad: document.querySelector("[data-golden-why-bad]"),
    goldenForbiddenReuse: document.querySelector("[data-golden-forbidden-reuse]"),
    saveVisualGolden: document.querySelector("[data-save-visual-golden]"),
    upgradeReferenceGolden: document.querySelector("[data-upgrade-reference-golden]"),
    currentGoldenName: document.querySelector("[data-current-golden-name]"),
    currentGoldenScreenshot: document.querySelector("[data-current-golden-screenshot]"),
    saveCurrentGoldenSecondary: document.querySelector("[data-save-current-golden-secondary]"),
    sampleEditor: document.querySelector("[data-sample-editor]"),
    sampleEditorId: document.querySelector("[data-sample-editor-id]"),
    editSampleName: document.querySelector("[data-edit-sample-name]"),
    editSampleType: document.querySelector("[data-edit-sample-type]"),
    editPageIntent: document.querySelector("[data-edit-page-intent]"),
    editThemePreset: document.querySelector("[data-edit-theme-preset]"),
    editVisualStyle: document.querySelector("[data-edit-visual-style]"),
    editTags: document.querySelector("[data-edit-tags]"),
    editScenarioTags: document.querySelector("[data-edit-scenario-tags]"),
    editApplicable: document.querySelector("[data-edit-applicable]"),
    editPrompt: document.querySelector("[data-edit-prompt]"),
    editHumanScore: document.querySelector("[data-edit-human-score]"),
    editHumanScoreOutput: document.querySelector("[data-edit-human-score-output]"),
    editDimensions: document.querySelector("[data-edit-dimensions]"),
    editWhyGood: document.querySelector("[data-edit-why-good]"),
    editWhyBad: document.querySelector("[data-edit-why-bad]"),
    editForbiddenReuse: document.querySelector("[data-edit-forbidden-reuse]"),
    editCleanupAssets: document.querySelector("[data-edit-cleanup-assets]"),
    updateSample: document.querySelector("[data-update-sample]"),
    cancelEditSample: document.querySelector("[data-cancel-edit-sample]"),
    deleteSample: document.querySelector("[data-delete-sample]"),
    toast: document.querySelector("[data-training-toast]"),
  };

  if (!els.page) return;

  const state = {
    samples: [],
    goldenSamples: [],
    rankedSamples: [],
    lowScoreAntiExamples: [],
    components: [],
    scores: [],
    feedback: [],
    candidates: [],
    references: [],
    pendingFiles: [],
    goldenPendingFile: null,
    goldenPendingFiles: [],
    goldenAnalysis: null,
    editingSampleId: "",
    sampleFilters: {
      scenario: "",
      type: "",
      minScore: "",
      maxScore: "",
      pageIntent: "",
      themePreset: "",
    },
    activeTab: "library",
    selectedCandidateId: "",
    decision: "approve",
    previewSize: "desktop",
  };

  function escapeHtml(value) {
    return String(value ?? "")
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
    }, 2200);
  }

  const MODAL_VIEW_COPY = {
    visual: {
      title: "新增视觉黄金样本",
      subtitle: "上传外部设计稿，或从已保存参考稿升级为 visual-only 黄金样本。",
    },
    current: {
      title: "保存当前首页",
      subtitle: "把当前首页草稿连同配置、DOM 证据和可选截图保存为完整 golden-page。",
    },
    edit: {
      title: "编辑样本",
      subtitle: "调整样本类型、标签、评分和审美说明，保存后立即回到样本库列表。",
    },
  };

  function setActiveTab(tab) {
    const next = tab === "review" ? "review" : "library";
    state.activeTab = next;
    els.page.dataset.activeTab = next;
    els.tabButtons.forEach((button) => {
      const active = button.dataset.trainingTab === next;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.tabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.trainingTabPanel !== next;
    });
  }

  function setModalView(view) {
    const next = MODAL_VIEW_COPY[view] ? view : "visual";
    const copy = MODAL_VIEW_COPY[next];
    if (els.modalTitle) els.modalTitle.textContent = copy.title;
    if (els.modalSubtitle) els.modalSubtitle.textContent = copy.subtitle;
    els.modalViews.forEach((panel) => {
      panel.hidden = panel.dataset.modalView !== next;
    });
    const body = els.trainingModal?.querySelector(".training-modal-body");
    if (body) body.scrollTop = 0;
  }

  function openTrainingModal(view = "visual") {
    if (!els.trainingModal) return;
    setModalView(view);
    els.trainingModal.hidden = false;
    els.trainingModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("training-modal-open");
    window.setTimeout(() => {
      const firstField = els.trainingModal?.querySelector('[data-modal-view]:not([hidden]) input, [data-modal-view]:not([hidden]) textarea, [data-modal-view]:not([hidden]) select, [data-modal-view]:not([hidden]) button');
      firstField?.focus?.();
    }, 0);
  }

  function closeTrainingModal() {
    if (!els.trainingModal) return;
    els.trainingModal.hidden = true;
    els.trainingModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("training-modal-open");
    state.editingSampleId = "";
    if (els.sampleEditor) els.sampleEditor.hidden = true;
  }

  function readJsonStorage(key, fallback = {}) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null") || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function savedPrompt() {
    return window.localStorage.getItem(PROMPT_KEY) || els.candidatePrompt?.value || "";
  }

  function currentRenderMode() {
    const value = window.localStorage.getItem(RENDER_MODE_KEY) || "compare";
    return ["config", "aiHtml", "compare"].includes(value) ? value : "compare";
  }

  function modelConfigForRequest() {
    const config = readJsonStorage(MODEL_CONFIG_KEY, {});
    return {
      provider: config.provider || "openai",
      name: config.name || "OpenAI",
      model: config.model || "gpt-5.2",
      baseUrl: config.baseUrl || "https://api.openai.com/v1",
      endpoint: config.endpoint || "/responses",
      apiMode: config.apiMode || "responses",
      callMode: config.callMode || "serverProxy",
      proxyEndpoint: "/api/home-ai/complete",
      temperature: Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.4,
      maxOutputTokens: Number.isFinite(Number(config.maxOutputTokens)) ? Number(config.maxOutputTokens) : 6000,
      apiKey: config.apiKey || "",
      apiKeys: config.apiKeys || {},
    };
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { "content-type": "application/json", accept: "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `${response.status} ${response.statusText}`);
    }
    return data;
  }

  function currentConfig() {
    if (!home) return {};
    const draft = home.loadDraft();
    const saved = home.loadConfig();
    return home.normalizeConfig(draft || saved);
  }

  function selectedCandidate() {
    return state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) || state.candidates[0] || null;
  }

  function scoreBandLabel(status) {
    return {
      passed: "通过",
      "needs-polish": "需优化",
      "needs-repair": "需返修",
    }[status] || status || "--";
  }

  function chipRow(values, className = "context-tags") {
    const items = (Array.isArray(values) ? values : []).filter(Boolean).slice(0, 10);
    if (!items.length) return "";
    return `<div class="${className}">${items.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>`;
  }

  function parseDelimited(value, limit = 12) {
    return String(value || "")
      .split(/[,，、\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  function formatDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function scoreForSample(sample) {
    const score = Number(sample?.humanScore ?? sample?.aestheticScore);
    return Number.isFinite(score) ? score : null;
  }

  function sampleTypeKey(sample) {
    if (sample?.isAntiExample || sample?.sampleKind === "anti-example" || Number(sample?.humanScore ?? sample?.aestheticScore) <= 68) return "anti";
    if (sample?.isGolden || sample?.sampleKind === "golden-page") return "golden";
    return "page";
  }

  function sampleTypeLabel(sample) {
    return {
      golden: sample?.visualOnly ? "黄金样本 · visual-only" : "黄金样本 · golden-page",
      page: "普通样本",
      anti: "低分反例",
    }[sampleTypeKey(sample)];
  }

  function themePresetForSample(sample) {
    return sample?.themePreset || sample?.configSnapshot?.themePreset || sample?.renderEvidence?.themeTokens?.themePreset || "";
  }

  function sampleThumbUrl(sample) {
    const evidence = sample?.renderEvidence || {};
    const raw = evidence.screenshotUrl || evidence.sourceUrl || (evidence.screenshotPath ? `/${String(evidence.screenshotPath).replace(/^\/+/, "")}` : "");
    return raw || "";
  }

  function renderSampleThumb(sample) {
    const url = sampleThumbUrl(sample);
    if (!url) return `<div class="sample-thumb">暂无缩略图</div>`;
    const label = escapeHtml(sample.name || "样本缩略图");
    if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) {
      return `<div class="sample-thumb"><img src="${escapeHtml(url)}" alt="${label}" /></div>`;
    }
    if (/\.html?(\?|$)/i.test(url) || sample?.sourceAssetType === "html") {
      return `<div class="sample-thumb"><iframe src="${escapeHtml(url)}" title="${label}"></iframe></div>`;
    }
    return `<a class="sample-thumb" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(sample.sourceAssetType || "参考稿")}</a>`;
  }

  function dimensionInputsHtml(values = {}, attrName = "data-form-dimension") {
    return DIMENSIONS.map((dimension) => {
      const value = Math.max(0, Math.min(10, Number(values?.[dimension.key] ?? 8)));
      return `
        <label class="dimension-row">
          <span>${escapeHtml(dimension.label)}</span>
          <input ${attrName}="${escapeHtml(dimension.key)}" type="range" min="0" max="10" step="1" value="${value}" />
          <output>${value}</output>
        </label>
      `;
    }).join("");
  }

  function bindRangeOutputs(root) {
    root?.querySelectorAll('input[type="range"]').forEach((input) => {
      const sync = () => {
        const output = input.closest("label")?.querySelector("output") || input.parentElement?.querySelector("output");
        if (output) output.textContent = input.value;
      };
      input.addEventListener("input", sync);
      sync();
    });
  }

  function renderScenarioCheckboxes(container, selected = []) {
    if (!container) return;
    const selectedSet = new Set(selected);
    container.innerHTML = SCENARIO_TAGS.map(
      (tag) => `
        <label>
          <input type="checkbox" value="${escapeHtml(tag)}" ${selectedSet.has(tag) ? "checked" : ""} />
          ${escapeHtml(tag)}
        </label>
      `,
    ).join("");
  }

  function readScenarioCheckboxes(container) {
    return [...(container?.querySelectorAll('input[type="checkbox"]:checked') || [])].map((input) => input.value).filter(Boolean);
  }

  function readDimensionsFrom(container, attrName) {
    return Object.fromEntries(
      DIMENSIONS.map((dimension) => {
        const input = container?.querySelector(`[${attrName}="${dimension.key}"]`);
        return [dimension.key, Number(input?.value || 8)];
      }),
    );
  }

  function renderStats() {
    if (els.referenceCount) els.referenceCount.textContent = state.references.length;
    if (els.sampleCount) els.sampleCount.textContent = state.samples.length;
    if (els.candidateCountStat) els.candidateCountStat.textContent = state.candidates.length;
    if (els.scoreCount) els.scoreCount.textContent = state.scores.length;
    if (els.feedbackCount) els.feedbackCount.textContent = state.feedback.length;
  }

  function renderReferences() {
    if (!els.referenceList) return;
    els.referenceList.innerHTML = state.references.length
      ? state.references
          .map((asset) => {
            const thumb = asset.type === "image"
              ? `<img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.name)}" />`
              : asset.type === "html"
              ? `<iframe src="${escapeHtml(asset.url)}" title="${escapeHtml(asset.name)}"></iframe>`
              : `<span>${escapeHtml(asset.type || "稿件")}</span>`;
            return `
              <article class="reference-card">
                <div class="reference-thumb">${thumb}</div>
                <span>${escapeHtml(asset.type || "reference")} · ${escapeHtml(new Date(asset.at || Date.now()).toLocaleDateString("zh-CN"))}</span>
                <h3>${escapeHtml(asset.name)}</h3>
                <p>${escapeHtml(asset.note || "已保存为审美参考。")}</p>
                ${chipRow(asset.tags || [], "reference-tags")}
                <button type="button" data-upgrade-reference-id="${escapeHtml(asset.id)}">升级为黄金样本</button>
              </article>
            `;
          })
          .join("")
      : `<p class="empty-training">还没有参考稿。可以上传截图、HTML 稿或 PDF，给 AI 一个更明确的审美方向。</p>`;
    els.referenceList.querySelectorAll("[data-upgrade-reference-id]").forEach((button) => {
      button.addEventListener("click", () => {
        if (els.referenceUpgradeSelect) els.referenceUpgradeSelect.value = button.dataset.upgradeReferenceId || "";
        const asset = state.references.find((item) => item.id === button.dataset.upgradeReferenceId);
        if (asset && els.goldenName && !els.goldenName.value) els.goldenName.value = asset.name;
        openTrainingModal("visual");
        showToast("已选中参考稿，补充分数和标签后升级");
      });
    });
    renderReferenceUpgradeOptions();
  }

  function renderReferenceUpgradeOptions() {
    if (!els.referenceUpgradeSelect) return;
    const selected = els.referenceUpgradeSelect.value;
    els.referenceUpgradeSelect.innerHTML = `<option value="">选择已上传参考稿</option>${state.references
      .map((asset) => `<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.name)} · ${escapeHtml(asset.type || "file")}</option>`)
      .join("")}`;
    if (selected && state.references.some((asset) => asset.id === selected)) els.referenceUpgradeSelect.value = selected;
  }

  function renderContext() {
    if (!els.contextList) return;
    const ranked = [
      ...state.references.slice(0, 3).map((item) => ({
        type: "参考稿",
        title: item.name,
        text: item.note || "用户上传的视觉参考稿。",
        tags: item.tags || [],
      })),
      ...state.goldenSamples.slice(0, 3).map((item) => ({
        type: "黄金整页",
        title: item.name,
        text: item.whyGood || item.scenario || item.page?.layout || "",
        tags: [item.pageIntent, item.visualStyle, ...(item.scenarioTags || [])].filter(Boolean),
      })),
      ...state.rankedSamples.slice(0, 3).map((item) => ({
        type: "样本页",
        title: item.name,
        text: item.scenario || item.page?.layout || "",
        tags: [item.pageIntent, item.visualStyle].filter(Boolean),
      })),
      ...state.components.slice(0, 4).map((item) => ({
        type: "漂亮积木",
        title: item.name,
        text: item.reuseAdvice || item.description || "",
        tags: [item.family, item.size].filter(Boolean),
      })),
      ...state.lowScoreAntiExamples.slice(0, 2).map((item) => ({
        type: "低分反例",
        title: item.name,
        text: item.forbiddenReuse || item.whyBad || item.avoidPatterns?.[0] || "",
        tags: [item.pageIntent, item.visualStyle].filter(Boolean),
      })),
    ];
    els.contextList.innerHTML = ranked.length
      ? ranked
          .map(
            (item) => `
              <article class="context-card">
                <span>${escapeHtml(item.type)}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.text)}</p>
                ${chipRow(item.tags)}
              </article>
            `,
          )
          .join("")
      : `<p class="empty-training">暂无上下文。生成时会自动读取样本库、漂亮积木和反馈记忆。</p>`;
  }

  function renderFeedback() {
    if (!els.feedbackList) return;
    els.feedbackList.innerHTML = state.feedback.length
      ? state.feedback
          .slice(0, 8)
          .map(
            (record) => `
              <article class="feedback-card">
                <span>${escapeHtml(record.decision)} · ${escapeHtml(record.manualScore ?? record.score ?? record.rating ?? "--")}分</span>
                <h3>${escapeHtml(record.pageIntent || record.visualStyle || "反馈记忆")}</h3>
                <p>${escapeHtml(record.note || record.prompt || "")}</p>
                ${chipRow(record.preferenceSignals || record.tags || [])}
              </article>
            `,
          )
          .join("")
      : `<p class="empty-training">暂无反馈记忆。人工评分保存后会出现在这里。</p>`;
  }

  function syncFilterSelect(select, values, placeholder) {
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${values
      .filter(Boolean)
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join("")}`;
    if (current && values.includes(current)) select.value = current;
  }

  function refreshSampleFilterOptions() {
    syncFilterSelect(els.sampleFilterScenario, SCENARIO_TAGS, "全部场景");
    const intents = [...new Set(state.samples.map((sample) => sample.pageIntent).filter(Boolean))].sort();
    const themes = [...new Set(state.samples.map(themePresetForSample).filter(Boolean))].sort();
    syncFilterSelect(els.sampleFilterIntent, intents, "全部 Intent");
    syncFilterSelect(els.sampleFilterTheme, themes, "全部主题");
  }

  function sampleMatchesFilters(sample) {
    const filters = state.sampleFilters;
    const score = scoreForSample(sample);
    if (filters.scenario && !(sample.scenarioTags || []).includes(filters.scenario)) return false;
    if (filters.type && sampleTypeKey(sample) !== filters.type) return false;
    if (filters.minScore !== "" && score !== null && score < Number(filters.minScore)) return false;
    if (filters.maxScore !== "" && score !== null && score > Number(filters.maxScore)) return false;
    if (filters.pageIntent && sample.pageIntent !== filters.pageIntent) return false;
    if (filters.themePreset && themePresetForSample(sample) !== filters.themePreset) return false;
    return true;
  }

  function renderGoldenLibrary() {
    if (!els.sampleLibraryList) return;
    refreshSampleFilterOptions();
    const filtered = state.samples
      .filter(sampleMatchesFilters)
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    els.sampleLibraryList.innerHTML = filtered.length
      ? filtered
          .map((sample) => {
            const score = scoreForSample(sample);
            const typeKey = sampleTypeKey(sample);
            const summary = sample.whyGood || sample.whyBad || sample.scenario || sample.page?.layout || "暂无说明。";
            return `
              <article class="sample-card" data-sample-id="${escapeHtml(sample.id)}">
                ${renderSampleThumb(sample)}
                <div class="sample-card-body">
                  <div class="sample-card-head">
                    <div>
                      <h3>${escapeHtml(sample.name)}</h3>
                      <p>${escapeHtml(summary)}</p>
                    </div>
                    <span class="sample-kind-pill" data-kind="${escapeHtml(typeKey)}">${escapeHtml(sampleTypeLabel(sample))}</span>
                  </div>
                  <div class="sample-meta-grid">
                    <span>pageIntent: ${escapeHtml(sample.pageIntent || "--")}</span>
                    <span>themePreset: ${escapeHtml(themePresetForSample(sample) || "--")}</span>
                    <span>visualStyle: ${escapeHtml(sample.visualStyle || "--")}</span>
                    <span>更新: ${escapeHtml(formatDate(sample.updatedAt || sample.createdAt))}</span>
                  </div>
                  <div class="candidate-meta">
                    <b>human ${escapeHtml(sample.humanScore ?? "--")}</b>
                    <b>aesthetic ${escapeHtml(sample.aestheticScore ?? "--")}</b>
                    <b class="sample-score-pill">${escapeHtml(score ?? "--")} / 100</b>
                  </div>
                  ${chipRow([...(sample.scenarioTags || []), ...(sample.tags || [])], "context-tags")}
                  <p>${escapeHtml(sample.whyBad ? `避开：${sample.whyBad}` : sample.forbiddenReuse || "")}</p>
                  <div class="sample-card-actions">
                    <button type="button" data-edit-sample="${escapeHtml(sample.id)}">编辑</button>
                    <button class="danger-button" type="button" data-delete-sample-id="${escapeHtml(sample.id)}">删除</button>
                  </div>
                </div>
              </article>
            `;
          })
          .join("")
      : `<p class="empty-training">没有符合筛选条件的样本。调整筛选，或先上传一份 visual-only 黄金样本。</p>`;

    els.sampleLibraryList.querySelectorAll("[data-edit-sample]").forEach((button) => {
      button.addEventListener("click", () => openSampleEditor(button.dataset.editSample));
    });
    els.sampleLibraryList.querySelectorAll("[data-delete-sample-id]").forEach((button) => {
      button.addEventListener("click", () => deleteSampleById(button.dataset.deleteSampleId, false).catch((error) => showToast(error.message)));
    });
  }

  function applyCandidatePreview(frame, candidate) {
    if (!frame || !candidate?.config) return;
    const run = () => {
      try {
        const frameWindow = frame.contentWindow;
        if (!frameWindow?.HomePersonalization?.applyConfig) return false;
        const config = home?.normalizeConfig ? home.normalizeConfig(candidate.config) : candidate.config;
        frameWindow.HomePersonalization.applyConfig(config, frameWindow.document);
        return true;
      } catch (error) {
        return false;
      }
    };
    if (!run()) {
      window.setTimeout(run, 240);
    }
  }

  function renderCandidates() {
    if (!els.candidateResults) return;
    els.candidateResults.innerHTML = state.candidates.length
      ? state.candidates
          .map(
            (candidate) => `
              <article class="candidate-card${candidate.id === state.selectedCandidateId ? " active" : ""}" data-candidate-id="${escapeHtml(candidate.id)}" data-status="${escapeHtml(candidate.status)}">
                <span>候选 ${candidate.index + 1} · ${escapeHtml(candidate.source)} · ${escapeHtml(scoreBandLabel(candidate.status))}</span>
                <h3>${escapeHtml(candidate.label)}</h3>
                <div class="candidate-meta">
                  <b>${escapeHtml(candidate.provider || "")}</b>
                  <b>${escapeHtml(candidate.model || "")}</b>
                  <b>${escapeHtml(candidate.config?.activeRenderMode || candidate.config?.renderMode || "")}</b>
                  <b class="score-pill">${escapeHtml(candidate.score)} / 100</b>
                </div>
                <p>${escapeHtml(candidate.message || candidate.config?.aiSummary || "")}</p>
                <div class="candidate-preview-shell">
                  <iframe
                    class="candidate-preview-frame"
                    data-candidate-preview="${escapeHtml(candidate.id)}"
                    title="${escapeHtml(candidate.label)}"
                    src="./client-home.html?preview=1&trainingCandidate=${encodeURIComponent(candidate.id)}"
                  ></iframe>
                </div>
                <div class="candidate-toolbar">
                  <button class="primary" type="button" data-select-candidate="${escapeHtml(candidate.id)}">评分这套</button>
                  <button type="button" data-open-candidate="${escapeHtml(candidate.id)}">完整预览</button>
                  <button type="button" data-save-candidate-sample="${escapeHtml(candidate.id)}">存为样本</button>
                </div>
              </article>
            `,
          )
          .join("")
      : `<p class="empty-training">还没有候选方案。左侧输入需求后生成，生成结果会直接在这里预览。</p>`;

    els.candidateResults.querySelectorAll("[data-candidate-preview]").forEach((frame) => {
      const candidate = state.candidates.find((item) => item.id === frame.dataset.candidatePreview);
      frame.addEventListener("load", () => applyCandidatePreview(frame, candidate));
      applyCandidatePreview(frame, candidate);
    });

    els.candidateResults.querySelectorAll("[data-select-candidate]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedCandidateId = button.dataset.selectCandidate;
        syncSelectedCandidateForm(true);
        renderCandidates();
      });
    });

    els.candidateResults.querySelectorAll("[data-open-candidate]").forEach((button) => {
      button.addEventListener("click", () => {
        const candidate = state.candidates.find((item) => item.id === button.dataset.openCandidate);
        if (!candidate?.config || !home) return;
        home.saveDraft(candidate.config);
        window.localStorage.setItem(PROMPT_KEY, els.candidatePrompt?.value || "");
        window.location.href = "./home-layout-preview.html";
      });
    });

    els.candidateResults.querySelectorAll("[data-save-candidate-sample]").forEach((button) => {
      button.addEventListener("click", () => {
        const candidate = state.candidates.find((item) => item.id === button.dataset.saveCandidateSample);
        if (!candidate) return;
        saveCandidateSample(candidate).catch((error) => showToast(error.message));
      });
    });
  }

  function categoryDefault(candidate, key, fallback) {
    const categories = candidate?.aesthetic?.categories || candidate?.scoreRecord?.categories || [];
    const map = {
      firstScreenFocus: "visualFocus",
      informationHierarchy: "layoutHierarchy",
      moduleBalance: "layoutHierarchy",
      componentCraft: "componentCraft",
      financialTone: "brandHarmony",
      businessTruth: "businessFunction",
      responsive: "responsiveSafety",
      visualConsistency: "componentCraft",
      publishability: "responsiveSafety",
    };
    const category = categories.find((item) => item.key === map[key]);
    return Math.round((Number(category?.score) || fallback * 10) / 10);
  }

  function readManualDimensions() {
    return Object.fromEntries(
      DIMENSIONS.map((dimension) => {
        const input = els.dimensionSliders?.querySelector(`[data-dimension="${dimension.key}"]`);
        return [dimension.key, Number(input?.value || 8)];
      }),
    );
  }

  function syncSamplesFromLibrary(librarySamples) {
    state.samples = Array.isArray(librarySamples) ? librarySamples : state.samples;
    state.goldenSamples = state.samples.filter((sample) => sample.isGolden && !sample.isAntiExample);
    state.rankedSamples = state.samples.filter((sample) => !sample.isGolden && !sample.isAntiExample).slice(0, 6);
    state.lowScoreAntiExamples = state.samples.filter((sample) => sample.isAntiExample || Number(sample.humanScore ?? sample.aestheticScore) <= 68).slice(0, 6);
  }

  function renderDimensionSliders(candidate) {
    if (!els.dimensionSliders) return;
    els.dimensionSliders.innerHTML = DIMENSIONS.map((dimension) => {
      const value = Math.max(0, Math.min(10, categoryDefault(candidate, dimension.key, 8)));
      return `
        <label class="dimension-row">
          <span>${escapeHtml(dimension.label)}</span>
          <input data-dimension="${escapeHtml(dimension.key)}" type="range" min="0" max="10" step="1" value="${value}" />
          <output>${value}</output>
        </label>
      `;
    }).join("");
    els.dimensionSliders.querySelectorAll("[data-dimension]").forEach((input) => {
      input.addEventListener("input", () => {
        const output = input.closest(".dimension-row")?.querySelector("output");
        if (output) output.textContent = input.value;
      });
    });
  }

  function syncSelectedCandidateForm(resetManualScore = false) {
    const candidate = selectedCandidate();
    if (!candidate) {
      if (els.selectedReview) els.selectedReview.innerHTML = `<p class="empty-training">先生成或选择一套候选方案，再进行人工评分。</p>`;
      if (els.machineScore) els.machineScore.textContent = "--";
      return;
    }

    if (!state.selectedCandidateId) state.selectedCandidateId = candidate.id;
    if (els.selectedReview) {
      const issues = (candidate.aesthetic?.issues || candidate.scoreRecord?.issues || []).slice(0, 3);
      els.selectedReview.innerHTML = `
        <h3>${escapeHtml(candidate.label)}</h3>
        <p>${escapeHtml(candidate.message || candidate.config?.aiSummary || "")}</p>
        ${chipRow(issues.length ? issues : ["暂无明显问题"], "context-tags")}
      `;
    }
    if (els.machineScore) els.machineScore.textContent = `${candidate.score ?? "--"}`;
    if (resetManualScore && els.manualScore) {
      els.manualScore.value = String(candidate.manualScore ?? candidate.score ?? 88);
    }
    if (els.manualScoreOutput) els.manualScoreOutput.textContent = els.manualScore?.value || String(candidate.score ?? 88);
    renderDimensionSliders(candidate);
  }

  function renderAll() {
    renderStats();
    renderReferences();
    renderContext();
    renderCandidates();
    syncSelectedCandidateForm(false);
    renderFeedback();
    renderGoldenLibrary();
  }

  async function loadTrainingData() {
    const prompt = encodeURIComponent(savedPrompt());
    const [samples, scores, feedback, references] = await Promise.all([
      requestJson(`/api/home-ai/design-samples?prompt=${prompt}`),
      requestJson("/api/home-ai/aesthetic-scores"),
      requestJson("/api/home-ai/feedback"),
      requestJson("/api/home-ai/reference-assets"),
    ]);
    state.samples = samples.samples || [];
    state.goldenSamples = samples.goldenSamples || [];
    state.rankedSamples = samples.rankedSamples || [];
    state.lowScoreAntiExamples = samples.lowScoreAntiExamples || [];
    state.components = samples.beautifulComponents || [];
    state.scores = scores.records || [];
    state.feedback = feedback.records || [];
    state.references = references.records || [];
    renderAll();
  }

  async function scoreCurrentDraft() {
    const config = currentConfig();
    const prompt = savedPrompt();
    const data = await requestJson("/api/home-ai/aesthetic-score", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        config,
        renderMode: config.renderMode || config.activeRenderMode || currentRenderMode(),
        source: "current-draft",
        action: "current-draft-score",
      }),
    });
    const candidate = {
      id: data.record.id,
      index: 0,
      score: data.report.score,
      status: data.report.status,
      label: "当前草稿",
      source: "current-draft",
      provider: "Local",
      model: "aesthetic-scorer",
      message: data.record.message || config.aiSummary || "当前草稿已完成机器初评。",
      config,
      aesthetic: data.report,
      scoreRecord: data.record,
    };
    state.scores = data.records || [];
    state.candidates = [candidate, ...state.candidates.filter((item) => item.id !== candidate.id)];
    state.selectedCandidateId = candidate.id;
    renderAll();
    showToast(`当前草稿审美分 ${data.report.score}/100`);
  }

  async function generateCandidates() {
    const prompt = String(els.candidatePrompt?.value || savedPrompt()).trim();
    if (!prompt) {
      showToast("请先输入候选生成需求");
      return;
    }
    window.localStorage.setItem(PROMPT_KEY, prompt);
    if (els.candidateStatus) els.candidateStatus.textContent = "正在生成多套候选并评分...";
    if (els.generateCandidates) els.generateCandidates.disabled = true;
    try {
      const data = await requestJson("/api/home-ai/candidates", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          count: Number(els.candidateCount?.value || 3),
          renderMode: els.candidateRenderMode?.value || "compare",
          referenceAssetIds: state.references.slice(0, 6).map((item) => item.id),
          modelConfig: modelConfigForRequest(),
          context: {
            currentConfig: currentConfig(),
            defaultConfig: home?.DEFAULT_CONFIG || null,
            schema: home?.HOMEPAGE_CONFIG_JSON_SCHEMA || null,
            features: home?.FEATURES || null,
            bricks: home?.HOME_BRICKS || null,
            moduleVariantOptions: home?.MODULE_VARIANT_OPTIONS || null,
            moduleStyleOptions: home?.MODULE_STYLE_OPTIONS || null,
          },
        }),
      });
      state.candidates = data.candidates || [];
      state.scores = state.candidates
        .map((item) => item.scoreRecord)
        .filter(Boolean)
        .concat(state.scores.filter((item) => !state.candidates.some((candidate) => candidate.scoreRecord?.id === item.id)));
      state.selectedCandidateId = data.bestCandidateId || state.candidates[0]?.id || "";
      renderAll();
      syncSelectedCandidateForm(true);
      if (els.candidateStatus) els.candidateStatus.textContent = `已生成 ${state.candidates.length} 套候选，最高分 ${state.candidates[0]?.score || "--"}/100。`;
      showToast("候选生成完成，可以直接预览并人工评分");
    } finally {
      if (els.generateCandidates) els.generateCandidates.disabled = false;
    }
  }

  function selectedPreviewFrame(candidate) {
    if (!candidate?.id || !els.candidateResults) return null;
    const escapedId = window.CSS?.escape ? window.CSS.escape(candidate.id) : String(candidate.id).replace(/["\\]/g, "\\$&");
    return els.candidateResults.querySelector(`[data-candidate-preview="${escapedId}"]`);
  }

  function readThemeTokens(doc, config) {
    const root = doc?.documentElement ? getComputedStyle(doc.documentElement) : null;
    const tokenNames = ["--home-bg", "--home-card-bg", "--home-primary", "--home-text", "--home-border", "--home-radius-sm"];
    return {
      themePreset: config?.themePreset || config?.theme || "",
      colorMode: config?.colorMode || "auto",
      density: config?.density || "",
      tokens: root
        ? Object.fromEntries(tokenNames.map((name) => [name, root.getPropertyValue(name).trim()]).filter(([, value]) => value))
      : {},
    };
  }

  function renderEvidenceFromDocument(doc, sourceUrl, config) {
    const root = doc?.querySelector(".client-home-page, [data-client-home-root], body");
    const htmlScheme = config?.htmlScheme || {};
    const skeleton = config?.skeletonHtmlScheme || {};
    return {
      capturedAt: new Date().toISOString(),
      sourceUrl: sourceUrl || window.location.href,
      domSnapshot: root?.outerHTML ? root.outerHTML.slice(0, 50000) : "",
      aiHtml: htmlScheme.enabled ? String(htmlScheme.html || "").slice(0, 30000) : "",
      aiCss: htmlScheme.enabled ? String(htmlScheme.css || "").slice(0, 30000) : "",
      skeletonHtml: skeleton.enabled ? String(skeleton.skeletonHtml || "").slice(0, 24000) : "",
      cssSummary: {
        renderMode: config?.activeRenderMode || config?.renderMode || "",
        moduleStyles: config?.moduleStyles || {},
        componentMorphs: config?.componentMorphs || {},
      },
      themeTokens: readThemeTokens(doc, config),
    };
  }

  function captureRenderEvidence(candidate, config) {
    const frame = selectedPreviewFrame(candidate);
    return renderEvidenceFromDocument(frame?.contentDocument || null, frame?.src || window.location.href, config);
  }

  function captureConfigEvidence(config) {
    if (!home?.applyConfig) return Promise.resolve(captureRenderEvidence(null, config));
    return new Promise((resolve) => {
      const frame = document.createElement("iframe");
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        const evidence = renderEvidenceFromDocument(frame.contentDocument || null, frame.src, config);
        frame.remove();
        resolve(evidence);
      };
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1440px;height:900px;opacity:0;pointer-events:none;";
      frame.src = "./client-home.html?preview=1&trainingSnapshot=1";
      frame.addEventListener("load", () => {
        try {
          frame.contentWindow?.HomePersonalization?.applyConfig(config, frame.contentDocument);
        } catch (error) {
          // The fallback evidence still records config tokens even if the preview iframe cannot render.
        }
        window.setTimeout(finish, 180);
      });
      document.body.appendChild(frame);
      window.setTimeout(finish, 1600);
    });
  }

  function scenarioTagsFromConfig(config, prompt) {
    const source = `${prompt || ""} ${config?.pageIntent?.primaryIntent || ""} ${config?.themePreset || config?.theme || ""} ${config?.layoutPreset || ""}`;
    return [
      /开户|onboarding|kyc/i.test(source) ? "新客开户" : "",
      /asset|资产|钱包|balance|overview|默认/i.test(source) ? "默认资产首页" : "",
      /入金|充值|deposit|fund/i.test(source) ? "入金转化" : "",
      /出金|提现|withdraw/i.test(source) ? "出金安全" : "",
      /专业交易|trader|mt5|持仓|订单/i.test(source) ? "专业交易" : "",
      /多账户|账户矩阵|account switch|account list/i.test(source) ? "多账户管理" : "",
      /copytrading|跟单|信号源/i.test(source) ? "CopyTrading" : "",
      /pamm|mam|理财|资管|wealth/i.test(source) ? "PAMM 理财" : "",
      /ib|代理|推广|邀请码|referral/i.test(source) ? "IB 推广" : "",
      /返佣|佣金|rebate|commission/i.test(source) ? "返佣中心" : "",
      /黑金|vip|高净值|blackgold/i.test(source) ? "黑金 VIP" : "",
      /活动|增长|大赛|campaign|promo/i.test(source) ? "活动增长" : "",
      /竞赛|比赛|competition|contest/i.test(source) ? "交易竞赛" : "",
      /风控|合规|监管|risk|compliance/i.test(source) ? "风控合规" : "",
      /白标|资金安全|安全/i.test(source) ? "白标资金安全" : "",
      /客服|帮助|support|help|工单/i.test(source) ? "客服帮助" : "",
      /行情|资讯|news|calendar|日历/i.test(source) ? "行情资讯" : "",
      /本地化|多语言|language|locale|region/i.test(source) ? "本地化运营" : "",
      /极简|白|minimalWhite/i.test(source) ? "极简白" : "",
      /暗色|深色|dark|blackgold/i.test(source) ? "暗色高端" : "",
      /移动端|手机|mobile/i.test(source) ? "移动端优先" : "",
    ].filter(Boolean);
  }

  function sampleFromConfig(config, prompt, sourceLabel = "当前草稿", options = {}) {
    const normalized = home?.normalizeConfig ? home.normalizeConfig(config) : config || {};
    const blocks = (normalized.brickPlan || []).slice(0, 8);
    const manualScore = Number(options.humanScore ?? options.manualScore ?? options.score ?? 92);
    const whyGood = options.whyGood || options.note || "从审美评审台人工保存为整页黄金样本。";
    const scoreDimensions = options.scoreDimensions || options.manualDimensions || readManualDimensions();
    const renderEvidence = options.renderEvidence || captureRenderEvidence(options.candidate || null, normalized);
    return {
      id: `training-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
      sampleKind: options.sampleKind || "golden-page",
      sourceType: "homepage-config",
      visualOnly: false,
      isGolden: options.isGolden !== false,
      name: options.name || `${normalized.name || sourceLabel} 样本`,
      scenario: prompt || normalized.aiSummary || "从审美评审台沉淀的首页样本。",
      pageIntent: normalized.pageIntent?.primaryIntent || normalized.brickTrace?.intent || "custom",
      themePreset: normalized.themePreset || normalized.theme || "",
      visualStyle: `${home?.themeLabel?.(normalized.themePreset || normalized.theme) || normalized.themePreset || "default"} · ${home?.layoutLabel?.(normalized.layoutPreset) || normalized.layoutPreset || ""}`,
      prompt,
      aestheticScore: manualScore,
      humanScore: manualScore,
      scoreDimensions,
      tags: [normalized.themePreset || normalized.theme, normalized.layoutPreset, normalized.heroFocus, ...(options.tags || [])].filter(Boolean),
      scenarioTags: scenarioTagsFromConfig(normalized, prompt),
      page: {
        name: normalized.name,
        layout: (normalized.sections || []).map((section) => `${section.type}:${(section.slots || []).join("+")}`).join(" / "),
        hero: home?.featureLabel?.(normalized.heroFocus) || normalized.heroFocus,
        mobile: "沿用 autoLayout 移动端单列策略。",
      },
      functions: blocks.map((brick) => ({
        name: brick.brickName || brick.family || brick.component,
        objective: brick.reason || "承接当前首页功能。",
        modules: [brick.component || brick.feature].filter(Boolean),
        data: [],
        actions: [],
      })),
      sampleBlocks: blocks.map((brick) => ({
        id: brick.brickId || brick.component || brick.feature,
        name: brick.brickName || brick.family || brick.component,
        page: brick.zone || "main",
        function: brick.reason || "当前方案中的功能积木。",
        componentRefs: [brick.brickId].filter(Boolean),
        visualNotes: [brick.size, brick.family].filter(Boolean),
        dataFields: [],
      })),
      componentRefs: blocks.map((brick) => brick.brickId).filter(Boolean),
      goodPatterns: ["来自审美评审台人工挑选，可作为后续生成前的整页主参考。", whyGood].filter(Boolean),
      avoidPatterns: options.avoidPatterns || [],
      whyGood,
      whyBad: options.whyBad || "",
      applicableScenarios: scenarioTagsFromConfig(normalized, prompt),
      forbiddenReuse: options.forbiddenReuse || "只学习整页结构、模块比例、层级、token 气质和业务边界；不要照搬临时文案、假数据或截图中的具体品牌资产。",
      homepageConfig: normalized,
      renderEvidence,
      promptSeeds: [prompt].filter(Boolean),
    };
  }

  async function saveCandidateSample(candidate) {
    const data = await requestJson("/api/home-ai/design-samples", {
      method: "POST",
      body: JSON.stringify({
        sample: sampleFromConfig(candidate.config, savedPrompt(), candidate.label, {
          candidate,
          humanScore: candidate.manualScore ?? candidate.score ?? Number(els.manualScore?.value || 92),
          note: els.feedbackNote?.value || candidate.message || "",
          scoreDimensions: readManualDimensions(),
        }),
      }),
    });
    syncSamplesFromLibrary(data.library?.samples);
    renderAll();
    showToast("已存为整页黄金样本");
  }

  async function evidenceWithOptionalScreenshot(baseEvidence) {
    const file = els.currentGoldenScreenshot?.files?.[0];
    if (!file) return baseEvidence;
    const payload = await readFilePayload(file);
    return { ...baseEvidence, screenshotDataUrl: payload.dataUrl };
  }

  async function saveCurrentGoldenSample() {
    const config = currentConfig();
    if (!config || !Object.keys(config).length) {
      showToast("当前没有可保存的首页草稿");
      return;
    }
    const manualScore = Number(els.manualScore?.value || 92);
    const evidence = await evidenceWithOptionalScreenshot(await captureConfigEvidence(config));
    const data = await requestJson("/api/home-ai/design-samples", {
      method: "POST",
      body: JSON.stringify({
        sample: sampleFromConfig(config, savedPrompt(), "当前首页", {
          name: String(els.currentGoldenName?.value || "").trim() || undefined,
          humanScore: manualScore,
          note: els.feedbackNote?.value || "",
          scoreDimensions: readManualDimensions(),
          renderEvidence: evidence,
        }),
      }),
    });
    syncSamplesFromLibrary(data.library?.samples);
    if (els.currentGoldenScreenshot) els.currentGoldenScreenshot.value = "";
    renderAll();
    setActiveTab("library");
    closeTrainingModal();
    showToast("当前首页已保存为黄金样本");
  }

  function ratingFromScore(score) {
    return Math.max(1, Math.min(5, Math.round(Number(score || 60) / 20)));
  }

  async function saveManualFeedback(event) {
    event.preventDefault();
    const candidate = selectedCandidate();
    if (!candidate) {
      showToast("请先选择一套候选方案");
      return;
    }
    const manualScore = Number(els.manualScore?.value || candidate.score || 88);
    const dimensions = readManualDimensions();
    const config = candidate.config || currentConfig();
    const signals = DIMENSIONS.map((dimension) => `${dimension.label} ${dimensions[dimension.key]}/10`);
    const data = await requestJson("/api/home-ai/feedback", {
      method: "POST",
      body: JSON.stringify({
        prompt: savedPrompt(),
        scoreRecordId: candidate.scoreRecord?.id || candidate.id,
        candidateGroupId: candidate.scoreRecord?.candidateGroupId || "",
        candidateIndex: candidate.index ?? null,
        decision: state.decision,
        rating: ratingFromScore(manualScore),
        note: els.feedbackNote?.value || "",
        tags: [config.themePreset || config.theme, config.layoutPreset, config.pageIntent?.primaryIntent].filter(Boolean),
        preferenceSignals: signals,
        pageIntent: config.pageIntent?.primaryIntent || config.brickTrace?.intent || "",
        visualStyle: config.themePreset || config.theme || "",
        score: manualScore,
        manualScore,
        machineScore: candidate.score,
        manualDimensions: dimensions,
        referenceAssets: state.references.slice(0, 6).map((asset) => ({ id: asset.id, name: asset.name, tags: asset.tags || [] })),
        evidence: captureRenderEvidence(candidate, config),
        config,
      }),
    });
    state.feedback = data.records || [];
    candidate.manualScore = manualScore;
    if (els.feedbackNote) els.feedbackNote.value = "";
    renderAll();
    showToast("人工评分和反馈已保存，后续生成会参考");
  }

  function inferredMimeForFile(file) {
    const name = String(file?.name || "");
    if (file?.type) return file.type;
    if (/\.html?$/i.test(name)) return "text/html";
    if (/\.css$/i.test(name)) return "text/css";
    if (/\.(mjs|cjs|js)$/i.test(name)) return "text/javascript";
    if (/\.txt$/i.test(name)) return "text/plain";
    return "application/octet-stream";
  }

  function isTextDesignFile(file) {
    const source = `${file?.type || ""} ${file?.name || ""}`;
    return /html|css|javascript|ecmascript|text|json|xml|\.html?$|\.css$|\.mjs$|\.cjs$|\.js$|\.txt$/i.test(source);
  }

  function imageElementFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () => reject(new Error("图片无法解析")));
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
      .slice(0, 6)
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
    if (ratio >= 2.4) return "超宽横幅，适合首屏条幅、指标带或横向工作台";
    if (ratio >= 1.35) return "横向界面，适合左右分栏、宽卡片和仪表盘首屏";
    if (ratio <= 0.72) return "竖向界面，适合移动端、侧栏或表单型结构";
    return "接近方形，适合信息卡、状态面板或局部功能组件";
  }

  async function enrichImagePayload(payload) {
    if (!/^image\//i.test(payload.mime || "") || !payload.dataUrl) return payload;
    try {
      const image = await imageElementFromDataUrl(payload.dataUrl);
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      const colors = analyzeImageColors(image);
      return {
        ...payload,
        width,
        height,
        aspectRatio: width && height ? `${(width / height).toFixed(2)}:1` : "",
        layoutHint: layoutHintForImage(width, height),
        dominantColors: colors.dominantColors,
        brightness: colors.brightness,
      };
    } catch (error) {
      return payload;
    }
  }

  function readFilePayload(file) {
    const isText = isTextDesignFile(file);
    const mime = inferredMimeForFile(file);
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
      reader.onload = async () => {
        const textContent = isText ? String(reader.result || "") : "";
        const textByteLength = isText && window.TextEncoder ? new TextEncoder().encode(textContent).length : textContent.length;
        const isHtml = /html/i.test(mime) || /\.html?$/i.test(file.name || "");
        if (isHtml && file.size > 0 && textByteLength < file.size * 0.92 && !/<\/html>\s*$/i.test(textContent)) {
          reject(new Error(`${file.name} 读取不完整，请重新选择原始 HTML 文件`));
          return;
        }
        const payload = {
          name: file.name,
          mime,
          size: file.size,
          dataUrl: isText ? "" : String(reader.result || ""),
          textContent,
          textByteLength,
        };
        resolve(await enrichImagePayload(payload));
      };
      if (isText) reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
  }

  async function uploadReferences() {
    const files = state.pendingFiles.length ? state.pendingFiles : [...(els.referenceFile?.files || [])];
    if (!files.length) {
      showToast("请先选择参考稿文件");
      return;
    }
    const tags = String(els.referenceTags?.value || "")
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
    const note = String(els.referenceNote?.value || "").trim();
    if (els.uploadReference) els.uploadReference.disabled = true;
    try {
      const assets = await Promise.all(files.map(readFilePayload));
      let latest = { records: state.references };
      for (const asset of assets) {
        latest = await requestJson("/api/home-ai/reference-assets", {
          method: "POST",
          body: JSON.stringify({ asset: { ...asset, tags, note } }),
        });
      }
      state.references = latest.records || [];
      state.pendingFiles = [];
      if (els.referenceFile) els.referenceFile.value = "";
      if (els.referenceTags) els.referenceTags.value = "";
      if (els.referenceNote) els.referenceNote.value = "";
      renderAll();
      showToast(`已保存 ${assets.length} 个参考稿`);
    } finally {
      if (els.uploadReference) els.uploadReference.disabled = false;
    }
  }

  function visualSampleMetadata() {
    const scenarioTags = readScenarioCheckboxes(els.goldenScenarioTags);
    const pageIntent = String(els.goldenPageIntent?.value || "").trim();
    const themePreset = String(els.goldenThemePreset?.value || "").trim();
    const visualStyle = String(els.goldenVisualStyle?.value || "").trim();
    const whyGood = String(els.goldenWhyGood?.value || "").trim();
    const whyBad = String(els.goldenWhyBad?.value || "").trim();
    const forbiddenReuse =
      String(els.goldenForbiddenReuse?.value || "").trim() ||
      "只学习视觉层级、构图、信息密度、色彩和模块比例；不要照搬品牌素材、文案、金额或受保护内容。";
    return {
      name: String(els.goldenName?.value || "").trim(),
      prompt: String(els.goldenPrompt?.value || savedPrompt()).trim(),
      pageIntent,
      themePreset,
      visualStyle,
      scenarioTags,
      applicableScenarios: parseDelimited(els.goldenApplicable?.value, 10),
      humanScore: Number(els.goldenHumanScore?.value || 92),
      scoreDimensions: readDimensionsFrom(els.goldenDimensions, "data-golden-dimension"),
      whyGood,
      whyBad,
      forbiddenReuse,
      tags: [themePreset, pageIntent, visualStyle, ...scenarioTags].filter(Boolean).slice(0, 12),
    };
  }

  function selectedGoldenFiles() {
    return (state.goldenPendingFiles.length ? state.goldenPendingFiles : [...(els.goldenFile?.files || [])]).slice(0, 6);
  }

  function setGoldenAnalysisStatus(message) {
    if (els.goldenAnalysisStatus) els.goldenAnalysisStatus.textContent = message;
  }

  function setVisualGoldenSaving(isSaving) {
    if (els.saveVisualGolden) els.saveVisualGolden.disabled = isSaving;
    if (els.upgradeReferenceGolden) els.upgradeReferenceGolden.disabled = isSaving;
    if (els.analyzeGoldenFiles) els.analyzeGoldenFiles.disabled = isSaving;
  }

  function fillFieldIfEmpty(input, value) {
    if (!input || !value) return;
    if (!String(input.value || "").trim()) input.value = value;
  }

  function applyGoldenAnalysisToForm(analysis) {
    if (!analysis) return;
    fillFieldIfEmpty(els.goldenName, analysis.name);
    fillFieldIfEmpty(els.goldenPrompt, analysis.prompt);
    fillFieldIfEmpty(els.goldenPageIntent, analysis.pageIntent);
    fillFieldIfEmpty(els.goldenThemePreset, analysis.themePreset);
    fillFieldIfEmpty(els.goldenVisualStyle, analysis.visualStyle);
    fillFieldIfEmpty(els.goldenApplicable, (analysis.applicableScenarios || []).join(", "));
    fillFieldIfEmpty(els.goldenWhyGood, analysis.whyGood);
    fillFieldIfEmpty(els.goldenWhyBad, analysis.whyBad);
    fillFieldIfEmpty(els.goldenForbiddenReuse, analysis.forbiddenReuse);
    if (els.goldenHumanScore && analysis.humanScore) {
      els.goldenHumanScore.value = String(analysis.humanScore);
      if (els.goldenHumanScoreOutput) els.goldenHumanScoreOutput.textContent = els.goldenHumanScore.value;
    }
    const mergedTags = [...new Set([...readScenarioCheckboxes(els.goldenScenarioTags), ...(analysis.scenarioTags || [])])];
    renderScenarioCheckboxes(els.goldenScenarioTags, mergedTags);
    if (els.goldenDimensions && analysis.scoreDimensions) {
      els.goldenDimensions.innerHTML = dimensionInputsHtml(analysis.scoreDimensions, "data-golden-dimension");
      bindRangeOutputs(els.goldenDimensions);
    }
  }

  function renderGoldenAnalysisSummary(analysis) {
    if (!els.goldenAnalysisSummary) return;
    if (!analysis) {
      els.goldenAnalysisSummary.hidden = true;
      els.goldenAnalysisSummary.innerHTML = "";
      return;
    }
    const files = (analysis.sourceFileSummary || []).slice(0, 6);
    const patterns = (analysis.goodPatterns || []).slice(0, 5);
    const functions = (analysis.functions || []).map((item) => item.name).filter(Boolean).slice(0, 6);
    const tokens = [
      ...(analysis.themeTokens?.colorPalette || []).slice(0, 6),
      ...(analysis.themeTokens?.spacingScale || []).slice(0, 4),
    ].slice(0, 10);
    const cards = (analysis.cssSummary?.componentCards || analysis.themeTokens?.componentCards || [])
      .map((item) => item.heading || item.role)
      .filter(Boolean)
      .slice(0, 6);
    els.goldenAnalysisSummary.hidden = false;
    els.goldenAnalysisSummary.innerHTML = `
      <h4>${escapeHtml(analysis.name || "自动提取结果")}</h4>
      <p>${escapeHtml(analysis.page?.layout || analysis.whyGood || "已提取可学习的视觉黄金样本内容。")}</p>
      ${chipRow([analysis.pageIntent, analysis.themePreset, analysis.visualStyle, ...(analysis.scenarioTags || [])].filter(Boolean), "context-tags")}
      ${files.length ? `<p>文件：${escapeHtml(files.join("；"))}</p>` : ""}
      ${tokens.length ? `<p>Token：${escapeHtml(tokens.join(" / "))}</p>` : ""}
      ${functions.length ? `<p>功能组件：${escapeHtml(functions.join("、"))}</p>` : ""}
      ${cards.length ? `<p>组件卡片：${escapeHtml(cards.join("、"))}</p>` : ""}
      ${patterns.length ? `<ul>${patterns.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    `;
  }

  async function analyzeGoldenFiles() {
    const files = selectedGoldenFiles();
    if (!files.length) {
      showToast("请先选择 1-6 个黄金样本文件");
      setGoldenAnalysisStatus("还没有文件可分析。");
      return;
    }
    if (files.length > 6) {
      showToast("一次最多分析 6 个文件");
      return;
    }
    if (els.analyzeGoldenFiles) els.analyzeGoldenFiles.disabled = true;
    setGoldenAnalysisStatus(`正在读取并提取 ${files.length} 个文件...`);
    try {
      const payloadFiles = await Promise.all(files.map(readFilePayload));
      const data = await requestJson("/api/home-ai/golden-sample/analyze", {
        method: "POST",
        body: JSON.stringify({
          files: payloadFiles,
          metadata: visualSampleMetadata(),
        }),
      });
      state.goldenAnalysis = data.analysis || null;
      applyGoldenAnalysisToForm(state.goldenAnalysis);
      renderGoldenAnalysisSummary(state.goldenAnalysis);
      setGoldenAnalysisStatus("已完成本地自动提取，字段已填充，可继续人工微调后保存。");
      showToast("黄金样本内容已自动提取");
    } finally {
      if (els.analyzeGoldenFiles) els.analyzeGoldenFiles.disabled = false;
    }
  }

  async function saveReferenceAssetFromFile(file, metadata) {
    const payload = await readFilePayload(file);
    const analysis = metadata.analysis && typeof metadata.analysis === "object" ? metadata.analysis : null;
    const note = [
      metadata.whyGood || metadata.prompt || "外部设计稿 visual-only 黄金样本来源。",
      analysis?.page?.layout ? `自动提取：${analysis.page.layout}` : "",
      analysis?.themeTokens?.colorPalette?.length ? `主色：${analysis.themeTokens.colorPalette.slice(0, 6).join(", ")}` : "",
      payload.layoutHint ? `布局线索：${payload.layoutHint}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const latest = await requestJson("/api/home-ai/reference-assets", {
      method: "POST",
      body: JSON.stringify({
        asset: {
          ...payload,
          tags: metadata.tags,
          note,
        },
      }),
    });
    state.references = latest.records || state.references;
    return state.references[0] || null;
  }

  function visualOnlySampleFromAsset(asset, metadata, options = {}) {
    const analysis = options.analysis && typeof options.analysis === "object" ? options.analysis : null;
    const assets = Array.isArray(options.assets) ? options.assets.filter(Boolean) : [asset].filter(Boolean);
    const imageAsset = assets.find((item) => item.type === "image" || /^image\//i.test(item.mime || ""));
    const htmlAsset = assets.find((item) => item.type === "html" || /html/i.test(item.mime || "") || /\.html?$/i.test(item.name || ""));
    const explicitAssetIsVisual = asset && (asset.type === "image" || /^image\//i.test(asset.mime || "") || asset.type === "html" || /html/i.test(asset.mime || ""));
    const primaryAsset = explicitAssetIsVisual ? asset : imageAsset || htmlAsset || asset || assets[0] || {};
    const name = metadata.name || analysis?.name || `${primaryAsset.name || "外部设计稿"} visual-only 黄金样本`;
    const isImage = primaryAsset.type === "image" || /^image\//i.test(primaryAsset.mime || "");
    const cssSummary = {
      ...(analysis?.cssSummary || {}),
      referenceAssetId: primaryAsset.id,
      referenceType: primaryAsset.type,
      sourceAssetIds: assets.map((item) => item.id).filter(Boolean),
      sourceAssetNames: assets.map((item) => item.name).filter(Boolean),
      textExcerpt: primaryAsset.textExcerpt || analysis?.domSnapshot || "",
    };
    return {
      id: `visual-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
      sampleKind: "golden-page",
      sourceType: "visual-only",
      visualOnly: true,
      isGolden: true,
      isAntiExample: false,
      name,
      scenario: metadata.prompt || analysis?.prompt || metadata.applicableScenarios.join("、") || "外部设计稿视觉黄金样本。",
      pageIntent: metadata.pageIntent || analysis?.pageIntent || "",
      themePreset: metadata.themePreset || analysis?.themePreset || "",
      visualStyle: metadata.visualStyle || analysis?.visualStyle || "",
      prompt: metadata.prompt || analysis?.prompt || "",
      aestheticScore: metadata.humanScore,
      humanScore: metadata.humanScore,
      scoreDimensions: analysis?.scoreDimensions || metadata.scoreDimensions,
      tags: [...new Set([...(metadata.tags || []), analysis?.themePreset, analysis?.pageIntent, analysis?.visualStyle].filter(Boolean))].slice(0, 12),
      scenarioTags: [...new Set([...(metadata.scenarioTags || []), ...(analysis?.scenarioTags || [])])].slice(0, 12),
      page: {
        name,
        layout: analysis?.page?.layout || "visual-only：仅学习外部设计稿的构图、层级、密度和 token 气质。",
        hero: analysis?.page?.hero || metadata.whyGood,
        navigation: analysis?.page?.navigation || "",
        mobile: analysis?.page?.mobile || (metadata.scenarioTags.includes("移动端优先") ? "移动端优先参考。" : ""),
      },
      functions: analysis?.functions || [],
      sampleBlocks: analysis?.sampleBlocks || [],
      componentRefs: [],
      goodPatterns: [...new Set([metadata.whyGood, ...(analysis?.goodPatterns || [])].filter(Boolean))].slice(0, 10),
      avoidPatterns: [...new Set([metadata.whyBad, ...(analysis?.avoidPatterns || [])].filter(Boolean))].slice(0, 10),
      whyGood: metadata.whyGood || analysis?.whyGood || "",
      whyBad: metadata.whyBad || analysis?.whyBad || "",
      applicableScenarios: metadata.applicableScenarios.length ? metadata.applicableScenarios : analysis?.applicableScenarios?.length ? analysis.applicableScenarios : metadata.scenarioTags,
      forbiddenReuse: metadata.forbiddenReuse,
      homepageConfig: null,
      configSnapshot: null,
      referenceAssetId: primaryAsset.id,
      sourceAssetType: primaryAsset.type,
      renderEvidence: {
        capturedAt: new Date().toISOString(),
        screenshotPath: imageAsset ? imageAsset.storagePath || "" : isImage ? primaryAsset.storagePath || "" : "",
        screenshotUrl: imageAsset ? imageAsset.url || "" : isImage ? primaryAsset.url || "" : "",
        sourceUrl: primaryAsset.url || "",
        domSnapshot: analysis?.domSnapshot || "",
        cssSummary,
        themeTokens: {
          ...(analysis?.themeTokens || {}),
          themePreset: metadata.themePreset || analysis?.themePreset || "",
          visualStyle: metadata.visualStyle || analysis?.visualStyle || "",
        },
      },
      promptSeeds: [metadata.prompt, ...(analysis?.promptSeeds || [])].filter(Boolean).slice(0, 8),
    };
  }

  async function saveVisualOnlyGoldenFromAsset(asset, options = {}) {
    if (!asset) {
      showToast("请先选择或上传一个设计稿");
      return;
    }
    const metadata = visualSampleMetadata();
    const analysis = options.analysis || state.goldenAnalysis || null;
    setVisualGoldenSaving(true);
    setGoldenAnalysisStatus("正在保存黄金样本，并生成截图阅览...");
    try {
      const data = await requestJson("/api/home-ai/design-samples", {
        method: "POST",
        body: JSON.stringify({ sample: visualOnlySampleFromAsset(asset, metadata, { analysis, assets: options.assets || [asset] }) }),
      });
      syncSamplesFromLibrary(data.library?.samples);
      renderAll();
      setActiveTab("library");
      closeTrainingModal();
      const hasScreenshot = Boolean(data.sample?.renderEvidence?.screenshotUrl || data.sample?.renderEvidence?.screenshotPath);
      showToast(hasScreenshot ? "visual-only 黄金样本已保存，截图阅览已生成" : "visual-only 黄金样本已保存，会参与生成前检索");
      return data.sample;
    } finally {
      setVisualGoldenSaving(false);
    }
  }

  async function saveUploadedVisualGolden() {
    const files = selectedGoldenFiles();
    const metadata = { ...visualSampleMetadata(), analysis: state.goldenAnalysis };
    const selectedReference = state.references.find((asset) => asset.id === els.referenceUpgradeSelect?.value);
    const savedAssets = [];
    setVisualGoldenSaving(true);
    setGoldenAnalysisStatus("正在保存参考稿，并准备生成截图阅览...");
    try {
      if (files.length) {
        for (const file of files) {
          const saved = await saveReferenceAssetFromFile(file, metadata);
          if (saved) savedAssets.push(saved);
        }
      }
      const assets = savedAssets.length ? savedAssets : selectedReference ? [selectedReference] : [];
      const primaryAsset =
        assets.find((asset) => asset.type === "image" || /^image\//i.test(asset.mime || "")) ||
        assets.find((asset) => asset.type === "html" || /html/i.test(asset.mime || "") || /\.html?$/i.test(asset.name || "")) ||
        assets[0] ||
        null;
      await saveVisualOnlyGoldenFromAsset(primaryAsset, { analysis: state.goldenAnalysis, assets });
      state.goldenPendingFile = null;
      state.goldenPendingFiles = [];
      state.goldenAnalysis = null;
      if (els.goldenFile) els.goldenFile.value = "";
      renderGoldenAnalysisSummary(null);
      setGoldenAnalysisStatus("等待选择文件。会提取界面骨架、结构、间距、留白、功能组件和视觉 token。");
    } finally {
      setVisualGoldenSaving(false);
    }
  }

  async function upgradeSelectedReferenceGolden() {
    const asset = state.references.find((item) => item.id === els.referenceUpgradeSelect?.value);
    if (!asset) {
      showToast("请先选择一个已上传参考稿");
      return;
    }
    await saveVisualOnlyGoldenFromAsset(asset);
  }

  function openSampleEditor(sampleId) {
    const sample = state.samples.find((item) => item.id === sampleId);
    if (!sample || !els.sampleEditor) return;
    state.editingSampleId = sample.id;
    openTrainingModal("edit");
    els.sampleEditor.hidden = false;
    if (els.sampleEditorId) els.sampleEditorId.textContent = sample.id;
    if (els.editSampleName) els.editSampleName.value = sample.name || "";
    if (els.editSampleType) els.editSampleType.value = sampleTypeKey(sample);
    if (els.editPageIntent) els.editPageIntent.value = sample.pageIntent || "";
    if (els.editThemePreset) els.editThemePreset.value = themePresetForSample(sample);
    if (els.editVisualStyle) els.editVisualStyle.value = sample.visualStyle || "";
    if (els.editTags) els.editTags.value = (sample.tags || []).join(", ");
    if (els.editApplicable) els.editApplicable.value = (sample.applicableScenarios || []).join(", ");
    if (els.editPrompt) els.editPrompt.value = sample.prompt || "";
    if (els.editHumanScore) els.editHumanScore.value = String(scoreForSample(sample) ?? 92);
    if (els.editHumanScoreOutput) els.editHumanScoreOutput.textContent = els.editHumanScore?.value || "92";
    if (els.editWhyGood) els.editWhyGood.value = sample.whyGood || "";
    if (els.editWhyBad) els.editWhyBad.value = sample.whyBad || "";
    if (els.editForbiddenReuse) els.editForbiddenReuse.value = sample.forbiddenReuse || "";
    if (els.editCleanupAssets) els.editCleanupAssets.checked = false;
    renderScenarioCheckboxes(els.editScenarioTags, sample.scenarioTags || []);
    if (els.editDimensions) {
      els.editDimensions.innerHTML = dimensionInputsHtml(sample.scoreDimensions || {}, "data-edit-dimension");
      bindRangeOutputs(els.editDimensions);
    }
    const body = els.trainingModal?.querySelector(".training-modal-body");
    if (body) body.scrollTop = 0;
  }

  function closeSampleEditor() {
    state.editingSampleId = "";
    if (els.sampleEditor) els.sampleEditor.hidden = true;
  }

  function samplePatchFromEditor() {
    const type = els.editSampleType?.value || "golden";
    const humanScore = Number(els.editHumanScore?.value || 92);
    const existing = state.samples.find((sample) => sample.id === state.editingSampleId) || {};
    return {
      name: String(els.editSampleName?.value || "").trim(),
      sampleKind: type === "anti" ? "anti-example" : type === "page" ? "page" : "golden-page",
      isGolden: type === "golden",
      isAntiExample: type === "anti",
      visualOnly: type === "golden" ? existing.visualOnly || false : false,
      sourceType: type === "golden" && existing.visualOnly ? "visual-only" : type === "golden" ? existing.sourceType || "homepage-config" : "sample-notes",
      pageIntent: String(els.editPageIntent?.value || "").trim(),
      themePreset: String(els.editThemePreset?.value || "").trim(),
      visualStyle: String(els.editVisualStyle?.value || "").trim(),
      prompt: String(els.editPrompt?.value || "").trim(),
      humanScore,
      aestheticScore: humanScore,
      scoreDimensions: readDimensionsFrom(els.editDimensions, "data-edit-dimension"),
      tags: parseDelimited(els.editTags?.value, 12),
      scenarioTags: readScenarioCheckboxes(els.editScenarioTags),
      applicableScenarios: parseDelimited(els.editApplicable?.value, 10),
      whyGood: String(els.editWhyGood?.value || "").trim(),
      whyBad: String(els.editWhyBad?.value || "").trim(),
      forbiddenReuse: String(els.editForbiddenReuse?.value || "").trim(),
    };
  }

  async function updateEditingSample() {
    if (!state.editingSampleId) {
      showToast("请先选择一个样本");
      return;
    }
    const data = await requestJson(`/api/home-ai/design-samples/${encodeURIComponent(state.editingSampleId)}`, {
      method: "PATCH",
      body: JSON.stringify({ sample: samplePatchFromEditor() }),
    });
    syncSamplesFromLibrary(data.library?.samples);
    renderAll();
    setActiveTab("library");
    closeTrainingModal();
    showToast("样本已更新");
  }

  async function deleteSampleById(sampleId, cleanupAssets = false) {
    const sample = state.samples.find((item) => item.id === sampleId);
    if (!sample) return;
    const confirmed = window.confirm(`确定删除样本「${sample.name}」吗？默认不会删除 referenceAssets。`);
    if (!confirmed) return;
    const suffix = cleanupAssets ? "?cleanupAssets=1" : "";
    const data = await requestJson(`/api/home-ai/design-samples/${encodeURIComponent(sampleId)}${suffix}`, { method: "DELETE" });
    syncSamplesFromLibrary(data.library?.samples);
    if (state.editingSampleId === sampleId) closeTrainingModal();
    renderAll();
    showToast("样本已删除");
  }

  async function deleteEditingSample() {
    if (!state.editingSampleId) return;
    await deleteSampleById(state.editingSampleId, Boolean(els.editCleanupAssets?.checked));
  }

  async function clearReferences() {
    const confirmed = window.confirm("确定清空所有上传参考稿吗？");
    if (!confirmed) return;
    const data = await requestJson("/api/home-ai/reference-assets", { method: "DELETE" });
    state.references = data.records || [];
    renderAll();
    showToast("参考稿已清空");
  }

  async function clearFeedback() {
    const confirmed = window.confirm("确定清空所有反馈记忆吗？");
    if (!confirmed) return;
    await requestJson("/api/home-ai/feedback", { method: "DELETE" });
    state.feedback = [];
    renderAll();
    showToast("反馈记忆已清空");
  }

  function setPreviewSize(size) {
    state.previewSize = size === "mobile" ? "mobile" : "desktop";
    els.page.dataset.previewSize = state.previewSize;
    els.previewSizeButtons.forEach((button) => {
      const active = button.dataset.previewSize === state.previewSize;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function bindDimensionAndDecisionControls() {
    els.manualScore?.addEventListener("input", () => {
      if (els.manualScoreOutput) els.manualScoreOutput.textContent = els.manualScore.value;
    });
    els.decisionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.decision = button.dataset.reviewDecision || "neutral";
        els.decisionButtons.forEach((item) => item.classList.toggle("active", item === button));
      });
    });
  }

  function syncSampleFiltersFromControls() {
    state.sampleFilters = {
      scenario: els.sampleFilterScenario?.value || "",
      type: els.sampleFilterType?.value || "",
      minScore: els.sampleFilterMinScore?.value || "",
      maxScore: els.sampleFilterMaxScore?.value || "",
      pageIntent: els.sampleFilterIntent?.value || "",
      themePreset: els.sampleFilterTheme?.value || "",
    };
    renderGoldenLibrary();
  }

  function resetSampleFilters() {
    [
      els.sampleFilterScenario,
      els.sampleFilterType,
      els.sampleFilterMinScore,
      els.sampleFilterMaxScore,
      els.sampleFilterIntent,
      els.sampleFilterTheme,
    ].forEach((control) => {
      if (control) control.value = "";
    });
    syncSampleFiltersFromControls();
  }

  function bindGoldenLibraryControls() {
    renderScenarioCheckboxes(els.goldenScenarioTags, []);
    if (els.goldenDimensions) {
      els.goldenDimensions.innerHTML = dimensionInputsHtml({}, "data-golden-dimension");
      bindRangeOutputs(els.goldenDimensions);
    }
    els.goldenHumanScore?.addEventListener("input", () => {
      if (els.goldenHumanScoreOutput) els.goldenHumanScoreOutput.textContent = els.goldenHumanScore.value;
    });
    els.editHumanScore?.addEventListener("input", () => {
      if (els.editHumanScoreOutput) els.editHumanScoreOutput.textContent = els.editHumanScore.value;
    });
    els.goldenFile?.addEventListener("change", () => {
      state.goldenPendingFiles = [...(els.goldenFile.files || [])].slice(0, 3);
      state.goldenPendingFile = state.goldenPendingFiles[0] || null;
      state.goldenAnalysis = null;
      renderGoldenAnalysisSummary(null);
      if (state.goldenPendingFile && els.goldenName && !els.goldenName.value) els.goldenName.value = state.goldenPendingFile.name.replace(/\.[^.]+$/, "");
      setGoldenAnalysisStatus(
        state.goldenPendingFiles.length
          ? `已选择 ${state.goldenPendingFiles.length} 个文件，点击自动提取生成黄金样本内容。`
          : "等待选择文件。会提取界面骨架、结构、间距、留白、功能组件和视觉 token。",
      );
      if ((els.goldenFile.files || []).length > 6) showToast("一次最多分析并保存前 6 个文件");
    });
    [
      els.sampleFilterScenario,
      els.sampleFilterType,
      els.sampleFilterMinScore,
      els.sampleFilterMaxScore,
      els.sampleFilterIntent,
      els.sampleFilterTheme,
    ].forEach((control) => {
      control?.addEventListener("input", syncSampleFiltersFromControls);
      control?.addEventListener("change", syncSampleFiltersFromControls);
    });
    els.goldenLibraryReset?.addEventListener("click", resetSampleFilters);
    els.analyzeGoldenFiles?.addEventListener("click", () => analyzeGoldenFiles().catch((error) => {
      setGoldenAnalysisStatus(error.message);
      showToast(error.message);
    }));
    els.saveVisualGolden?.addEventListener("click", () => saveUploadedVisualGolden().catch((error) => showToast(error.message)));
    els.upgradeReferenceGolden?.addEventListener("click", () => upgradeSelectedReferenceGolden().catch((error) => showToast(error.message)));
    els.saveCurrentGoldenSecondary?.addEventListener("click", () => saveCurrentGoldenSample().catch((error) => showToast(error.message)));
    els.updateSample?.addEventListener("click", () => updateEditingSample().catch((error) => showToast(error.message)));
    els.cancelEditSample?.addEventListener("click", closeTrainingModal);
    els.deleteSample?.addEventListener("click", () => deleteEditingSample().catch((error) => showToast(error.message)));
  }

  els.refresh?.addEventListener("click", () => loadTrainingData().then(() => showToast("训练数据已刷新")).catch((error) => showToast(error.message)));
  els.scoreCurrent?.addEventListener("click", () => scoreCurrentDraft().catch((error) => showToast(error.message)));
  els.saveCurrentGolden?.addEventListener("click", () => openTrainingModal("current"));
  els.openVisualGoldenModal?.addEventListener("click", () => openTrainingModal("visual"));
  els.openCurrentGoldenModal?.addEventListener("click", () => openTrainingModal("current"));
  els.modalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeTrainingModal);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.trainingModal?.hidden) closeTrainingModal();
  });
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.trainingTab));
  });
  els.generateCandidates?.addEventListener("click", () => generateCandidates().catch((error) => {
    if (els.candidateStatus) els.candidateStatus.textContent = error.message;
    showToast(error.message);
  }));
  els.referenceFile?.addEventListener("change", () => {
    state.pendingFiles = [...(els.referenceFile.files || [])];
    if (state.pendingFiles.length) showToast(`已选择 ${state.pendingFiles.length} 个参考稿，点击保存后进入样本库`);
  });
  els.uploadReference?.addEventListener("click", () => uploadReferences().catch((error) => showToast(error.message)));
  els.clearReferences?.addEventListener("click", () => clearReferences().catch((error) => showToast(error.message)));
  els.manualScoreForm?.addEventListener("submit", (event) => saveManualFeedback(event).catch((error) => showToast(error.message)));
  els.clearFeedback?.addEventListener("click", () => clearFeedback().catch((error) => showToast(error.message)));
  els.previewSizeButtons.forEach((button) => {
    button.addEventListener("click", () => setPreviewSize(button.dataset.previewSize));
  });

  bindDimensionAndDecisionControls();
  bindGoldenLibraryControls();
  renderDimensionSliders(null);
  setActiveTab("library");
  setPreviewSize("desktop");

  const initialPrompt = savedPrompt();
  if (initialPrompt && els.candidatePrompt) els.candidatePrompt.value = initialPrompt;
  if (els.candidateRenderMode) els.candidateRenderMode.value = currentRenderMode() === "config" ? "compare" : currentRenderMode();
  loadTrainingData().catch((error) => showToast(error.message));
})();

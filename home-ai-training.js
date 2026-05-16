(function () {
  const home = window.HomePersonalization;
  const PROMPT_KEY = "forexcrm.home.personalization.prompt";
  const MODEL_CONFIG_KEY = "forexcrm.home.ai.model.config";
  const RENDER_MODE_KEY = "forexcrm.home.ai.render.mode";

  const DIMENSIONS = [
    { key: "visualFocus", label: "首屏" },
    { key: "hierarchy", label: "层级" },
    { key: "brand", label: "品牌感" },
    { key: "craft", label: "组件美感" },
    { key: "business", label: "业务清晰" },
    { key: "mobile", label: "移动端" },
  ];

  const els = {
    page: document.querySelector("[data-training-page]"),
    refresh: document.querySelector("[data-training-refresh]"),
    referenceCount: document.querySelector("[data-training-reference-count]"),
    sampleCount: document.querySelector("[data-training-sample-count]"),
    candidateCountStat: document.querySelector("[data-training-candidate-count]"),
    scoreCount: document.querySelector("[data-training-score-count]"),
    feedbackCount: document.querySelector("[data-training-feedback-count]"),
    candidatePrompt: document.querySelector("[data-candidate-prompt]"),
    candidateCount: document.querySelector("[data-candidate-count]"),
    candidateRenderMode: document.querySelector("[data-candidate-render-mode]"),
    generateCandidates: document.querySelector("[data-generate-candidates]"),
    candidateStatus: document.querySelector("[data-candidate-status]"),
    candidateResults: document.querySelector("[data-candidate-results]"),
    scoreCurrent: document.querySelector("[data-score-current]"),
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
    toast: document.querySelector("[data-training-toast]"),
  };

  if (!els.page) return;

  const state = {
    samples: [],
    rankedSamples: [],
    components: [],
    scores: [],
    feedback: [],
    candidates: [],
    references: [],
    pendingFiles: [],
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
              </article>
            `;
          })
          .join("")
      : `<p class="empty-training">还没有参考稿。可以上传截图、HTML 稿或 PDF，给 AI 一个更明确的审美方向。</p>`;
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
      visualFocus: "visualFocus",
      hierarchy: "layoutHierarchy",
      brand: "brandHarmony",
      craft: "componentCraft",
      business: "businessFunction",
      mobile: "responsiveSafety",
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
    state.rankedSamples = samples.rankedSamples || [];
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

  function sampleFromConfig(config, prompt, sourceLabel = "当前草稿") {
    const normalized = home?.normalizeConfig ? home.normalizeConfig(config) : config || {};
    const blocks = (normalized.brickPlan || []).slice(0, 8);
    return {
      id: `training-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
      name: `${normalized.name || sourceLabel} 样本`,
      scenario: prompt || normalized.aiSummary || "从审美评审台沉淀的首页样本。",
      pageIntent: normalized.pageIntent?.primaryIntent || normalized.brickTrace?.intent || "custom",
      visualStyle: `${home?.themeLabel?.(normalized.themePreset || normalized.theme) || normalized.themePreset || "default"} · ${home?.layoutLabel?.(normalized.layoutPreset) || normalized.layoutPreset || ""}`,
      aestheticScore: 88,
      tags: [normalized.themePreset || normalized.theme, normalized.layoutPreset, normalized.heroFocus].filter(Boolean),
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
      goodPatterns: ["来自审美评审台人工挑选，可作为后续生成参考。"],
      avoidPatterns: [],
      promptSeeds: [prompt].filter(Boolean),
    };
  }

  async function saveCandidateSample(candidate) {
    const data = await requestJson("/api/home-ai/design-samples", {
      method: "POST",
      body: JSON.stringify({ sample: sampleFromConfig(candidate.config, savedPrompt(), candidate.label) }),
    });
    state.samples = data.library?.samples || state.samples;
    renderAll();
    showToast("已存为审美样本");
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
        config,
      }),
    });
    state.feedback = data.records || [];
    candidate.manualScore = manualScore;
    if (els.feedbackNote) els.feedbackNote.value = "";
    renderAll();
    showToast("人工评分和反馈已保存，后续生成会参考");
  }

  function readFilePayload(file) {
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

  els.refresh?.addEventListener("click", () => loadTrainingData().then(() => showToast("训练数据已刷新")).catch((error) => showToast(error.message)));
  els.scoreCurrent?.addEventListener("click", () => scoreCurrentDraft().catch((error) => showToast(error.message)));
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
  renderDimensionSliders(null);
  setPreviewSize("desktop");

  const initialPrompt = savedPrompt();
  if (initialPrompt && els.candidatePrompt) els.candidatePrompt.value = initialPrompt;
  if (els.candidateRenderMode) els.candidateRenderMode.value = currentRenderMode() === "config" ? "compare" : currentRenderMode();
  loadTrainingData().catch((error) => showToast(error.message));
})();

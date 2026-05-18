(function () {
  const PROMPT_KEY = "forexcrm.auth.ai.prompt";
  const SELECTED_REFERENCE_KEY = "forexcrm.auth.visual.reference.ids";
  const REFERENCE_INDEX_PATH = "/auth-ai-reference-assets.json";

  const els = {
    page: document.querySelector("[data-auth-visual-page]"),
    refresh: document.querySelector("[data-auth-training-refresh]"),
    referenceCount: document.querySelector("[data-auth-reference-count]"),
    selectedCount: document.querySelector("[data-auth-selected-count]"),
    segmentCount: document.querySelector("[data-auth-segment-count]"),
    promptCount: document.querySelector("[data-auth-prompt-count]"),
    file: document.querySelector("[data-auth-reference-file]"),
    flow: document.querySelector("[data-auth-reference-flow]"),
    tags: document.querySelector("[data-auth-reference-tags]"),
    style: document.querySelector("[data-auth-reference-style]"),
    note: document.querySelector("[data-auth-reference-note]"),
    upload: document.querySelector("[data-auth-upload-reference]"),
    clear: document.querySelector("[data-auth-clear-references]"),
    status: document.querySelector("[data-auth-training-status]"),
    referenceList: document.querySelector("[data-auth-reference-list]"),
    selectLatest: document.querySelector("[data-auth-select-latest]"),
    prompt: document.querySelector("[data-auth-reference-prompt]"),
    copyPrompt: document.querySelector("[data-auth-copy-prompt]"),
    applyPrompt: document.querySelector("[data-auth-apply-prompt]"),
    contextList: document.querySelector("[data-auth-context-list]"),
    toast: document.querySelector("[data-auth-training-toast]"),
  };

  if (!els.page) return;

  const state = {
    records: [],
    pendingFiles: [],
    selectedIds: readSelectedIds(),
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
    if (els.status) els.status.textContent = message || "";
    if (!els.toast) return;
    els.toast.textContent = message || "";
    els.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 2200);
  }

  function localApiEndpointCandidates(url) {
    const value = String(url || "");
    if (/^https?:\/\//i.test(value)) return [value];
    const path = value.startsWith("/") ? value : `/${value}`;
    const candidates = [];
    if (/^https?:\/\//i.test(window.location.origin)) candidates.push(`${window.location.origin}${path}`);
    const currentHost = window.location.hostname || "127.0.0.1";
    [...new Set([currentHost, "127.0.0.1", "localhost"])].forEach((host) => {
      ["5174", "5184", "5194"].forEach((port) => candidates.push(`http://${host}:${port}${path}`));
    });
    return [...new Set(candidates)];
  }

  async function requestJson(url, options = {}) {
    const endpoints = localApiEndpointCandidates(url);
    let lastMessage = "";
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { "content-type": "application/json", accept: "application/json", ...(options.headers || {}) },
          ...options,
        });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.ok !== false) return data || {};
        lastMessage = data?.error || `${response.status} ${response.statusText}`;
        if (![404, 405, 501].includes(response.status)) break;
      } catch (error) {
        lastMessage = String(error?.message || error || "Failed to fetch");
      }
    }
    const needsRestart = /405|404|Method Not Allowed|Not Found/i.test(lastMessage);
    throw new Error(needsRestart
      ? "上传接口不可用：当前页面连接到旧后端进程，请重启 npm start 或切换到最新本地端口后重试。"
      : `${lastMessage || "Failed to fetch"} · 已尝试 ${endpoints.join(" -> ")}`);
  }

  async function loadReferenceIndexFallback() {
    const endpoints = localApiEndpointCandidates(REFERENCE_INDEX_PATH);
    let lastMessage = "";
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers: { accept: "application/json" } });
        const data = await response.json().catch(() => null);
        if (response.ok && Array.isArray(data?.records)) return data.records;
        lastMessage = `${response.status} ${response.statusText}`;
      } catch (error) {
        lastMessage = String(error?.message || error || "Failed to fetch");
      }
    }
    throw new Error(`${lastMessage || "本地视觉素材索引读取失败"} · 已尝试 ${endpoints.join(" -> ")}`);
  }

  function readSelectedIds() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SELECTED_REFERENCE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : [];
    } catch (error) {
      return [];
    }
  }

  function saveSelectedIds() {
    const available = new Set(state.records.map((record) => record.id));
    state.selectedIds = state.selectedIds.filter((id) => available.has(id)).slice(0, 6);
    window.localStorage.setItem(SELECTED_REFERENCE_KEY, JSON.stringify(state.selectedIds));
  }

  function selectedSegments() {
    return [...document.querySelectorAll(".auth-segment-field input:checked")]
      .map((input) => input.value)
      .filter(Boolean)
      .slice(0, 12);
  }

  function splitTags(value) {
    return String(value || "")
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 14);
  }

  function chipRow(values, className = "reference-tags") {
    const items = (Array.isArray(values) ? values : []).filter(Boolean).slice(0, 10);
    if (!items.length) return "";
    return `<div class="${className}">${items.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>`;
  }

  function selectedRecords() {
    const selected = state.selectedIds
      .map((id) => state.records.find((record) => record.id === id))
      .filter(Boolean);
    return selected.length ? selected : state.records.slice(0, 3);
  }

  function buildPromptSeed(asset) {
    const lines = [
      `借鉴「${asset.name || "认证视觉素材"}」的抽象设计语言，不要复制原图。`,
      `适用流程：${asset.flow || "三流程"}。`,
    ];
    if (asset.tags?.length) lines.push(`视觉标签：${asset.tags.join("、")}。`);
    if (asset.segments?.length) lines.push(`界面分格：${asset.segments.join("、")}。`);
    if (asset.visualStructure?.summary) {
      lines.push(`自动结构识别：${asset.visualStructure.summary}`);
      lines.push(`布局字段：${asset.visualStructure.layoutType || "split"} / 表单 ${asset.visualStructure.formPosition || "right"} / 视觉 ${asset.visualStructure.mediaPosition || "left"}。`);
    }
    if (asset.styleBrief) lines.push(`风格提炼：${asset.styleBrief}`);
    if (asset.note) lines.push(`喜欢点：${asset.note}`);
    return lines.join("\n");
  }

  function visualStructureSummary(record) {
    const structure = record?.visualStructure || {};
    if (!structure.summary) return "";
    return [
      structure.summary,
      `布局 ${structure.layoutType || "split"} · 表单 ${structure.formPosition || "right"} · 视觉 ${structure.mediaPosition || "left"}`,
    ].join(" / ");
  }

  function buildReusablePrompt() {
    const records = selectedRecords();
    if (!records.length) {
      return "请先上传或选择登录/注册/找回密码视觉素材。";
    }

    return [
      "登录模块视觉借鉴约束：",
      "只借鉴视觉素材的抽象设计语言、界面分格、Logo 摆放、信息层级、色彩气质、输入框/按钮密度和移动端节奏；不要复刻原图、品牌资产、插画、图标或具体像素排版。",
      "",
      ...records.map((record, index) => [
        `素材 ${index + 1}：${record.name}`,
        `适用流程：${record.flow || "三流程"}`,
        record.segments?.length ? `界面分格：${record.segments.join("、")}` : "",
        record.tags?.length ? `视觉标签：${record.tags.join("、")}` : "",
        record.styleBrief ? `风格提炼：${record.styleBrief}` : "",
        record.note ? `喜欢点：${record.note}` : "",
      ].filter(Boolean).join("\n")),
      "",
      "生成要求：",
      "登录、注册、找回密码三条流程都要完整；移动端适配和美观是必选项；平台 Logo 摆放必须有明确方案；注册流程需要真实字段组织，找回密码要体现安全可信；最终界面要重新组合为 ForexCRM 认证模块，不要像通用模板。",
    ].join("\n");
  }

  function renderStats() {
    const selected = state.selectedIds.filter((id) => state.records.some((record) => record.id === id));
    const segmentSet = new Set(state.records.flatMap((record) => record.segments || []));
    if (els.referenceCount) els.referenceCount.textContent = state.records.length;
    if (els.selectedCount) els.selectedCount.textContent = selected.length;
    if (els.segmentCount) els.segmentCount.textContent = segmentSet.size;
    if (els.promptCount) els.promptCount.textContent = state.records.filter((record) => record.promptSeed || record.note || record.styleBrief).length;
  }

  function renderReferences() {
    if (!els.referenceList) return;
    els.referenceList.innerHTML = state.records.length
      ? state.records
          .map((record) => {
            const selected = state.selectedIds.includes(record.id);
            const thumb = record.type === "image"
              ? `<img src="${escapeHtml(record.url)}" alt="${escapeHtml(record.name)}" />`
              : record.type === "html"
                ? `<iframe src="${escapeHtml(record.url)}" title="${escapeHtml(record.name)}"></iframe>`
                : `<span>${escapeHtml(record.type || "视觉素材")}</span>`;
            return `
              <article class="reference-card auth-reference-card${selected ? " is-selected" : ""}">
                <div class="reference-thumb">${thumb}</div>
                <span>${escapeHtml(record.flow || "三流程")} · ${escapeHtml(new Date(record.at || Date.now()).toLocaleDateString("zh-CN"))}</span>
                <h3>${escapeHtml(record.name)}</h3>
                <p>${escapeHtml(visualStructureSummary(record) || record.styleBrief || record.note || "已保存为认证模块视觉素材。")}</p>
                ${chipRow([...(record.tags || []), ...(record.segments || [])])}
                <div class="auth-reference-toolbar">
                  <button type="button" data-auth-toggle-reference="${escapeHtml(record.id)}">${selected ? "已选为借鉴" : "设为本次借鉴"}</button>
                </div>
              </article>
            `;
          })
          .join("")
      : `<p class="empty-training">还没有认证视觉素材。上传你喜欢的登录页、注册页或找回密码界面后，它们会在这里变成可复用的风格约束。</p>`;

    els.referenceList.querySelectorAll("[data-auth-toggle-reference]").forEach((button) => {
      button.addEventListener("click", () => toggleSelectedReference(button.dataset.authToggleReference));
    });
  }

  function renderPrompt() {
    if (els.prompt) els.prompt.value = buildReusablePrompt();
  }

  function renderContext() {
    if (!els.contextList) return;
    const records = selectedRecords();
    els.contextList.innerHTML = records.length
      ? records
          .map((record) => `
            <article class="context-card">
              <span>${escapeHtml(record.flow || "三流程")}</span>
              <h3>${escapeHtml(record.name)}</h3>
              <p>${escapeHtml(record.promptSeed || buildPromptSeed(record))}</p>
              ${record.visualStructure?.summary ? `<p class="auth-structure-summary">${escapeHtml(visualStructureSummary(record))}</p>` : ""}
              ${chipRow(record.segments || [], "context-tags")}
            </article>
          `)
          .join("")
      : `<p class="empty-training">AI 会读取你选择的素材名称、标签、分格、风格提炼和喜欢点，并把它们转成生成约束。</p>`;
  }

  function renderAll() {
    saveSelectedIds();
    renderStats();
    renderReferences();
    renderPrompt();
    renderContext();
  }

  async function loadReferences() {
    try {
      const data = await requestJson("/api/auth-ai/reference-assets");
      state.records = data.records || [];
    } catch (error) {
      const fallbackRecords = await loadReferenceIndexFallback();
      state.records = fallbackRecords;
      showToast("已从本地索引恢复视觉素材；保存/清空需重启后端。");
    }
    renderAll();
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
    const sourceFiles = state.pendingFiles.length ? state.pendingFiles : [...(els.file?.files || [])];
    const files = sourceFiles.slice(0, 3);
    if (!files.length) {
      showToast("请先选择认证视觉素材");
      return;
    }
    if (sourceFiles.length > 3) {
      showToast("一次最多上传 3 张，已自动取前 3 张。");
    }

    const flow = els.flow?.value || "三流程";
    const tags = splitTags(els.tags?.value || "");
    const segments = selectedSegments();
    const styleBrief = String(els.style?.value || "").trim();
    const note = String(els.note?.value || "").trim();

    if (els.upload) els.upload.disabled = true;
    showToast(`正在保存 ${files.length} 个认证视觉素材...`);
    try {
      const payloads = await Promise.all(files.map(readFilePayload));
      const assets = payloads.map((filePayload) => {
        const asset = {
          ...filePayload,
          flow,
          tags,
          segments,
          styleBrief,
          note,
        };
        asset.promptSeed = buildPromptSeed(asset);
        return asset;
      });
      const latest = await requestJson("/api/auth-ai/reference-assets", {
        method: "POST",
        body: JSON.stringify({ assets }),
      });
      state.records = latest.records || [];
      state.selectedIds = state.records.slice(0, Math.min(3, state.records.length)).map((record) => record.id);
      state.pendingFiles = [];
      if (els.file) els.file.value = "";
      if (els.tags) els.tags.value = "";
      if (els.style) els.style.value = "";
      if (els.note) els.note.value = "";
      renderAll();
      showToast(`已保存 ${payloads.length} 个认证视觉素材`);
    } finally {
      if (els.upload) els.upload.disabled = false;
    }
  }

  async function clearReferences() {
    const confirmed = window.confirm("确定清空所有认证视觉素材吗？");
    if (!confirmed) return;
    const data = await requestJson("/api/auth-ai/reference-assets", { method: "DELETE" });
    state.records = data.records || [];
    state.selectedIds = [];
    renderAll();
    showToast("认证视觉素材已清空");
  }

  function toggleSelectedReference(id) {
    if (!id) return;
    if (state.selectedIds.includes(id)) {
      state.selectedIds = state.selectedIds.filter((item) => item !== id);
    } else {
      state.selectedIds = [id, ...state.selectedIds].slice(0, 6);
    }
    renderAll();
  }

  function selectLatest() {
    state.selectedIds = state.records.slice(0, Math.min(3, state.records.length)).map((record) => record.id);
    renderAll();
    showToast("已选择最新视觉素材");
  }

  async function copyPrompt() {
    const value = els.prompt?.value || "";
    if (!value.trim()) return;
    await navigator.clipboard?.writeText(value);
    showToast("提示词已复制");
  }

  function applyPromptToGenerator() {
    const visualPrompt = els.prompt?.value || buildReusablePrompt();
    const current = window.localStorage.getItem(PROMPT_KEY) || "帮我生成一套适合外汇平台开户的登录注册模块：中文，移动端优先且必须美观，布局方案为左右布局，桌面端左侧品牌平台开户说明、右侧登录表单，移动端折叠为单列但保留 Logo、主入口和主按钮优先级。平台 Logo 摆放要有明确方案。登录首屏只保留账号（手机号/邮箱）和密码，可提供 Google / Apple 快捷登录；如账号开启双重验证，下一步输入 6 位验证码。注册和找回密码在提交、发送验证码等关键步骤触发人机校验，KYC 与风险确认放到注册后的开户流程说明里，整体可信但不要像通用模板。";
    const nextPrompt = `${current.trim()}\n\n${visualPrompt.trim()}`;
    window.localStorage.setItem(PROMPT_KEY, nextPrompt);
    saveSelectedIds();
    showToast("已写入登录注册生成器");
    window.setTimeout(() => {
      window.location.href = "./auth-layout-admin.html";
    }, 280);
  }

  els.refresh?.addEventListener("click", () => loadReferences().then(() => showToast("认证视觉素材已刷新")).catch((error) => showToast(error.message)));
  els.file?.addEventListener("change", () => {
    const selected = [...(els.file.files || [])];
    state.pendingFiles = selected.slice(0, 3);
    if (selected.length > 3) showToast("一次最多上传 3 张，保存时会取前 3 张");
    else if (state.pendingFiles.length) showToast(`已选择 ${state.pendingFiles.length} 个视觉素材，点击保存后一起进入视觉库`);
  });
  els.upload?.addEventListener("click", () => uploadReferences().catch((error) => showToast(error.message)));
  els.clear?.addEventListener("click", () => clearReferences().catch((error) => showToast(error.message)));
  els.selectLatest?.addEventListener("click", selectLatest);
  els.copyPrompt?.addEventListener("click", () => copyPrompt().catch((error) => showToast(error.message)));
  els.applyPrompt?.addEventListener("click", applyPromptToGenerator);

  loadReferences().catch((error) => showToast(error.message));
})();

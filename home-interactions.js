/*
 * ForexCRM 首页组件 · 声明式交互运行时（第一方、零依赖、安全）
 * -------------------------------------------------------------------------
 * 模型生成的组件只输出 HTML/CSS + 声明式 data-home-* 标记（禁止内联 JS）。
 * 本运行时用一个全局事件委托统一实现"组件内 UI 状态交互"，所有组件复用。
 * 与 data-home-action（跳转类动作）平行：这里只管组件内部的 显隐/切换/折叠/区间/打码。
 *
 * 支持的交互原语：
 *   1) 筛选  segmented filter
 *        组:  [data-home-filter="groupKey"]
 *        tab: [data-home-filter-value="all|live|demo|..."]（在组内）
 *        项:  [data-home-filter-item] + [data-home-filter-kind="live demo ..."]
 *   2) 标签页 tabs
 *        tab: [data-home-tab="panelId"]
 *        面板:[data-home-tabpanel="panelId"]
 *   3) 折叠  collapsible（FAQ 等）
 *        触发:[data-home-toggle]（可选 [data-home-toggle-default-open]）
 *        内容:同一 [data-home-toggle-item] 内的 [data-home-toggle-body]，或触发的下一个兄弟
 *   4) 区间  range（7D/30D 等）
 *        组:  [data-home-range-group]
 *        tab: [data-home-range="7d|30d|..."]
 *        视图(可选):[data-home-range-view="7d"]；同时派发 CustomEvent("home:range")
 *   5) 打码  mask（隐藏余额）
 *        触发:[data-home-mask-toggle]；目标:[data-home-mask]
 *
 * 作用域：一个交互默认作用于触发元素最近的组件根 [data-brick-root]（找不到则 body）。
 * 动态注入的组件无需重新绑定（全局委托）；如需初始化默认态，调用 HomeInteractions.bind(root)。
 */
(function (global) {
  "use strict";
  var doc = global.document;
  if (!doc) return;

  function closest(el, sel) {
    return el && el.closest ? el.closest(sel) : null;
  }
  function scopeOf(el) {
    return closest(el, "[data-brick-root]") || closest(el, "[data-home-interaction-scope]") || (el.ownerDocument || doc).body;
  }
  function all(root, sel) {
    return Array.prototype.slice.call((root || doc).querySelectorAll(sel));
  }

  /* ---------------- 1) 筛选 ---------------- */
  function applyFilter(group) {
    var value = group.__homeFilterValue || "all";
    var scope = scopeOf(group);
    all(scope, "[data-home-filter-item]").forEach(function (item) {
      var kinds = (item.getAttribute("data-home-filter-kind") || "").toLowerCase().split(/\s+/).filter(Boolean);
      var show = value === "all" || kinds.indexOf(value) >= 0;
      item.hidden = !show;
      item.style.display = show ? "" : "none";
    });
  }
  function onFilterClick(tab) {
    var group = closest(tab, "[data-home-filter]");
    if (!group) return;
    group.__homeFilterValue = (tab.getAttribute("data-home-filter-value") || "all").toLowerCase();
    all(group, "[data-home-filter-value]").forEach(function (t) {
      var active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    applyFilter(group);
  }

  /* ---------------- 2) 标签页 ---------------- */
  function onTabClick(tab) {
    var panelId = tab.getAttribute("data-home-tab");
    if (!panelId) return;
    var scope = scopeOf(tab);
    all(scope, "[data-home-tab]").forEach(function (t) {
      var active = t.getAttribute("data-home-tab") === panelId;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    all(scope, "[data-home-tabpanel]").forEach(function (panel) {
      var active = panel.getAttribute("data-home-tabpanel") === panelId;
      panel.hidden = !active;
      panel.style.display = active ? "" : "none";
    });
  }

  /* ---------------- 3) 折叠 ---------------- */
  function toggleBodyFor(trigger) {
    var item = closest(trigger, "[data-home-toggle-item]");
    if (item) return item.querySelector("[data-home-toggle-body]") || null;
    var body = trigger.nextElementSibling;
    return body && body.hasAttribute("data-home-toggle-body") ? body : body;
  }
  function setToggle(trigger, open) {
    var body = toggleBodyFor(trigger);
    var item = closest(trigger, "[data-home-toggle-item]") || trigger;
    item.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (body) {
      body.hidden = !open;
      body.style.display = open ? "" : "none";
    }
  }
  function onToggleClick(trigger) {
    var isOpen = trigger.getAttribute("aria-expanded") === "true";
    setToggle(trigger, !isOpen);
  }

  /* ---------------- 4) 区间 ---------------- */
  function onRangeClick(tab) {
    var group = closest(tab, "[data-home-range-group]") || scopeOf(tab);
    var value = (tab.getAttribute("data-home-range") || "").toLowerCase();
    all(group, "[data-home-range]").forEach(function (t) {
      var active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    all(group, "[data-home-range-view]").forEach(function (view) {
      var active = view.getAttribute("data-home-range-view").toLowerCase() === value;
      view.hidden = !active;
      view.style.display = active ? "" : "none";
    });
    group.dispatchEvent(new CustomEvent("home:range", { bubbles: true, detail: { range: value } }));
  }

  /* ---------------- 5) 打码 ---------------- */
  function onMaskToggle(trigger) {
    var scope = scopeOf(trigger);
    var masked = trigger.getAttribute("aria-pressed") === "true";
    trigger.setAttribute("aria-pressed", masked ? "false" : "true");
    all(scope, "[data-home-mask]").forEach(function (node) {
      if (!masked) {
        if (node.dataset.homeMaskOriginal == null) node.dataset.homeMaskOriginal = node.textContent;
        node.textContent = "••••••";
      } else if (node.dataset.homeMaskOriginal != null) {
        node.textContent = node.dataset.homeMaskOriginal;
      }
    });
  }

  /* ---------------- 全局事件委托 ---------------- */
  doc.addEventListener(
    "click",
    function (event) {
      var t = event.target;
      // data-home-action（跳转类）交给业务动作处理器，本运行时不接管
      if (closest(t, "[data-home-action]")) return;
      var el;
      if ((el = closest(t, "[data-home-filter-value]"))) { event.preventDefault(); onFilterClick(el); return; }
      if ((el = closest(t, "[data-home-range]"))) { event.preventDefault(); onRangeClick(el); return; }
      if ((el = closest(t, "[data-home-tab]"))) { event.preventDefault(); onTabClick(el); return; }
      if ((el = closest(t, "[data-home-mask-toggle]"))) { event.preventDefault(); onMaskToggle(el); return; }
      if ((el = closest(t, "[data-home-toggle]"))) { event.preventDefault(); onToggleClick(el); return; }
    },
    true,
  );

  /* ---------------- 自动接线：为"没带 data-home-* 标记"的存量/兜底组件自动识别常见交互 ----------------
   * 客户端启发式、非破坏性：只在能高置信度识别出"分段筛选控件 + 可分类的行"时才补标记；
   * 认不准就跳过（不影响展示）。目前覆盖最常见的"账号 全部/真实/模拟(或 Live/Demo) 筛选"。 */
  var AUTO_FILTER_VALUES = [
    { v: "all", re: /^(全部|全部账[号户]|all)$/i },
    { v: "live", re: /^(真实账?[号户]?|真实|live)$/i },
    { v: "demo", re: /^(模拟账?[号户]?|模拟|demo)$/i },
  ];
  function autoFilterValue(text) {
    var t = String(text || "").replace(/\s+/g, "").trim();
    if (!t || t.length > 8) return "";
    for (var i = 0; i < AUTO_FILTER_VALUES.length; i++) if (AUTO_FILTER_VALUES[i].re.test(t)) return AUTO_FILTER_VALUES[i].v;
    return "";
  }
  function rowKind(el) {
    var text = (el.textContent || "").toLowerCase();
    var live = /live|真实/.test(text);
    var demo = /demo|模拟/.test(text);
    if (live && !demo) return "live";
    if (demo && !live) return "demo";
    return "";
  }
  function autoWire(root) {
    all(root, "[data-brick-root]").concat([root]).forEach(function (scope) {
      if (!scope || scope.querySelector == null) return;
      if (scope.querySelector("[data-home-filter]")) return; // 已有显式筛选标记，尊重之
      // 1) 找分段控件：某个父元素下有 >=2 个短文本子项命中筛选词，且至少含一个 all + 一个 live/demo
      var candidates = {};
      all(scope, "*").forEach(function (el) {
        if (el.children && el.children.length) return; // 只看叶子文本项
        var v = autoFilterValue(el.textContent);
        if (!v) return;
        var parent = el.parentElement;
        if (!parent) return;
        var key = parent.__homeAutoKey || (parent.__homeAutoKey = "g" + Math.round(parent.getBoundingClientRect().top) + "-" + parent.children.length);
        (candidates[key] = candidates[key] || { parent: parent, tabs: [] }).tabs.push({ el: el, v: v });
      });
      var group = null;
      Object.keys(candidates).forEach(function (k) {
        var c = candidates[k];
        var vals = c.tabs.map(function (t) { return t.v; });
        if (!group && vals.indexOf("all") >= 0 && (vals.indexOf("live") >= 0 || vals.indexOf("demo") >= 0) && c.tabs.length >= 2) group = c;
      });
      if (!group) return;
      // 2) 找可分类的行：排除 tab 组后，找"重复兄弟里可分类"的元素，再只保留最外层（避免误标行内单元格）
      var raw = [];
      all(scope, "*").forEach(function (el) {
        if (group.parent.contains(el) || el.contains(group.parent)) return; // 排除 tab 组及其祖先
        if (!rowKind(el)) return;
        var parent = el.parentElement;
        if (!parent) return;
        var kSibs = Array.prototype.filter.call(parent.children, function (c) { return rowKind(c); });
        if (kSibs.length >= 2) raw.push(el); // 该元素与其兄弟中至少两个可分类 → 疑似"行"层
      });
      var rows = raw
        .filter(function (el) { return !raw.some(function (o) { return o !== el && o.contains(el); }); }) // 只保留最外层
        .map(function (el) { return { el: el, kind: rowKind(el) }; });
      if (rows.length < 2) return;
      // 3) 打标记 → 交给既有筛选机制
      group.parent.setAttribute("data-home-filter", "accountKind");
      group.tabs.forEach(function (t) { if (!t.el.hasAttribute("data-home-filter-value")) t.el.setAttribute("data-home-filter-value", t.v); });
      rows.forEach(function (r) {
        r.el.setAttribute("data-home-filter-item", "");
        if (!r.el.getAttribute("data-home-filter-kind")) r.el.setAttribute("data-home-filter-kind", r.kind);
      });
    });
  }

  /* ---------------- 初始化默认态 ---------------- */
  function bind(root) {
    root = root || doc;
    injectBaseStyles();
    autoWire(root);
    all(root, "[data-home-filter]").forEach(function (group) {
      if (group.__homeFilterBound) return;
      group.__homeFilterBound = true;
      var first = group.querySelector('[data-home-filter-value="all"]') || group.querySelector("[data-home-filter-value]");
      if (first) onFilterClick(first);
    });
    all(root, "[data-home-tabpanel]").length &&
      all(root, "[data-home-tab]").forEach(function (tab, i) {
        if (i === 0 && !all(scopeOf(tab), "[data-home-tab].is-active").length) onTabClick(tab);
      });
    all(root, "[data-home-toggle]").forEach(function (trigger) {
      if (trigger.__homeToggleBound) return;
      trigger.__homeToggleBound = true;
      setToggle(trigger, trigger.hasAttribute("data-home-toggle-default-open"));
    });
    all(root, "[data-home-range-group]").forEach(function (group) {
      if (group.__homeRangeBound) return;
      group.__homeRangeBound = true;
      var first = group.querySelector("[data-home-range]");
      if (first) onRangeClick(first);
    });
  }

  /* ---------------- 基线交互状态样式（随运行时注入一次，保证激活态/折叠/显隐视觉正确） ----------------
   * 只针对交互状态做最小化补充，不重排组件自身布局：
   * - 激活态统一用 [aria-selected="true"] / .is-active 驱动（组件 CSS 可覆盖）；
   * - 折叠箭头、指针光标、hidden 强制隐藏。 */
  var BASE_STYLE_ID = "home-interactions-base-style";
  var BASE_STYLE = [
    '[data-home-filter-value],[data-home-range],[data-home-tab],[data-home-toggle],[data-home-mask-toggle]{cursor:pointer;user-select:none}',
    '[data-home-filter-value],[data-home-range]{transition:background-color .15s ease,color .15s ease}',
    '[data-home-filter-value][aria-selected="true"],[data-home-filter-value].is-active,[data-home-range][aria-selected="true"],[data-home-range].is-active{background:var(--home-primary-soft,#dbe7ff);color:var(--home-primary-strong,#1d4ed8);border-radius:var(--home-radius-sm,8px);font-weight:900}',
    '[data-home-tab]{transition:color .15s ease,border-color .15s ease}',
    '[data-home-tab][aria-selected="true"],[data-home-tab].is-active{color:var(--home-primary-strong,#1d4ed8);font-weight:900}',
    '[data-home-toggle]{display:flex;align-items:center;gap:8px}',
    '[data-home-toggle]::after{content:"";margin-left:auto;width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .18s ease;opacity:.55}',
    '[data-home-toggle-item].is-open [data-home-toggle]::after,[data-home-toggle][aria-expanded="true"]::after{transform:rotate(-135deg)}',
    '[data-home-toggle-body]{transition:none}',
    '[hidden]{display:none !important}',
  ].join("");
  function injectBaseStyles() {
    if (doc.getElementById(BASE_STYLE_ID)) return;
    var style = doc.createElement("style");
    style.id = BASE_STYLE_ID;
    style.textContent = BASE_STYLE;
    (doc.head || doc.documentElement).appendChild(style);
  }

  var HomeInteractions = { bind: bind, version: "1.0.0" };
  global.HomeInteractions = HomeInteractions;

  // 动态注入的组件（首页渲染/骨架填充后才插入 DOM）也要自动接线：观察 DOM 变化、去抖后重新 bind。
  var rebindTimer = null;
  function scheduleRebind() {
    if (rebindTimer) return;
    rebindTimer = global.setTimeout(function () {
      rebindTimer = null;
      try { bind(doc); } catch (e) {}
    }, 120);
  }
  function startObserver() {
    if (!global.MutationObserver || doc.__homeInteractionsObserving) return;
    doc.__homeInteractionsObserving = true;
    var mo = new global.MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length) { scheduleRebind(); return; }
      }
    });
    mo.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { bind(doc); startObserver(); });
  } else {
    bind(doc);
    startObserver();
  }
})(typeof window !== "undefined" ? window : this);

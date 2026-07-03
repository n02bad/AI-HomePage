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

  /* ---------------- 初始化默认态 ---------------- */
  function bind(root) {
    root = root || doc;
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

  var HomeInteractions = { bind: bind, version: "1.0.0" };
  global.HomeInteractions = HomeInteractions;

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { bind(doc); });
  } else {
    bind(doc);
  }
})(typeof window !== "undefined" ? window : this);

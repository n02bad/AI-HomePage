(function () {
  const STORAGE_KEY = "nxbroker.activePortal";
  const TABS_STORAGE_KEY = "nxbroker.openTabs";
  const MAX_OPEN_TABS = 10;

  const icons = {
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />',
    chevronDown: '<path d="m7 10 5 5 5-5" />',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" />',
    globe: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9c-2-2.4-3-5.4-3-9s1-6.6 3-9z" />',
    moon: '<path d="M20 15.3A8 8 0 1 1 8.7 4 6.2 6.2 0 0 0 20 15.3z" />',
    activity: '<path d="M3 12h4l2-7 4 14 2-7h6" />',
    search: '<path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="7" />',
    settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /><path d="M4 12h2" /><path d="M18 12h2" /><path d="m6.3 6.3 1.4 1.4" /><path d="m16.3 16.3 1.4 1.4" /><path d="M12 4v2" /><path d="M12 18v2" /><path d="m17.7 6.3-1.4 1.4" /><path d="m7.7 16.3-1.4 1.4" />',
    sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  };

  const portal = {
    key: "client",
    label: "用户端",
    subtitle: "Client Portal",
    badge: "CLIENT",
    color: "#059669",
  };

  const navigation = [
    {
      title: "CLIENT",
      items: [
        navItem("client-home", "Account Overview", "./client-home.html", "grid"),
        navItem("home-layout-admin", "首页个性化", "./home-layout-admin.html", "settings"),
        navItem("auth-layout-admin", "登录注册生成", "./auth-layout-admin.html", "settings"),
        navItem("auth-visual-training", "登录视觉训练", "./auth-visual-training.html", "activity"),
        navItem("ai-model-settings", "大模型配置", "./ai-model-settings.html", "settings"),
        navItem("home-model-calls", "调用记录", "./home-model-calls.html", "activity"),
        navItem("home-ai-training", "审美训练", "./home-ai-training.html", "activity"),
        navItem("home-module-preview", "积木组件库", "./home-module-preview.html", "grid"),
      ],
    },
  ];

  const pageConfigs = {
    "client-home": {
      activeNav: "client-home",
      tabLabel: "Account Overview",
      search: "搜索首页模块、交易账号、邀请链接...",
      tabs: [{ label: "Account Overview", href: "./client-home.html", active: true }],
    },
    "home-layout-admin": {
      activeNav: "home-layout-admin",
      tabLabel: "首页个性化",
      search: "搜索首页模块、布局方案、AI 生成记录...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html", active: true },
        { label: "登录注册生成", href: "./auth-layout-admin.html" },
        { label: "登录视觉训练", href: "./auth-visual-training.html" },
        { label: "大模型配置", href: "./ai-model-settings.html" },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "审美训练", href: "./home-ai-training.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "auth-layout-admin": {
      activeNav: "auth-layout-admin",
      tabLabel: "登录注册生成",
      search: "搜索登录注册界面、认证流程、找回密码方案...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "登录注册生成", href: "./auth-layout-admin.html", active: true },
        { label: "登录视觉训练", href: "./auth-visual-training.html" },
        { label: "大模型配置", href: "./ai-model-settings.html" },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "审美训练", href: "./home-ai-training.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "auth-visual-training": {
      activeNav: "auth-visual-training",
      tabLabel: "登录视觉训练",
      search: "搜索登录参考稿、界面分格、风格提示词...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "登录注册生成", href: "./auth-layout-admin.html" },
        { label: "登录视觉训练", href: "./auth-visual-training.html", active: true },
        { label: "大模型配置", href: "./ai-model-settings.html" },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "审美训练", href: "./home-ai-training.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "home-layout-preview": {
      activeNav: "home-layout-admin",
      tabLabel: "首页预览",
      search: "搜索首页模块、布局方案、AI 生成记录...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html", active: true },
        { label: "登录注册生成", href: "./auth-layout-admin.html" },
        { label: "登录视觉训练", href: "./auth-visual-training.html" },
        { label: "大模型配置", href: "./ai-model-settings.html" },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "审美训练", href: "./home-ai-training.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "home-model-calls": {
      activeNav: "home-model-calls",
      tabLabel: "调用记录",
      search: "搜索模型、状态、调用摘要...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "登录注册生成", href: "./auth-layout-admin.html" },
        { label: "登录视觉训练", href: "./auth-visual-training.html" },
        { label: "大模型配置", href: "./ai-model-settings.html" },
        { label: "调用记录", href: "./home-model-calls.html", active: true },
        { label: "审美训练", href: "./home-ai-training.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "ai-model-settings": {
      activeNav: "ai-model-settings",
      tabLabel: "大模型配置",
      search: "搜索模型厂商、Key 状态、调用参数...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "登录注册生成", href: "./auth-layout-admin.html" },
        { label: "登录视觉训练", href: "./auth-visual-training.html" },
        { label: "大模型配置", href: "./ai-model-settings.html", active: true },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "审美训练", href: "./home-ai-training.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "home-ai-training": {
      activeNav: "home-ai-training",
      tabLabel: "审美训练",
      search: "搜索样本、审美评分、反馈记忆、漂亮积木...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "登录注册生成", href: "./auth-layout-admin.html" },
        { label: "登录视觉训练", href: "./auth-visual-training.html" },
        { label: "大模型配置", href: "./ai-model-settings.html" },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "审美训练", href: "./home-ai-training.html", active: true },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "home-module-preview": {
      activeNav: "home-module-preview",
      tabLabel: "积木组件库",
      search: "搜索首页积木、模块尺寸、组件样式...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "登录注册生成", href: "./auth-layout-admin.html" },
        { label: "登录视觉训练", href: "./auth-visual-training.html" },
        { label: "大模型配置", href: "./ai-model-settings.html" },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "审美训练", href: "./home-ai-training.html" },
        { label: "积木组件库", href: "./home-module-preview.html", active: true },
      ],
    },
  };

  function navItem(id, label, href, iconName) {
    return { id, label, href, icon: iconName };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function svg(iconName, className = "") {
    return `<svg${className ? ` class="${className}"` : ""} viewBox="0 0 24 24" aria-hidden="true">${icons[iconName] || icons.grid}</svg>`;
  }

  function pageKeyFromPath() {
    const file = window.location.pathname.split("/").pop() || "index.html";
    return file.replace(/\.html$/i, "") || "client-home";
  }

  function pageKeyFromHref(href) {
    if (!href || href === "#") return "";
    try {
      const url = new URL(href, window.location.href);
      const file = url.pathname.split("/").pop() || "index.html";
      return file.replace(/\.html$/i, "") || "client-home";
    } catch (error) {
      return "";
    }
  }

  function findNavigationItem(pageKey) {
    for (const section of navigation) {
      const item = section.items.find((entry) => entry.id === pageKey || pageKeyFromHref(entry.href) === pageKey);
      if (item) return item;
    }
    return null;
  }

  function hrefForPageKey(pageKey) {
    const nav = findNavigationItem(pageKey);
    if (nav?.href) return nav.href;
    return `./${pageKey || "client-home"}.html`;
  }

  function labelForPageKey(pageKey, fallback = "") {
    const config = pageConfigs[pageKey];
    const nav = findNavigationItem(pageKey);
    return config?.tabLabel || nav?.label || fallback || pageKey || "页面";
  }

  function normalizeTab(tab, activePageKey) {
    const key = tab?.key || pageKeyFromHref(tab?.href);
    if (!key) return null;
    return {
      key,
      label: labelForPageKey(key, tab?.label),
      href: hrefForPageKey(key),
      active: key === activePageKey,
    };
  }

  function readOpenTabs() {
    try {
      const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function dedupeTabs(tabs) {
    const seen = new Set();
    return tabs.filter((tab) => {
      if (!tab?.key || seen.has(tab.key)) return false;
      seen.add(tab.key);
      return true;
    });
  }

  function currentTabFromConfig(config) {
    return {
      key: config.pageKey,
      label: labelForPageKey(config.pageKey, config.tabLabel),
      href: hrefForPageKey(config.pageKey),
      active: true,
    };
  }

  function saveOpenTabs(tabs) {
    const payload = dedupeTabs(tabs)
      .slice(-MAX_OPEN_TABS)
      .map(({ key, label, href, active }) => ({ key, label, href, active: Boolean(active) }));
    window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function syncOpenTabs(config) {
    const current = currentTabFromConfig(config);
    const stored = readOpenTabs();
    const seed = stored?.length ? stored : config.tabs;
    let tabs = dedupeTabs((seed || []).map((tab) => normalizeTab(tab, config.pageKey)).filter(Boolean));
    const currentIndex = tabs.findIndex((tab) => tab.key === current.key);

    if (currentIndex >= 0) {
      tabs[currentIndex] = { ...tabs[currentIndex], ...current, active: true };
    } else {
      tabs.push(current);
    }

    tabs = tabs.map((tab) => ({ ...tab, active: tab.key === current.key }));
    if (tabs.length > MAX_OPEN_TABS) {
      const currentTab = tabs.find((tab) => tab.key === current.key);
      tabs = tabs.filter((tab) => tab.key !== current.key).slice(-(MAX_OPEN_TABS - 1));
      tabs.push(currentTab);
    }

    return saveOpenTabs(tabs);
  }

  function setStoredActiveTab(pageKey) {
    const tabs = readOpenTabs();
    if (!tabs?.length) return;
    saveOpenTabs(tabs.map((tab) => ({ ...tab, active: tab.key === pageKey })));
  }

  function removeStoredTab(pageKey) {
    const tabs = readOpenTabs() || [];
    return saveOpenTabs(tabs.filter((tab) => tab.key !== pageKey));
  }

  function shouldSkipCommonChrome() {
    const pageKey = document.body.dataset.layoutPage || pageKeyFromPath();
    if (pageKey !== "client-home") return false;
    const params = new URLSearchParams(window.location.search);
    const skip = params.has("preview") || document.body.dataset.homePreview === "content-only";
    if (params.has("preview")) document.body.dataset.homePreview = "content-only";
    return skip;
  }

  function resolveConfig() {
    const pageKey = document.body.dataset.layoutPage || pageKeyFromPath();
    const config = {
      pageKey,
      activeNav: pageKey,
      search: "搜索首页模块、交易账号、邀请链接...",
      topActions: [
        { type: "icon", icon: "bell", label: "通知" },
        { type: "theme" },
        { type: "language", chevron: true },
      ],
      tabs: [],
      ...pageConfigs[pageKey],
      ...(window.NXBrokerPageConfig || {}),
    };
    config.tabs = syncOpenTabs(config);
    return config;
  }

  function renderSidebar(config) {
    return `
      <aside class="sidebar" data-common-layout="sidebar" style="--portal-color: ${portal.color}">
        <div class="brand">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 15.5 10.2 11l3.2 3.2L18.8 8.8" />
              <path d="M16.1 8.8h2.7v2.7" />
            </svg>
          </div>
          <div>
            <div class="brand-title">ForexCRM</div>
            <div class="brand-subtitle" data-portal-subtitle>${portal.subtitle}</div>
          </div>
        </div>

        <div class="portal-switch-wrap">
          <button class="portal-switch" type="button" aria-expanded="false">
            <span class="status-dot"></span>
            <span data-portal-label>${portal.label}</span>
            ${svg("chevronDown")}
          </button>
        </div>

        <nav class="nav" aria-label="主导航" data-shared-nav>
          ${renderNav(config)}
        </nav>

        <div class="profile">
          <div class="profile-name">Huang Jackie</div>
          <div class="profile-email">n02badd@gmail.com</div>
          <div class="badges">
            <span class="badge green active-role" data-portal-badge="client">${portal.badge}</span>
          </div>
        </div>

        <button class="logout" type="button"><span class="logout-icon"></span>Logout</button>
      </aside>`;
  }

  function renderNav(config) {
    return navigation
      .map((section) => {
        const items = section.items
          .map((item) => {
            const active = item.id === config.activeNav || item.href.split("/").pop() === `${pageKeyFromPath()}.html`;
            return `<a${active ? ' class="active-menu"' : ""} href="${escapeHtml(item.href)}" data-nav-id="${escapeHtml(item.id)}">${svg(item.icon, "nav-icon")}${escapeHtml(item.label)}</a>`;
          })
          .join("");
        return `<section><h2>${escapeHtml(section.title)}</h2>${items}</section>`;
      })
      .join("");
  }

  function renderTopbar(config) {
    return `
      <header class="topbar" data-common-layout="topbar">
        <div class="search">
          ${svg("search")}
          <span>${escapeHtml(config.search)}</span>
          <kbd>⌘K</kbd>
        </div>
        <div class="top-actions">
          ${config.topActions.map(renderTopAction).join("")}
        </div>
      </header>`;
  }

  function renderTopAction(action) {
    if (action.type === "theme") {
      return `<button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-label="${escapeHtml(action.label || "切换到黑夜模式")}" title="${escapeHtml(action.label || "切换到黑夜模式")}">${svg("moon", "theme-icon theme-icon-moon")}${svg("sun", "theme-icon theme-icon-sun")}</button>`;
    }

    if (action.type === "language") {
      return `<button class="language" type="button" aria-label="切换语言">${svg("globe")}<span>🇺🇸</span><span>English</span>${action.chevron ? svg("chevronDown") : ""}</button>`;
    }

    return `<button class="icon-btn" type="button" aria-label="${escapeHtml(action.label)}">${svg(action.icon)}</button>`;
  }

  function renderTabbar(config) {
    if (!config.tabs.length) return "";
    return `
      <div class="tabbar common-tabbar" data-common-layout="tabbar" role="tablist">
        ${config.tabs.map(renderTab).join("")}
      </div>`;
  }

  function renderTab(tab, index = 0) {
    const className = ["tab", tab.active ? "active-tab" : "muted-tab"].join(" ");
    const hrefAttr = tab.href ? ` data-tab-href="${escapeHtml(tab.href)}"` : "";
    const keyAttr = tab.key ? ` data-tab-key="${escapeHtml(tab.key)}"` : "";
    const indexAttr = ` data-tab-index="${index}"`;
    return `<div class="${className}" role="tab" tabindex="0"${hrefAttr}${keyAttr}${indexAttr} aria-selected="${tab.active ? "true" : "false"}"><span>${escapeHtml(tab.label)}</span><button type="button" data-tab-close aria-label="关闭 ${escapeHtml(tab.label)}">×</button></div>`;
  }

  function ensureLayoutStyles() {
    if (document.querySelector("#nxbroker-common-layout-style")) return;

    const style = document.createElement("style");
    style.id = "nxbroker-common-layout-style";
    style.textContent = `
      :root {
        --app-topbar-height: 72px;
        --app-tabbar-height: 59px;
        --app-chrome-height: calc(var(--app-topbar-height) + var(--app-tabbar-height));
      }

      .app > .topbar {
        position: sticky;
        top: 0;
        z-index: 18;
        backdrop-filter: blur(14px);
      }

      .app > .common-tabbar {
        position: sticky;
        top: var(--app-topbar-height);
        z-index: 17;
        backdrop-filter: blur(14px);
      }

      .active-menu {
        background: #eef4ff;
        color: #1d4ed8 !important;
        font-weight: 800;
      }

      .portal-switch-wrap {
        position: relative;
        margin: 0 16px 18px;
      }

      .portal-switch-wrap .portal-switch {
        width: 100%;
        margin: 0;
        cursor: default;
      }

      .portal-switch .status-dot {
        background: var(--portal-color, var(--blue));
      }

      .badge.active-role {
        outline: 2px solid var(--portal-color, var(--blue));
        outline-offset: 2px;
      }

      .common-tabbar {
        gap: 8px;
        padding: 0 16px;
      }

      .common-tabbar .tab {
        height: 38px;
        max-width: 190px;
        padding: 0 13px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-weight: 700;
      }

      .common-tabbar .tab span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .common-tabbar .tab button {
        border-radius: 4px;
        cursor: pointer;
      }

      .common-tabbar .tab button:hover {
        background: rgba(100, 116, 139, 0.14);
        color: #475569;
      }

      .common-tabbar .active-tab {
        background: #f1f5fb;
        color: #2563eb;
      }

      .theme-toggle svg {
        width: 17px;
        height: 17px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
      }

      @media (max-width: 860px) {
        :root {
          --app-topbar-height: 0px;
          --app-tabbar-height: 0px;
          --app-chrome-height: 0px;
        }

        .app > .topbar,
        .app > .common-tabbar {
          position: static;
        }

        .common-tabbar {
          max-width: 100%;
          overflow-x: auto;
          flex-wrap: nowrap;
        }

        .common-tabbar .tab {
          flex: 0 0 auto;
        }

        .portal-switch-wrap {
          display: none;
        }
      }
    `;
    document.head.append(style);
  }

  function bindTabs() {
    document.querySelectorAll("[data-common-layout='tabbar'] .tab").forEach((tab) => {
      if (tab.dataset.boundCommonTab) return;
      tab.dataset.boundCommonTab = "true";

      tab.addEventListener("click", (event) => {
        if (event.target.closest("[data-tab-close]")) {
          closeTab(tab);
          return;
        }
        const href = tab.dataset.tabHref;
        const key = tab.dataset.tabKey || pageKeyFromHref(href);
        if (key) setStoredActiveTab(key);
        if (href && href !== "#") window.location.href = href;
      });

      tab.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const href = tab.dataset.tabHref;
        if (href && href !== "#") {
          event.preventDefault();
          const key = tab.dataset.tabKey || pageKeyFromHref(href);
          if (key) setStoredActiveTab(key);
          window.location.href = href;
        }
      });
    });
  }

  function closeTab(tabNode) {
    const key = tabNode.dataset.tabKey || pageKeyFromHref(tabNode.dataset.tabHref);
    if (!key) return;

    const activeKey = document.body.dataset.layoutPage || pageKeyFromPath();
    const index = Number(tabNode.dataset.tabIndex || 0);
    const wasActive = key === activeKey;
    let tabs = removeStoredTab(key);

    if (!tabs.length) {
      tabs = saveOpenTabs([{ ...currentTabFromConfig({ pageKey: "client-home", tabLabel: "Account Overview" }), active: true }]);
    }

    if (wasActive) {
      const fallback = tabs[Math.min(index, tabs.length - 1)] || tabs[tabs.length - 1];
      if (!fallback) return;
      setStoredActiveTab(fallback.key);
      window.location.href = fallback.href;
      return;
    }

    const tabbar = document.querySelector("[data-common-layout='tabbar']");
    if (!tabbar) return;
    tabbar.innerHTML = tabs.map(renderTab).join("");
    bindTabs();
  }

  function mount() {
    const main = document.querySelector("[data-layout-main], main.app");
    if (!main) return;
    if (shouldSkipCommonChrome()) {
      document.body.dataset.commonChrome = "hidden";
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, portal.key);
    document.body.dataset.portal = portal.key;
    ensureLayoutStyles();

    const config = resolveConfig();

    if (!document.querySelector('[data-common-layout="sidebar"]')) {
      main.insertAdjacentHTML("beforebegin", renderSidebar(config));
    }

    if (!main.querySelector('[data-common-layout="topbar"]')) {
      main.insertAdjacentHTML("afterbegin", `${renderTopbar(config)}${renderTabbar(config)}`);
    }

    bindTabs();
  }

  window.NXBrokerLayout = {
    mount,
    setPortal: () => window.localStorage.setItem(STORAGE_KEY, portal.key),
  };

  if (document.querySelector("[data-layout-main], main.app")) {
    mount();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();

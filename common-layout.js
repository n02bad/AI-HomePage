(function () {
  const STORAGE_KEY = "nxbroker.activePortal";

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
        navItem("home-model-calls", "调用记录", "./home-model-calls.html", "activity"),
        navItem("home-module-preview", "积木组件库", "./home-module-preview.html", "grid"),
      ],
    },
  ];

  const pageConfigs = {
    "client-home": {
      activeNav: "client-home",
      search: "搜索首页模块、交易账号、邀请链接...",
      tabs: [{ label: "Account Overview", href: "./client-home.html", active: true }],
    },
    "home-layout-admin": {
      activeNav: "home-layout-admin",
      search: "搜索首页模块、布局方案、AI 生成记录...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html", active: true },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "home-layout-preview": {
      activeNav: "home-layout-admin",
      search: "搜索首页模块、布局方案、AI 生成记录...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html", active: true },
        { label: "调用记录", href: "./home-model-calls.html" },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "home-model-calls": {
      activeNav: "home-model-calls",
      search: "搜索模型、状态、调用摘要...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "调用记录", href: "./home-model-calls.html", active: true },
        { label: "积木组件库", href: "./home-module-preview.html" },
      ],
    },
    "home-module-preview": {
      activeNav: "home-module-preview",
      search: "搜索首页积木、模块尺寸、组件样式...",
      tabs: [
        { label: "Account Overview", href: "./client-home.html" },
        { label: "首页个性化", href: "./home-layout-admin.html" },
        { label: "调用记录", href: "./home-model-calls.html" },
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

  function resolveConfig() {
    const pageKey = document.body.dataset.layoutPage || pageKeyFromPath();
    return {
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

  function renderTab(tab) {
    const className = ["tab", tab.active ? "active-tab" : "muted-tab"].join(" ");
    const hrefAttr = tab.href ? ` data-tab-href="${escapeHtml(tab.href)}"` : "";
    return `<div class="${className}" role="tab" tabindex="0"${hrefAttr} aria-selected="${tab.active ? "true" : "false"}"><span>${escapeHtml(tab.label)}</span><button type="button" aria-label="关闭标签">×</button></div>`;
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
        padding: 0 13px;
        background: transparent;
        color: #64748b;
        font-weight: 700;
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
      tab.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        const href = tab.dataset.tabHref;
        if (href && href !== "#") window.location.href = href;
      });

      tab.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const href = tab.dataset.tabHref;
        if (href && href !== "#") {
          event.preventDefault();
          window.location.href = href;
        }
      });
    });
  }

  function mount() {
    const main = document.querySelector("[data-layout-main], main.app");
    if (!main) return;

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

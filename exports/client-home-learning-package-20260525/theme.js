(function () {
  const STORAGE_KEY = "nxbroker.theme";
  const TENANT_STORAGE_KEY = "nxbroker.tenantTheme";
  const THEMES = new Set(["light", "dark"]);
  const TENANT_THEMES = {
    default: {
      primaryColor: "#2563eb",
      accentColor: "#facc15",
      backgroundStyle: "classic-blue-white",
      cardStyle: "raised-white",
      cardRadius: "8px",
      cardShadow: "soft",
      buttonStyle: "solid-primary",
      fontDensity: 1,
      numberStyle: "tabular",
      bannerStyle: "dark-campaign",
    },
    blackGold: {
      primaryColor: "#b7791f",
      accentColor: "#facc15",
      backgroundStyle: "black-gold-ambient",
      cardStyle: "warm-ivory",
      cardRadius: "8px",
      cardShadow: "warm-elevated",
      buttonStyle: "black-gold-gradient",
      fontDensity: 1.02,
      numberStyle: "executive",
      bannerStyle: "black-gold-campaign",
    },
    lightGold: {
      primaryColor: "#b7791f",
      accentColor: "#f5c451",
      backgroundStyle: "light-gold-air",
      cardStyle: "flat-warm-white",
      cardRadius: "8px",
      cardShadow: "low",
      buttonStyle: "soft-gold",
      fontDensity: 1,
      numberStyle: "tabular",
      bannerStyle: "light-gold-campaign",
    },
    blueFinance: {
      primaryColor: "#1d4ed8",
      accentColor: "#14b8a6",
      backgroundStyle: "blue-finance-air",
      cardStyle: "clean-white",
      cardRadius: "8px",
      cardShadow: "finance-soft",
      buttonStyle: "teal-blue-gradient",
      fontDensity: 1,
      numberStyle: "financial",
      bannerStyle: "teal-blue-campaign",
    },
    darkTech: {
      primaryColor: "#38bdf8",
      accentColor: "#a78bfa",
      backgroundStyle: "dark-tech-grid",
      cardStyle: "glass-dark",
      cardRadius: "8px",
      cardShadow: "deep-tech",
      buttonStyle: "blue-purple-gradient",
      fontDensity: 0.98,
      numberStyle: "terminal",
      bannerStyle: "neon-campaign",
    },
    minimalWhite: {
      primaryColor: "#475569",
      accentColor: "#64748b",
      backgroundStyle: "minimal-white",
      cardStyle: "flat-white",
      cardRadius: "4px",
      cardShadow: "none",
      buttonStyle: "quiet-outline",
      fontDensity: 0.96,
      numberStyle: "quiet",
      bannerStyle: "paper-band",
    },
    emeraldTrust: {
      primaryColor: "#059669",
      accentColor: "#0ea5e9",
      backgroundStyle: "emerald-trust-air",
      cardStyle: "clean-white",
      cardRadius: "8px",
      cardShadow: "trust-soft",
      buttonStyle: "emerald-blue-gradient",
      fontDensity: 1,
      numberStyle: "financial",
      bannerStyle: "emerald-trust-campaign",
    },
    cobaltTeal: {
      primaryColor: "#0f766e",
      accentColor: "#2563eb",
      backgroundStyle: "cobalt-teal-grid",
      cardStyle: "clean-white",
      cardRadius: "8px",
      cardShadow: "finance-soft",
      buttonStyle: "cobalt-teal-gradient",
      fontDensity: 1,
      numberStyle: "financial",
      bannerStyle: "cobalt-teal-campaign",
    },
    crimsonPromo: {
      primaryColor: "#be123c",
      accentColor: "#f97316",
      backgroundStyle: "crimson-promo-air",
      cardStyle: "warm-white",
      cardRadius: "8px",
      cardShadow: "promo-soft",
      buttonStyle: "crimson-orange-gradient",
      fontDensity: 1,
      numberStyle: "tabular",
      bannerStyle: "crimson-promo-campaign",
    },
    graphiteSilver: {
      primaryColor: "#334155",
      accentColor: "#0ea5e9",
      backgroundStyle: "graphite-silver-air",
      cardStyle: "flat-white",
      cardRadius: "6px",
      cardShadow: "low",
      buttonStyle: "graphite-silver",
      fontDensity: 0.98,
      numberStyle: "quiet",
      bannerStyle: "graphite-silver-campaign",
    },
  };
  const TENANT_THEME_IDS = new Set(Object.keys(TENANT_THEMES));
  const LEGACY_TENANT_THEME_MAP = {
    classic: "default",
    aurum: "blackGold",
    ocean: "blueFinance",
    energy: "darkTech",
  };
  const root = document.documentElement;

  function isTenantHomeScope() {
    const body = document.body;
    if (body?.dataset?.layoutPage === "client-home" || body?.dataset?.homePreview === "content-only") return true;

    const path = String(window.location?.pathname || "");
    if (/\/client-home\.html$/i.test(path)) return true;

    try {
      const params = new URLSearchParams(window.location.search);
      return params.has("preview") && /\/client-home\.html$/i.test(path);
    } catch (error) {
      return false;
    }
  }

  function readTheme() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (THEMES.has(stored)) return stored;
    } catch (error) {
      return "light";
    }
    return "light";
  }

  function normalizeTenantTheme(theme) {
    const value = LEGACY_TENANT_THEME_MAP[theme] || theme;
    return TENANT_THEME_IDS.has(value) ? value : "default";
  }

  function readTenantTheme() {
    try {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("tenantTheme") || params.get("tenant-theme");
      if (requested) return normalizeTenantTheme(requested);

      const stored = window.localStorage.getItem(TENANT_STORAGE_KEY);
      if (stored) return normalizeTenantTheme(stored);
    } catch (error) {
      return normalizeTenantTheme(document.body?.dataset?.tenantTheme || root.dataset.tenantTheme);
    }

    return normalizeTenantTheme(document.body?.dataset?.tenantTheme || root.dataset.tenantTheme);
  }

  function writeTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Theme should still work for the current page when storage is unavailable.
    }
  }

  function writeTenantTheme(theme) {
    try {
      window.localStorage.setItem(TENANT_STORAGE_KEY, theme);
    } catch (error) {
      // Tenant tokens still apply for the current page when storage is unavailable.
    }
  }

  function updateControls(theme) {
    const nextLabel = theme === "dark" ? "切换到白天模式" : "切换到黑夜模式";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.dataset.themeCurrent = theme;
      button.setAttribute("aria-label", nextLabel);
      button.setAttribute("title", nextLabel);
    });
  }

  function applyTheme(theme) {
    const requestedTheme = THEMES.has(theme) ? theme : "light";
    const tenantHomeScope = isTenantHomeScope();
    const nextTheme = tenantHomeScope ? "light" : requestedTheme;
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;

    if (document.body) {
      document.body.dataset.theme = nextTheme;
      if (tenantHomeScope) {
        document.body.dataset.homeColorMode = requestedTheme;
      } else {
        delete document.body.dataset.homeColorMode;
      }
    }

    updateControls(tenantHomeScope ? requestedTheme : nextTheme);
    return nextTheme;
  }

  function applyTenantTheme(theme) {
    const nextTheme = normalizeTenantTheme(theme);
    root.dataset.tenantTheme = nextTheme;

    if (document.body) {
      document.body.dataset.tenantTheme = nextTheme;
    }

    return nextTheme;
  }

  function setTheme(theme) {
    const requestedTheme = THEMES.has(theme) ? theme : "light";
    const nextTheme = applyTheme(requestedTheme);
    writeTheme(requestedTheme);
    return nextTheme;
  }

  function setTenantTheme(theme) {
    const nextTheme = applyTenantTheme(theme);
    writeTenantTheme(nextTheme);
    return nextTheme;
  }

  function toggleTheme() {
    const currentTheme = isTenantHomeScope()
      ? document.body?.dataset?.homeColorMode || readTheme()
      : root.dataset.theme || readTheme();
    return setTheme(currentTheme === "dark" ? "light" : "dark");
  }

  applyTheme(readTheme());
  applyTenantTheme(readTenantTheme());

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(readTheme());
    applyTenantTheme(readTenantTheme());
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-toggle]");
    if (!button) return;
    toggleTheme();
  });

  window.NXBrokerTheme = {
    applyTheme,
    applyTenantTheme,
    getTheme: () => root.dataset.theme || readTheme(),
    getHomeColorMode: () => (isTenantHomeScope() ? document.body?.dataset?.homeColorMode || readTheme() : root.dataset.theme || readTheme()),
    getTenantTheme: () => root.dataset.tenantTheme || readTenantTheme(),
    normalizeTenantTheme,
    setTheme,
    setTenantTheme,
    tenantThemes: TENANT_THEMES,
    toggleTheme,
  };
})();

(function () {
  const auth = window.AuthPersonalization;
  const host = document.querySelector("[data-auth-standalone-host]");
  if (!auth || !host) return;

  const STORAGE_KEY = "forexcrm.auth.generated.scheme";
  const DEFAULT_PROMPT = "生成 ForexCRM 登录、注册、找回密码界面。";
  const buttons = [...document.querySelectorAll("[data-auth-preview-screen]")];
  let screen = new URLSearchParams(window.location.search).get("screen") || "login";

  function loadScheme() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") return auth.normalizeScheme(saved, { prompt: DEFAULT_PROMPT, screen });
    } catch (error) {
      return null;
    }
    return auth.localSchemeFromPrompt(DEFAULT_PROMPT, { screen });
  }

  function render() {
    const scheme = loadScheme();
    auth.renderAuthPreview(host, scheme, { screen });
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.authPreviewScreen === screen));
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      screen = button.dataset.authPreviewScreen || "login";
      render();
    });
  });

  render();
})();

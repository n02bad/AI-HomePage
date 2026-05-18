(function () {
  const auth = window.AuthPersonalization;
  const host = document.querySelector("[data-auth-standalone-host]");
  if (!auth || !host) return;

  const STORAGE_KEY = "forexcrm.auth.generated.scheme";
  const DEFAULT_PROMPT = "生成 ForexCRM 登录、注册、找回密码界面：布局方案为左右布局，桌面端左侧品牌平台开户说明、右侧登录表单，移动端折叠为单列但保留 Logo、主入口和主按钮优先级。登录首屏只保留手机号/邮箱账号与密码，可提供 Google / Apple 快捷登录；双重验证在下一步输入 6 位验证码，人机校验用于登录风险、注册提交和找回密码发送验证码。";
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

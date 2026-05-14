const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function httpRequest({ method = "GET", hostname = "127.0.0.1", port, path: requestPath, body = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(body) : null;
    const req = http.request(
      {
        method,
        hostname,
        port,
        path: requestPath,
        headers: {
          ...headers,
          ...(payload ? { "content-length": payload.length } : {}),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve({ statusCode: res.statusCode, data }));
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function httpJson(options) {
  const response = await httpRequest(options);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`${options.method || "GET"} ${options.path} failed with ${response.statusCode}: ${response.data.slice(0, 300)}`);
  }
  return JSON.parse(response.data);
}

async function waitForHttp(port, requestPath = "/", timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await httpRequest({ port, path: requestPath });
      if (response.statusCode && response.statusCode < 500) return;
    } catch (error) {
      await delay(120);
    }
  }
  throw new Error(`server did not respond on ${port}`);
}

function stopChild(child, signal = "SIGTERM", timeoutMs = 1200) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.killed) {
      resolve();
      return;
    }

    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill(signal);
  });
}

function cleanupTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
  } catch (error) {
    if (["ENOENT", "EACCES", "ENOTEMPTY", "EBUSY"].includes(error.code)) return;
    throw error;
  }
}

function findChrome() {
  const chrome = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!chrome) throw new Error("Chrome executable not found; set CHROME_PATH to run visual style checks.");
  return chrome;
}

function encodeClientFrame(payload) {
  const data = Buffer.from(payload);
  const header = [];
  header.push(0x81);
  if (data.length < 126) {
    header.push(0x80 | data.length);
  } else if (data.length < 65536) {
    header.push(0x80 | 126, (data.length >> 8) & 0xff, data.length & 0xff);
  } else {
    const length = BigInt(data.length);
    header.push(0x80 | 127);
    for (let shift = 56n; shift >= 0n; shift -= 8n) {
      header.push(Number((length >> shift) & 0xffn));
    }
  }
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(data.length);
  for (let index = 0; index < data.length; index += 1) {
    masked[index] = data[index] ^ mask[index % 4];
  }
  return Buffer.concat([Buffer.from(header), mask, masked]);
}

function encodePongFrame(payload) {
  const data = Buffer.from(payload || "");
  return Buffer.concat([Buffer.from([0x8a, data.length]), data]);
}

class CdpClient {
  constructor(wsUrl) {
    this.url = new URL(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.handshaken = false;
    this.socket = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      const port = Number(this.url.port || 80);
      const socket = net.connect(port, this.url.hostname);
      this.socket = socket;

      const fail = (error) => {
        for (const [, pending] of this.pending) pending.reject(error);
        this.pending.clear();
        reject(error);
      };

      socket.on("connect", () => {
        socket.write(
          [
            `GET ${this.url.pathname}${this.url.search} HTTP/1.1`,
            `Host: ${this.url.host}`,
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Key: ${key}`,
            "Sec-WebSocket-Version: 13",
            "\r\n",
          ].join("\r\n"),
        );
      });

      socket.on("data", (chunk) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (!this.handshaken) {
          const headerEnd = this.buffer.indexOf("\r\n\r\n");
          if (headerEnd === -1) return;
          const header = this.buffer.slice(0, headerEnd).toString("utf8");
          if (!/^HTTP\/1\.1 101/.test(header)) {
            fail(new Error(`WebSocket handshake failed: ${header.split("\r\n")[0]}`));
            return;
          }
          this.handshaken = true;
          this.buffer = this.buffer.slice(headerEnd + 4);
          resolve();
        }
        this.parseFrames();
      });

      socket.on("error", (error) => {
        for (const [, pending] of this.pending) pending.reject(error);
        this.pending.clear();
      });

      socket.on("close", () => {
        const error = new Error("CDP socket closed");
        for (const [, pending] of this.pending) pending.reject(error);
        this.pending.clear();
      });
    });
  }

  parseFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        length = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }
      let mask = null;
      if (masked) {
        if (this.buffer.length < offset + 4) return;
        mask = this.buffer.slice(offset, offset + 4);
        offset += 4;
      }
      if (this.buffer.length < offset + length) return;
      let payload = this.buffer.slice(offset, offset + length);
      this.buffer = this.buffer.slice(offset + length);
      if (mask) {
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }
      if (opcode === 0x1) {
        this.handleMessage(payload.toString("utf8"));
      } else if (opcode === 0x8) {
        this.socket.end();
      } else if (opcode === 0x9) {
        this.socket.write(encodePongFrame(payload));
      }
    }
  }

  handleMessage(message) {
    const data = JSON.parse(message);
    if (!data.id) return;
    const pending = this.pending.get(data.id);
    if (!pending) return;
    this.pending.delete(data.id);
    if (data.error) {
      pending.reject(new Error(`${pending.method} failed: ${data.error.message}`));
    } else {
      pending.resolve(data.result);
    }
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({ id, method, params });
    this.socket.write(encodeClientFrame(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 10000);
    });
  }

  close() {
    if (this.socket) this.socket.end();
  }
}

async function createChromeTab(debugPort) {
  let target;
  try {
    target = await httpJson({ port: debugPort, path: "/json/new?about:blank" });
  } catch (error) {
    target = await httpJson({ method: "PUT", port: debugPort, path: "/json/new?about:blank" });
  }
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.text || result.exceptionDetails.exception?.description || "evaluation failed";
    throw new Error(text);
  }
  return result.result?.value;
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const readyState = await evaluate(client, "document.readyState");
      if (readyState === "complete") {
        await delay(250);
        return;
      }
    } catch (error) {
      await delay(120);
    }
  }
  throw new Error(`page did not finish loading: ${url}`);
}

const STYLE_SNAPSHOT_EXPRESSION = `(() => {
  const root = getComputedStyle(document.documentElement);
  const selectors = [
    ".client-home-page",
    ".client-shell",
    ".ai-home-block",
    ".ai-feature-slot",
    "[data-home-component='onboarding_guide']",
    ".ai-mission-board",
    ".ai-mission-step",
    "[data-home-component='copytrading_signals']",
    ".ai-copy-cta",
    ".ai-copy-signal-metrics span",
    "[data-home-component='pamm_products']",
    ".balance-overview",
    ".balance-metric.primary",
    ".fund-action.deposit",
    ".account-progress-card",
    ".ai-guide-card",
    ".promo-banner",
    ".quick-action"
  ];
  const read = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const style = getComputedStyle(node);
    return {
      selector,
      color: style.color,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderColor: style.borderTopColor,
      boxShadow: style.boxShadow
    };
  };
  const parseColor = (value) => {
    if (!value || value === "transparent") return null;
    const rgb = value.match(/rgba?\\(([^)]+)\\)/i);
    if (rgb) {
      const parts = rgb[1].trim().split(/[\\s,\\/]+/).filter(Boolean);
      const numbers = parts.slice(0, 4).map(Number);
      return { r: numbers[0], g: numbers[1], b: numbers[2], a: numbers[3] === undefined ? 1 : numbers[3] };
    }
    const srgb = value.match(/color\\(srgb\\s+([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)(?:\\s*\\/\\s*([0-9.]+))?\\)/i);
    if (srgb) {
      return {
        r: Math.round(Number(srgb[1]) * 255),
        g: Math.round(Number(srgb[2]) * 255),
        b: Math.round(Number(srgb[3]) * 255),
        a: srgb[4] === undefined ? 1 : Number(srgb[4])
      };
    }
    return null;
  };
  const luminance = (color) => {
    const channel = (value) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  };
  const contrastRatio = (foreground, background) => {
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const effectiveBackground = (node) => {
    let current = node;
    while (current) {
      const style = getComputedStyle(current);
      const color = parseColor(style.backgroundColor);
      if (color && color.a > 0.55) return color;
      current = current.parentElement;
    }
    return parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const contrastSelectors = [
    ".client-welcome h1",
    ".ai-feature-title strong",
    ".ai-mission-title strong",
    ".ai-mission-step-copy strong",
    ".ai-copy-signal-head strong",
    ".ai-copy-signal-metrics span",
    ".ai-copy-cta",
    ".balance-metric.primary strong",
    ".balance-metric small",
    ".fund-action.deposit",
    ".account-progress-card h2",
    ".ai-guide-card strong",
    ".quick-action span:last-child"
  ];
  const contrast = contrastSelectors
    .map((selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const fg = parseColor(getComputedStyle(node).color);
      const bg = effectiveBackground(node);
      return fg && bg ? { selector, ratio: Number(contrastRatio(fg, bg).toFixed(2)), color: getComputedStyle(node).color } : null;
    })
    .filter(Boolean);
  const samples = selectors.map(read).filter(Boolean);
  const hardBlueHits = samples.filter((item) => {
    return [item.color, item.backgroundColor, item.borderColor, item.backgroundImage, item.boxShadow].some((value) => /37,\\s*99,\\s*235|#2563eb/i.test(String(value || "")));
  });
  return {
    rootTheme: document.documentElement.dataset.theme || "",
    rootTenantTheme: document.documentElement.dataset.tenantTheme || "",
    bodyTenantTheme: document.body.dataset.tenantTheme || "",
    bodyPreview: document.body.dataset.homePreview || "",
    tenantPrimary: root.getPropertyValue("--tenant-primaryColor").trim(),
    homeBg: root.getPropertyValue("--home-bg").trim(),
    homeCardBg: root.getPropertyValue("--home-card-bg").trim(),
    samples,
    hardBlueHits,
    contrast,
    badContrast: contrast.filter((item) => item.ratio < 3.2)
  };
})()`;

async function assertTenantTheme(client, baseUrl, theme, expectedPrimary) {
  await navigate(client, `${baseUrl}/client-home.html?preview=1&tenantTheme=${theme}`);
  const snapshot = await evaluate(client, STYLE_SNAPSHOT_EXPRESSION);
  assert.strictEqual(snapshot.rootTheme, "light", `${theme} must force the shell theme to light inside client-home preview`);
  assert.strictEqual(snapshot.rootTenantTheme, theme, `${theme} must apply to documentElement`);
  assert.strictEqual(snapshot.bodyTenantTheme, theme, `${theme} must apply to body`);
  assert.strictEqual(snapshot.bodyPreview, "content-only", `${theme} preview must be content-only`);
  assert.strictEqual(snapshot.tenantPrimary.toLowerCase(), expectedPrimary, `${theme} primary token must come from tenant tokens`);
  assert(snapshot.homeBg && !/0a1020|10,\\s*16,\\s*32/i.test(snapshot.homeBg), `${theme} home background must not be global dark shell`);
  assert(snapshot.samples.length >= 6, `${theme} should render key homepage modules`);
  return snapshot;
}

async function assertServerOnboardingIntent(port) {
  const response = await httpJson({
    method: "POST",
    port,
    path: "/api/home-ai/complete",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "新用户 Onboarding：KYC、创建真实账户、首次入金三步旅程，做成开户进度首页。",
      modelConfig: { provider: "openai" },
    }),
  });
  assert.strictEqual(response.ok, true);
  assert.strictEqual(response.config?.pageIntent?.primaryIntent, "onboarding");
  assert.strictEqual(response.config?.brickTrace?.intent, "onboarding");
  assert.strictEqual(
    Boolean(response.config?.brickPlan?.some((brick) => brick?.brickId === "promoBanner.depositLadder")),
    false,
    "new user onboarding prompt must not become depositLadder",
  );
}

async function assertBlackGoldPromptReadability(client) {
  await evaluate(
    client,
    `(() => {
      const config = window.HomePersonalization.promptToConfig("黑金高净值 VIP 首页，首屏突出资产、入金和专属服务，黑金但不要太暗。", 1);
      config.themePreset = "blackGold";
      config.theme = "blackGold";
      config.themeCustom = { input: "黑金但不要太暗，高净值 VIP" };
      window.HomePersonalization.applyConfig(config, document);
      return true;
    })()`,
  );
  await delay(250);
  const snapshot = await evaluate(client, STYLE_SNAPSHOT_EXPRESSION);
  assert.strictEqual(snapshot.bodyTenantTheme, "blackGold");
  assert.strictEqual(snapshot.hardBlueHits.length, 0, `blackGold prompt still has hardcoded blue styles: ${JSON.stringify(snapshot.hardBlueHits)}`);
  assert.strictEqual(snapshot.badContrast.length, 0, `blackGold prompt has low contrast text: ${JSON.stringify(snapshot.badContrast)}`);
}

async function assertMinimalWhiteLightAndDarkModes(client) {
  await evaluate(
    client,
    `(() => {
      const config = window.HomePersonalization.promptToConfig("极简的淡色风格，生成专业交易客户首页，首屏展示交易账号状态、账户表现图表和快捷入口，要考虑白天模式跟暗夜模式。", 1);
      config.colorMode = "light";
      window.HomePersonalization.applyConfig(config, document);
      return true;
    })()`,
  );
  await delay(250);
  const lightSnapshot = await evaluate(
    client,
    `(() => {
      const parse = (value) => {
        const match = String(value || "").match(/rgba?\\(([^)]+)\\)/i);
        if (!match) return null;
        const parts = match[1].trim().split(/[\\s,\\/]+/).filter(Boolean).slice(0, 3).map(Number);
        return parts.length === 3 ? { r: parts[0], g: parts[1], b: parts[2] } : null;
      };
      const isDark = (value) => {
        const color = parse(value);
        return color ? color.r < 45 && color.g < 55 && color.b < 70 : /#0[0-9a-f]{5}|#111827|#0f172a|#020617/i.test(String(value || ""));
      };
      const nodes = [...document.querySelectorAll(".ai-welcome-feature, .ai-performance-feature, .ai-accounts-feature, .ai-balance-feature, .ai-quick-feature, .ai-promo-feature")];
      return {
        tenantTheme: document.body.dataset.tenantTheme || "",
        colorMode: document.body.dataset.homeColorMode || "",
        darkPanels: nodes
          .map((node) => {
            const style = getComputedStyle(node);
            return { selector: node.dataset.homeComponent || node.className, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage };
          })
          .filter((item) => isDark(item.backgroundColor) || /#0[0-9a-f]{5}|#111827|#0f172a|#020617/i.test(item.backgroundImage))
      };
    })()`,
  );
  assert.strictEqual(lightSnapshot.tenantTheme, "minimalWhite");
  assert.strictEqual(lightSnapshot.colorMode, "light");
  assert.strictEqual(lightSnapshot.darkPanels.length, 0, `minimalWhite light mode must not render dark panels: ${JSON.stringify(lightSnapshot.darkPanels)}`);

  await evaluate(
    client,
    `(() => {
      const config = window.HomePersonalization.promptToConfig("极简的淡色风格，生成专业交易客户首页，首屏展示交易账号状态、账户表现图表和快捷入口，要考虑白天模式跟暗夜模式。", 1);
      config.colorMode = "dark";
      window.HomePersonalization.applyConfig(config, document);
      return true;
    })()`,
  );
  await delay(250);
  const darkSnapshot = await evaluate(client, `(() => ({ tenantTheme: document.body.dataset.tenantTheme || "", colorMode: document.body.dataset.homeColorMode || "", pageBg: getComputedStyle(document.querySelector(".client-home-page")).backgroundImage }))()`);
  assert.strictEqual(darkSnapshot.tenantTheme, "minimalWhite");
  assert.strictEqual(darkSnapshot.colorMode, "dark");
  assert(/0f172a|7,\s*17,\s*31|11,\s*18,\s*32/i.test(darkSnapshot.pageBg), `minimalWhite dark mode should switch to an intentional dark palette: ${darkSnapshot.pageBg}`);
}

async function run() {
  const appPort = await getFreePort();
  const debugPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${appPort}`;
  const server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(appPort), HOME_AI_MOCK: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "home-style-chrome-"));
  const chrome = spawn(
    findChrome(),
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--window-size=1366,900",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let client = null;

  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  chrome.stderr.on("data", (chunk) => {
    const text = String(chunk);
    if (!/DevTools listening/.test(text)) process.stderr.write(chunk);
  });

  try {
    await waitForHttp(appPort, "/client-home.html");
    await waitForHttp(debugPort, "/json/version");
    client = await createChromeTab(debugPort);

    await navigate(client, `${baseUrl}/client-home.html?preview=1&tenantTheme=blackGold`);
    await evaluate(client, `localStorage.setItem("nxbroker.theme", "dark"); true`);

    await assertTenantTheme(client, baseUrl, "blackGold", "#b7791f");
    await assertTenantTheme(client, baseUrl, "blueFinance", "#1d4ed8");
    await assertTenantTheme(client, baseUrl, "darkTech", "#38bdf8");
    await assertServerOnboardingIntent(appPort);
    await navigate(client, `${baseUrl}/client-home.html?preview=1&tenantTheme=blackGold`);
    await assertBlackGoldPromptReadability(client);
    await assertMinimalWhiteLightAndDarkModes(client);

    console.log("home visual style checks passed");
  } finally {
    if (client) client.close();
    await Promise.all([stopChild(chrome), stopChild(server)]);
    cleanupTempDir(userDataDir);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

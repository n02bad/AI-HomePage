# AI 首页生成接入说明

## 现在的运行方式

项目已经从纯静态页面升级为本地 Node 服务：

```bash
npm start
```

打开：

```text
http://127.0.0.1:5174/client-home.html
http://127.0.0.1:5174/home-layout-admin.html
http://127.0.0.1:5174/home-layout-preview.html
http://127.0.0.1:5174/home-module-preview.html
```

项目范围已经收窄为用户端首页、AI 个性化输入页、首页预览页和首页积木组件库；其他独立业务界面不再作为本原型入口保留。

`server.js` 同时负责静态页面和大模型代理接口：

```text
POST /api/home-ai/complete
POST /api/home-ai/test
GET  /api/home-components/library
POST /api/home-components/generate
POST /api/home-components/save
POST /api/home-components/compose
```

`/api/home-ai/test` 用于在配置弹窗里做最小连通性测试，只验证 Key、Base URL、模型和接口路径是否可用，不会生成或发布首页。

`home-module-preview.html` 里的组件库 AI 工作台会调用这些接口生成组件定义，并保存到：

```text
home-component-library.json
home-component-compositions.json
```

生成组件时，如果没有真实密钥，可以用 mock 模式先验证完整链路；配置密钥后会走真实大模型。

## 配置密钥

推荐在 shell 环境里配置密钥，不要把密钥写进前端代码：

```bash
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export MINIMAX_API_KEY="..."
export MINIMAX_BASE_URL="https://api.minimaxi.com/v1"
export MINIMAX_MODEL="MiniMax-M2.7"
export MOONSHOT_API_KEY="..."
export DEEPSEEK_API_KEY="..."
export DEEPSEEK_MODEL="deepseek-v4-flash"
npm start
```

页面里的「大模型配置」可以选择 OpenAI、Claude、MiniMax、Kimi、DeepSeek，以及模型 ID、Base URL、接口路径和调用方式。
MiniMax CN 站点的 OpenAI 兼容 Base URL 是 `https://api.minimaxi.com/v1`，不是 `https://api.minimaxi.cn/v1`；国际账号可改为 `https://api.minimax.io/v1`。如果表单里误填 `.cn`，前后端都会按 CN 官方 API Host 自动纠正到 `.com`。
DeepSeek V4 使用 OpenAI 兼容接口，Base URL 是 `https://api.deepseek.com`，当前预设包含 `deepseek-v4-flash` 和 `deepseek-v4-pro`。首页/组件生成默认使用 `deepseek-v4-flash`；如果手动选择 `deepseek-v4-pro`，代理会关闭 thinking mode，并在 Pro 超时或返回不可解析 JSON 时自动降级重试 Flash。

## 开发自测

没有真实密钥时，可以用 mock 模式确认前端闭环：

```bash
npm run start:mock
```

mock 模式不会调用外部大模型，但会走同一个 `/api/home-ai/complete` 接口，便于验证“生成预览 -> 保存草稿 -> iframe 预览”的链路。Mock 现在也会按资产管理、数据洞察、入金转化、风控提醒、留存唤醒、移动优先、白标品牌、IB 代理等意图返回不同 `brickPlan`，避免不同提示语都落回同一套首页。

生成记录会保存 `configSnapshot`，包含 `layoutPreset`、`themePreset`、`brickTrace.intent`、`brickTrace.strategy`、`brickPlan` 摘要和 section 摘要，用来判断本次到底是“真实大模型 / Mock / 本地规则 / 回退”，以及为什么页面看起来相似。

## 页面治理与质检

首页生成现在多了一层页面治理契约。模型输出、mock 输出和本地规则生成的配置，都会在标准化阶段按 `pageIntent` 检查主目标、首屏模块、CTA 重复、操作区位置、弱化模块和模块数量。

预览页左侧会显示 `页面质检`，例如入金转化首页应看到：

```text
入金转化契约 · 100 分
```

入金转化页的硬规则：

- 首屏展示 `$500 / $2,000 / $10,000` 三档入金奖励和最高赠金 `$300`。
- 首屏组合为奖励阶梯、钱包余额、主入金入口和开真实账号。
- 主入金按钮只保留一个，快捷入口不再重复入金/出金。
- 快捷入口紧跟首屏，优先放转账、订单、持仓、客服等二级任务。
- 交易账号和轻量趋势放在操作区之后，复杂图表和资产长摘要不要抢首屏。

自测时建议同时看三项：

```bash
npm run check
git diff --check
```

再用 `npm run start:mock` 打开 `home-layout-preview.html`，确认 `页面质检` 分数、首屏顺序和快捷入口动作符合当前 prompt 的业务目标。

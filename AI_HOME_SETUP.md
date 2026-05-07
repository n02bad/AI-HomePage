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
export DEEPSEEK_MODEL="deepseek-v4-pro"
npm start
```

页面里的「大模型配置」可以选择 OpenAI、Claude、MiniMax、Kimi、DeepSeek，以及模型 ID、Base URL、接口路径和调用方式。
MiniMax CN 站点的 OpenAI 兼容 Base URL 是 `https://api.minimaxi.com/v1`，不是 `https://api.minimaxi.cn/v1`；国际账号可改为 `https://api.minimax.io/v1`。如果表单里误填 `.cn`，前后端都会按 CN 官方 API Host 自动纠正到 `.com`。
DeepSeek V4 使用 OpenAI 兼容接口，Base URL 是 `https://api.deepseek.com`，当前预设包含 `deepseek-v4-pro` 和 `deepseek-v4-flash`。

## 开发自测

没有真实密钥时，可以用 mock 模式确认前端闭环：

```bash
npm run start:mock
```

mock 模式不会调用外部大模型，但会走同一个 `/api/home-ai/complete` 接口，便于验证“生成预览 -> 保存草稿 -> iframe 预览”的链路。

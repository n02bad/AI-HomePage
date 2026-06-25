---
description: 启动首页 AI 项目 session（只读上下文文档 + diff + 任务相关文件，禁止全量扫描）
---

# /start-homepage

你正在进入 **ForexCRM 首页 AI 生成项目**（`forexcrm-home-ai-prototype`）。
本命令的唯一目的：用**最小读取**建立上下文，**不要全量扫描项目**。

## 本次 session 只允许按以下顺序读取

1. **`CLAUDE.md`**（根目录）— 项目目标、pipeline、关键文件、layout 现状问题、修改原则。
2. **`docs/PROJECT_MAP.md`** — 模块地图与 `server.js` 行号锚点（pipeline 入口 / prompt / schema / layout / brick registry / quality evaluator / 勿改文件）。
3. **`git log --oneline -10`** 与 **`git status` + `git diff`** — 当前分支（通常 `home-ai-quality-improvements`）改了什么。
4. **本次任务相关文件**：根据用户任务，用 `CLAUDE.md` / `PROJECT_MAP.md` 的锚点 + `grep -n` **精准定位 `server.js` 片段，只读相关行**。仅当任务相关时再读 `design.md`、`home-module-bricks.md`、对应 `tests/*.test.js`。

## 硬性约束

- ❌ 不要整文件读 `server.js`（约 21k 行）。先 grep 定位函数/行号，再按需读片段。
- ❌ 不要读大 JSON 数据文件（`home-ai-call-history.json` ~33MB、`home-ai-feedback-memory.json`、`home-ai-score-records.json`、`home-component-library.json` 等）——它们是运行时产物。
- ❌ 不要对全项目做无目标扫描 / 递归列目录后逐个打开。
- ❌ 不要碰 `auth-*` 子系统（除非任务明确涉及认证页）。
- ✅ 找东西就用 `grep -n`、Explore agent 或 PROJECT_MAP 的锚点表。

## 完成上下文加载后

用 3–5 行向用户汇报：
1. 当前分支与最近改动（来自 git diff）一句话总结。
2. 你对本次任务相关代码位置的定位（具体函数 + 行号）。
3. 计划的下一步（若涉及业务逻辑改动，先说明意图再动手）。

## 提醒（来自 CLAUDE.md）

- **Layout 现状问题**：渲染层支持左右布局（12 列 grid + `brickBackedSlotSpans`），但规划阶段（`buildHomepagePagePlan` / `compositionGroups`）只产纵向顺序，prompt 不鼓励多 slot/split，故输出千篇一律纵向堆叠。
- **改完必跑**：`npm run check` + `npm test`；验证 layout 用 `POST /api/home-ai/candidates`。

$ARGUMENTS

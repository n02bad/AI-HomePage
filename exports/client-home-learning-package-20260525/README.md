# 用户端首页学习包

这个文件夹是从当前项目的用户端首页旁路导出的副本，原始界面文件没有被改动。

## 入口

- `client-home.html`：用户端首页原入口副本。
- `index.html`：同一份首页入口副本，方便另一个项目直接把文件夹当静态站点打开。

## 建议预览

在本文件夹下启动静态服务：

```bash
python3 -m http.server 5173
```

然后访问：

```text
http://127.0.0.1:5173/client-home.html
```

## 文件作用

- `client-home.html`：页面结构、模块顺序、基础 DOM 模板。
- `client-home.css`：用户首页专属视觉样式。
- `client-home.js`：账户、钱包、快捷操作、复制、轮播和账户列表交互。
- `home-personalization.js`：AI 首页配置归一化、默认首页蓝图、模块渲染和主题落地逻辑。
- `home-personalization.css`：AI 蓝图首页、积木模块和个性化首页样式。
- `common-layout.js`：侧边栏、顶部栏、标签栏等共享用户端壳层。
- `theme.js` / `theme.css`：浅色/深色主题、租户主题 token。
- `styles.css`：基础后台/用户端共享样式。

## 给 AI 学习时的重点

优先学习 `client-home.html` 的模块语义和 `client-home.css` 的视觉层级；如果要学习“AI 如何生成/重组首页”，再看 `home-personalization.js` 里的 `DEFAULT_CONFIG`、`renderBlueprint()` 和 `applyConfig()`。


# DevTools 模板（#782）

A 级工具：纯前端本地生成与校验，无网络、无第三方 API。

## 功能

- **生成模板**：输入面板配置 JSON，生成 DevTools 扩展所需的三个文件：
  - `devtools.html`：DevTools 入口页，加载 `devtools.js`；
  - `panel.html`：面板页面骨架；
  - `panel.js`：调用 `chrome.devtools.panels.create` 创建面板，可选生成
    `elements.createSidebarPane` 侧边栏示例代码。
- **校验 manifest**：检查 `manifest_version` 为 3、`devtools_page` 存在且指向 `.html` 文件。

## 输入配置（JSON）

```json
{ "panelTitle": "我的面板", "sidebar": false }
```

```json
{ "panelTitle": "网络审计", "sidebar": true }
```

## 使用说明

1. 在上方输入框填写面板配置，点击「生成模板」得到三个文件的代码；
2. 在下方文本框粘贴 `manifest.json`，点击「校验 manifest」检查声明；
3. 将生成的文件放入扩展目录，并在 `manifest.json` 中声明
   `"devtools_page": "devtools.html"`。

## 说明

- 面板脚本可通过 `chrome.devtools.inspectedWindow` 与被检查页面通信；
- 本工具仅生成模板代码，不验证 Chrome 版本兼容性，详见 Chrome 官方文档。

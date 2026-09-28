# 跨浏览器兼容（#778）

A 级工具：纯前端本地处理，无网络、无第三方 API。

## 功能

- **API 对照**：内置 `chrome.*` 常用 API 在 Firefox（`browser.*`）与 Safari
  上的支持情况对照表（Promise / 回调 / 不支持），含备注说明。
- **垫片生成**（`task: "polyfill"`）：按所选 API 生成回调转 Promise 垫片代码——
  优先使用 `browser.*` Promise，在 Chrome 回退为回调封装。
- **兼容性扫描**（`task: "scan"`）：扫描扩展代码中的 `chrome.*` 调用点，逐个给出
  Firefox / Safari 兼容性建议；未收录的 API 会提示查阅 MDN。

## 输入（JSON）

```json
{ "task": "polyfill", "apis": ["storage.sync", "tabs.query"] }
```

```json
{ "task": "scan", "code": "chrome.tabs.query({active: true});" }
```

可用 API：`storage.sync`、`tabs.query`、`runtime.sendMessage`、`alarms.create`、
`contextMenus.create`、`action.setBadgeText`、`scripting.executeScript`。

## 说明

- 对照表覆盖主流场景但非穷尽，Safari 对 alarms / contextMenus / action
  等 API 不支持，相关代码需准备降级方案。
- 生成的垫片为通用模板，请按实际 API 签名调整后使用。
- 所有处理在浏览器本地完成，不发送任何网络请求。

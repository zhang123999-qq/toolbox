# Content Script 模板（#772）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **生成**：输入 JSON 配置，生成浏览器扩展 `content.js` 代码模板，包含：
  - 与 background / service worker 的消息通信骨架（`onMessage` + `sendMessage`）；
  - 可选特性：`dom-observe`（MutationObserver 监听 DOM 变化）、
    `context-menu`（右键选中文本上报给 background 创建菜单）、
    `storage-sync`（`chrome.storage.sync` 读写示例）。
- **校验**：matches 至少一个、符合 Chrome Match Pattern（`https://example.com/*` / `<all_urls>`）；
  runAt 限 `document_start / document_end / document_idle`；features 限已知三项。

## 输入配置（JSON）

```json
{
  "matches": ["https://example.com/*"],
  "runAt": "document_idle",
  "features": ["dom-observe", "storage-sync"]
}
```

## 说明

- 生成的代码可直接保存为扩展目录下的 `content.js`，并在 `manifest.json` 的
  `content_scripts` 中引用（可用 #771 Manifest V3 生成工具）。
- 所有处理在浏览器本地完成，不发送任何网络请求。

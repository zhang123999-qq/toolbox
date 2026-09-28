# Manifest V3 生成（#771）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **生成**：输入扩展配置，生成标准 `manifest.json`（强制 `manifest_version: 3`），
  支持 permissions / host_permissions / action / background service_worker /
  content_scripts。
- **校验**：name 非空、version 为 1～4 段数字版本号、权限在已知表内、
  host_permissions 格式合法、content_scripts 必填项齐全。
- **MV2 拦截**：检测到 `browser_action` / `page_action` /
  `background.persistent` 等 MV2 遗留字段时直接报错并给出 MV3 替代写法。

## 输入配置（JSON）

```json
{
  "name": "我的扩展",
  "version": "1.0.0",
  "description": "示例浏览器扩展",
  "permissions": ["storage", "activeTab"],
  "hostPermissions": ["https://api.example.com/*"],
  "action": { "defaultTitle": "打开", "defaultPopup": "popup.html" },
  "backgroundServiceWorker": "background.js",
  "contentScripts": [{ "matches": ["https://example.com/*"], "js": ["content.js"] }]
}
```

## 说明

- 校验失败时一次性列出全部中文错误。
- 生成结果可通过页面复制/下载按钮保存为 `manifest.json`。
- 所有处理在浏览器本地完成，不发送任何网络请求。

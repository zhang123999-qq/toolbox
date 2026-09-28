# Background 模板（#779）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **生成**：输入 JSON 配置，按所选事件生成 Manifest V3 Service Worker
  `background.js` 模板，事件可选：
  - `alarms`：定时任务（需 `alarms` 权限）；
  - `runtime.onInstalled`：安装 / 更新钩子；
  - `contextMenus`：右键菜单（需 `contextMenus` 权限）；
  - `runtime.onMessage`：与 content script / popup 的消息通信；
  - `tabs.onUpdated`：标签页更新监听（需 `tabs` 权限以读取 URL）。
- **保活说明**：`keepAlive: true` 时追加 MV3 保活说明片段。

## 输入配置（JSON）

```json
{
  "events": ["runtime.onInstalled", "runtime.onMessage", "alarms"],
  "keepAlive": false
}
```

## 说明

- **MV3 不支持 persistent 后台页**：Service Worker 会在空闲时被浏览器休眠，
  不要把状态放在内存变量里，应持久化到 `chrome.storage`；周期任务用
  `chrome.alarms`（最小间隔 1 分钟）。
- 生成的代码在 manifest.json 中声明 `"background": { "service_worker": "background.js" }`
  即可使用（可用 #771 Manifest V3 生成工具）。
- 所有处理在浏览器本地完成，不发送任何网络请求。

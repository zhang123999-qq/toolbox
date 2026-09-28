# Popup 模板（#780）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **生成**：输入 JSON 配置（title / width / height / features），生成
  `popup.html` / `popup.js` / `popup.css` 三文件模板。
- **特性**（features，可多选）：
  - `tabs`：读取当前标签页标题与 URL（需 `tabs` 权限或 `activeTab`）；
  - `storage`：配置读写示例（需 `storage` 权限）；
  - `i18n`：国际化文案示例（需 `_locales/<lang>/messages.json`）。

## 输入配置（JSON）

```json
{
  "title": "我的扩展",
  "width": 360,
  "height": 480,
  "features": ["tabs", "storage"]
}
```

## 说明

- 尺寸上限 800×600（Chrome popup 限制），超出会被校验拒绝。
- 生成的文件在 manifest.json 中声明 `"action": { "default_popup": "popup.html" }`
  即可使用（可用 #771 Manifest V3 生成工具）。
- 所有处理在浏览器本地完成，不发送任何网络请求。

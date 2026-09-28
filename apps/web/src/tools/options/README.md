# Options 模板（#781）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **生成**：输入 JSON 的 `fields` 数组，生成 `options.html` / `options.js`
  两文件模板，配置经 `chrome.storage.sync` 读写。
- **字段类型**（type）：
  - `text`：单行文本；
  - `checkbox`：复选框；
  - `select`：下拉框（需 `options` 非空数组）；
  - `number`：数字输入。
- **校验**：key 须字母开头、仅含字母数字下划线；label 非空；select 的
  `defaultValue` 必须是 options 中的一项；key 不可重复。

## 输入（JSON）

```json
{
  "fields": [
    { "key": "apiHost", "label": "接口地址", "type": "text", "defaultValue": "https://api.example.com" },
    { "key": "enableNotify", "label": "启用通知", "type": "checkbox", "defaultValue": true },
    { "key": "theme", "label": "主题", "type": "select", "options": ["light", "dark"], "defaultValue": "light" },
    { "key": "refreshInterval", "label": "刷新间隔（秒）", "type": "number", "defaultValue": 60 }
  ]
}
```

## 说明

- 生成的文件在 manifest.json 中声明 `"options_page": "options.html"`
 （或 `options_ui`）即可使用（可用 #771 Manifest V3 生成工具）。
- 所有处理在浏览器本地完成，不发送任何网络请求。

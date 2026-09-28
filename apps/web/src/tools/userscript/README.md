# 油猴脚本模板（#773）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **生成**：输入脚本元信息 JSON，生成 Tampermonkey 用户脚本：
  `// ==UserScript==` 头注释（name / namespace / version / description / author /
  match / grant / run-at）+ `(function() { 'use strict'; ... })();` 脚本骨架。
- **校验**：必填四项非空、version 为 `x.y.z` 数字版本号、matches 符合 Match Pattern、
  grants 限白名单（`none` 不可与其他混用）、runAt 限
  `document-start / document-end / document-idle`。
- **按需示例**：grants 含 `GM_addStyle` 时生成样式注入示例；
  含 `GM_registerMenuCommand` 时生成菜单命令示例。

## 输入配置（JSON）

```json
{
  "name": "示例油猴脚本",
  "namespace": "https://toolbox.example/userscripts",
  "version": "1.0.0",
  "description": "在示例站点自动执行的小脚本",
  "author": "",
  "matches": ["https://example.com/*"],
  "grants": ["none"],
  "runAt": "document-end"
}
```

## 说明

- 生成结果可通过页面复制/下载按钮保存为 `.user.js`，拖入 Tampermonkey 安装。
- 所有处理在浏览器本地完成，不发送任何网络请求。

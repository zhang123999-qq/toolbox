# 扩展打包（#775）

A 级工具：纯前端本地打包，无网络。`fflate` 为仓库既有依赖。

## 功能

- **校验**：文件清单至少一个文件、必须包含 `manifest.json`；
  文件名不允许绝对路径、反斜杠或 `..`；重复文件名报错；
  content 须为字符串或 Uint8Array。
- **打包**：用 `fflate` 打成 zip（压缩等级 6），页面内下载 `extension.zip`，
  可直接用于 Chrome 扩展开发者模式「加载已解压的扩展程序」（解压后加载）。

## 输入清单（JSON）

```json
{
  "files": [
    { "name": "manifest.json", "content": "{ \"manifest_version\": 3, ... }" },
    { "name": "content.js", "content": "// content script\n" }
  ]
}
```

## 说明

- 所有处理在浏览器本地完成，不发送任何网络请求。
- 建议配合 #771 Manifest V3 生成、#772 Content Script 模板、
  #774 扩展图标使用，组成完整扩展脚手架。

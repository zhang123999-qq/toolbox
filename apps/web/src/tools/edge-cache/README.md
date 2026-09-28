# 边缘缓存（#816）

A 级工具：纯前端本地拼装与解析，无网络、无第三方 API。

## 功能

- **生成模式（build）**：右侧表单填写 max-age / s-maxage / stale-while-revalidate（秒）与 immutable / no-store / no-cache / must-revalidate 开关，实时拼出 Cache-Control 头；数值非法时中文报错；no-store 勾选后独占输出。
- **解析模式（parse）**：左侧粘贴已有 Cache-Control 响应头，输出人类可读的中文语义（如"浏览器缓存 3600 秒；CDN 缓存 86400 秒"）；未知指令忽略，非法指令值中文报错。
- **复制 / 下载**：输出可复制或下载为 `.txt`。

## 说明

- 生成的头部可直接用于 Worker 响应、CDN 或源站配置。
- 解析大小写不敏感，容忍多余空白与空片段。

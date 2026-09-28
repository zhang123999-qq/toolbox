# Netlify 配置（#815）

A 级工具：纯前端本地生成与校验，无网络、无第三方 API，不引入 TOML 依赖。

## 功能

- **校验**：左侧编写 netlify.toml，实时检查格式与结构；支持 `[build]`、`[[redirects]]`、`[[headers]]`、`[headers.values]` 四节子集，错误带行号中文提示。
- **规范输出**：校验通过后输出统一缩进的 TOML；from / to / for 必须以 `/` 开头；redirect status 仅允许 200 / 301 / 302 / 303 / 304 / 307 / 308 / 404 / 410。
- **摘要**：显示是否含 [build] 及 redirects / headers 条目数。
- **复制 / 下载**：输出可复制或下载为 `.toml`。

## 说明

- 解析器为手写子集实现，仅覆盖本工具生成的写法；复杂 TOML（含多行字符串、日期类型等）不在支持范围。
- 校验通过的 TOML 可直接保存为项目根目录的 `netlify.toml`。

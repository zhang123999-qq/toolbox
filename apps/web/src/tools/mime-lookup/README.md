# MIME 查询

按扩展名查 MIME 类型，或按 MIME 类型反查扩展名，支持关键词模糊搜索。

## 用途

给上传接口纠 `<input accept>` 的取值、给 CDN 补 `Content-Type`、核对 nginx / Spring /
Django 的 mime.types 配置，都不用再翻 RFC 表格。内置一份常用对照表（150 余条），
一次可以贴多行查询词，逐行给出结果。

## 输入

| 字段   | 类型   | 约束             |
| ------ | ------ | ---------------- |
| `text` | string | 最大 10,000 字符 |

每行一个查询词；空行跳过。扩展名写法可以是 `png`、`.png`、`PNG`、甚至 `*.png`。

## 输出

| 字段   | 类型   | 说明                     |
| ------ | ------ | ------------------------ |
| `text` | string | 查询结果；空输入返回空串 |

## 选项

| 选项     | 取值                               | 默认       | 说明                                       |
| -------- | ---------------------------------- | ---------- | ------------------------------------------ |
| `mode`   | `ext2mime` / `mime2ext` / `search` | `ext2mime` | 扩展名查 MIME / MIME 反查扩展名 / 模糊搜索 |
| `strict` | boolean                            | `false`    | 未命中时报错而非输出「未收录」             |

### 各模式的输出形态

- `ext2mime`：`png → image/png   PNG 图片`
- `mime2ext`：`image/jpeg → .jpg .jpeg .jpe   JPEG 图片`（同一类型的别名一次列全）
- `search`：先输出 `“关键词” 命中 N 条：`，下面逐条列出扩展名、MIME、说明。
  排序为「扩展名完全相等 → MIME 完全相等 → 扩展名前缀 → MIME 前缀 → 说明或 MIME 含关键词」，
  因此 `js` 一定排在 `json` 前面。每个关键词最多返回 20 条。

## 限制

- **内置表只有 150 余条常用记录**，远小于 IANA 全量 media-types（上千条）。
  冷门类型（各类 `application/vnd.*`）请自查规范或 server 的 mime.types。
- `mime2ext` 只做精确匹配，`application/octet-stream` 这类「容器类型」不会反查到
  所有二进制扩展名；反查时会列出所有别名，不做「推荐主扩展名」的判断。
- **`.ts` 存在歧义**：本工具按 nginx mime.types 口径记为 `video/mp2t`（MPEG-TS 传输流），
  TypeScript 源码场景请自行改判为 `text/typescript` 之类。
- 模糊搜索只对扩展名、MIME、中文说明做子串匹配，不支持拼音、缩写与容错拼写。
- 不校验 MIME 是否已被 IANA 注册（`application/x-*` 一类私有前缀原样收录）。

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（ext2mime）：

```text
png
.svg
webp
JPG
```

输出：

```text
png → image/png   PNG 图片
svg → image/svg+xml   SVG 矢量图
webp → image/webp   WebP 图片
jpg → image/jpeg   JPEG 图片
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #181                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P0                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |

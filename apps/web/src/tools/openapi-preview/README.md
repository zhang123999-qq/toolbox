# OpenAPI 预览

粘贴 OpenAPI 3.x（或 Swagger 2.0 结构近似）JSON，结构化预览有哪些路径、方法、参数与响应。
纯本地解析，不依赖 swagger-parser。

## 用途

拿到一份 `openapi.json` 想快速扫一眼「这个 API 有哪些接口、每个接口收什么参、返回什么码」，
而不打开 Swagger UI。本工具把 `paths` 摊成可读大纲。

## 输入

| 字段   | 类型   | 约束                            |
| ------ | ------ | ------------------------------- |
| `text` | string | OpenAPI JSON，最大 200,000 字符 |

## 输出

- 文档标题、版本、OpenAPI 版本
- 每条路径下每个方法（GET/POST/PUT/DELETE/PATCH…）
  - 摘要、operationId
  - 参数（name / in=query/path/header / 是否必填）
  - 请求体 MIME 类型
  - 响应状态码列表

## 示例

```text
标题：示例 API
版本：1.0.0
OpenAPI：3.0.3

共 2 条路径：

GET /users
  摘要：列出用户
  参数：
    - page（in=query）
  响应：200, 500
```

## 限制

- 只解析 JSON 输入，不支持 YAML（请先把 YAML 转成 JSON）
- 不展开 `$ref` 引用，只显示字段是否存在，不深入 schema 细节
- 不做文档合法性校验，格式错误只报到「不是 JSON / 缺 paths」这一层
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 不发送网络请求。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #211                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |

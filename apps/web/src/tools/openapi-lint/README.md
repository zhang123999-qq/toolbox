# OpenAPI 规范检查（#745）

纯前端工具，无网络请求。

## 功能

粘贴 OpenAPI 3.x 规范（JSON 或 YAML），工具做 lint 检查并给出 0–100 评分。
这是**规范检查**，与 `openapi-preview`（结构化预览）不同。

## 检查规则

- 顶层：`openapi: 3.x`、`info`、`info.title`、`info.version`、`paths` 非空
- 每个 operation：有 `summary`/`description`（警告）、`operationId` 唯一（重复为错误）
- 参数：`name`/`in` 合法、有 `description`、`path` 参数建议 `required: true`
- `requestBody`：`$ref` 可解析、有 `content`
- `responses`：非空、每个响应有 `description`、建议包含 2xx
- 路径命名：建议 kebab-case（小写短横线）

## 说明

- YAML 解析为手写子集（映射 / 列表 / 标量），复杂结构请用 JSON。
- 内部 `$ref`（如 `#/components/schemas/User`）解析一层。
- 评分：错误 −10 分、警告 −3 分，最低 0 分。

# API 文档生成（#756）

A 级工具：纯本地文本生成，无网络请求。

## 功能

主输入为接口定义 JSON（单个对象或数组），批量生成 Markdown API 文档：
文档标题、版本、目录（锚点链接）、每个接口的独立章节（方法+路径、描述、
请求头表、查询参数表、请求体示例、响应示例）。

接口定义字段：

- `name`（必填）：接口名称
- `method`（必填）：GET / POST / PUT / DELETE / PATCH / HEAD
- `path`（必填）：以 `/` 开头
- `description`：接口描述
- `headers`：`[{ name, required, description }]`
- `queryParams`：`[{ name, type, required, description }]`
- `bodyExample` / `responseExample`：示例文本（JSON 会按代码块渲染）

## 说明

- 与 `openapi-preview`（OpenAPI 规范预览）差异化：本工具从表单化定义直接生成
  Markdown 文档，不需要写完整的 OpenAPI YAML/JSON。
- 测试为纯本地单测，无网络依赖。

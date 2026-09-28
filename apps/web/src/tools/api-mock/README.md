# API Mock 端点模拟（#743）

纯前端工具，无网络请求。

## 功能

定义 mock 路由规则（JSON 数组），输入模拟请求行（如 `GET /users/123?active=true`），
工具按顺序匹配路由并返回预设响应。这是对**端点行为**的模拟（请求匹配 → 响应），
与 `mock-data`（按字段定义生成 mock 数据）不同。

## 路由规则字段

- `method`：GET/POST/…，`*` 通配所有方法
- `pathPattern`：`/users/:id` 命名参数、`/static/*` 通配
- `status`：100–599
- `headers`：响应头对象（可选）
- `bodyTemplate`：响应体模板，支持占位 `{{query.x}}` / `{{param.id}}` / `{{body.a.b}}`
- `delayMs`：模拟延迟（展示用，不实际等待）

## 说明

- 模板变量缺失、无匹配路由时均给出中文提示。
- 请求体需为合法 JSON（可空）。

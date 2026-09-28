# HTTP 断言测试（#748）

D 级工具：会在浏览器内向目标 URL 发起真实请求。

## 功能

输入 URL、方法、请求头、请求体与断言规则（JSON 数组），工具执行请求并逐条断言，
输出测试报告（通过/失败、状态码、耗时）。

## 断言类型

- `status`：状态码等于 `expected`
- `statusRange`：状态码在 `[min, max]` 区间
- `header`：响应头存在（`name`），或等于 `expected`
- `bodyContains`：响应体包含 `text`
- `bodyJsonPath`：JSON 响应体按点路径（如 `data.list.0.name`）取值并深度比较 `expected`
- `timeLt`：响应耗时小于 `ms` 毫秒

## 说明

- 请求在浏览器内发起：**目标服务器必须允许 CORS**，否则浏览器会拦截响应并报中文错误。
- 可与 `postman-import`（#751）联动：导入 Collection 后可导出为本工具的断言任务 JSON。
- 测试中 fetch 全部 mock，不发起真实网络请求。

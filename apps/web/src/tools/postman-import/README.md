# Postman 导入（#751）

纯前端工具，无网络请求。

## 功能

粘贴 Postman Collection v2.1 JSON，解析出请求列表（名称、方法、URL、请求头、查询参数、请求体），
支持选择请求查看详情，并一键导出为 HTTP 断言测试（#748）可用的断言任务 JSON。

## 解析说明

- 仅支持 Collection v2.1（按 `info.schema` 判定）。
- URL 支持字符串与 `{raw, host[], path[]}` 对象两种形式。
- 文件夹递归展开，请求名带路径前缀（如 `用户 / 获取用户`）。
- 请求体支持 `raw` 与 `urlencoded`；`form-data` / `file` 暂不支持（会中文提示）。
- `disabled` 的请求头 / 查询参数会被跳过。

## 联动

导出的断言任务 JSON 可直接粘贴到 #748 使用：`url`、`method`、`headers`（Key: Value 多行文本）、
`body` 填入对应输入框，`assertions` 数组填入断言规则框。

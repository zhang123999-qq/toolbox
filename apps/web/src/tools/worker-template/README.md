# Worker 模板（#806）

A 级工具：纯前端本地生成，无网络、无第三方 API。

## 功能

- **路由分发**：在主输入框按 `METHOD /path` 逐行填写路由，生成 `handleRouteN` 处理函数与分发分支；`#` 开头为注释行。
- **绑定声明**：勾选 KV / D1 / R2 后，在 `Env` 接口中生成 `KVNamespace` / `D1Database` / `R2Bucket` 绑定。
- **Cron 定时**：勾选后生成 `scheduled` 处理器，需同时填写 cron 表达式。
- **名称校验**：Worker 名称须为小写字母、数字与连字符，以字母或数字开头，不超过 63 字符。

## 说明

- 生成的 `worker.js` 可直接使用；KV / D1 / R2 绑定还需在 `wrangler.toml` 中声明对应命名空间 / 数据库 / 存储桶（可用本站 KV 配置 / D1 配置 / R2 配置工具生成）。
- Cron 表达式需同步写入 `wrangler.toml` 的 `[triggers]` 小节 `crons` 数组。
- 模板为起点代码，复杂路由建议改用 `itty-router` 等路由库。

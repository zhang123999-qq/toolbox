# GraphQL 测试（#752）

D 级工具：会在浏览器内向目标端点发起真实 POST 请求。

## 功能

输入 GraphQL 端点 URL、查询语句、变量（JSON）与请求头，工具以 POST `{query, variables}`
发送请求，`data` 与 `errors` 分开展示。内置标准内省查询，一键填入即可查看端点 schema。

## 查询校验

发送前做够用级别的校验：括号配平（忽略字符串与注释内的括号）、
含 `query` / `mutation` / `subscription` / `fragment` 关键字或匿名查询块；非法时中文提示。

## 说明

- 请求在浏览器内发起：**目标服务器必须允许 CORS**，否则浏览器会拦截响应并报中文错误。
- 测试中 fetch 全部 mock，不发起真实网络请求。

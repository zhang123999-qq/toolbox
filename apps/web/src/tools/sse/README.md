# SSE 测试（#754）

C 级工具：使用浏览器原生 EventSource 直连目标服务器。

## 功能

输入 SSE 地址建立连接，实时查看事件流日志（含事件名、Last-Event-ID、数据）。
支持自定义事件名监听（逗号分隔，如 `update, notification`）。

## 说明

- 浏览器直连：目标服务器需允许跨域（CORS）且返回 `Content-Type: text/event-stream`。
- Last-Event-ID 由浏览器自动维护，断线重连时自动带上。
- 无需后端、无 API Key，连接信息只存在页面内存中。
- 测试中 EventSource 全部 mock，不发起真实连接。

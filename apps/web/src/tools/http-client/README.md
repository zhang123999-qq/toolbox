# HTTP 请求测试

在浏览器内向任意 URL 发 GET / POST / PUT / DELETE / PATCH 请求，查看状态码、响应头与响应体。

## 用途

临时调一个接口看返回，不用开 Postman / curl。填 URL、必要时加请求头和 body，点运行即可。

## 输入

| 字段             | 类型   | 说明                      |
| ---------------- | ------ | ------------------------- |
| `text`（主输入） | string | 请求 URL，需 `http(s)://` |
| 请求头           | string | 每行一条 `Key: Value`     |
| 请求体           | string | POST/PUT/PATCH 的 body    |

## 选项

| 选项         | 说明                                             |
| ------------ | ------------------------------------------------ |
| 请求方法     | GET / POST / PUT / DELETE / PATCH                |
| no-cors 模式 | 发送不透明请求；**读不到响应**，仅用于「打一下」 |

## 输出

```text
GET https://httpbin.org/get
状态：200 OK
响应头：
  content-type: application/json
  ...
响应体：
{ ... }
```

## 浏览器边界（重要）

- 这是**浏览器 fetch**，受同源策略限制：目标服务器必须返回 `Access-Control-Allow-Origin`，
  否则请求会被 CORS 拦下并报网络错误
- 浏览器**无法自定义** `Host` / `User-Agent` / `Content-Length` 等禁止修改的头
- `no-cors` 模式能发出去但响应不透明，用来测 webhook 触达可以，看返回不行
- 这不是服务端请求：从你自己的浏览器 IP 发出，别拿它调内网地址

## 数据流向

**浏览器发起 fetch（C 类）。** 不经过本工具后端。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #209                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P1                      |
| 可行性   | C（浏览器 fetch）       |
| 模板     | T2（双栏）              |

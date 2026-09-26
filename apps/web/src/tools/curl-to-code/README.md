# cURL 转代码

把浏览器「复制为 cURL」得到的命令，一键转成 fetch / Node.js / Python / Java / Go 的请求代码。
纯本地手写解析器，不依赖 curlconverter。

## 用途

抓包工具（Chrome DevTools、Charles）导出的请求经常是一长串 `curl`，
直接拿去对接后端或写脚本时还得手工翻译。本工具解析 `-X` / `-H` / `-d` / `-u` 等参数，
按目标语言生成可直接改改用的代码。

## 输入

| 字段   | 类型   | 约束                              |
| ------ | ------ | --------------------------------- |
| `text` | string | 一条 cURL 命令，最大 200,000 字符 |

支持单/双引号、反斜杠续行、`-H` 多个请求头、`-d` 请求体、`-u` Basic 认证。

## 选项

| 选项     | 取值                                                    |
| -------- | ------------------------------------------------------- |
| 目标语言 | `fetch`（浏览器 JS）/ `node` / `python` / `java` / `go` |

## 解析规则

| cURL 参数                     | 落地结果                                   |
| ----------------------------- | ------------------------------------------ |
| 裸位置参数 / `--url`          | 请求 URL                                   |
| `-X / --request`              | 显式方法；否则有 body → `POST`，否则 `GET` |
| `-H / --header`               | 请求头（可多个）                           |
| `-d / --data-raw / ...`       | 请求体                                     |
| `-u / --user`                 | 生成 `Authorization: Basic base64(...)`    |
| `-A / --user-agent`           | User-Agent 头                              |
| `-i/-s/-k/-L/--compressed` 等 | 仅影响 curl 行为，转代码时忽略             |

## 示例

输入：

```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name":"小张","age":25}'
```

输出（fetch）：

```js
const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: `{"name":"小张","age":25}`,
})
const text = await res.text()
console.log(res.status, text)
```

## 限制

- 不解析 `--cookie` 的复杂内容、`--proxy`、多步 `--config` 文件
- shell 展开（`$VAR`、`~`、命令替换）不会被求值，按字面量保留
- 生成代码是**起点模板**，生产用前请按需调整错误处理与类型
- 输入上限 200,000 字符

## 数据流向

**纯本地处理。** 不发送网络请求。`meta.api = false`。

## 元信息

| 项       | 值                      |
| -------- | ----------------------- |
| 全局编号 | #210                    |
| 域       | `devops`（开发 / 运维） |
| 大组     | `dev`                   |
| 优先级   | P0                      |
| 可行性   | A（纯 JS）              |
| 模板     | T2（双栏）              |

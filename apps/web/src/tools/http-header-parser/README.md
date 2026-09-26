# HTTP Header

解析 HTTP 请求 / 响应头为结构化数据，或由键值对生成头文本。

## 用途

把 `curl -v`、浏览器开发者工具、`ngx.headers` 里粘出来的原始头文本整理成可核对的清单，
反过来也能先用 JSON / 键值对描述要发的头，再拼成可以直接塞进代码的头文本。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

## 输出

| 字段   | 类型   | 说明                                   |
| ------ | ------ | -------------------------------------- |
| `text` | string | 解析结果或生成的头文本；空输入返回空串 |

## 选项

| 选项        | 取值              | 默认    | 说明                                      |
| ----------- | ----------------- | ------- | ----------------------------------------- |
| `direction` | `parse` / `build` | `parse` | 解析原始头，还是由键值对生成头文本        |
| `format`    | `json` / `text`   | `text`  | 解析输出的写法，同时决定 build 的输入写法 |

### 各模式的输入形态

- `direction=parse`：贴一段原始头。首行若是请求行（如 `GET / HTTP/1.1`）或状态行
  （如 `HTTP/1.1 200 OK`）会被识别为起始行；随后每行按 `名称: 值` 解析。
- `direction=build` + `format=text`：每行一个 `名称: 值`，`#` 开头的行视为注释跳过；
  首行若形如请求行 / 状态行，会被原样放到输出的第一行。
- `direction=build` + `format=json`：JSON 顶层可以是
  ① 对象 `{"Content-Type":"text/plain"}`
  ② 数组 `[{"name":"X-A","value":"1"}]`
  ③ 本工具 `parse` + `json` 的输出（可直接回环重建）。
  对象的值若是数组，会按同名重复展开成多行（写 `Set-Cookie` 很方便）。

## 限制

- 只处理头（head）：遇到第一个空行即停止解析，之后的正文会被忽略。
- 支持 obsolete 折行（行首空格 / 制表符续接上一行的值），按 1 个空格拼接到上一个值尾部，
  不还原原始换行。
- build 输出用 `\n` 连接。HTTP 协议要求 CRLF，用于真实报文时请自行替换。
- 不做语义校验：不检查 Host 是否必填、Content-Length 是否与正文一致、`Set-Cookie`
  属性是否合法，也不折叠同名字段。

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

输入（parse + text）：

```http
GET /api/tools?page=2 HTTP/1.1
Host: toolbox.example.com
Accept: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9
```

输出：

```text
起始行: GET /api/tools?page=2 HTTP/1.1
Host      : toolbox.example.com
Accept    : application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9

共 3 个字段
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #180                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P0                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |

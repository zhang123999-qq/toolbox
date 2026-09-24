# Cookie 解析

Cookie / Set-Cookie 串与对象互转，支持属性标志位。

## 用途

排查登录态问题时核对 `Set-Cookie` 的属性（`Path` / `Max-Age` / `HttpOnly` / `Secure`），
或把对象快速拼成请求头用的 `Cookie` 串。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 100,000 字符 |

解析模式接受：`a=1; b=2` 或 `sid=x; Path=/; HttpOnly; Secure`。
生成模式要求：JSON 对象文本（值为字符串 / 数字 / 布尔）。

## 输出

| 字段   | 类型   | 说明                                           |
| ------ | ------ | ---------------------------------------------- |
| `text` | string | 解析模式为缩进 2 的 JSON；生成模式为 Cookie 串 |

## 选项

| 选项       | 取值              | 默认    | 说明                             |
| ---------- | ----------------- | ------- | -------------------------------- |
| `mode`     | `parse` / `build` | `parse` | 方向：串转对象 / 对象转串        |
| `sortKeys` | boolean           | `false` | 是否按键名排序（对两模式都生效） |

## 限制

- 无 `=` 的属性（如 `HttpOnly`）解析为 `true`；生成时 `true` 只输出键名
- 值中的等号不会截断（`token=a=b` → `"a=b"`）
- 不做 URL 解码，Cookie 值按原样保留

## 数据流向

**纯本地处理。** 输入内容仅在浏览器内存中处理，不发送任何网络请求，不写入服务端。
`meta.api = false`，无需自备 API/Key。

## 示例

解析（`mode=parse`）：

```text
sid=abc123; theme=dark; Path=/; HttpOnly; Secure
```

```json
{
  "sid": "abc123",
  "theme": "dark",
  "Path": "/",
  "HttpOnly": true,
  "Secure": true
}
```

生成（`mode=build`）：

```json
{ "sid": "abc123", "HttpOnly": true }
```

```text
sid=abc123; HttpOnly
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #179                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P0                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |

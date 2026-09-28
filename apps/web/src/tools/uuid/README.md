# UUID 生成 uuid（#376）

## 用途 | Purpose

- 用 `crypto.randomUUID()` 生成 RFC 4122 v4 版本 UUID，供数据库主键、会话标识、资源 ID 等场景使用。
- Generate RFC 4122 v4 UUIDs via `crypto.randomUUID()` for database keys, session IDs and resource identifiers.

## 输入 | Input

- 文本框：触发用，内容不参与生成。留空不输出；点「示例」或输入任意内容即生成。
- Textarea: trigger only. Leave empty for no output; click Example or type anything to generate.

## 选项 | Options

| 选项       | 说明                                                         | Option       | Description                                          |
| ---------- | ------------------------------------------------------------ | ------------ | ---------------------------------------------------- |
| 数量 count | 1–100 的整数，默认 1                                         | Count        | Integer 1–100, default 1                             |
| 大写输出   | 字母转大写，默认关闭                                         | Uppercase    | Uppercase letters, off by default                    |
| 保留横线   | 保留形如 `xxxxxxxx-…` 的横线，默认开启；关闭后输出 32 位 hex | Keep hyphens | Keep hyphens, on by default; off yields 32 hex chars |

## 输出 | Output

- 每行一个 UUID。默认小写带横线的标准 v4 格式。
- One UUID per line. Default is the standard lowercase hyphenated v4 format.

## 限制 | Limits

- 数量须为 1–100 整数；非法数量显示中文错误。
- 由浏览器原生 `crypto.randomUUID()` 生成，符合 v4（随机）版本与变体位。

## 数据流向 | Data flow

- 全部在浏览器本地生成，无网络请求、无依赖包。
- Generated entirely in the browser; no network, no dependencies.

## 示例 | Example

数量 2 →

```
f47ac10b-58cc-4372-a567-0e02b2c3d479
9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

（实际值随机）

## 元信息 | Meta

- 编号 #376 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: 无

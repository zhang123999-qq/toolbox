# ULID 生成 ulid（#378）

## 用途 | Purpose

- 按 ULID（Universally Unique Lexicographically Sortable Identifier）规范生成可按时间排序的随机 ID。
- Generate lexicographically sortable random IDs following the ULID specification.

## 输入 | Input

- 文本框：触发用，内容不参与生成。留空不输出；点「示例」或输入任意内容即生成。
- Textarea: trigger only. Leave empty for no output; click Example or type anything to generate.

## 选项 | Options

| 选项       | 说明                 | Option | Description              |
| ---------- | -------------------- | ------ | ------------------------ |
| 数量 count | 1–100 的整数，默认 1 | Count  | Integer 1–100, default 1 |

## 输出 | Output

- 每行一个 ULID，共 26 个 Crockford Base32 大写字符（不含 I/L/O/U）。
- One ULID per line: 26 Crockford Base32 uppercase characters (I/L/O/U excluded).

## 格式 | Format

- 前 10 字符为 48bit 毫秒时间戳，后 16 字符为 80bit 随机数。
- 时间戳越大字典序越大，因此同毫秒内的随机部分打乱、跨毫秒天然按时间排序。
- First 10 chars = 48-bit millisecond timestamp; last 16 chars = 80-bit randomness. Larger timestamps sort lexicographically later.

## 限制 | Limits

- 数量须为 1–100 整数；非法数量显示中文错误。
- 随机数经 `crypto.getRandomValues`；时间戳取自 `Date.now()`。

## 数据流向 | Data flow

- 全部在浏览器本地生成，无网络请求、无依赖包。
- Generated entirely in the browser; no network, no dependencies.

## 示例 | Example

```
01J9XK2M3Q8H4T6VYWZRDPNSBG
```

（实际值随时间随机）

## 元信息 | Meta

- 编号 #378 · category `random` · group `design` · 优先级 P1 · 可行性 A · 纯前端 · deps: 无

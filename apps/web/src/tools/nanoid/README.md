# NanoID 生成 nanoid（#377）

## 用途 | Purpose

- 生成 NanoID 风格的短随机 ID，URL 安全、无歧义，适合前端短链、对象 ID、临时标识等场景。
- Generate short URL-safe NanoID-style random IDs for short links, object IDs and temporary tokens.

## 输入 | Input

- 文本框：触发用，内容不参与生成。留空不输出；点「示例」或输入任意内容即生成。
- Textarea: trigger only. Leave empty for no output; click Example or type anything to generate.

## 选项 | Options

| 选项            | 说明                                                       | Option   | Description                                                  |
| --------------- | ---------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| 长度 length     | 1–64 的整数，默认 21                                       | Length   | Integer 1–64, default 21                                     |
| 字母表 alphabet | 生成所用字符集，默认 URL 安全 `A–Z a–z 0–9 _ -`（64 字符） | Alphabet | Character set, default URL-safe `A–Z a–z 0–9 _ -` (64 chars) |

## 输出 | Output

- 单个 NanoID 字符串，全部来自所选字母表。
- A single NanoID string drawn from the chosen alphabet.

## 限制 | Limits

- 长度须为 1–64 整数；字母表不能为空；非法选项显示中文错误。
- 随机数经 `crypto.getRandomValues` + 拒绝采样，无模偏差。

## 数据流向 | Data flow

- 全部在浏览器本地生成，无网络请求、无依赖包。
- Generated entirely in the browser; no network, no dependencies.

## 示例 | Example

默认 21 位 →

```
V1StGXR8_Z5jdHi6B-myT
```

（实际值随机）

## 元信息 | Meta

- 编号 #377 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: 无

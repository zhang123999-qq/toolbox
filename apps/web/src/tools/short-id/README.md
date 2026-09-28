# 短 ID 生成 short-id（#379）

## 用途 | Purpose

- 用加密安全随机数生成短小易读的 ID，适合短链、邀请码、临时口令、文件名后缀等场景。
- Generate short, readable random IDs for short links, invite codes, temporary tokens and filename suffixes.

## 输入 | Input

- 文本框：触发用，内容不参与生成。留空不输出；点「示例」或输入任意内容即生成。
- Textarea: trigger only. Leave empty for no output; click Example or type anything to generate.

## 选项 | Options

| 选项                       | 说明                             | Option         | Description                                      |
| -------------------------- | -------------------------------- | -------------- | ------------------------------------------------ |
| 长度 length                | 4–32 的整数，默认 8              | Length         | Integer 4–32, default 8                          |
| 字符集 charset             | alnum / alpha / hex / custom     | Charset preset | alnum / alpha / hex / custom                     |
| 排除易混淆字符             | 剔除 I l 1 O o 0，默认关闭       | No ambiguous   | Exclude I l 1 O o 0, off by default              |
| 自定义字符集 customCharset | 仅当 charset=custom 时生效，非空 | Custom charset | Used only when charset=custom; must be non-empty |

## 输出 | Output

- 单个短 ID 字符串，长度与字符集由选项决定。
- A single short ID string of the chosen length and charset.

## 限制 | Limits

- 长度须为 4–32 整数；custom 字符集不能为空；排除易混后字符集为空会提示。
- 随机数经 `crypto.getRandomValues` + 拒绝采样，无模偏差。

## 数据流向 | Data flow

- 全部在浏览器本地生成，无网络请求、无依赖包。
- Generated entirely in the browser; no network, no dependencies.

## 示例 | Example

字符集 alnum、长度 8 →

```
Kx9mQ2vL
```

（实际值随机）

## 元信息 | Meta

- 编号 #379 · category `random` · group `design` · 优先级 P1 · 可行性 A · 纯前端 · deps: 无

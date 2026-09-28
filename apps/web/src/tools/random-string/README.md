# 随机字符串 random-string（#372）

## 用途 | Purpose

- 用加密安全随机数生成指定长度的随机字符串，供 token、密钥、会话标识等场景使用。
- Generate cryptographically random strings of a given length for tokens, keys and session IDs.

## 输入 | Input

- 文本框：触发用，内容不参与生成。留空不输出；点「示例」或输入任意内容即生成。
- Textarea: trigger only. Leave empty for no output; click Example or type anything to generate.

## 选项 | Options

| 选项                       | 说明                                                            | Option         | Description                                                     |
| -------------------------- | --------------------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| 长度 length                | 1–512 的整数，默认 32                                           | Length         | Integer 1–512, default 32                                       |
| 字符集 charset             | alnum / alpha / lower / upper / numeric / hex / base64 / custom | Charset preset | alnum / alpha / lower / upper / numeric / hex / base64 / custom |
| 自定义字符集 customCharset | 仅当 charset=custom 时生效，非空                                | Custom charset | Used only when charset=custom; must be non-empty                |

## 输出 | Output

- 单个随机字符串，长度与字符集由选项决定。
- A single random string of the chosen length and charset.

## 限制 | Limits

- 长度须为 1–512 整数；custom 字符集不能为空；未知预设 / 非法长度显示中文错误。
- 随机数经 `crypto.getRandomValues` + 拒绝采样，无模偏差。

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求、无依赖包。
- All locally in the browser; no network, no dependencies.

## 示例 | Example

字符集 alnum、长度 32 →

```
x7Kp2mQv9Lw3Bn4RtYc6HfDsEjUgZaXb
```

（实际值随机）

## 元信息 | Meta

- 编号 #372 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: 无

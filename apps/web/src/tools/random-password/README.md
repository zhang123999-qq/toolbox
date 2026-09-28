# 随机密码 random-password（#371）

## 用途 | Purpose

- 用加密安全随机数（CSPRNG）生成高强度随机密码，供账号注册、系统口令等场景使用。
- Generate strong random passwords with a CSPRNG for account credentials and system secrets.

## 输入 | Input

- 文本框：触发用，内容不参与生成。留空不输出；点「示例」或输入任意内容即生成一条密码。
- Textarea: trigger only, content is not used. Leave empty for no output; click Example or type anything to generate one password.

## 选项 | Options

| 选项           | 说明                              | Option            | Description                                                       |
| -------------- | --------------------------------- | ----------------- | ----------------------------------------------------------------- |
| 长度 length    | 8–128 的整数，默认 16             | Length            | Integer 8–128, default 16                                         |
| 包含大写字母   | A–Z，默认开启                     | Include uppercase | Include A–Z, on by default                                        |
| 包含小写字母   | a–z，默认开启                     | Include lowercase | Include a–z, on by default                                        |
| 包含数字       | 0–9，默认开启                     | Include numbers   | Include 0–9, on by default                                        |
| 包含符号       | !@#$%^&*()-_=+[]{}<>?/~，默认开启 | Include symbols   | Symbol set, on by default                                         |
| 排除易混淆字符 | 剔除 I l 1 O o 0，默认关闭        | No ambiguous      | Exclude visually confusing characters I l 1 O o 0, off by default |

## 输出 | Output

- 单行一个随机密码；每个启用的字符类至少出现一个字符。
- One random password per line; each enabled character class appears at least once.

## 限制 | Limits

- 长度须为 8–128 整数；一类字符都不勾选会报错；非法长度会显示中文错误。
- 随机数经 `crypto.getRandomValues` + 拒绝采样，无模偏差。

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求、无任何依赖包。
- All computation happens locally in the browser; no network requests, no dependencies.

## 示例 | Example

点「示例」后输出（实际值随机）：

```
K9#mQ2!vLp4sTw7x
```

## 元信息 | Meta

- 编号 #371 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: 无

# 图形验证码 captcha（#383）

## 用途 | Purpose

- 在 canvas 上绘制带随机旋转、随机颜色、干扰线与噪点的图形验证码，可一键刷新。
- Draw a graphical captcha on canvas with random rotation, colors, interference lines and noise dots; refresh on demand.

## 输入 | Input

- 无需输入文本，验证码由本地随机生成。
- No input needed; the captcha is generated locally.

## 选项 | Options

| 选项                   | 说明                                              | Option       | Description                   |
| ---------------------- | ------------------------------------------------- | ------------ | ----------------------------- |
| 长度 length            | 默认 4，范围 3–8                                  | Length       | default 4, range 3–8          |
| 字符集 charset         | alnum（字母数字）/ alpha（字母）/ numeric（数字） | Charset      | alnum / alpha / numeric       |
| 排除易混淆 noAmbiguous | 排除 O/0/I/1/l 等易混字符，默认开                 | No ambiguous | exclude O/0/I/1/l, default on |

## 输出 | Output

- 右侧 canvas 实时渲染验证码图片；「复制」可取到当前验证码文本。
- A live canvas image; "Copy" copies the current captcha text.

## 限制 | Limits

- 仅用于演示 / 前端体验，不具备真实防机器人能力；随机源为 crypto.getRandomValues。
- For demo/frontend experience only; not a real anti-bot control. Randomness via crypto.getRandomValues.

## 数据流向 | Data flow

- 全部在浏览器本地完成，无网络请求；卸载时清理 canvas。
- All local to the browser; no network. Canvas is cleared on unmount.

## 示例 | Example

长度 4、alnum、排除易混淆 → 生成类似 `K7mQ` 的图形验证码。

## 元信息 | Meta

- 编号 #383 · category `random` · group `design` · 优先级 P1 · 可行性 A · 纯前端 · deps: 无

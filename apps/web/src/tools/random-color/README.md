# 随机颜色 random-color（#373）

## 用途 | Purpose

- 批量生成随机颜色值，供 UI 调试、配色灵感、占位色块使用。
- Generate random color values in batch for UI debugging, color inspiration, or placeholder swatches.

## 输入 | Input

- 本工具无实质输入，文本框留空即可。
- No real input needed; leave the textarea empty.

## 选项 | Options

| 选项        | 说明                      | Option | Description                      |
| ----------- | ------------------------- | ------ | -------------------------------- |
| 数量 count  | 1–50 的整数，默认 1       | Count  | Integer 1–50, defaults to 1      |
| 格式 format | hex / rgb / hsl，默认 hex | Format | hex / rgb / hsl, defaults to hex |

## 输出 | Output

- 每行一个颜色值：`#rrggbb` / `rgb(r, g, b)` / `hsl(h, s%, l%)`。
- One color per line: `#rrggbb` / `rgb(r, g, b)` / `hsl(h, s%, l%)`.

## 限制 | Limits

- 数量上限 50；非法数量 / 格式会显示中文错误提示。
- 颜色在 Oklch 色彩空间（经 `culori` 转换）生成，保证感知均匀。
- Count capped at 50; invalid count / format shows a Chinese error.
- Colors are generated in Oklch (via `culori`) for perceptual uniformity.

## 数据流向 | Data flow

- 全部在浏览器本地计算，随机数取自 `crypto.getRandomValues`，无网络请求；依赖 `culori`。
- All computation happens locally in the browser; randomness from `crypto.getRandomValues`; no network requests. Depends on `culori`.

## 示例 | Example

数量 3、格式 hex →

```
#4d6df2
#388efb
#9c3bd6
```

（实际值随机）

## 元信息 | Meta

- 编号 #373 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: `culori`

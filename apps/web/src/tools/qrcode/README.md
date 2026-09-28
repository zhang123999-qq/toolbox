# 二维码生成 qrcode（#380）

## 用途 | Purpose

- 把文本或链接编码为二维码，输出可直接使用 / 保存的 SVG 源码。
- Encode text or a URL into a QR code and export it as ready-to-use SVG source.

## 输入 | Input

- 文本框：二维码内容（URL、文本、WiFi 配置串等）。
- Textarea: QR content (URL, plain text, WiFi config string, etc.).

## 选项 | Options

| 选项           | 说明                                     | Option           | Description                                    |
| -------------- | ---------------------------------------- | ---------------- | ---------------------------------------------- |
| 容错级别 level | L(7%) / M(15%) / Q(25%) / H(30%)，默认 M | Error correction | L / M / Q / H, default M                       |
| 尺寸 size      | 显示尺寸（px），默认 256，范围 64–1024   | Size             | Display size in px, default 256, range 64–1024 |

## 输出 | Output

- 一段带 XML 注释（版本 / 模块数 / 容错级别）的 SVG 字符串，含 4 模块静默区。
- An SVG string (with an XML comment of version / module count / EC level), including a 4-module quiet zone.

## 限制 | Limits

- 输入超过 2,000 字符会报错；非法容错级别或尺寸会显示中文错误提示。
- Input beyond 2,000 characters is rejected; invalid level or size shows a Chinese error.

## 数据流向 | Data flow

- 矩阵由本地 `qrcode` npm 包生成，无网络请求。
- The matrix is generated locally by the `qrcode` npm package; no network requests.

## 示例 | Example

输入：`https://example.com`，容错 M，尺寸 256 → 输出含 `<svg ...>...</svg>` 的源码。

## 元信息 | Meta

- 编号 #380 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: `qrcode`

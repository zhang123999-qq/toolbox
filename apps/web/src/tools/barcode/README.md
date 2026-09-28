# 条形码生成 barcode（#382）

## 用途 | Purpose

- 把 ASCII 可打印文本编码为 Code128 B 条形码，输出 SVG 源码。
- Encode printable ASCII text into a Code128 B barcode as SVG source.

## 输入 | Input

- 文本框：要编码的内容（仅空格到波浪线之间的 ASCII 可打印字符，最多 80 个）。
- Textarea: content to encode (printable ASCII space through tilde, up to 80 chars).

## 选项 | Options

| 选项              | 说明                             | Option       | Description                   |
| ----------------- | -------------------------------- | ------------ | ----------------------------- |
| 条高 height       | 默认 80，范围 20–200（px）       | Bar height   | default 80, range 20–200 px   |
| 线宽 lineWidth    | 模块宽度，默认 2，范围 1–5（px） | Module width | default 2, range 1–5 px       |
| 显示文本 showText | 是否在条码下方显示原文，默认开   | Show text    | render text below, default on |

## 输出 | Output

- 一段带 XML 注释（字符数 / 校验位）的 SVG，含左右各 10 模块静默区。
- An SVG string (with comment of char count / check digit), with 10-module quiet zones on both sides.

## 限制 | Limits

- 仅支持 Code128 B（可打印 ASCII）；含中文 / 控制字符或超 80 字符会报错。
- Code128 B only (printable ASCII); non-ASCII, control chars, or > 80 chars are rejected.

## 数据流向 | Data flow

- 编码（起始码 104、数据值 = ASCII−32、加权校验位 mod 103、终止码）在本地纯函数完成，无网络请求。
- Encoding (start 104, data value = ASCII−32, weighted checksum mod 103, stop) runs locally; no network.

## 示例 | Example

输入 `12345678` → 输出 Code128 B SVG，校验位自动计算。

## 元信息 | Meta

- 编号 #382 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: 无

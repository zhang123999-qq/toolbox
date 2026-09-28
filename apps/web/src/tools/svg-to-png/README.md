# SVG 转 PNG svg-to-png（#453）

## 用途 | Purpose

- 本地把 SVG 矢量图转为 PNG 位图：输出宽度/高度可选（空=自然尺寸），背景可选透明/白色/自定义颜色，全程不上传。
- Convert SVG vectors to PNG bitmaps locally: optional output width/height (empty = natural size), background transparent / white / custom color, no upload.

## 输入 | Input

- SVG 文件（`.svg` / `image/svg+xml`），单文件上限 50MB。
- SVG file (`.svg` / `image/svg+xml`), max 50MB per file.

## 选项 | Options

| 选项                   | 说明                                   | Option       | Description                                 |
| ---------------------- | -------------------------------------- | ------------ | ------------------------------------------- |
| 宽度 width             | 输出像素，空=自然尺寸，上限 16384      | Width        | Output px, empty = natural size, max 16384  |
| 高度 height            | 输出像素，空=自然尺寸，上限 16384      | Height       | Output px, empty = natural size, max 16384  |
| 背景 background        | 透明 / 白色 / 自定义                   | Background   | Transparent / white / custom                |
| 自定义颜色 customColor | 背景=自定义时有效，只接受 #rgb/#rrggbb | Custom color | Only when background=custom; #rgb / #rrggbb |

## 自然尺寸解析规则 | Natural size rules

输出宽高留空时使用 SVG 的自然尺寸，按以下顺序解析 `<svg>` 标签：

1. `width` / `height` 属性：只接受纯数字或 `px` 后缀（如 `width="200"`、`width="200px"`）；
   百分比、`pt` 等其他单位会被拒绝；
2. 退化到 `viewBox` 的后两个数（如 `viewBox="0 0 300 150"` → 300×150）；
3. 都解析不出时，用浏览器实际解码出的图片尺寸；
4. 仍未知时默认 512×512。

只填一边时，另一边按自然宽高比等比缩放（自然尺寸未知时取正方形）；
两边都填则直接使用，不做比例保持。

## 输出 | Output

- 原 SVG 与转换后 PNG 并排预览、输出尺寸与文件大小统计，一键下载 `.png`。
- Side-by-side preview of the original SVG and the converted PNG, output size/file-size stats, one-click `.png` download.

## 边界 | Limits

- 全程本地处理，不上传。
- 非法 SVG（Image 加载失败，如内容损坏或根本不是 SVG）会报错。
- **跨域限制**：SVG 内部通过 `<image>` 等引用外部资源的图片时，若该资源不允许跨域访问，
  绘制后 Canvas 会被“污染”（tainted），浏览器出于安全限制拒绝导出，转换失败。
  这是浏览器的安全机制，不是本工具的缺陷；把外部图片内联为 data URL 后可避免。

## 数据流向 | Data flow

文件 → 文本 → Blob URL → Image → 内存 Canvas → PNG Blob → 下载；不经过网络。

# ICO 生成 ico（#428）

## 用途 | Purpose

- 把任意图片转换为真正的多尺寸 `.ico` 图标文件：每个勾选尺寸缩放到正方形并编码为 PNG，手工组装标准 ICO 二进制（ICONDIR + ICONDIRENTRY + PNG 内嵌），可直接用作 Windows 应用 / 网站 favicon 的图标文件。
- Convert any image into a real multi-size `.ico` file: each selected size is scaled to a square and PNG-encoded, then assembled into a standard ICO binary by hand. Ready to use as a Windows app / website favicon file.
- 与「Favicon 生成」（favicon，#386）的区别：favicon 是**从零生成**图标（字母 / 渐变 / 几何三种样式，导出 SVG / PNG）；本工具是把**任意已有图片**转换为标准的多尺寸 `.ico` 容器文件。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项           | 说明                                                                      | Option | Description                                                                                   |
| -------------- | ------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| 包含尺寸 sizes | 16 / 24 / 32 / 48 / 64 / 128 / 256 px 复选，默认 16 / 32 / 48，至少选一个 | Sizes  | 16 / 24 / 32 / 48 / 64 / 128 / 256 px checkboxes, default 16 / 32 / 48, at least one required |

## 输出 | Output

- 最大选中尺寸的 PNG 预览、包含尺寸列表与文件大小，一键下载 `.ico` 文件（MIME `image/x-icon`）。
- PNG preview of the largest selected size, size list and file size, one-click `.ico` download (MIME `image/x-icon`).

## 边界 | Limits

- 全程本地 Canvas + 手工二进制组装，不上传，不引入新依赖。
- 256px 按 ICO 规范用 width/height 字节 `0` 表示（单字节存不下 256）。
- 每个尺寸内嵌 PNG（Vista 之后的标准做法），不做 BMP/DIB 位图编码；老旧系统只认 BMP 的图标可能无法显示 256px 条目。
- GIF 动图只取第一帧（Canvas 限制）。
- 浏览器不支持 PNG 导出时会报错。

## 数据流向 | Data flow

文件 → loadImageFromBlob → 每个尺寸 drawScaled 正方形缩放 → canvasToBlob('image/png') → buildIco 组装二进制 → Blob('image/x-icon') → 下载；不经过网络。

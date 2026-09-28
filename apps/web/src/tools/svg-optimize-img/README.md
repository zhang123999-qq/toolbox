# SVG 优化压缩 svg-optimize-img（#452）

## 用途 | Purpose

- 上传 `.svg` 文件，用 [svgo](https://github.com/svg/svgo)（v4，纯 JS）在本地压缩优化：去注释、冗余属性与多余空白，缩短数字精度。
- 显示原文件 / 优化后字节数、压缩率与节省字节数，可下载优化后的 `.svg`（原名 + `-optimized.svg`）。
- Upload a `.svg` file and optimize it locally with svgo v4 (pure JS): strips comments, redundant attributes and whitespace, shortens numeric precision. Shows before/after byte sizes, ratio and bytes saved; downloads the optimized `.svg`.

## 输入 | Input

- SVG 文件：扩展名为 `.svg` 或 MIME 类型为 `image/svg+xml`，单文件上限 50MB。
- 文件内容必须包含 `<svg` 标签，否则报错「不是有效的 SVG」。
- An SVG file: `.svg` extension or `image/svg+xml` MIME, max 50MB per file. Content must contain an `<svg` tag, otherwise an error "not a valid SVG" is shown.

## 选项 | Options

| 选项               | 说明                                             | Option    | Description                                             |
| ------------------ | ------------------------------------------------ | --------- | ------------------------------------------------------- |
| 多轮优化 multipass | 默认开；多次遍历直至无法继续压缩（更彻底，稍慢） | Multipass | On by default; multiple passes until no further savings |
| 格式化输出 pretty  | 默认关；输出带缩进换行的可读 SVG（体积略大）     | Pretty    | Off by default; indented human-readable output (larger) |

## svgo 说明 | About svgo

- svgo v4 为同步 API：`optimize(svgText, { multipass, js2svg: { pretty } })`，取返回值的 `data`（string）即优化后文本。
- 未传入 `plugins` 时默认使用 `preset-default` 预设；`pretty` 通过 `js2svg.pretty` 控制输出格式。
- The v4 API is synchronous; without `plugins` it uses the `preset-default` preset, and `pretty` is controlled via `js2svg.pretty`.

## 输出 | Output

- 优化后 SVG 预览、原大小 / 优化后大小 / 压缩率 / 节省字节统计，一键下载。
- Optimized SVG preview, before/after sizes, ratio and saved-bytes stats, one-click download.

## 边界 | Limits

- 全程本地处理（svgo 跑在浏览器主线程），不上传。
- 非 SVG 文件（扩展名/MIME 不符）直接拒绝；内容不含 `<svg` 标签报错「不是有效的 SVG」。
- svgo 解析失败（如畸形 XML）会透出原始错误信息。
- Processed fully locally (svgo runs on the browser main thread), no upload. Non-SVG files are rejected; content without an `<svg` tag errors; svgo parse failures surface the original error message.

## 数据流向 | Data flow

文件 → 文本 → svgo 优化 → Blob（image/svg+xml）→ 下载；不经过网络。

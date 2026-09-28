# 雪碧图生成 sprite-gen（#455）

## 用途 | Purpose

- 把多张图片拼成一张雪碧图（sprite sheet）：横向 / 纵向 / 网格三种布局，纯 Canvas 本地拼合。
- 同时输出每张子图的坐标数据：JSON（`[{name,x,y,w,h}]`）与 CSS（`background` 定位规则），一键复制，直接用于网页开发。
- Combine multiple images into one sprite sheet (horizontal / vertical / grid) with pure Canvas, plus per-sprite coordinates as JSON and CSS for web development.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，可多选（`multiple`），至少 2 张才拼合。
- 每张独立校验：类型须为支持的图片格式，单张上限 50MB；不合法的文件会被跳过并提示。
- 文件列表显示缩略图、文件名、尺寸与大小；支持删除单张、清空全部。
- Image files: PNG / JPEG / WebP / GIF / BMP / AVIF, multiple selection, at least 2 to compose.
- Each file is validated independently (type / 50MB limit); invalid files are skipped with an error.
- Thumbnails with name, dimensions and size; remove one or clear all.

## 选项 | Options

| 选项            | 说明                                        | Option    | Description                              |
| --------------- | ------------------------------------------- | --------- | ---------------------------------------- |
| 布局 direction  | horizontal 横向 / vertical 纵向 / grid 网格 | Direction | horizontal / vertical / grid             |
| 列数 columns    | 1–10，默认 4（仅网格布局有效）              | Columns   | 1–10, default 4 (grid only)              |
| 间距 gap        | 子图之间 px，0–100，默认 0                  | Gap       | px between sprites, 0–100, default 0     |
| 输出格式 format | png（默认，保留透明）/ jpeg                 | Format    | png (default, keeps transparency) / jpeg |
| 质量 quality    | 1–100，默认 90（仅 jpeg 有效）              | Quality   | 1–100, default 90 (jpeg only)            |

选项变更后自动重新拼合，无需手动触发。

## 输出 | Output

- 拼合图预览 + 一键下载（`sprite.png` / `sprite.jpg`）。
- 坐标 JSON（只读文本区 + 复制按钮），示例：
  ```json
  [
    {
      "name": "logo.png",
      "x": 0,
      "y": 0,
      "w": 100,
      "h": 50
    },
    {
      "name": "icon.png",
      "x": 100,
      "y": 0,
      "w": 60,
      "h": 80
    }
  ]
  ```
- CSS 代码（只读文本区 + 复制按钮），示例：
  ```css
  .logo {
    width: 100px;
    height: 50px;
    background: url(sprite.png) -0px -0px;
  }
  .icon {
    width: 60px;
    height: 80px;
    background: url(sprite.png) -100px -0px;
  }
  ```
- 复制走 `navigator.clipboard.writeText`；成功/失败均有行内提示（浏览器拒绝剪贴板权限时显示错误）。
- Composed preview + one-click download (`sprite.png` / `sprite.jpg`).
- Coordinate JSON and CSS in read-only textareas with copy buttons, e.g. above.
- Copy uses `navigator.clipboard.writeText` with inline success/failure tips.

## 边界 | Limits

- 至少 2 张图片才生成；只有 1 张时显示提示，不拼合。
- 雪碧图通常需要透明通道，默认输出 PNG；选 JPEG 会丢失透明。
- 网格布局的列数若超过图片数，多余空列不计入总宽。
- GIF 动图只取第一帧拼合（Canvas 限制）。
- CSS 类名由文件名派生：去扩展名、小写、非法字符转 `-`；中文名或空名兜底为 `sprite`，数字开头加 `s-` 前缀。
- At least 2 images required; a hint is shown otherwise.
- PNG is the default to keep transparency; JPEG drops the alpha channel.
- Grid columns beyond the image count don't add extra width.
- Animated GIFs contribute only their first frame (Canvas limitation).
- CSS class names derive from file names: extension stripped, lowercased, illegal chars become `-`; Chinese/empty names fall back to `sprite`, leading digits get an `s-` prefix.

## 数据流向 | Data flow

文件 → 内存 Image → 拼合 Canvas → Blob（下载）/ 坐标文本（复制）；object URL 在删除、清空、重拼时及时 `revoke`，不经过网络。

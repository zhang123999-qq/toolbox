# PDF 旋转 pdf-rotate（#484）

## 用途 | Purpose

- 本地旋转 PDF 页面：选择顺时针旋转角度（90° / 180° / 270°），可作用于整文档或指定页面。
- 页范围写法如 `1-3,5`（第 1–3 页和第 5 页）；非法输入会明确报错。
- Rotate PDF pages locally: 90° / 180° / 270° clockwise, whole document or specific pages.
- Page ranges like `1-3,5`; invalid input produces a clear error.

## 输入 | Input

- 单个 PDF 文件，上限 50MB（按 `%PDF` 魔数头校验，不依赖扩展名）。
- 加密（带密码）的 PDF 无法处理，会明确提示先解密。
- Single PDF file, max 50MB (validated by `%PDF` magic header, not the extension).
- Encrypted (password-protected) PDFs are rejected with a clear message.

## 选项 | Options

| 选项           | 说明                       | Option     | Description                         |
| -------------- | -------------------------- | ---------- | ----------------------------------- |
| 旋转角度 angle | 90 / 180 / 270（顺时针）   | Angle      | 90 / 180 / 270 (clockwise)          |
| 旋转范围 scope | 全部页面 / 指定页面        | Scope      | All pages / specific pages          |
| 页码范围 pages | 如 `1-3,5`，指定页面时有效 | Page range | e.g. `1-3,5`, used when scope=pages |

## 输出 | Output

- 旋转后的 PDF，一键下载（原名 + `-rotated.pdf`）。
- Rotated PDF, one-click download (original name + `-rotated.pdf`).

## 边界 | Limits

- 全程本地 pdf-lib 处理，不上传。
- 角度为**累加**语义：新角度 =（原角度 + 本次增量）% 360。例如原已是 90° 的页面再顺时针转 270°，结果为 0°。
- 旋转只改页面 `/Rotate` 属性，不重排版、不转曲文字，可逆（再转一次即可还原）。
- All processing is local via pdf-lib, no upload.
- Rotation is **cumulative**: new angle = (old angle + delta) % 360. E.g. a page already at 90° rotated by another 270° ends at 0°.
- Only the page `/Rotate` attribute is changed; no re-layout, fully reversible.

## 数据流向 | Data flow

文件 → 内存 pdf-lib → Blob → 下载；不经过网络。

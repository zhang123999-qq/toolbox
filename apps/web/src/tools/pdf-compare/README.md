# PDF 对比 pdf-compare（#498）

## 用途 | Purpose

- 上传两份 PDF，逐页渲染为位图后做像素级差异比对：输出差异页列表（页码、差异像素占比）、选中页的并排 / 叠加对比视图、差异区域红色半透明高亮，并可下载纯文本差异报告。
- Compare two PDFs page by page at the pixel level: diff page list (page number + diff ratio), side-by-side / overlay views for the selected page, red translucent diff highlighting, downloadable plain-text diff report.
- 与「PDF 转图片」（pdf-to-image #462）的区别：#462 是把 PDF 页面渲染导出为图片文件；本工具做两份 PDF 的逐页像素级差异分析，不导出页面图片。

## 输入 | Input

- 两份 PDF 文件（A / B），每个单文件上限 50MB，按 `%PDF-` 魔数校验。
- Two PDF files (A / B), max 50MB each, validated by the `%PDF-` magic number.

## 选项 | Options

| 选项               | 说明                                                    | Option         | Description                                                                                            |
| ------------------ | ------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| 差异阈值 threshold | 0–255，默认 30；任一 RGB 通道差值超过阈值即记为差异像素 | Diff threshold | 0–255, default 30; a pixel counts as different when any RGB channel differs by more than the threshold |
| 视图 view          | side 并排 / overlay 叠加高亮（以 A 页为底）             | View           | side-by-side / overlay highlight (page A as base)                                                      |

## 输出 | Output

- 页数信息：两份 PDF 各自页数；页数不同时明确提示，仅对比前 `min(页数)` 页，多出的页单独列出。
- 差异页列表：每页的差异像素数 / 总像素数 / 占比，点击选中查看详情。
- 选中页详情：并排视图（A、B 两页原图）或叠加视图（A 页为底 + 红色半透明差异层），附差异统计。
- 差异报告下载（`a-vs-b-diff.txt`）：逐页统计、多出页列表。
- Page counts of both PDFs; on mismatch a clear notice is shown, only the first `min(pages)` pages are compared and extra pages are listed separately.
- Diff page list: diff pixels / total pixels / ratio per page, click to inspect.
- Selected page detail: side-by-side (original A/B renders) or overlay (page A as base + red translucent diff layer), with diff stats.
- Diff report download (`a-vs-b-diff.txt`): per-page stats plus extra pages.

## 边界 | Limits

- 全程本地处理（pdfjs-dist + Canvas），不上传。
- **渲染精度权衡**：页面按固定 **1.2 倍**缩放渲染（A4 约 714×1010 像素）。倍数越高，越能捕捉细小文字差异，但内存与耗时线性增长：每页差异计算需持有两份 RGBA 缓冲（约 宽×高×4×2 字节）。1.2 是在"看清正文级差异"与"百页文档不爆内存"之间的折中；如需更高精度，可先用 pdf-to-image 高 DPI 导出再用图片对比。
- 两页尺寸不同时，对齐到外接矩形（较小页居中、白底补齐），超出较小页范围的像素视为差异，并在详情中标注"两页尺寸不同"。
- 只比较 RGB 三通道，alpha 通道忽略；通道差值**等于**阈值不算差异。
- 加密 PDF 会明确提示哪一份无法打开（不支持输入密码）；损坏的 PDF 同样按份提示。
- 阈值变更会自动重新对比（已解析的文档走缓存，只重渲染），大文档对比中可随时取消。
- 内存：比对时像素缓冲只在单次页迭代内持有，迭代结束即释放；选中页详情按需重渲染，不缓存整份文档的位图；重置/换文件时销毁 pdfjs 文档并释放对象 URL。

## 数据流向 | Data flow

文件 → pdfjs 解析 → 逐页 Canvas 渲染 → ImageData 像素比对 → 统计/差异层 → 报告下载；不经过网络。

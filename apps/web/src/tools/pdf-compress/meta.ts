import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-compress —— 全局编号 #483
 * 域：pdf（PDF 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 *
 * PDF 压缩（诚实方案）：用 pdf-lib 重新加载并以 useObjectStreams 保存（对象流优化），
 * 可选清除文档元数据（标题/作者/创建者/生产者/主题/关键字）。
 *
 * 可行性说明（与文档 docs/tools/09-PDF-Office.md 的差异）：
 * 文档建议可行性 B（pdfjs + 图片重压缩 wasm）。但 pdf-lib 无法对 PDF 内图片做重编码，
 * 在不引入 wasm 解码/重编码链的前提下，本工具只能做结构优化，压缩效果通常有限
 * （0–10%，部分文件甚至略有增大）。为不虚报 B 的 wasm 能力，按 #426/#443 先例记
 * feasibility: 'A'（纯 pdf-lib，无 wasm），工具页与 README 显著告知用户效果有限。
 */
export const meta: ToolMeta = {
  id: 'pdf-compress',
  slug: 'pdf-compress',
  title: 'PDF 压缩',
  description:
    '本地重新封装 PDF（对象流优化），可选清除文档元数据；效果有限，一般仅 0–10%，全程不上传',
  titleEn: 'PDF Compress',
  descriptionEn:
    'Re-save PDFs locally with object-stream optimization, optional metadata stripping; limited effect (typically 0–10%), no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'compress', 'size'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['removeMetadata'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-to-pdf —— 全局编号 #461
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 多张图片合并为一个 PDF（每图一页）：页面尺寸 适应图片/A4/Letter，
 * 页边距可调，图片顺序可在列表中上移/下移/删除，全程本地不上传。
 * PDF 生成使用 pdf-lib（纯 JS，无 wasm），与模板 image-compress 同属 T2。
 */
export const meta: ToolMeta = {
  id: 'image-to-pdf',
  slug: 'image-to-pdf',
  title: '图片转 PDF',
  description: '多张图片合并为一个 PDF，每图一页，可调页面尺寸与页边距，支持排序，全程不上传',
  titleEn: 'Image to PDF',
  descriptionEn:
    'Merge multiple images into one PDF, one page per image, adjustable page size and margins, reorderable, no upload',

  category: 'image',
  group: 'design',
  tags: ['pdf', 'image', 'merge'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['pageSize', 'margin', 'order'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

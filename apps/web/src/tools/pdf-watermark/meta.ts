import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-watermark —— 全局编号 #487
 * 域：pdf（PDF / 办公）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * PDF 水印：本地 pdf-lib 在每页叠加文字或图片水印，可调透明度、旋转角度、
 * 九宫格位置与页面范围。文字水印仅支持 ASCII（Helvetica 无 CJK 字形）。
 */
export const meta: ToolMeta = {
  id: 'pdf-watermark',
  slug: 'pdf-watermark',
  title: 'PDF 水印',
  description:
    '给 PDF 添加文字或图片水印：透明度、旋转、九宫格位置、页面范围可调，全程本地处理不上传',
  titleEn: 'PDF Watermark',
  descriptionEn:
    'Add text or image watermarks to PDFs: adjustable opacity, rotation, 9-grid position and page ranges, all local',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'watermark', 'stamp', 'text', 'image'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: [
    'watermarkType',
    'text',
    'fontSize',
    'color',
    'opacity',
    'rotate',
    'position',
    'pageMode',
    'pageRange',
    'scale',
  ],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

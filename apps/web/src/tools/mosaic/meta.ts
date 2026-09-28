import type { ToolMeta } from '@toolbox/catalog'

/**
 * mosaic —— 全局编号 #431
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 马赛克打码：对图片整体做像素块遮挡（隐私打码场景），块大小可调，纯 Canvas 本地处理。
 * 与「像素化」（pixelate，#450）不同：本工具定位是隐私遮挡/打码，pixelate 定位像素艺术风格。
 */
export const meta: ToolMeta = {
  id: 'mosaic',
  slug: 'mosaic',
  title: '马赛克',
  description: '图片马赛克打码：整体像素块遮挡隐私，块大小可调，全程不上传',
  titleEn: 'Mosaic',
  descriptionEn:
    'Mosaic redaction: pixelate the whole image to hide private content, adjustable block size, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'mosaic', 'pixel', 'privacy', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['blockSize', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * hue —— 全局编号 #438
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 色相调整：本地 Canvas ctx.filter hue-rotate() 旋转色相，-180..180 度可调，
 * hue=0 时滤镜为 none，输出与原图一致。全程不上传。
 */
export const meta: ToolMeta = {
  id: 'hue',
  slug: 'hue',
  title: '色相调整',
  description: '旋转图片色相：-180°~+180° 可调，0° 输出与原图一致，全程本地处理不上传',
  titleEn: 'Hue Rotate',
  descriptionEn:
    'Rotate image hue from -180° to +180°; 0° keeps the original. Processed locally, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'hue', 'color', 'filter', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['hue', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * saturation —— 全局编号 #437
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 饱和度调整：本地 Canvas ctx.filter saturate() 重绘；
 * 0 = 黑白，100 = 原图，200 = 过饱和，可选输出格式。
 */
export const meta: ToolMeta = {
  id: 'saturation',
  slug: 'saturation',
  title: '饱和度调整',
  description: '本地调整图片饱和度：0 为黑白，100 为原图，200 为过饱和，全程不上传',
  titleEn: 'Saturation',
  descriptionEn:
    'Adjust image saturation locally: 0 = grayscale, 100 = original, 200 = over-saturated, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'saturation', 'color', 'filter', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['saturation', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

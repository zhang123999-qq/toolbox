import type { ToolMeta } from '@toolbox/catalog'

/**
 * color-adjust —— 全局编号 #435
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 图片调色：像素级微调色温（冷暖）、色调（品绿）、曝光三项，不碰亮度/对比度/
 * 饱和度/色相（分别由 #436、#437、#438 负责），互不重叠。
 */
export const meta: ToolMeta = {
  id: 'color-adjust',
  slug: 'color-adjust',
  title: '调色',
  description: '本地精细调色：色温冷暖、色调品绿、曝光三项像素级调整，全程不上传',
  titleEn: 'Color Adjust',
  descriptionEn:
    'Fine-tune color locally: pixel-level temperature, tint, and exposure adjustments, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'color', 'temperature', 'tint', 'exposure'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['temperature', 'tint', 'exposure', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

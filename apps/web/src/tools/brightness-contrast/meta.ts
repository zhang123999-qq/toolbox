import type { ToolMeta } from '@toolbox/catalog'

/**
 * brightness-contrast —— 全局编号 #436
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 亮度/对比度调整：纯 Canvas ctx.filter（brightness/contrast 滤镜）本地处理，
 * 亮度 -100~100（负值变暗，正值变亮），对比度 -100~100（负值降低，正值增强）。
 * 与「色相/饱和度」（hue-saturation，#437）不同：本工具只调亮度与对比度。
 */
export const meta: ToolMeta = {
  id: 'brightness-contrast',
  slug: 'brightness-contrast',
  title: '亮度/对比度',
  description: '本地调整图片亮度与对比度：亮度 -100~100、对比度 -100~100，全程不上传',
  titleEn: 'Brightness & Contrast',
  descriptionEn:
    'Adjust image brightness and contrast locally: brightness -100~100, contrast -100~100, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'brightness', 'contrast', 'filter', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['brightness', 'contrast', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

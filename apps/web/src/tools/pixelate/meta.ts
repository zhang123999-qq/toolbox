import type { ToolMeta } from '@toolbox/catalog'

/**
 * pixelate —— 全局编号 #450
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 像素化艺术效果：像素块大小可调（2–64px），复古像素风风格化，本地 Canvas 处理。
 * 与「马赛克打码」（mosaic，#431）不同：本工具是艺术风格化（复古像素风），
 * mosaic 是隐私遮挡打码。
 */
export const meta: ToolMeta = {
  id: 'pixelate',
  slug: 'pixelate',
  title: '像素化',
  description: '复古像素风艺术效果：像素块大小可调，全程本地处理不上传',
  titleEn: 'Pixelate',
  descriptionEn:
    'Retro pixel-art effect: adjustable pixel block size, processed locally, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'pixelate', 'pixel-art', 'retro', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['pixelSize', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

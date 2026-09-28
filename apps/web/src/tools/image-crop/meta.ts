import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-crop —— 全局编号 #422
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 图片裁剪：上传后设置裁剪矩形（x/y/宽/高，像素），纵横比预设与快捷选区，
 * 原图上用 CSS 遮罩实时显示裁剪区域；纯 Canvas 本地处理，可选输出格式与质量。
 */
export const meta: ToolMeta = {
  id: 'image-crop',
  slug: 'image-crop',
  title: '图片裁剪',
  description: '本地裁剪图片：自定义裁剪矩形，纵横比预设与快捷选区，全程不上传',
  titleEn: 'Image Crop',
  descriptionEn:
    'Crop images locally: custom crop rectangle, aspect-ratio presets and quick selections, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'crop', 'avatar', 'jpeg', 'webp'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['aspectRatio', 'x', 'y', 'width', 'height', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-resize —— 全局编号 #425
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 图片缩放：本地 Canvas 高质量重采样。两种模式：按像素（目标宽/高数字输入，
 * 「锁定纵横比」默认开启，改一边另一边按原图比例联动）与按百分比（1–1000%）。
 * 输出 jpeg/png/webp + 质量，全程不上传。
 * 与后续批次的「图片尺寸调整」（image-dimension，#472）不同：本工具是通用缩放器
 * （按像素/百分比自由缩放）；#472 侧重尺寸调整的另一组能力，后续批次实现。
 */
export const meta: ToolMeta = {
  id: 'image-resize',
  slug: 'image-resize',
  title: '图片缩放',
  description: '本地缩放图片尺寸：按像素或百分比，高质量重采样，可锁定纵横比，全程不上传',
  titleEn: 'Image Resize',
  descriptionEn:
    'Resize images locally: by pixels or percentage, high-quality resampling, optional aspect-ratio lock, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'resize', 'scale', 'dimension'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['mode', 'width', 'height', 'lock', 'percent', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

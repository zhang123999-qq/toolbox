import type { ToolMeta } from '@toolbox/catalog'

/**
 * exif-remove —— 全局编号 #445
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * EXIF 清除：上传图片后用 Canvas 按原尺寸重编码（JPEG 质量固定 92），
 * Canvas 绘制只保留像素数据、不保留任何元数据，天然剥离 EXIF/GPS/缩略图等。
 * 展示原图大小 / 新图大小 / 节省量 / 尺寸对比，可下载清除后的图片。
 */
export const meta: ToolMeta = {
  id: 'exif-remove',
  slug: 'exif-remove',
  title: 'EXIF 清除',
  description: '清除图片 EXIF/GPS 等元数据：Canvas 本地重编码，只保留像素，全程不上传',
  titleEn: 'EXIF Remover',
  descriptionEn:
    'Strip EXIF/GPS metadata from images: re-encoded locally via Canvas, pixels only, no upload',

  category: 'image',
  group: 'design',
  tags: ['exif', 'metadata', 'privacy', 'clean', 'image'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

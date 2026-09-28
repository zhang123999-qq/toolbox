import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-compress —— 全局编号 #421
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 图片压缩：本地 Canvas 重编码（JPEG/WebP 可调质量，PNG 无损），可选限制最大边。
 * 与「压缩到指定大小」（compress-size，#460）不同：本工具按质量/格式压缩，
 * compress-size 按目标字节数二分逼近。
 */
export const meta: ToolMeta = {
  id: 'image-compress',
  slug: 'image-compress',
  title: '图片压缩',
  description: '本地压缩图片体积：JPEG/WebP 可调质量，可选限制最大边，全程不上传',
  titleEn: 'Image Compress',
  descriptionEn:
    'Compress images locally: adjustable quality for JPEG/WebP, optional max-dimension limit, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'compress', 'jpeg', 'webp', 'png'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['format', 'quality', 'maxDimension'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

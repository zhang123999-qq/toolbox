import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-convert —— 全局编号 #426
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 图片格式转换：纯 Canvas 零依赖实现。文档原可行性 B（wasm-vips），
 * 本批改用浏览器 Canvas toBlob 编码即可覆盖输出 jpeg/png/webp，故降为 A。
 * 与「图片压缩」（image-compress，#421）不同：本工具专注「格式互转」
 * （默认质量 100、无尺寸限制选项）；#421 专注「压体积」（质量 + 最大边）。
 */
export const meta: ToolMeta = {
  id: 'image-convert',
  slug: 'image-convert',
  title: '图片格式转换',
  description: '本地互转图片格式：PNG/JPEG/WebP/GIF/BMP/AVIF 输入 → JPEG/PNG/WebP 输出，全程不上传',
  titleEn: 'Image Format Converter',
  descriptionEn:
    'Convert image formats locally: PNG/JPEG/WebP/GIF/BMP/AVIF input → JPEG/PNG/WebP output, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'convert', 'format', 'jpeg', 'webp'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

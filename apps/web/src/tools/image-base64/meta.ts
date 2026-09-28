import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-base64 —— 全局编号 #427
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 图片 ⇄ Base64 双向转换：图片转 DataURL / 纯 Base64 文本，或粘贴 Base64 还原为图片下载。
 * 与单向工具 #475 image-to-base64（图片→Base64）、#476 base64-to-image（Base64→图片）
 * 的关系：本工具是双向一体版，那两个是本工具两个模式的独立入口。
 */
export const meta: ToolMeta = {
  id: 'image-base64',
  slug: 'image-base64',
  title: 'Base64 转换',
  description:
    '图片与 Base64 双向互转：图片转 DataURL / 纯 Base64，或粘贴 Base64 还原为图片，全程不上传',
  titleEn: 'Base64 Converter',
  descriptionEn:
    'Two-way image ⇄ Base64 conversion: image to DataURL / raw Base64, or paste Base64 to restore the image, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'base64', 'data-url', 'encode', 'decode'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file', 'text'],
  outputs: ['text', 'file'],
  options: ['mode', 'dataUrl'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

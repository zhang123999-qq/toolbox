import type { ToolMeta } from '@toolbox/catalog'

/**
 * compress-size —— 全局编号 #460
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 *
 * 按「目标字节数」压缩图片：用户输入目标大小（KB），工具先对 JPEG/WebP
 * 质量 1–100 做二分查找逼近目标体积；若质量=1 仍超标，则按面积 ×0.7
 * 逐轮缩小尺寸后重新二分（最多 3 轮，保底 1px）。
 *
 * 与 image-compress（#421）的区别：本工具按「目标字节数」二分逼近，
 * image-compress 按「质量/格式」直接压缩（PNG 无质量参数无法二分，
 * 故本工具不提供 PNG 输出）。
 *
 * 可行性说明：文档可行性原标 B（曾考虑 WASM 编码器），实际实现为纯
 * Canvas 2D 重编码 + JS 二分逻辑，无外部依赖，故标 A。
 */
export const meta: ToolMeta = {
  id: 'compress-size',
  slug: 'compress-size',
  title: '压缩到指定大小',
  description:
    '输入目标大小（KB），自动二分逼近质量、必要时缩小尺寸，把图片压到目标体积以下，全程不上传',
  titleEn: 'Compress to Target Size',
  descriptionEn:
    'Enter a target size (KB); binary-searches quality and downscales if needed to fit under it, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'compress', 'size', 'jpeg', 'webp'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['format', 'targetSize'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

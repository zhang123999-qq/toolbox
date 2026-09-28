import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-batch —— 全局编号 #458
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 *
 * 多张图片批量处理流水线：统一应用「输出格式（jpeg/png/webp）+ 质量 1–100 +
 * 最大边缩放（0=不限）」，队列逐项处理，带逐项进度、取消与结果列表。
 *
 * 与相近工具的边界：
 *  - vs #421 image-compress / #425 image-resize / #426 image-convert（单张）：
 *    本工具是它们的批量组合版（压缩 + 缩放 + 转格式流水线），一次配置处理多张。
 *  - vs #469 watermark-batch / #473 rotate-batch / #474 merge-batch（单功能批量）：
 *    本工具是通用处理流水线，不是单一功能批量。
 *
 * 可行性说明：文档原定 B（wasm-vips），实际纯 Canvas 实现即可覆盖全部需求
 * （重编码 + 等比缩放均为 Canvas 原生能力），无需引入 wasm，故记为 A。
 */
export const meta: ToolMeta = {
  id: 'image-batch',
  slug: 'image-batch',
  title: '图片批处理',
  description: '多张图片批量处理：统一输出格式、质量与最大边，逐项进度与结果列表，全程本地不上传',
  titleEn: 'Image Batch Processing',
  descriptionEn:
    'Batch-process images: unified output format, quality and max-dimension limit, per-item progress, all local, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'batch', 'compress', 'resize', 'convert'],

  priority: 'P2',
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

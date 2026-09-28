import type { ToolMeta } from '@toolbox/catalog'

/**
 * sharpen —— 全局编号 #433
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 图片锐化：3×3 卷积核 [[0,-k,0],[-k,1+4k,-k],[0,-k,0]] 增强边缘清晰度，
 * k = strength/100，强度 0–100 可调，纯 Canvas 本地处理。
 */
export const meta: ToolMeta = {
  id: 'sharpen',
  slug: 'sharpen',
  title: '图片锐化',
  description: '卷积锐化增强图片清晰度：强度 0–100 可调，全程本地处理不上传',
  titleEn: 'Image Sharpen',
  descriptionEn:
    'Sharpen images with convolution: adjustable strength 0–100, processed locally, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'sharpen', 'filter', 'convolution', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['strength', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

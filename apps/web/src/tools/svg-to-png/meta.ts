import type { ToolMeta } from '@toolbox/catalog'

/**
 * svg-to-png —— 全局编号 #453
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * SVG 转 PNG：本地解析 SVG 文本，经 Blob URL + Image 加载后在 Canvas 上光栅化，
 * 输出宽高可选（空=自然尺寸）、背景可选透明/白/自定义色，全程不上传。
 * 纯 Canvas 实现，无 worker / wasm / 后端依赖。
 */
export const meta: ToolMeta = {
  id: 'svg-to-png',
  slug: 'svg-to-png',
  title: 'SVG 转 PNG',
  description: '本地把 SVG 矢量图转为 PNG 位图：输出尺寸与背景可调，全程不上传',
  titleEn: 'SVG to PNG',
  descriptionEn:
    'Convert SVG vectors to PNG bitmaps locally: adjustable output size and background, no upload',

  category: 'image',
  group: 'design',
  tags: ['svg', 'png', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['width', 'height', 'background', 'customColor'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

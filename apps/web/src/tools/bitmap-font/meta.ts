import type { ToolMeta } from '@toolbox/catalog'

/**
 * bitmap-font —— 全局编号 #796
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'bitmap-font',
  slug: 'bitmap-font',
  title: '字体位图',
  description:
    '把文本逐字渲染为位图字体数据：可调字体与字号，导出 JSON 或 C 数组格式，供游戏引擎使用',
  titleEn: 'Bitmap Font',
  descriptionEn:
    'Rasterize text into bitmap font data: adjustable font and size, export as JSON or C array for game engines',

  category: 'game',
  group: 'design',
  tags: ['game', 'font', 'bitmap', 'raster'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['file', 'text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

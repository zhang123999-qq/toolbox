import type { ToolMeta } from '@toolbox/catalog'

/**
 * drawing-board —— 全局编号 #798
 * 域：online（在线工具）｜大组：online｜优先级：P2｜可行性：A｜模板：T3
 * 在线工具大组的首个工具：自由画布，画笔/橡皮/直线/矩形/圆形/油漆桶，撤销重做，导出 PNG。
 */
export const meta: ToolMeta = {
  id: 'drawing-board',
  slug: 'drawing-board',
  title: '在线画图',
  description: '在线画布：画笔、橡皮、直线、矩形、圆形、油漆桶填充，支持撤销重做，一键导出 PNG',
  titleEn: 'Drawing Board',
  descriptionEn:
    'Online drawing canvas: brush, eraser, line, rectangle, ellipse, flood fill, with undo/redo and PNG export',

  category: 'online',
  group: 'online',
  tags: ['drawing', 'canvas', 'paint', 'online', 'image'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['file'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

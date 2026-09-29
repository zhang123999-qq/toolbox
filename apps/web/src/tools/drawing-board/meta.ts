import type { ToolMeta } from '@toolbox/catalog'

/**
 * drawing-board —— 全局编号 #798
 * 域：online（在线工具）｜大组：online｜优先级：P2｜可行性：A｜模板：T3
 * 在线工具大组的首个工具：自由画布，13 种工具（画笔/喷雾/荧光笔/直线/箭头/矩形/圆形/
 * 三角形/菱形/星形/文本/橡皮/油漆桶），图形描边/填充切换，图片底图，撤销重做，导出 PNG/JPG。
 */
export const meta: ToolMeta = {
  id: 'drawing-board',
  slug: 'drawing-board',
  title: '在线画图',
  description: '在线画布：13 种工具（画笔/喷雾/荧光笔/直线/箭头/矩形/圆形/三角形/菱形/星形/文本/橡皮/油漆桶），图形描边填充切换，图片底图，撤销重做，导出 PNG/JPG',
  titleEn: 'Drawing Board',
  descriptionEn:
    'Online drawing canvas: 13 tools (brush, spray, highlighter, line, arrow, shapes, text, eraser, flood fill), shape stroke/fill modes, image background, undo/redo, PNG/JPG export',

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

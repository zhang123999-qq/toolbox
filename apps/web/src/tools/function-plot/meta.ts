import type { ToolMeta } from '@toolbox/catalog'

/**
 * function-plot —— 全局编号 #826
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'function-plot',
  slug: 'function-plot',
  title: '函数图像',
  description: '输入函数表达式，在画布上绘制函数图像（安全表达式解析，本地计算）',
  titleEn: 'Function Plotter',
  descriptionEn:
    'Plot function graphs on canvas from expressions (safe expression parser, local compute)',

  category: 'education',
  group: 'life',
  tags: ['math', 'function', 'plot', 'education'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

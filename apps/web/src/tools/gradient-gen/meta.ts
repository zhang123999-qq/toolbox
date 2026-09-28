import type { ToolMeta } from '@toolbox/catalog'

/**
 * gradient-gen —— 全局编号 #388
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * CSS 渐变生成：线性 / 径向 / 锥形，颜色列表留空则随机生成 2–4 色
 */
export const meta: ToolMeta = {
  id: 'gradient-gen',
  slug: 'gradient-gen',
  title: '渐变生成',
  description: '按颜色列表与类型（线性/径向/锥形）生成 CSS gradient 代码，留空随机配色',
  titleEn: 'CSS Gradient Generator',
  descriptionEn:
    'Generate CSS gradient code (linear / radial / conic) from a color list; random palette when left empty',

  category: 'random',
  group: 'design',
  tags: ['css', 'gradient', 'background', 'design'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'angle', 'shape'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

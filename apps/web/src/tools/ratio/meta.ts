import type { ToolMeta } from '@toolbox/catalog'

/**
 * ratio —— 全局编号 #328
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T3
 * 比例计算：化简比例 / 解比例方程 / 按比例分配
 */
export const meta: ToolMeta = {
  id: 'ratio',
  slug: 'ratio',
  title: '比例计算',
  description: '化简比例（如 12:18 → 2:3）、解比例方程（a:b = c:x）、按比例分配总数',
  titleEn: 'Ratio Calculator',
  descriptionEn:
    'Simplify ratios (e.g. 12:18 → 2:3), solve proportions (a:b = c:x), and split a total by ratio',

  category: 'math',
  group: 'life',
  tags: ['ratio', 'proportion', 'math'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

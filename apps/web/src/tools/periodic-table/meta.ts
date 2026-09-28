import type { ToolMeta } from '@toolbox/catalog'

/**
 * periodic-table —— 全局编号 #821
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'periodic-table',
  slug: 'periodic-table',
  title: '元素周期表',
  description: '118 种化学元素数据查询：符号、中英文名称、原子序数、原子量、族、周期与分类筛选',
  titleEn: 'Periodic Table',
  descriptionEn:
    'Query 118 chemical elements: symbol, Chinese/English names, atomic number, mass, group, period, category filter',

  category: 'education',
  group: 'life',
  tags: ['chemistry', 'element', 'periodic', 'education'],

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

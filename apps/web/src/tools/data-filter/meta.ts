import type { ToolMeta } from '@toolbox/catalog'

/**
 * data-filter —— 全局编号 #689
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 数据过滤：CSV + 多条件（列 运算符 值，AND/OR）→ 过滤后表格与 CSV 导出
 */
export const meta: ToolMeta = {
  id: 'data-filter',
  slug: 'data-filter',
  title: '数据过滤',
  description: '按多条件过滤 CSV 数据：等于、大于、包含、为空等 12 种运算符，支持 AND/OR',
  titleEn: 'Data Filter',
  descriptionEn: 'Filter CSV rows by multiple conditions: 12 operators (=, >, contains, empty…), AND/OR logic',

  category: 'random',
  group: 'design',
  tags: ['table', 'csv', 'data', 'filter', 'query'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'conditions'],
  outputs: ['text'],
  options: ['logic'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

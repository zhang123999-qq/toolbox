import type { ToolMeta } from '@toolbox/catalog'

/**
 * data-sort —— 全局编号 #690
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 数据排序：CSV + 多列排序规则（列名:asc|desc）→ 稳定多列排序 + CSV 导出
 */
export const meta: ToolMeta = {
  id: 'data-sort',
  slug: 'data-sort',
  title: '数据排序',
  description: 'CSV 多列排序：每行一条「列名:asc|desc」规则，数字感知、空值置后、稳定排序',
  titleEn: 'Data Sort',
  descriptionEn:
    'Multi-column CSV sort: one "column:asc|desc" rule per line, numeric-aware, empties last, stable',

  category: 'random',
  group: 'design',
  tags: ['table', 'csv', 'data', 'sort', 'order'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'sortSpec'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

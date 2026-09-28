import type { ToolMeta } from '@toolbox/catalog'

/**
 * pivot —— 全局编号 #685
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 纯 JS 数据透视：CSV 按行列维度分组聚合（求和/计数/平均/最大/最小），结果表格渲染并支持导出 CSV
 */
export const meta: ToolMeta = {
  id: 'pivot',
  slug: 'pivot',
  title: '数据透视',
  description: 'CSV 按行列维度分组聚合（求和/计数/平均/最大/最小），结果表格展示并导出 CSV',
  titleEn: 'Pivot Table',
  descriptionEn: 'Pivot CSV data by row/column dimensions with sum/count/avg/max/min, export as CSV',

  category: 'random',
  group: 'design',
  tags: ['pivot', 'csv', 'table', 'aggregate', 'data'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['rowKey', 'colKey', 'valKey', 'agg'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * data-table —— 全局编号 #688
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 交互式数据表格：CSV 粘贴 → 点击表头排序 / 关键词搜索 / 分页 / 导出 CSV
 */
export const meta: ToolMeta = {
  id: 'data-table',
  slug: 'data-table',
  title: '数据表格',
  description: 'CSV 粘贴成可交互表格：点击表头排序、关键词搜索、分页浏览、导出 CSV',
  titleEn: 'Data Table',
  descriptionEn:
    'Turn pasted CSV into an interactive table: sortable headers, keyword search, pagination, CSV export',

  category: 'random',
  group: 'design',
  tags: ['table', 'csv', 'data', 'sort', 'pagination'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['pageSize'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

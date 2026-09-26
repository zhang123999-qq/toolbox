import type { ToolMeta } from '@toolbox/catalog'

/**
 * schema-diff —— 全局编号 #186
 * 域：data-format（数据格式 / 解析）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'schema-diff',
  slug: 'schema-diff',
  title: 'Schema Diff',
  description: '对比两份表结构定义（SQL DDL 或 JSON），列出新增、删除、类型与约束变更',
  titleEn: 'Schema Diff',
  descriptionEn:
    'Diff two table schemas (SQL DDL or JSON): added, removed, type and constraint changes',

  category: 'data-format',
  group: 'dev',
  tags: ['schema', 'database', 'diff'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'schemaB'],
  outputs: ['text'],
  options: ['format', 'ignoreCase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

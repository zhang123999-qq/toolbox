import type { ToolMeta } from '@toolbox/catalog'

/**
 * cloc —— 全局编号 #273
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'cloc',
  slug: 'cloc',
  title: '代码行数统计',
  description: '统计代码行数：总行数 / 代码行 / 注释行 / 空行（支持 // /* */ # -- 注释）',
  titleEn: 'Lines of Code',
  descriptionEn: 'Count total / code / comment / blank lines of source code',

  category: 'devops',
  group: 'dev',
  tags: ['cloc', 'lines-of-code', 'statistics', 'code-quality'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['language'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

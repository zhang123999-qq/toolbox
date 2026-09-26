import type { ToolMeta } from '@toolbox/catalog'

/**
 * regex-cross —— 全局编号 #194
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/04-开发运维云原生.md
 */
export const meta: ToolMeta = {
  id: 'regex-cross',
  slug: 'regex-cross',
  title: '跨语言正则',
  description: '把 JS 正则转成 Python / Java 的正则代码',
  titleEn: 'Cross-language Regex',
  descriptionEn: 'Convert a JavaScript regex into Python or Java regex code',

  category: 'devops',
  group: 'dev',
  tags: ['regex', 'python', 'java', 'convert', 'cross-language'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['target'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

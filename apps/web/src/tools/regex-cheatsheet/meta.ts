import type { ToolMeta } from '@toolbox/catalog'

/**
 * regex-cheatsheet —— 全局编号 #193
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-开发运维云原生.md
 */
export const meta: ToolMeta = {
  id: 'regex-cheatsheet',
  slug: 'regex-cheatsheet',
  title: '正则速查',
  description: '常用正则表达式速查表（邮箱 / 手机号 / URL / IP / 日期等）',
  titleEn: 'Regex Cheatsheet',
  descriptionEn: 'A quick reference of common regular expressions',

  category: 'devops',
  group: 'dev',
  tags: ['regex', 'cheatsheet', 'reference'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['category'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * regex-ast —— 全局编号 #277
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/04-开发运维云原生.md
 */
export const meta: ToolMeta = {
  id: 'regex-ast',
  slug: 'regex-ast',
  title: '正则转 AST',
  description: '把正则表达式解析成语法树（AST）文本',
  titleEn: 'Regex to AST',
  descriptionEn: 'Parse a regular expression into a syntax tree (AST) text dump',

  category: 'devops',
  group: 'dev',
  tags: ['regex', 'ast', 'parser', 'tree'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

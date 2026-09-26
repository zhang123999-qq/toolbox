import type { ToolMeta } from '@toolbox/catalog'

/**
 * code-convert —— 全局编号 #275
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'code-convert',
  slug: 'code-convert',
  title: '代码转换',
  description: 'JS 与 Python 之间的基础语法映射（function/def、console.log/print、循环等）',
  titleEn: 'Code Converter',
  descriptionEn: 'Basic syntax mapping between JavaScript and Python',

  category: 'devops',
  group: 'dev',
  tags: ['convert', 'javascript', 'python', 'transpile'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['from', 'to'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * complexity —— 全局编号 #272
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'complexity',
  slug: 'complexity',
  title: '代码复杂度',
  description: '统计 JS/TS/Python 代码的圈复杂度，给出函数级分数与评级',
  titleEn: 'Cyclomatic Complexity',
  descriptionEn: 'Compute cyclomatic complexity of JS/TS/Python code per function',

  category: 'devops',
  group: 'dev',
  tags: ['complexity', 'cyclomatic', 'code-quality', 'linter'],

  priority: 'P2',
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

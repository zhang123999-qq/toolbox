import type { ToolMeta } from '@toolbox/catalog'

/**
 * regex-visualize —— 全局编号 #192
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/04-开发运维云原生.md
 */
export const meta: ToolMeta = {
  id: 'regex-visualize',
  slug: 'regex-visualize',
  title: '正则可视化',
  description: '把正则表达式画成 SVG 铁路图（railroad diagram）',
  titleEn: 'Regex Visualizer',
  descriptionEn: 'Render a regular expression as an SVG railroad diagram',

  category: 'devops',
  group: 'dev',
  tags: ['regex', 'railroad', 'svg', 'diagram', 'visualization'],

  priority: 'P1',
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

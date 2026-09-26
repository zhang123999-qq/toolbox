import type { ToolMeta } from '@toolbox/catalog'

/**
 * regex-tester —— 全局编号 #191
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-开发运维云原生.md
 */
export const meta: ToolMeta = {
  id: 'regex-tester',
  slug: 'regex-tester',
  title: '正则测试',
  description: '正则匹配测试、分组捕获与位置标注',
  titleEn: 'Regex Tester',
  descriptionEn:
    'Test a regular expression against text, listing every match, capture groups and indices',

  category: 'devops',
  group: 'dev',
  tags: ['regex', 'test', 'match', 'groups'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'pattern'],
  outputs: ['text'],
  options: ['global', 'ignoreCase', 'multiline', 'dotAll', 'unicode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

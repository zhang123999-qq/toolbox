import type { ToolMeta } from '@toolbox/catalog'

/**
 * code-diff —— 全局编号 #242
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-开发运维云原生.md
 */
export const meta: ToolMeta = {
  id: 'code-diff',
  slug: 'code-diff',
  title: '代码 Diff',
  description: '两段代码差异对比，输出 unified diff（行级 / 字符级）',
  titleEn: 'Code Diff',
  descriptionEn: 'Compare two code snippets and produce a unified diff at line or char level',

  category: 'devops',
  group: 'dev',
  tags: ['diff', 'code', 'compare', 'unified'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['diff'],
  worker: false,
  wasm: false,
  api: false,
}

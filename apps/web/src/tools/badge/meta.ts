import type { ToolMeta } from '@toolbox/catalog'

/**
 * badge —— 全局编号 #268
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'badge',
  slug: 'badge',
  title: 'Badge 生成',
  description: '生成 Shields.io 风格的状态徽章 URL 与 Markdown / HTML 引用代码',
  titleEn: 'Shields Badge Generator',
  descriptionEn: 'Generate a shields.io badge URL with Markdown and HTML embed code',

  category: 'devops',
  group: 'dev',
  tags: ['badge', 'shields', 'markdown', 'readme'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['label', 'message', 'color'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

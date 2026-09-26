import type { ToolMeta } from '@toolbox/catalog'

/**
 * changelog —— 全局编号 #265
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'changelog',
  slug: 'changelog',
  title: 'Changelog 生成',
  description: '按 Keep a Changelog 格式，从版本号与变更列表生成 CHANGELOG.md 片段',
  titleEn: 'Changelog Generator',
  descriptionEn: 'Generate a Keep a Changelog style CHANGELOG.md section',

  category: 'devops',
  group: 'dev',
  tags: ['changelog', 'release', 'keep-a-changelog'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['version'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

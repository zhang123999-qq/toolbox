import type { ToolMeta } from '@toolbox/catalog'

/**
 * dependency —— 全局编号 #262
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'dependency',
  slug: 'dependency',
  title: '依赖分析',
  description: '粘贴 package.json，统计依赖数量、重复与版本范围风险',
  titleEn: 'Dependency Analyzer',
  descriptionEn: 'Analyze package.json: counts, duplicates and version range risk',

  category: 'devops',
  group: 'dev',
  tags: ['package-json', 'dependencies', 'audit', 'devops'],

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

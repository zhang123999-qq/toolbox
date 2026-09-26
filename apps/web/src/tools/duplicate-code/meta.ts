import type { ToolMeta } from '@toolbox/catalog'

/**
 * duplicate-code —— 全局编号 #274
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'duplicate-code',
  slug: 'duplicate-code',
  title: '重复代码检测',
  description: '按行级 hash 检测重复代码行与重复块，给出重复率与位置',
  titleEn: 'Duplicate Code Detector',
  descriptionEn: 'Detect duplicate lines and blocks by line-level hashing',

  category: 'devops',
  group: 'dev',
  tags: ['duplication', 'code-quality', 'refactor', 'clones'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['minBlock'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

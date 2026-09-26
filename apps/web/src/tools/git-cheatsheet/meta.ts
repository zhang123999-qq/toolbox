import type { ToolMeta } from '@toolbox/catalog'

/**
 * git-cheatsheet —— 全局编号 #215
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'git-cheatsheet',
  slug: 'git-cheatsheet',
  title: 'Git 命令速查',
  description: '按分类列出常用 Git 命令、说明与示例',
  titleEn: 'Git Cheat Sheet',
  descriptionEn: 'Common Git commands grouped by category, with descriptions and examples',

  category: 'devops',
  group: 'dev',
  tags: ['git', 'cheatsheet', 'vcs', 'cli'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['category'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

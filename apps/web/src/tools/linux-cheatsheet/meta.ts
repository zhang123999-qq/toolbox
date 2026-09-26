import type { ToolMeta } from '@toolbox/catalog'

/**
 * linux-cheatsheet —— 全局编号 #228
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'linux-cheatsheet',
  slug: 'linux-cheatsheet',
  title: 'Linux 命令',
  description: '按分类列出常用 Linux 命令、说明与示例',
  titleEn: 'Linux Command Cheat Sheet',
  descriptionEn: 'Common Linux commands grouped by category with descriptions and examples',

  category: 'devops',
  group: 'dev',
  tags: ['linux', 'cli', 'cheatsheet', 'devops'],

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

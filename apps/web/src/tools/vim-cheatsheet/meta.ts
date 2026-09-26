import type { ToolMeta } from '@toolbox/catalog'

/**
 * vim-cheatsheet —— 全局编号 #229
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'vim-cheatsheet',
  slug: 'vim-cheatsheet',
  title: 'Vim 命令',
  description: '按分类列出常用 Vim 按键与命令',
  titleEn: 'Vim Cheat Sheet',
  descriptionEn: 'Common Vim keys and commands grouped by category',

  category: 'devops',
  group: 'dev',
  tags: ['vim', 'editor', 'cheatsheet', 'cli'],

  priority: 'P1',
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

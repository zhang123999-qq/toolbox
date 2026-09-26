import type { ToolMeta } from '@toolbox/catalog'

/**
 * package-manager —— 全局编号 #261
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'package-manager',
  slug: 'package-manager',
  title: '包管理命令',
  description: 'npm / yarn / pnpm 常用命令对照表速查',
  titleEn: 'Package Manager Cheatsheet',
  descriptionEn: 'Cheatsheet comparing npm / yarn / pnpm commands',

  category: 'devops',
  group: 'dev',
  tags: ['npm', 'yarn', 'pnpm', 'package-manager', 'cli'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['pm'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

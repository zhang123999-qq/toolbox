import type { ToolMeta } from '@toolbox/catalog'

/**
 * chmod —— 全局编号 #227
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'chmod',
  slug: 'chmod',
  title: 'Chmod 计算',
  description: '数字权限与符号权限双向转换（755 ↔ rwxr-xr-x）',
  titleEn: 'Chmod Calculator',
  descriptionEn: 'Convert between numeric (755) and symbolic (rwxr-xr-x) file permissions',

  category: 'devops',
  group: 'dev',
  tags: ['chmod', 'permission', 'linux', 'cli'],

  priority: 'P0',
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

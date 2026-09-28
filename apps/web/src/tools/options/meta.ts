import type { ToolMeta } from '@toolbox/catalog'

/**
 * options —— 全局编号 #781
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'options',
  slug: 'options',
  title: 'Options 模板',
  description: '按字段定义生成浏览器扩展选项页 options.html / options.js 模板',
  titleEn: 'Options Page Template',
  descriptionEn: 'Generate browser extension options.html / options.js from field definitions',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'options', 'settings', 'template'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

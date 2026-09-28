import type { ToolMeta } from '@toolbox/catalog'

/**
 * popup —— 全局编号 #780
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'popup',
  slug: 'popup',
  title: 'Popup 模板',
  description: '生成浏览器扩展弹出页 popup.html / popup.js / popup.css 三文件模板',
  titleEn: 'Popup Template',
  descriptionEn: 'Generate browser extension popup.html / popup.js / popup.css boilerplate',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'popup', 'template', 'ui'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * content-script —— 全局编号 #772
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'content-script',
  slug: 'content-script',
  title: 'Content Script 模板',
  description: '按匹配规则与可选特性生成浏览器扩展 content.js 代码模板',
  titleEn: 'Content Script Template',
  descriptionEn:
    'Generate browser extension content.js boilerplate from match patterns and optional features',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'content-script', 'chrome', 'template'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * devtools —— 全局编号 #782
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'devtools',
  slug: 'devtools',
  title: 'DevTools 模板',
  description: '生成 Chrome DevTools 扩展面板模板（devtools.html / panel.html / panel.js），并校验 manifest 声明',
  titleEn: 'DevTools Panel Template',
  descriptionEn:
    'Generate Chrome DevTools extension panel templates and validate the devtools_page manifest declaration',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'devtools', 'manifest-v3', 'template'],

  priority: 'P3',
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

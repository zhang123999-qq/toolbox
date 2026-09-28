import type { ToolMeta } from '@toolbox/catalog'

/**
 * cross-browser —— 全局编号 #778
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'cross-browser',
  slug: 'cross-browser',
  title: '跨浏览器兼容',
  description: 'chrome.* / browser.* API 差异对照，生成回调转 Promise 垫片并扫描代码兼容性',
  titleEn: 'Cross-Browser Compatibility',
  descriptionEn:
    'Compare chrome.* vs browser.* API differences, generate promise shims and scan code compatibility',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'firefox', 'safari', 'polyfill'],

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

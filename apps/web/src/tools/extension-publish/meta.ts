import type { ToolMeta } from '@toolbox/catalog'

/**
 * extension-publish —— 全局编号 #784
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'extension-publish',
  slug: 'extension-publish',
  title: '扩展发布',
  description: '浏览器扩展发布前检查：按 Chrome / Edge / Firefox 商店要求逐项评估 manifest 与打包材料',
  titleEn: 'Extension Publish Checklist',
  descriptionEn:
    'Pre-publish checklist for browser extensions against Chrome, Edge and Firefox store requirements',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'publish', 'checklist', 'store'],

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

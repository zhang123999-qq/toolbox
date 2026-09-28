import type { ToolMeta } from '@toolbox/catalog'

/**
 * background —— 全局编号 #779
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'background',
  slug: 'background',
  title: 'Background 模板',
  description: '按所选事件生成 Manifest V3 Service Worker 后台脚本模板',
  titleEn: 'Background Template',
  descriptionEn: 'Generate Manifest V3 service worker background script from selected events',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'background', 'service-worker', 'template'],

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

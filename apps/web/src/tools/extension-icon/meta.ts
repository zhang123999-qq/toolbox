import type { ToolMeta } from '@toolbox/catalog'

/**
 * extension-icon —— 全局编号 #774
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'extension-icon',
  slug: 'extension-icon',
  title: '扩展图标',
  description: '绘制浏览器扩展图标：圆角矩形/圆形底 + 字母，导出 16/48/128 PNG',
  titleEn: 'Extension Icon',
  descriptionEn: 'Draw browser extension icons and export 16/48/128 PNG files',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'icon', 'canvas', 'png'],

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

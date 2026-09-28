import type { ToolMeta } from '@toolbox/catalog'

/**
 * extension-pack —— 全局编号 #775
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'extension-pack',
  slug: 'extension-pack',
  title: '扩展打包',
  description: '校验扩展文件清单并打包为 zip：必须包含 manifest.json',
  titleEn: 'Extension Packager',
  descriptionEn: 'Validate extension file lists and package them into a zip archive',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'zip', 'package', 'fflate'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['fflate'],
  worker: false,
  wasm: false,
  api: false,
}

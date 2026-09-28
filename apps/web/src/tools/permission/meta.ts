import type { ToolMeta } from '@toolbox/catalog'

/**
 * permission —— 全局编号 #776
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'permission',
  slug: 'permission',
  title: '权限声明',
  description: '浏览器扩展权限字典：中文说明、风险等级，生成权限清单片段',
  titleEn: 'Permission Declarations',
  descriptionEn:
    'Browser extension permission dictionary with risk levels; generate manifest permission snippets',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'permission', 'manifest', 'security'],

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

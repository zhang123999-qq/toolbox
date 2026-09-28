import type { ToolMeta } from '@toolbox/catalog'

/**
 * directory-tree —— 全局编号 #526
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'directory-tree',
  slug: 'directory-tree',
  title: '目录树生成',
  description: '选择本地文件夹，生成树形目录结构文本',
  titleEn: 'Directory Tree Generator',
  descriptionEn: 'Pick a local folder and render its tree structure as text',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'directory', 'tree', 'folder'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: ['maxDepth', 'showHidden', 'sortMode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * file-mime —— 全局编号 #524
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'file-mime',
  slug: 'file-mime',
  title: 'MIME 类型查询',
  description: '上传文件或输入扩展名，查询对应的 MIME 类型并校对扩展名与文件头',
  titleEn: 'MIME Type Lookup',
  descriptionEn:
    'Look up MIME types for uploaded files or extensions, and verify extension vs file header',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'mime', 'extension', 'lookup'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file', 'text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

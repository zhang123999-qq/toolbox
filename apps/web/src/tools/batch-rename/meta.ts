import type { ToolMeta } from '@toolbox/catalog'

/**
 * batch-rename —— 全局编号 #525
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'batch-rename',
  slug: 'batch-rename',
  title: '批量重命名',
  description: '批量为文件加前缀、编号或查找替换，导出对照表与重命名包',
  titleEn: 'Batch Rename',
  descriptionEn:
    'Rename files in bulk with prefixes, numbering, or find-and-replace, then export the mapping and package',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'rename', 'batch', 'zip'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['file', 'text'],
  options: ['rule', 'prefix', 'find', 'replace', 'start', 'digits'],

  deps: ['fflate'],
  worker: false,
  wasm: false,
  api: false,
}

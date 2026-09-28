import type { ToolMeta } from '@toolbox/catalog'

/**
 * zip-create —— 全局编号 #515
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P0｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'zip-create',
  slug: 'zip-create',
  title: '打包 ZIP',
  description: '多文件上传，一键打包为 ZIP 压缩包并下载，可选压缩级别',
  titleEn: 'Create ZIP',
  descriptionEn:
    'Pack multiple uploaded files into a ZIP archive with a selectable compression level',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'zip', 'archive', 'compress'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['file'],
  options: ['level', 'archiveName'],

  deps: ['fflate'],
  worker: false,
  wasm: false,
  api: false,
}

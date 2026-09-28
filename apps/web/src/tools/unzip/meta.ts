import type { ToolMeta } from '@toolbox/catalog'

/**
 * unzip —— 全局编号 #516
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P0｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'unzip',
  slug: 'unzip',
  title: '解压 ZIP',
  description: '上传 ZIP 压缩包，列出包内文件清单，可逐个或全部解压下载',
  titleEn: 'Extract ZIP',
  descriptionEn:
    'List entries of an uploaded ZIP archive and extract files individually or all at once',

  category: 'media',
  group: 'design',
  tags: ['file', 'zip', 'archive', 'extract', 'unzip'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text', 'file'],
  options: [],

  deps: ['fflate'],
  worker: false,
  wasm: false,
  api: false,
}

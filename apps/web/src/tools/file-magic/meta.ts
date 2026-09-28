import type { ToolMeta } from '@toolbox/catalog'

/**
 * file-magic —— 全局编号 #527
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'file-magic',
  slug: 'file-magic',
  title: '文件类型鉴定',
  description: '读取文件头魔数，鉴定文件真实类型并判断扩展名是否疑似篡改',
  titleEn: 'File Type Identifier',
  descriptionEn:
    'Identify the real file type from magic numbers and flag suspicious extension mismatches',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'magic', 'identify', 'forensics'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

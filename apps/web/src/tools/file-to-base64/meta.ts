import type { ToolMeta } from '@toolbox/catalog'

/**
 * file-to-base64 —— 全局编号 #523
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'file-to-base64',
  slug: 'file-to-base64',
  title: '文件转 Base64',
  description: '把文件编码为 Base64 文本，可选输出 DataURL 格式',
  titleEn: 'File to Base64',
  descriptionEn: 'Encode a file as Base64 text, optionally as a DataURL',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'base64', 'encode', 'dataurl'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file', 'text'],
  outputs: ['text'],
  options: ['dataUrl'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

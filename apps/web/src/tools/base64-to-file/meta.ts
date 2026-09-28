import type { ToolMeta } from '@toolbox/catalog'

/**
 * base64-to-file —— 全局编号 #522
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'base64-to-file',
  slug: 'base64-to-file',
  title: 'Base64 转文件',
  description: '粘贴 Base64 文本，解码后按指定文件名下载为文件',
  titleEn: 'Base64 to File',
  descriptionEn: 'Decode pasted Base64 text and download it as a file with your chosen name',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'base64', 'decode', 'download'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['file', 'text'],
  options: ['filename', 'extension'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

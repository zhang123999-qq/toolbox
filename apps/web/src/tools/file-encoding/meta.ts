import type { ToolMeta } from '@toolbox/catalog'

/**
 * file-encoding —— 全局编号 #520
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 *
 * 与 charset-detect（#40，粘贴乱码文本检测）的区别：本工具只走文件上传，
 * 直接读文件的原始字节做检测，并按检测到的编码解码出可读预览。
 */
export const meta: ToolMeta = {
  id: 'file-encoding',
  slug: 'file-encoding',
  title: '文件编码检测',
  description: '上传文件，检测其文本编码（chardet），并按该编码解码预览内容',
  titleEn: 'Detect File Encoding',
  descriptionEn: 'Detect the text encoding of an uploaded file and preview its decoded content',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'encoding', 'charset', 'chardet'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: ['topN', 'preview'],

  deps: ['chardet'],
  worker: false,
  wasm: false,
  api: false,
}

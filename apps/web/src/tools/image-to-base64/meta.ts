import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-to-base64 —— 全局编号 #475
 * 域：image（图片 / 图形）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 单向批量「图片 → Base64」：多张图片转 Base64 文本，输出形式可选
 * DataURL（含 data:image/...;base64, 前缀）或纯 Base64（无前缀），
 * 专注转文本场景——每项显示输出字符数，支持逐项复制 / 下载 .txt，
 * 也可把全部结果合并下载为一个 txt。全程本地 FileReader，不上传。
 * 与相近工具的边界：
 *  • #427 image-base64（Base64 转换）：双向互转一体版，图片→Base64 / Base64→图片
 *    两种方向在一个页面；本工具是其中「图片→Base64」方向的独立批量入口，
 *    按复制/下载文本场景优化（逐项复制、逐项 .txt、合并下载）。
 *  • #476 base64-to-image：反向「Base64→图片」；需要把文本还原为图片用它。
 */
export const meta: ToolMeta = {
  id: 'image-to-base64',
  slug: 'image-to-base64',
  title: '图片转 Base64',
  description:
    '批量把图片转为 Base64 文本：可选 DataURL 或纯 Base64，逐项复制、下载 .txt，全程不上传',
  titleEn: 'Image to Base64',
  descriptionEn:
    'Batch convert images to Base64 text: DataURL or raw Base64, copy / download .txt per item, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'base64', 'data-url', 'encode', 'copy'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: ['outputKind'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

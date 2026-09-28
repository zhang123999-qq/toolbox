import type { ToolMeta } from '@toolbox/catalog'

/**
 * file-compare —— 全局编号 #519
 * 域：media（音视频 / 媒体）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 *
 * 与 #36 text-diff（粘贴文本对比）的区别：本工具只走文件上传，
 * 适合对比两个版本的文件（配置、文档、导出的数据），不经过剪贴板。
 */
export const meta: ToolMeta = {
  id: 'file-compare',
  slug: 'file-compare',
  title: '文件对比',
  description: '上传两个文件，按文本做差异对比，高亮新增与删除的行',
  titleEn: 'Compare Files',
  descriptionEn: 'Upload two files and diff them as text with added / removed highlighting',

  category: 'media',
  group: 'design',
  tags: ['media', 'file', 'diff', 'compare', 'text'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: ['mode', 'ignoreWhitespace'],

  deps: ['diff'],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-merge —— 全局编号 #481
 * 域：pdf（PDF / 文档）｜大组：office｜优先级：P0｜可行性：A｜模板：T2
 * 合并多个 PDF：按文件列表顺序把各文档的全部页面拼接为一个 PDF，
 * 列表支持上移/下移/删除；单文件上限 50MB，加密 PDF 不支持。
 * PDF 解析与合并使用 pdf-lib（纯 JS，无 wasm/worker），与模板 image-compress 同属 T2。
 */
export const meta: ToolMeta = {
  id: 'pdf-merge',
  slug: 'pdf-merge',
  title: 'PDF 合并',
  description: '按顺序合并多个 PDF 为一个文件，支持列表排序，全程本地不上传',
  titleEn: 'PDF Merge',
  descriptionEn: 'Merge multiple PDFs into one file in list order, reorderable, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'merge', 'combine'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['order'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

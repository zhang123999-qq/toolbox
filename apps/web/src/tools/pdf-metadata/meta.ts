import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-metadata —— 全局编号 #499
 * 域：pdf（PDF 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * PDF 元数据查看与编辑：pdf-lib 本地读取标题/作者/主题/关键字/创建者/生产者/
 * 创建时间/修改时间；标题/作者/主题/关键字可编辑，一键清空可编辑字段，
 * 重新保存下载，全程不上传。
 * load/save 均避免 pdf-lib 盖章（updateMetadata:false），未改字段原样保留。
 */
export const meta: ToolMeta = {
  id: 'pdf-metadata',
  slug: 'pdf-metadata',
  title: 'PDF 元数据',
  description:
    '本地查看与编辑 PDF 元数据：标题/作者/主题/关键字可改，一键清空可编辑字段，全程不上传',
  titleEn: 'PDF Metadata',
  descriptionEn:
    'View and edit PDF metadata locally: editable title/author/subject/keywords, one-click clear, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'metadata', 'edit', 'info', 'document'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['title', 'author', 'subject', 'keywords'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

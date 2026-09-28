import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-sort —— 全局编号 #486
 * 域：pdf（PDF / 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * 上传单个 PDF 后调整页面顺序（上移/下移、反转、重置），按新顺序
 * copyPages 生成新 PDF；单文件上限 50MB，页数上限 500（防 OOM），
 * 加密 PDF 不支持。PDF 解析与重排使用 pdf-lib（纯 JS，无 wasm/worker）。
 */
export const meta: ToolMeta = {
  id: 'pdf-sort',
  slug: 'pdf-sort',
  title: 'PDF 页面排序',
  description: '调整 PDF 页面顺序：上移/下移、反转、重置，本地生成新 PDF，不上传',
  titleEn: 'PDF Page Sort',
  descriptionEn:
    'Reorder PDF pages: move up/down, reverse, reset — generate a new PDF locally, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'sort', 'pages', 'reorder'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['pageOrder'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

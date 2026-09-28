import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-split —— 全局编号 #482
 * 域：pdf（PDF / 办公）｜大组：office｜优先级：P0｜可行性：A｜模板：T2
 * PDF 拆分：本地按页范围 / 每 N 页 / 单页逐个拆分成多个 PDF 文件。
 * PDF 处理使用 pdf-lib（纯 JS，无 wasm），与模板 image-compress 同属 T2。
 * 输出为多个独立 PDF 文件（各自下载，不打包：fflate/jszip 未安装，
 * 详见 README「为什么不打包成 ZIP」）。
 */
export const meta: ToolMeta = {
  id: 'pdf-split',
  slug: 'pdf-split',
  title: 'PDF 拆分',
  description: '本地拆分 PDF：按页范围、每 N 页或单页逐个拆成多个文件，全程不上传',
  titleEn: 'PDF Split',
  descriptionEn:
    'Split PDF locally: by page ranges, every N pages, or page-by-page into multiple files, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'split', 'pages'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['mode', 'pages', 'chunkSize'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

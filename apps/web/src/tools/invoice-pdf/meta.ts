import type { ToolMeta } from '@toolbox/catalog'

/**
 * invoice-pdf —— 全局编号 #512
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P0｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'invoice-pdf',
  slug: 'invoice-pdf',
  title: '发票 PDF 生成',
  description: '填写发票抬头、明细与税率，生成排版好的发票 PDF，纯本地生成',
  titleEn: 'Invoice PDF Generator',
  descriptionEn:
    'Fill in invoice header, line items and tax rate to generate a formatted PDF locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'invoice', 'billing', 'document'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'seller', 'buyer', 'number', 'date', 'taxRate', 'notes'],
  outputs: ['file'],
  options: [],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

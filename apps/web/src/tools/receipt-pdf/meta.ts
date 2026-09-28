import type { ToolMeta } from '@toolbox/catalog'

/**
 * receipt-pdf —— 全局编号 #513
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'receipt-pdf',
  slug: 'receipt-pdf',
  title: '收据 PDF 生成',
  description: '填写商户、明细与支付方式，生成简洁收据 PDF，纯本地生成',
  titleEn: 'Receipt PDF Generator',
  descriptionEn:
    'Fill in merchant, line items and payment method to generate a clean receipt PDF locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'receipt', 'billing', 'document'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'merchant', 'date', 'payment'],
  outputs: ['file'],
  options: [],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

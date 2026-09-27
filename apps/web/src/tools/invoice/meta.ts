import type { ToolMeta } from '@toolbox/catalog'

/**
 * invoice —— 全局编号 #355
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 发票生成：填写购销双方与明细，生成发票并导出图片
 */
export const meta: ToolMeta = {
  id: 'invoice',
  slug: 'invoice',
  title: '发票生成',
  description: '填写购销双方与明细，生成发票并导出图片',
  titleEn: 'Invoice Generator',
  descriptionEn: 'Fill in buyer/seller and line items, generate an invoice and export as image',

  category: 'math',
  group: 'life',
  tags: ['invoice', 'finance', 'bill'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['taxRate'],

  deps: ['html-to-image'],
  worker: false,
  wasm: false,
  api: false,
}

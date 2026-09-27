import type { ToolMeta } from '@toolbox/catalog'

/**
 * invoice-gen —— 全局编号 #406
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 发票生成：填写销方/购方/明细 → 自动算税额 → 预览 → 导出 PNG（html-to-image）
 */
export const meta: ToolMeta = {
  id: 'invoice-gen',
  slug: 'invoice-gen',
  title: '发票生成',
  description: '填写销方、购方与收费明细，自动计算税额，预览排版并导出 PNG 发票',
  titleEn: 'Invoice Generator',
  descriptionEn:
    'Enter seller, buyer and line items, auto-compute tax, preview the layout and export a PNG invoice',

  category: 'random',
  group: 'design',
  tags: ['invoice', 'bill', 'generator', 'export'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'seller', 'buyer', 'number', 'date', 'taxRate', 'notes'],
  outputs: ['text'],
  options: [],

  deps: ['html-to-image'],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * receipt —— 全局编号 #407
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 收据生成：填写付款人/收款人/金额/事由 → 预览 → 导出 PNG（html-to-image）
 */
export const meta: ToolMeta = {
  id: 'receipt',
  slug: 'receipt',
  title: '收据生成',
  description: '填写付款人、收款人、金额与事由，生成规范收据并导出 PNG 图片',
  titleEn: 'Receipt Generator',
  descriptionEn:
    'Enter payer, payee, amount and purpose to generate a proper receipt and export it as a PNG image',

  category: 'random',
  group: 'design',
  tags: ['receipt', 'payment', 'generator', 'export'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'payer', 'payee', 'amount', 'date', 'number'],
  outputs: ['text'],
  options: ['method'],

  deps: ['html-to-image'],
  worker: false,
  wasm: false,
  api: false,
}

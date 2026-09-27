import type { ToolMeta } from '@toolbox/catalog'

/**
 * tax —— 全局编号 #349
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 税率计算：含税价 / 不含税价互转，算税额与对应价格（decimal.js 保精度）
 */
export const meta: ToolMeta = {
  id: 'tax',
  slug: 'tax',
  title: '税率计算',
  description: '含税价 / 不含税价互转：输入金额与税率，算税额与对应价格',
  titleEn: 'Tax Calculator',
  descriptionEn:
    'Convert between tax-inclusive and tax-exclusive prices: enter amount and tax rate to get tax amount and the counterpart price',

  category: 'math',
  group: 'life',
  tags: ['tax', 'vat', 'finance'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'taxRate'],
  outputs: ['text'],
  options: ['taxDirection'],

  deps: ['decimal.js'],
  worker: false,
  wasm: false,
  api: false,
}

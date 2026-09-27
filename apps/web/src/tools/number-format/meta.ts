import type { ToolMeta } from '@toolbox/catalog'

/**
 * number-format —— 全局编号 #366
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 数字格式：Intl.NumberFormat；千分位、小数位、百分比、科学计数法选项
 */
export const meta: ToolMeta = {
  id: 'number-format',
  slug: 'number-format',
  title: '数字格式',
  description: '按千分位、小数位、百分比、科学计数法格式化数字',
  titleEn: 'Number Format',
  descriptionEn:
    'Format numbers with thousands separators, fixed decimals, percent style or scientific notation',

  category: 'math',
  group: 'life',
  tags: ['number', 'format', 'percent', 'math'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'grouping', 'decimals'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

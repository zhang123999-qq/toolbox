import type { ToolMeta } from '@toolbox/catalog'

/**
 * currency —— 全局编号 #365
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 货币格式：Intl.NumberFormat 按货币代码 / 地区格式 / 显示方式 / 小数位格式化金额。
 * 来源：docs/tools/06-数学金融.md
 */
export const meta: ToolMeta = {
  id: 'currency',
  slug: 'currency',
  title: '货币格式',
  description: '按货币代码、地区格式、符号/代码/名称与小数位选项格式化金额',
  titleEn: 'Currency Formatter',
  descriptionEn:
    'Format amounts with Intl.NumberFormat: currency code, locale, symbol/code/name and decimals',

  category: 'math',
  group: 'life',
  tags: ['currency', 'money', 'format', 'intl'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['currency', 'locale', 'display', 'decimals'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

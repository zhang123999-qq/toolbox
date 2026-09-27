import type { ToolMeta } from '@toolbox/catalog'

/**
 * median —— 全局编号 #332
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 中位数：求一组数字排序后的中间值
 */
export const meta: ToolMeta = {
  id: 'median',
  slug: 'median',
  title: '中位数',
  description: '求一组数字排序后的中位数（中间值），附个数与排序结果',
  titleEn: 'Median Calculator',
  descriptionEn: 'Compute the median (middle value) of a sorted set of numbers, with count',

  category: 'math',
  group: 'life',
  tags: ['median', 'statistics', 'math'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['decimals'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

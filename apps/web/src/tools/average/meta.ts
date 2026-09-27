import type { ToolMeta } from '@toolbox/catalog'

/**
 * average —— 全局编号 #331
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 平均数：求一组数字的算术平均数，附总和与最值
 */
export const meta: ToolMeta = {
  id: 'average',
  slug: 'average',
  title: '平均数',
  description: '求一组数字的算术平均数，附个数、总和、最小值与最大值',
  titleEn: 'Average Calculator',
  descriptionEn:
    'Compute the arithmetic mean of a set of numbers, with count, sum, minimum and maximum',

  category: 'math',
  group: 'life',
  tags: ['average', 'mean', 'statistics', 'math'],

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

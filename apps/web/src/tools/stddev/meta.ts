import type { ToolMeta } from '@toolbox/catalog'

/**
 * stddev —— 全局编号 #335
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 标准差：输入一组数字，计算总体标准差或样本标准差
 */
export const meta: ToolMeta = {
  id: 'stddev',
  slug: 'stddev',
  title: '标准差',
  description: '输入一组数字，计算总体标准差或样本标准差，附均值与数据个数',
  titleEn: 'Standard Deviation',
  descriptionEn:
    'Compute the population or sample standard deviation of a list of numbers, with mean and count',

  category: 'math',
  group: 'life',
  tags: ['stddev', 'statistics', 'math', 'spread'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['sample'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

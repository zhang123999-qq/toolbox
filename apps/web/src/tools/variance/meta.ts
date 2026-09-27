import type { ToolMeta } from '@toolbox/catalog'

/**
 * variance —— 全局编号 #334
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 方差：输入一组数字，计算总体方差或样本方差
 */
export const meta: ToolMeta = {
  id: 'variance',
  slug: 'variance',
  title: '方差',
  description: '输入一组数字，计算总体方差或样本方差，附均值与数据个数',
  titleEn: 'Variance',
  descriptionEn:
    'Compute the population or sample variance of a list of numbers, with mean and count',

  category: 'math',
  group: 'life',
  tags: ['variance', 'statistics', 'math', 'spread'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * probability —— 全局编号 #368
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 概率计算：二项分布 P(X=k)/累积、条件概率 P(A|B)、正态分布近似（erf 实现）；
 * n 很大时用对数域 / 正态近似防溢出
 */
export const meta: ToolMeta = {
  id: 'probability',
  slug: 'probability',
  title: '概率计算',
  description: '二项分布、条件概率与正态分布的概率计算',
  titleEn: 'Probability Calculator',
  descriptionEn:
    'Compute binomial probabilities, conditional probability and normal distribution values',

  category: 'math',
  group: 'life',
  tags: ['probability', 'binomial', 'normal', 'statistics', 'math'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'decimals'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

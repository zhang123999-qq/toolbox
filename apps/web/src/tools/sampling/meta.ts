import type { ToolMeta } from '@toolbox/catalog'

/**
 * sampling —— 全局编号 #369
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 随机抽样：从输入总体中有放回 / 无放回抽取样本；可选种子，相同种子结果可复现（mulberry32）
 */
export const meta: ToolMeta = {
  id: 'sampling',
  slug: 'sampling',
  title: '随机抽样',
  description: '从输入总体中随机抽样：支持有放回 / 无放回、可设样本量与种子，相同种子结果可复现',
  titleEn: 'Random Sampling',
  descriptionEn:
    'Draw a random sample from a population, with or without replacement; an optional seed makes the result reproducible',

  category: 'math',
  group: 'life',
  tags: ['sampling', 'random', 'statistics', 'math'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'sampleSize', 'seed'],
  outputs: ['text'],
  options: ['replace'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

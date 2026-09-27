import type { ToolMeta } from '@toolbox/catalog'

/**
 * permutation —— 全局编号 #336
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 排列组合：输入 n 与 k，计算排列数 P(n,k)、组合数 C(n,k) 与阶乘（BigInt 精确计算）
 */
export const meta: ToolMeta = {
  id: 'permutation',
  slug: 'permutation',
  title: '排列组合',
  description: '输入 n 和 k，计算排列数 P(n,k)、组合数 C(n,k) 与阶乘（n ≤ 1000）',
  titleEn: 'Permutations & Combinations',
  descriptionEn:
    'Compute P(n,k), C(n,k) and factorials for given n and k, exactly with BigInt (n ≤ 1000)',

  category: 'math',
  group: 'life',
  tags: ['permutation', 'combination', 'math', 'factorial'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'k'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

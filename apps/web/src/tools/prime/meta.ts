import type { ToolMeta } from '@toolbox/catalog'

/**
 * prime —— 全局编号 #337
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 质数判断：Miller–Rabin 确定性判定（|n| ≤ 10^12），合数给出最小质因数
 */
export const meta: ToolMeta = {
  id: 'prime',
  slug: 'prime',
  title: '质数判断',
  description: '判断整数是否为质数（支持 |n| ≤ 10¹²），合数给出最小质因数',
  titleEn: 'Prime Checker',
  descriptionEn:
    'Test whether an integer is prime (supports |n| ≤ 10¹²); shows the smallest prime factor for composites',

  category: 'math',
  group: 'life',
  tags: ['prime', 'math', 'number-theory'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

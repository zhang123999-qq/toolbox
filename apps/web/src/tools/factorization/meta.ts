import type { ToolMeta } from '@toolbox/catalog'

/**
 * factorization —— 全局编号 #338
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 因数分解：将整数分解为质因数（|n| ≤ 10^12），附因数个数与因数和
 */
export const meta: ToolMeta = {
  id: 'factorization',
  slug: 'factorization',
  title: '因数分解',
  description: '将整数分解为质因数（支持 |n| ≤ 10¹²），附因数个数与因数和',
  titleEn: 'Prime Factorization',
  descriptionEn:
    'Factor an integer into primes (supports |n| ≤ 10¹²), with divisor count and divisor sum',

  category: 'math',
  group: 'life',
  tags: ['factorization', 'prime', 'math', 'factor'],

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

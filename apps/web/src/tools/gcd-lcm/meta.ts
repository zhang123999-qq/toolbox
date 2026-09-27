import type { ToolMeta } from '@toolbox/catalog'

/**
 * gcd-lcm —— 全局编号 #339
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * GCD/LCM：求两个整数的最大公约数与最小公倍数（BigInt，任意大整数精确）
 */
export const meta: ToolMeta = {
  id: 'gcd-lcm',
  slug: 'gcd-lcm',
  title: 'GCD/LCM',
  description: '求两个整数的最大公约数与最小公倍数，附互质判断，大整数用 BigInt 精确计算',
  titleEn: 'GCD / LCM',
  descriptionEn:
    'Compute the greatest common divisor and least common multiple of two integers, with coprimality check; exact for big integers via BigInt',

  category: 'math',
  group: 'life',
  tags: ['math', 'gcd', 'lcm', 'number-theory'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

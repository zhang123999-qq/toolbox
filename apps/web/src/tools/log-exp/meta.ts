import type { ToolMeta } from '@toolbox/catalog'

/**
 * log-exp —— 全局编号 #344
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 对数指数：常用对数、自然对数、二进制对数、自定义底数对数与指数运算
 */
export const meta: ToolMeta = {
  id: 'log-exp',
  slug: 'log-exp',
  title: '对数指数',
  description: '常用对数 lg、自然对数 ln、二进制对数、自定义底数对数与指数运算，附定义域检查',
  titleEn: 'Logarithm & Exponential',
  descriptionEn:
    'Common log, natural log, binary log, custom-base log and exponentials, with domain checks',

  category: 'math',
  group: 'life',
  tags: ['math', 'logarithm', 'exponential', 'power'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['function'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

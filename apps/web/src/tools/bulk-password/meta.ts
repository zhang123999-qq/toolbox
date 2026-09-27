import type { ToolMeta } from '@toolbox/catalog'

/**
 * bulk-password —— 全局编号 #420
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 随机密码批量：一次生成多条随机密码（上限 10000 条，性能边界见页面说明与 README）。
 * 与「随机密码」（password-generator，一次一条）不同：本工具面向批量发放/初始化场景；
 * 随机源为 crypto.getRandomValues。
 */
export const meta: ToolMeta = {
  id: 'bulk-password',
  slug: 'bulk-password',
  title: '随机密码批量',
  description:
    '一次批量生成多条随机密码（上限 10000 条）；区别于「随机密码」的一次一条，适合批量发放与账号初始化',
  titleEn: 'Bulk Password Generator',
  descriptionEn:
    'Generate many random passwords at once (up to 10,000); unlike Random Password which outputs one at a time, this fits bulk provisioning and account setup',

  category: 'random',
  group: 'design',
  tags: ['password', 'bulk', 'security', 'generator'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'length', 'lower', 'upper', 'numbers', 'symbols'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

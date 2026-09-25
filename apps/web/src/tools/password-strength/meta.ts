import type { ToolMeta } from '@toolbox/catalog'

/**
 * password-strength —— 全局编号 #113
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'password-strength',
  slug: 'password-strength',
  title: '密码强度',
  description: '用 zxcvbn 估算口令强度与破解耗时',
  titleEn: 'Password Strength',
  descriptionEn: 'Estimate password strength and crack time with zxcvbn',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'password', 'security', 'zxcvbn', 'audit'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['zxcvbn'],
  worker: false,
  wasm: false,
  api: false,
}

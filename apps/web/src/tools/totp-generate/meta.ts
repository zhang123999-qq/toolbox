import type { ToolMeta } from '@toolbox/catalog'

/**
 * totp-generate —— 全局编号 #105
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'totp-generate',
  slug: 'totp-generate',
  title: 'TOTP 生成',
  description: '按时间生成动态验证码（6 / 8 位，周期可调）',
  titleEn: 'TOTP Generator',
  descriptionEn: 'Generate time-based one-time passwords (6 or 8 digits)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'otp', 'totp', '2fa', 'auth'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['digits', 'period', 'algorithm'],

  deps: ['otpauth'],
  worker: false,
  wasm: false,
  api: false,
}

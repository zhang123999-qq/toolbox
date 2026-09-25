import type { ToolMeta } from '@toolbox/catalog'

/**
 * hotp-generate —— 全局编号 #106
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'hotp-generate',
  slug: 'hotp-generate',
  title: 'HOTP 生成',
  description: '按计数器生成一次性口令（RFC 4226）',
  titleEn: 'HOTP Generator',
  descriptionEn: 'Generate counter-based one-time passwords (RFC 4226)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'otp', 'hotp', '2fa', 'counter'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['digits', 'algorithm'],

  deps: ['otpauth'],
  worker: false,
  wasm: false,
  api: false,
}

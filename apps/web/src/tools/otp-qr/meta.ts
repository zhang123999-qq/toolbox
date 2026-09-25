import type { ToolMeta } from '@toolbox/catalog'

/**
 * otp-qr —— 全局编号 #107
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'otp-qr',
  slug: 'otp-qr',
  title: 'OTP 二维码',
  description: '生成 otpauth:// 绑定地址与字符画二维码',
  titleEn: 'OTP QR Code',
  descriptionEn: 'Build an otpauth:// URI and render it as an ASCII QR code',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'otp', 'totp', 'hotp', 'qr', '2fa'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'digits', 'period', 'algorithm'],

  deps: ['otpauth', 'qrcode'],
  worker: false,
  wasm: false,
  api: false,
}

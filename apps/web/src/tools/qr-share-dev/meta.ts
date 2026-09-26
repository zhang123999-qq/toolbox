import type { ToolMeta } from '@toolbox/catalog'

/**
 * qr-share-dev —— 全局编号 #269
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'qr-share-dev',
  slug: 'qr-share-dev',
  title: '二维码分享',
  description: '把文本或链接生成二维码（SVG 源码），扫码即可在手机上打开',
  titleEn: 'QR Share',
  descriptionEn: 'Generate a QR code SVG from text or a URL for sharing',

  category: 'devops',
  group: 'dev',
  tags: ['qrcode', 'share', 'url', 'mobile'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['level'],

  deps: ['qrcode'],
  worker: false,
  wasm: false,
  api: false,
}

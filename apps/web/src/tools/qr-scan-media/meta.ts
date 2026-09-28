import type { ToolMeta } from '@toolbox/catalog'

/**
 * qr-scan-media —— 全局编号 #571
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（jsqr 纯 JS 解码）｜模板：T3
 *
 * 注意：本工具是二维码「扫描识别」器（从摄像头 / 图片解码），
 * 与仓库已有的 qrcode「生成」器不重复。
 */
export const meta: ToolMeta = {
  id: 'qr-scan-media',
  slug: 'qr-scan-media',
  title: '二维码扫描',
  description: '用摄像头实时扫描或上传图片，用 jsqr 解码二维码内容',
  titleEn: 'QR Scanner',
  descriptionEn: 'Scan QR codes from camera or uploaded images with jsqr',

  category: 'media',
  group: 'design',
  tags: ['qr', 'scan', 'qrcode', 'decode', 'camera'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['jsqr'],
  worker: false,
  wasm: false,
  api: false,
}

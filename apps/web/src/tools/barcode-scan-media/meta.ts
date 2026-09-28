import type { ToolMeta } from '@toolbox/catalog'

/**
 * barcode-scan-media —— 全局编号 #572
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（ZXing 纯 JS 解码）｜模板：T3
 *
 * 注意：本工具是一维条码 / 二维码「扫描识别」器（从摄像头 / 图片解码），
 * 与仓库已有的 barcode「生成」器不重复。
 */
export const meta: ToolMeta = {
  id: 'barcode-scan-media',
  slug: 'barcode-scan-media',
  title: '条码扫描',
  description: '用摄像头实时扫描或上传图片，用 ZXing 解码一维条码与二维码',
  titleEn: 'Barcode Scanner',
  descriptionEn: 'Scan 1D barcodes and QR codes from camera or images with ZXing',

  category: 'media',
  group: 'design',
  tags: ['barcode', 'scan', 'zxing', 'decode', 'camera'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['@zxing/browser'],
  worker: false,
  wasm: false,
  api: false,
}

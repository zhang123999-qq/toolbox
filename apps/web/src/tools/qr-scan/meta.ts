import type { ToolMeta } from '@toolbox/catalog'

/**
 * qr-scan —— 全局编号 #447
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 二维码识别：上传图片 → 本地解码其中的二维码 → 显示解码文本与码制，可一键复制。
 *
 * 依赖选择说明（经协调员确认的偏离）：
 * 规格文档建议使用 jsQR，但 jsQR 仅支持 QR 码；而本批 #448（条码识别）需要一维码。
 * 为将新增依赖数量压到最少，#447 / #448 统一使用 @zxing/library（纯 JS 实现，
 * 无 WASM 依赖），本工具仅通过 POSSIBLE_FORMATS hints 限定为 QR_CODE。
 */
export const meta: ToolMeta = {
  id: 'qr-scan',
  slug: 'qr-scan',
  title: '二维码识别',
  description: '上传图片识别其中的二维码：本地解码显示文本内容与码制，可一键复制，全程不上传',
  titleEn: 'QR Code Scanner',
  descriptionEn:
    'Decode QR codes from uploaded images locally: shows decoded text and format, one-click copy, no upload',

  category: 'image',
  group: 'design',
  tags: ['qr', 'qrcode', 'scan', 'decode', 'image'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: ['@zxing/library'],
  worker: false,
  wasm: false,
  api: false,
}

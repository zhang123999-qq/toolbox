import type { ToolMeta } from '@toolbox/catalog'

/**
 * barcode-scan —— 全局编号 #448
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 条形码识别：上传图片，用 @zxing/library（纯 JS 实现，无 WASM）解码其中的一维条形码，
 * 展示解码文本 + 码制中文名，一键复制结果；未识别到时友好提示。
 * 与「条形码生成」（barcode，#382）不同：barcode 是把文本编码成条码图片（生成方向）；
 * 本工具是反向操作——从图片中识别并解码出条码内容（识别方向），两者功能互补、不重叠。
 * 依赖说明：规格文档写"纯 JS"，但手写一维码解码无法达到零 Bug 标准，
 * 故与 #447 共用 @zxing/library（纯 JS 实现，无 WASM，可行性仍为 A），
 * 此偏离已经协调员确认。
 */
export const meta: ToolMeta = {
  id: 'barcode-scan',
  slug: 'barcode-scan',
  title: '条形码识别',
  description:
    '本地识别图片中的一维条形码：EAN-13/8、UPC-A/E、Code128/39、ITF，显示内容与码制，全程不上传',
  titleEn: 'Barcode Scan',
  descriptionEn:
    'Decode 1D barcodes from images locally: EAN-13/8, UPC-A/E, Code128/39, ITF; shows text and format, no upload',

  category: 'image',
  group: 'design',
  tags: ['barcode', 'scan', 'decode', 'ean', 'image'],

  priority: 'P2',
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

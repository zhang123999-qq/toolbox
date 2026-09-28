import type { ToolMeta } from '@toolbox/catalog'

/**
 * ocr —— 全局编号 #446
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：B｜模板：T2
 * 来源：docs/tools/08-图片图形.md
 * 图片文字识别：tesseract.js（WASM）在浏览器本地识别图片中的中英文文字。
 * 注意：tesseract.js 首次使用时从 CDN 下载识别引擎与语言包（图片本身不上传），
 * 因此不是完全离线工具，页面内有显著的隐私说明。
 */
export const meta: ToolMeta = {
  id: 'ocr',
  slug: 'ocr',
  title: 'OCR 图片文字识别',
  description:
    '上传图片，本地识别其中的中英文文字并可一键复制（引擎与语言包从 CDN 下载，图片不上传）',
  titleEn: 'OCR Image Text Recognition',
  descriptionEn:
    'Upload an image to recognize Chinese/English text locally and copy the result (engine and language packs are downloaded from a CDN; images are never uploaded)',

  category: 'image',
  group: 'design',
  tags: ['ocr', 'text', 'recognize', 'image', 'tesseract'],

  priority: 'P2',
  feasibility: 'B',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: ['languages'],

  deps: ['tesseract.js'],
  worker: true,
  wasm: true,
  api: false,
}

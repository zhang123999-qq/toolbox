import type { ToolMeta } from '@toolbox/catalog'

/**
 * ocr-post —— 全局编号 #599
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS 规则纠错）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ocr-post',
  slug: 'ocr-post',
  title: 'OCR后处理',
  description: 'OCR 文本规则纠错：形近字、多余空白、换行合并、全半角统一，规则可开关',
  titleEn: 'OCR Post-processor',
  descriptionEn: 'Rule-based OCR text cleanup: confusables, whitespace, line breaks, width',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'ocr', 'text', 'cleanup', 'local'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['confusables', 'spaces', 'lineBreaks', 'width'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

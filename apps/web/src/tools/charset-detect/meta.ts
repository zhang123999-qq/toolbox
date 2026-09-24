import type { ToolMeta } from '@toolbox/catalog'

/**
 * charset-detect —— 全局编号 #40
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'charset-detect',
  slug: 'charset-detect',
  title: '编码检测',
  description: '检测文本编码',
  titleEn: 'Encoding Detector',
  descriptionEn: 'Detect the character encoding of text',

  category: 'text',
  group: 'dev',
  tags: ['text', 'charset', 'encoding'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['topN', 'preview'],

  deps: ['chardet'],
  worker: false,
  wasm: false,
  api: false,
}

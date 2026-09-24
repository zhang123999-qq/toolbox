import type { ToolMeta } from '@toolbox/catalog'

/**
 * pinyin —— 全局编号 #13
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'pinyin',
  slug: 'pinyin',
  title: '拼音转换',
  description: '汉字转拼音，支持声调、多音字',
  titleEn: 'Pinyin',
  descriptionEn: 'Convert Chinese characters to pinyin with tones and polyphone support',

  category: 'text',
  group: 'dev',
  tags: ['text', 'pinyin', 'chinese'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['tone'],

  deps: ['pinyin-pro'],
  worker: false,
  wasm: false,
  api: false,
}

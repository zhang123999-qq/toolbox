import type { ToolMeta } from '@toolbox/catalog'

/**
 * zhuyin —— 全局编号 #14
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'zhuyin',
  slug: 'zhuyin',
  title: '注音转换',
  description: '汉字转注音符号',
  titleEn: 'Zhuyin',
  descriptionEn: 'Convert Chinese characters to zhuyin (bopomofo) symbols',

  category: 'text',
  group: 'dev',
  tags: ['text', 'zhuyin', 'chinese'],

  priority: 'P1',
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

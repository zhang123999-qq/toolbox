import type { ToolMeta } from '@toolbox/catalog'

/**
 * word-count —— 全局编号 #1
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'word-count',
  slug: 'word-count',
  title: '字数统计',
  description: '统计字符、字、词、句、段、行、字节与阅读时间',
  titleEn: 'Word Count',
  descriptionEn: 'Count characters, words, sentences, paragraphs, lines, bytes and reading time',

  category: 'text',
  group: 'dev',
  tags: ['text', 'count', 'stats'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['countSpaces'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

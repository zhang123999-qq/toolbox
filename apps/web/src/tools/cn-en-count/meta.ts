import type { ToolMeta } from '@toolbox/catalog'

/**
 * cn-en-count —— 全局编号 #2
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'cn-en-count',
  slug: 'cn-en-count',
  title: '中英文字数',
  description: '区分中文字符与英文单词分别计数',
  titleEn: 'Chinese / English Count',
  descriptionEn: 'Count Chinese characters and English words separately',

  category: 'text',
  group: 'dev',
  tags: ['text', 'count', 'chinese'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

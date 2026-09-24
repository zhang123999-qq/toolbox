import type { ToolMeta } from '@toolbox/catalog'

/**
 * diff-highlight —— 全局编号 #51
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'diff-highlight',
  slug: 'diff-highlight',
  title: '文本对比高亮',
  description: '差异高亮显示',
  titleEn: 'Diff Highlighter',
  descriptionEn: 'Highlight the differences between two texts',

  category: 'text',
  group: 'dev',
  tags: ['text', 'diff', 'highlight'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['diff'],
  worker: false,
  wasm: false,
  api: false,
}

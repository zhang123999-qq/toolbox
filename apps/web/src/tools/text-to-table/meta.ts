import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-to-table —— 全局编号 #23
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-to-table',
  slug: 'text-to-table',
  title: '文本转表格',
  description: '分隔文本转表格',
  titleEn: 'Text to Table',
  descriptionEn: 'Turn delimited text into an aligned table',

  category: 'text',
  group: 'dev',
  tags: ['text', 'table', 'format'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['delimiter', 'style', 'header'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

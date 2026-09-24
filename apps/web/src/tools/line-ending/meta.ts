import type { ToolMeta } from '@toolbox/catalog'

/**
 * line-ending —— 全局编号 #44
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'line-ending',
  slug: 'line-ending',
  title: '换行符转换',
  description: 'LF、CRLF、CR 互转',
  titleEn: 'Line Ending Converter',
  descriptionEn: 'Convert between LF, CRLF and CR line endings',

  category: 'text',
  group: 'dev',
  tags: ['text', 'line-ending', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['target'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

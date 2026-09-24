import type { ToolMeta } from '@toolbox/catalog'

/**
 * duplicate-lines —— 全局编号 #59
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'duplicate-lines',
  slug: 'duplicate-lines',
  title: '重复行检测',
  description: '找出重复行并统计',
  titleEn: 'Duplicate Line Finder',
  descriptionEn: 'Find duplicate lines and count them',

  category: 'text',
  group: 'dev',
  tags: ['text', 'duplicate', 'lines'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'trim', 'ignoreCase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * blank-lines —— 全局编号 #60
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'blank-lines',
  slug: 'blank-lines',
  title: '空行处理',
  description: '删除、压缩空行',
  titleEn: 'Blank Line Handler',
  descriptionEn: 'Remove or collapse blank lines',

  category: 'text',
  group: 'dev',
  tags: ['text', 'blank', 'lines'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-hash —— 全局编号 #66
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：C｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-hash',
  slug: 'text-hash',
  title: '文本哈希',
  description: '文本哈希值',
  titleEn: 'Text Hash',
  descriptionEn: 'Hash a piece of text',

  category: 'text',
  group: 'dev',
  tags: ['text', 'hash', 'crypto'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['algorithm', 'uppercase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

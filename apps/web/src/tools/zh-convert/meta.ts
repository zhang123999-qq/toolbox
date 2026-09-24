import type { ToolMeta } from '@toolbox/catalog'

/**
 * zh-convert —— 全局编号 #12
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'zh-convert',
  slug: 'zh-convert',
  title: '简繁转换',
  description: '简体与繁体中文互转',
  titleEn: 'Chinese Convert',
  descriptionEn: 'Convert between Simplified and Traditional Chinese',

  category: 'text',
  group: 'dev',
  tags: ['text', 'chinese', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['opencc-js'],
  worker: false,
  wasm: false,
  api: false,
}

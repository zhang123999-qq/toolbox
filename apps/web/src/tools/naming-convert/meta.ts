import type { ToolMeta } from '@toolbox/catalog'

/**
 * naming-convert —— 全局编号 #10
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'naming-convert',
  slug: 'naming-convert',
  title: '命名转换',
  description: '驼峰、下划线、中划线、常量、帕斯卡互转',
  titleEn: 'Naming Convert',
  descriptionEn: 'Convert between camel, snake, kebab, constant and pascal case',

  category: 'text',
  group: 'dev',
  tags: ['text', 'naming', 'code'],

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

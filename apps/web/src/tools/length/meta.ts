import type { ToolMeta } from '@toolbox/catalog'

/**
 * length —— 全局编号 #315
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 长度换算：毫米到英里，长度单位互转
 */
export const meta: ToolMeta = {
  id: 'length',
  slug: 'length',
  title: '长度换算',
  description: '毫米到英里，长度单位互转',
  titleEn: 'Length Converter',
  descriptionEn: 'Convert between length units, from millimeters to miles',

  category: 'math',
  group: 'life',
  tags: ['length', 'distance', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['from', 'to'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

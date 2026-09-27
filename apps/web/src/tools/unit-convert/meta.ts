import type { ToolMeta } from '@toolbox/catalog'

/**
 * unit-convert —— 全局编号 #314
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 单位换算：长度/重量/面积/体积/温度/速度，多类别单位一站式换算
 */
export const meta: ToolMeta = {
  id: 'unit-convert',
  slug: 'unit-convert',
  title: '单位换算',
  description: '长度/重量/面积/体积/温度/速度，多类别单位一站式换算',
  titleEn: 'Unit Converter',
  descriptionEn: 'All-in-one converter: length, weight, area, volume, temperature, speed',

  category: 'math',
  group: 'life',
  tags: ['unit', 'convert', 'length'],

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

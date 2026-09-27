import type { ToolMeta } from '@toolbox/catalog'

/**
 * power —— 全局编号 #323
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 功率换算：瓦特/马力/千瓦等功率单位互转
 */
export const meta: ToolMeta = {
  id: 'power',
  slug: 'power',
  title: '功率换算',
  description: '瓦特/马力/千瓦等功率单位互转',
  titleEn: 'Power Converter',
  descriptionEn: 'Convert between power units: W, kW, MW, hp, PS, BTU/h and more',

  category: 'math',
  group: 'life',
  tags: ['power', 'unit', 'convert'],

  priority: 'P1',
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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * energy —— 全局编号 #322
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 能量换算：焦耳/卡路里/千瓦时/电子伏特等能量单位互转
 */
export const meta: ToolMeta = {
  id: 'energy',
  slug: 'energy',
  title: '能量换算',
  description: '焦耳/卡路里/千瓦时/电子伏特等能量单位互转',
  titleEn: 'Energy Converter',
  descriptionEn: 'Convert between energy units: J, kJ, cal, kcal, kWh, eV, BTU and more',

  category: 'math',
  group: 'life',
  tags: ['energy', 'unit', 'convert'],

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

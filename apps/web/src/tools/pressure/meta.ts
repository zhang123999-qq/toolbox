import type { ToolMeta } from '@toolbox/catalog'

/**
 * pressure —— 全局编号 #321
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 压力换算：帕斯卡/巴/psi/大气压等压力单位互转
 */
export const meta: ToolMeta = {
  id: 'pressure',
  slug: 'pressure',
  title: '压力换算',
  description: '帕斯卡/巴/psi/大气压等压力单位互转',
  titleEn: 'Pressure Converter',
  descriptionEn: 'Convert between pressure units: Pa, kPa, MPa, bar, psi, atm, mmHg and more',

  category: 'math',
  group: 'life',
  tags: ['pressure', 'unit', 'convert'],

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

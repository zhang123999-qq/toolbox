import type { ToolMeta } from '@toolbox/catalog'

/**
 * weight —— 全局编号 #316
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 重量换算：毫克到磅，重量单位互转（含斤）
 */
export const meta: ToolMeta = {
  id: 'weight',
  slug: 'weight',
  title: '重量换算',
  description: '毫克到磅，重量单位互转（含斤）',
  titleEn: 'Weight Converter',
  descriptionEn: 'Convert between weight units, milligrams to pounds (incl. jin)',

  category: 'math',
  group: 'life',
  tags: ['weight', 'mass', 'convert'],

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

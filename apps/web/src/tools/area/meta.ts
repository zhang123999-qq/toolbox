import type { ToolMeta } from '@toolbox/catalog'

/**
 * area —— 全局编号 #317
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 面积换算：面积单位互转（含亩、公顷）
 */
export const meta: ToolMeta = {
  id: 'area',
  slug: 'area',
  title: '面积换算',
  description: '面积单位互转（含亩、公顷）',
  titleEn: 'Area Converter',
  descriptionEn: 'Convert between area units (incl. mu and hectare)',

  category: 'math',
  group: 'life',
  tags: ['area', 'convert', 'land'],

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

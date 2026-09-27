import type { ToolMeta } from '@toolbox/catalog'

/**
 * speed —— 全局编号 #320
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 速度换算：米/秒、千米/时、英里/时、英尺/秒、节互转
 */
export const meta: ToolMeta = {
  id: 'speed',
  slug: 'speed',
  title: '速度换算',
  description: '速度单位互转（米/秒、千米/时、英里/时、节）',
  titleEn: 'Speed Converter',
  descriptionEn: 'Convert between speed units (m/s, km/h, mph, knots)',

  category: 'math',
  group: 'life',
  tags: ['speed', 'velocity', 'convert'],

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

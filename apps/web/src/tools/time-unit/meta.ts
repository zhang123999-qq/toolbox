import type { ToolMeta } from '@toolbox/catalog'

/**
 * time-unit —— 全局编号 #326
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 时间单位：纳秒到年，时间单位互转
 */
export const meta: ToolMeta = {
  id: 'time-unit',
  slug: 'time-unit',
  title: '时间单位',
  description: '纳秒到年，时间单位互转',
  titleEn: 'Time Unit Converter',
  descriptionEn: 'Convert between time units: ns, μs, ms, s, min, h, day, week, month, year',

  category: 'math',
  group: 'life',
  tags: ['time', 'unit', 'convert'],

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

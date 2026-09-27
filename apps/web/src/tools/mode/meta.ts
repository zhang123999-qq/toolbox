import type { ToolMeta } from '@toolbox/catalog'

/**
 * mode —— 全局编号 #333
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 众数：输入一组数字，找出出现次数最多的值（可多个）
 */
export const meta: ToolMeta = {
  id: 'mode',
  slug: 'mode',
  title: '众数',
  description: '输入一组数字，找出出现次数最多的众数，附出现次数与占比',
  titleEn: 'Mode',
  descriptionEn:
    'Find the most frequent value(s) in a list of numbers, with occurrence count and share',

  category: 'math',
  group: 'life',
  tags: ['mode', 'statistics', 'math', 'frequency'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

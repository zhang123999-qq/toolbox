import type { ToolMeta } from '@toolbox/catalog'

/**
 * cps —— 全局编号 #852
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 手速测试：限定时间内统计每秒点击次数（CPS），附平均间隔与最高连击统计。
 */
export const meta: ToolMeta = {
  id: 'cps',
  slug: 'cps',
  title: '手速测试',
  description: '手速 CPS 测试：限定时间内疯狂点击，统计每秒点击数与最高连击',
  titleEn: 'CPS Test',
  descriptionEn: 'Clicks-per-second test: click as fast as you can, get CPS and burst stats',

  category: 'education',
  group: 'life',
  tags: ['game', 'cps', 'speed', 'test', 'fun'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

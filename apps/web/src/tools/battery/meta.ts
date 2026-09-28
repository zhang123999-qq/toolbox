import type { ToolMeta } from '@toolbox/catalog'

/**
 * battery —— 全局编号 #861
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'battery',
  slug: 'battery',
  title: '电池信息',
  description: '通过 Battery Status API 读取设备电量、充电状态与预计充放电时间',
  titleEn: 'Battery Info',
  descriptionEn:
    'Reads device battery level, charging state and estimated charge/discharge time via the Battery Status API',

  category: 'education',
  group: 'life',
  tags: ['battery', 'power', 'device', 'test'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

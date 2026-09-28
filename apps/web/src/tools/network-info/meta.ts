import type { ToolMeta } from '@toolbox/catalog'

/**
 * network-info —— 全局编号 #862
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'network-info',
  slug: 'network-info',
  title: '网络信息',
  description: '通过 Network Information API 读取网络类型、下行速率、RTT 与省流模式状态',
  titleEn: 'Network Info',
  descriptionEn:
    'Reads network type, downlink speed, RTT and data-saver state via the Network Information API',

  category: 'education',
  group: 'life',
  tags: ['network', 'connection', 'speed', 'test'],

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

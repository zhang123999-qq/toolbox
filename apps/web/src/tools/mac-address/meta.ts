import type { ToolMeta } from '@toolbox/catalog'

/**
 * mac-address —— 全局编号 #205
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * MAC 地址解析与生成：格式校验、厂商前缀（OUI）查询、随机生成
 */
export const meta: ToolMeta = {
  id: 'mac-address',
  slug: 'mac-address',
  title: 'MAC 地址',
  description: 'MAC 地址格式校验、厂商前缀查询与随机生成',
  titleEn: 'MAC Address',
  descriptionEn: 'Validate MAC addresses, look up OUI vendor prefix, and generate random MACs',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'network', 'mac', 'oui', 'hardware'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

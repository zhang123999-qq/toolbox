import type { ToolMeta } from '@toolbox/catalog'

/**
 * port-lookup —— 全局编号 #202
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 常用端口双向查询（端口号 ↔ 服务名），内置 50+ 条
 */
export const meta: ToolMeta = {
  id: 'port-lookup',
  slug: 'port-lookup',
  title: '端口查询',
  description: '常用网络端口号与服务名互相查询',
  titleEn: 'Port Lookup',
  descriptionEn: 'Look up common network port numbers by service name or vice versa',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'network', 'port', 'service'],

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

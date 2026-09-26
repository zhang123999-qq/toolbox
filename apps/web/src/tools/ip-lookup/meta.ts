import type { ToolMeta } from '@toolbox/catalog'

/**
 * ip-lookup —— 全局编号 #204
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * IP 地址解析：IPv4/IPv6 校验、分类、二进制/十六进制/整数表示
 */
export const meta: ToolMeta = {
  id: 'ip-lookup',
  slug: 'ip-lookup',
  title: 'IP 查询',
  description: 'IPv4/IPv6 校验与分类：公网/私网/环回/组播，二进制与整数表示',
  titleEn: 'IP Lookup',
  descriptionEn: 'Validate and classify IPv4/IPv6 addresses with binary, hex and integer forms',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'network', 'ipv4', 'ipv6', 'ip'],

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

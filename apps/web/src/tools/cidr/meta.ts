import type { ToolMeta } from '@toolbox/catalog'

/**
 * cidr —— 全局编号 #203
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * IPv4 CIDR 子网计算（网络地址 / 广播 / 可用范围 / 主机数 / 二进制）
 */
export const meta: ToolMeta = {
  id: 'cidr',
  slug: 'cidr',
  title: 'CIDR 计算',
  description: 'IPv4 CIDR 子网计算：网络地址 / 广播 / 掩码 / 可用范围 / 主机数',
  titleEn: 'CIDR Calculator',
  descriptionEn:
    'Compute IPv4 network address, broadcast, subnet mask, usable range and host count',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'network', 'cidr', 'ipv4', 'subnet'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * dns-query —— 全局编号 #207
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 *
 * 走公共 DNS-over-HTTPS（Google）JSON 接口，浏览器直连。
 */
export const meta: ToolMeta = {
  id: 'dns-query',
  slug: 'dns-query',
  title: 'DNS 查询',
  description: '通过 DNS-over-HTTPS 查询域名的 A / AAAA / CNAME / MX / TXT / NS 记录',
  titleEn: 'DNS Query (DoH)',
  descriptionEn: 'Look up A/AAAA/CNAME/MX/TXT/NS records over DNS-over-HTTPS',

  category: 'devops',
  group: 'dev',
  tags: ['dns', 'doh', 'network', 'devops'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

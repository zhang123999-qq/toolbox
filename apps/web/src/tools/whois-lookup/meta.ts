import type { ToolMeta } from '@toolbox/catalog'

/**
 * whois-lookup —— 全局编号 #208
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 *
 * 浏览器无 whois 端口：本地解析域名结构 + 速查表，并尽力尝试 RDAP（rdap.org）。
 */
export const meta: ToolMeta = {
  id: 'whois-lookup',
  slug: 'whois-lookup',
  title: 'Whois 查询',
  description: '解析域名结构，给出 Whois 服务器速查，并尽力查询 RDAP 注册/过期信息',
  titleEn: 'Whois / RDAP Lookup',
  descriptionEn: 'Parse a domain, show whois server hints and best-effort RDAP registration data',

  category: 'devops',
  group: 'dev',
  tags: ['whois', 'rdap', 'dns', 'domain', 'devops'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

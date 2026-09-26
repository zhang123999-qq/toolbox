import type { ToolMeta } from '@toolbox/catalog'

/**
 * lb-config —— 全局编号 #256
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 生成负载均衡配置（Nginx upstream / HAProxy）
 */
export const meta: ToolMeta = {
  id: 'lb-config',
  slug: 'lb-config',
  title: '负载均衡配置',
  description: '配置后端服务器列表与算法，生成 Nginx upstream 或 HAProxy 配置',
  titleEn: 'Load Balancer Config',
  descriptionEn: 'Configure backends and algorithm, generate Nginx upstream or HAProxy config',

  category: 'devops',
  group: 'dev',
  tags: ['nginx', 'haproxy', 'load-balancer', 'upstream', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'servers', 'algorithm', 'healthCheck'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

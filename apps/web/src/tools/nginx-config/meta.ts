import type { ToolMeta } from '@toolbox/catalog'

/**
 * nginx-config —— 全局编号 #225
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'nginx-config',
  slug: 'nginx-config',
  title: 'nginx 配置',
  description: '生成 nginx.conf server 块（静态站点 / 反向代理 / SSL / gzip）',
  titleEn: 'Nginx Config Generator',
  descriptionEn: 'Generate an nginx.conf server block with static root, proxy_pass, SSL and gzip',

  category: 'devops',
  group: 'dev',
  tags: ['nginx', 'config', 'reverse-proxy', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['serverName', 'listen', 'root', 'proxyPass', 'ssl', 'gzip'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

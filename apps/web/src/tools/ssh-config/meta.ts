import type { ToolMeta } from '@toolbox/catalog'

/**
 * ssh-config —— 全局编号 #249
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'ssh-config',
  slug: 'ssh-config',
  title: 'SSH 配置',
  description: '生成 ~/.ssh/config 主机片段（Host / ProxyJump / ForwardAgent 等）',
  titleEn: 'SSH Config Generator',
  descriptionEn: 'Generate a ~/.ssh/config host snippet with ProxyJump and ForwardAgent',

  category: 'devops',
  group: 'dev',
  tags: ['ssh', 'config', 'devops', 'proxyjump'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['host', 'hostname', 'port', 'user', 'identityFile', 'proxyJump', 'forwardAgent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

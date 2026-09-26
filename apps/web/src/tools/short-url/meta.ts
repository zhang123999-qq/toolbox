import type { ToolMeta } from '@toolbox/catalog'

/**
 * short-url —— 全局编号 #270
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P3｜可行性：A｜模板：T2
 *
 * 说明：原规划 E（需后端）。这里降级为「本地短码演示 + 自建短链方案代码」，
 * 不起服务、不真缩短，仅按内容 hash 生成短码并给出 Nginx / Cloudflare Worker 重定向方案。
 */
export const meta: ToolMeta = {
  id: 'short-url',
  slug: 'short-url',
  title: '短链生成',
  description: '本地按内容 hash 生成短码，附自建短链的 Nginx / Cloudflare Worker 重定向方案',
  titleEn: 'Short URL Demo',
  descriptionEn: 'Derive a local short code by content hash and self-host redirect snippets',

  category: 'devops',
  group: 'dev',
  tags: ['url', 'short-link', 'nginx', 'cloudflare-worker'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['baseUrl'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

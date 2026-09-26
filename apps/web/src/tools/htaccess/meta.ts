import type { ToolMeta } from '@toolbox/catalog'

/**
 * htaccess —— 全局编号 #226
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'htaccess',
  slug: 'htaccess',
  title: '.htaccess 生成',
  description: '生成 Apache .htaccess（重定向 / 重写 / 缓存 / 防盗链 / 禁止访问）',
  titleEn: '.htaccess Generator',
  descriptionEn:
    'Generate an Apache .htaccess with redirects, rewrite, cache, hotlink protection and deny rules',

  category: 'devops',
  group: 'dev',
  tags: ['apache', 'htaccess', 'config', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['redirects', 'rewrites', 'cache', 'hotlink', 'deny'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

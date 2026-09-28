import type { ToolMeta } from '@toolbox/catalog'

/**
 * netlify —— 全局编号 #815
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'netlify',
  slug: 'netlify',
  title: 'Netlify 配置',
  description: '生成与校验 netlify.toml：构建设置、重定向规则、响应头的手写 TOML 输出与回读',
  titleEn: 'Netlify Config',
  descriptionEn:
    'Generate and validate netlify.toml: hand-written TOML output and round-trip parsing for build settings, redirects and headers',

  category: 'edge',
  group: 'life',
  tags: ['netlify', 'config', 'toml', 'redirect'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

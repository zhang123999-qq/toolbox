import type { ToolMeta } from '@toolbox/catalog'

/**
 * csp-config —— 全局编号 #246
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 *
 * 与 #127 csp（粗粒度一键基线）不同：本工具逐指令配置 source 取值。
 */
export const meta: ToolMeta = {
  id: 'csp-config',
  slug: 'csp-config',
  title: 'CSP 指令配置',
  description: '逐条配置 CSP 指令（script-src / style-src / frame-ancestors 等）的取值',
  titleEn: 'Fine-grained CSP Config',
  descriptionEn: 'Configure each CSP directive source value individually',

  category: 'devops',
  group: 'dev',
  tags: ['csp', 'security', 'headers', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [
    'defaultSrc',
    'scriptSrc',
    'styleSrc',
    'imgSrc',
    'connectSrc',
    'fontSrc',
    'frameSrc',
    'mediaSrc',
    'objectSrc',
    'baseUri',
    'formAction',
    'frameAncestors',
    'upgradeInsecure',
    'reportOnly',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

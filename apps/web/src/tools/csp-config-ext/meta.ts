import type { ToolMeta } from '@toolbox/catalog'

/**
 * csp-config-ext —— 全局编号 #777
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'csp-config-ext',
  slug: 'csp-config-ext',
  title: 'CSP 配置',
  description: '生成 Manifest V3 扩展的 content_security_policy 策略，并校验远程代码等禁止项',
  titleEn: 'Extension CSP Config',
  descriptionEn:
    'Generate Manifest V3 extension content_security_policy and validate forbidden sources like remote code',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'csp', 'manifest-v3', 'security'],

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

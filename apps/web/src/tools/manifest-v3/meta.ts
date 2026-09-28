import type { ToolMeta } from '@toolbox/catalog'

/**
 * manifest-v3 —— 全局编号 #771
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'manifest-v3',
  slug: 'manifest-v3',
  title: 'Manifest V3 生成',
  description: '生成浏览器扩展 Manifest V3 配置：校验必填项并拦截 MV2 遗留字段',
  titleEn: 'Manifest V3 Generator',
  descriptionEn:
    'Generate browser extension Manifest V3 files with validation and MV2 legacy-field detection',

  category: 'extension',
  group: 'life',
  tags: ['manifest', 'extension', 'chrome', 'mv3'],

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

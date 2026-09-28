import type { ToolMeta } from '@toolbox/catalog'

/**
 * extension-debug —— 全局编号 #783
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'extension-debug',
  slug: 'extension-debug',
  title: '扩展调试',
  description:
    '诊断浏览器扩展 manifest.json 的常见问题：MV2 残留、background 声明、图标缺失与权限宽泛度',
  titleEn: 'Extension Debugger',
  descriptionEn:
    'Diagnose common browser extension issues: MV2 leftovers, background declarations, missing icons, broad permissions',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'debug', 'manifest-v3', 'diagnose'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * userscript —— 全局编号 #773
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'userscript',
  slug: 'userscript',
  title: '油猴脚本模板',
  description: '生成 Tampermonkey 用户脚本：==UserScript== 头注释校验与脚本骨架',
  titleEn: 'Userscript Template',
  descriptionEn: 'Generate Tampermonkey userscripts with validated ==UserScript== headers',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'userscript', 'tampermonkey', 'template'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * userscript-debug —— 全局编号 #785
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'userscript-debug',
  slug: 'userscript-debug',
  title: '油猴调试',
  description: '扫描油猴用户脚本的常见问题：元数据块缺失、非法 @match、GM_ 函数与 @grant 不一致及风险写法',
  titleEn: 'Userscript Debugger',
  descriptionEn:
    'Scan Tampermonkey userscripts for metadata issues, invalid @match, GM_/@grant mismatches and risky patterns',

  category: 'extension',
  group: 'life',
  tags: ['extension', 'userscript', 'tampermonkey', 'debug'],

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

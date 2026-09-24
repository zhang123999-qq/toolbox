import type { ToolMeta } from '@toolbox/catalog'

/**
 * invisible-chars —— 全局编号 #41
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'invisible-chars',
  slug: 'invisible-chars',
  title: '不可见字符',
  description: '检测并高亮不可见字符',
  titleEn: 'Invisible Characters',
  descriptionEn: 'Detect and highlight invisible characters',

  category: 'text',
  group: 'dev',
  tags: ['text', 'invisible', 'clean'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'keepCommon'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

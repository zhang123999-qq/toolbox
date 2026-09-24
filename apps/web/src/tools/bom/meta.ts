import type { ToolMeta } from '@toolbox/catalog'

/**
 * bom —— 全局编号 #43
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'bom',
  slug: 'bom',
  title: 'BOM 处理',
  description: '检测、添加、移除 BOM',
  titleEn: 'BOM Handler',
  descriptionEn: 'Detect, add or remove the byte order mark',

  category: 'text',
  group: 'dev',
  tags: ['text', 'bom', 'encoding'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

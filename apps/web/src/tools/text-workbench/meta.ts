import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-workbench —— 全局编号 #70
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-workbench',
  slug: 'text-workbench',
  title: '文本工作台',
  description: '多工具组合流水线',
  titleEn: 'Text Workbench',
  descriptionEn: 'Chain multiple text operations into a pipeline',

  category: 'text',
  group: 'dev',
  tags: ['text', 'pipeline', 'workbench'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['steps'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

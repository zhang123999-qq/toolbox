import type { ToolMeta } from '@toolbox/catalog'

/**
 * mindmap —— 全局编号 #398
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 编写 Mermaid mindmap 代码，右侧实时渲染 SVG 预览
 */
export const meta: ToolMeta = {
  id: 'mindmap',
  slug: 'mindmap',
  title: '思维导图',
  description: '编写 Mermaid mindmap 代码，右侧实时渲染思维导图预览，支持复制与下载源码',
  titleEn: 'Mind Map',
  descriptionEn: 'Write Mermaid mindmap code with a live SVG preview; copy or download the source',

  category: 'random',
  group: 'design',
  tags: ['mermaid', 'mindmap', 'diagram', 'preview'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['mermaid'],
  worker: false,
  wasm: false,
  api: false,
}

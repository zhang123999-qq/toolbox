import type { ToolMeta } from '@toolbox/catalog'

/**
 * sequence —— 全局编号 #400
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 时序图：左侧编写 Mermaid sequenceDiagram 代码，右侧实时渲染 SVG 预览
 */
export const meta: ToolMeta = {
  id: 'sequence',
  slug: 'sequence',
  title: '时序图',
  description: '编写 Mermaid 时序图代码，右侧实时渲染预览，支持复制与下载源码',
  titleEn: 'Sequence Diagram',
  descriptionEn:
    'Write Mermaid sequence diagram code with a live SVG preview; copy or download the source',

  category: 'random',
  group: 'design',
  tags: ['mermaid', 'sequence', 'diagram', 'preview'],

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

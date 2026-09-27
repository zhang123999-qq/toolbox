import type { ToolMeta } from '@toolbox/catalog'

/**
 * er-gen —— 全局编号 #401
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * ER 图生成：左侧编写 Mermaid erDiagram 代码，右侧实时渲染 SVG 预览
 */
export const meta: ToolMeta = {
  id: 'er-gen',
  slug: 'er-gen',
  title: 'ER 图生成',
  description: '编写 Mermaid ER 图代码，右侧实时渲染预览，支持复制与下载源码',
  titleEn: 'ER Diagram Generator',
  descriptionEn:
    'Write Mermaid ER diagram code with a live SVG preview; copy or download the source',

  category: 'random',
  group: 'design',
  tags: ['mermaid', 'er-diagram', 'database', 'preview'],

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

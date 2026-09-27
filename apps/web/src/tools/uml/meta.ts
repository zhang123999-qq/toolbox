import type { ToolMeta } from '@toolbox/catalog'

/**
 * uml —— 全局编号 #402
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * UML 图：左侧编写 Mermaid classDiagram 代码，右侧实时渲染 SVG 预览
 */
export const meta: ToolMeta = {
  id: 'uml',
  slug: 'uml',
  title: 'UML 图',
  description: '编写 Mermaid UML 类图代码，右侧实时渲染预览，支持复制与下载源码',
  titleEn: 'UML Diagram',
  descriptionEn:
    'Write Mermaid UML class diagram code with a live SVG preview; copy or download the source',

  category: 'random',
  group: 'design',
  tags: ['mermaid', 'uml', 'class-diagram', 'preview'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * flowchart —— 全局编号 #399
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 编写 Mermaid flowchart 代码，右侧实时渲染 SVG 预览，自动补全方向头部
 */
export const meta: ToolMeta = {
  id: 'flowchart',
  slug: 'flowchart',
  title: '流程图',
  description: '编写 Mermaid flowchart 代码，右侧实时渲染流程图预览，自动补全方向头部',
  titleEn: 'Flowchart',
  descriptionEn:
    'Write Mermaid flowchart code with a live SVG preview; direction header auto-completed',

  category: 'random',
  group: 'design',
  tags: ['mermaid', 'flowchart', 'diagram', 'preview'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction'],

  deps: ['mermaid'],
  worker: false,
  wasm: false,
  api: false,
}

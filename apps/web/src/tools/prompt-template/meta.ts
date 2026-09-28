import type { ToolMeta } from '@toolbox/catalog'

/**
 * prompt-template —— 全局编号 #591
 * 域：ai（AI / LLM）｜大组：life｜优先级：P0｜可行性：A（纯 JS 模板渲染）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'prompt-template',
  slug: 'prompt-template',
  title: '提示词模板',
  description: '内置常用提示词模板库（翻译 / 摘要 / 改写 / 代码解释等），填充变量后一键复制',
  titleEn: 'Prompt Templates',
  descriptionEn: 'Built-in prompt template library: fill variables and copy with one click',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'prompt', 'template', 'llm'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['templateId'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * calculator —— 全局编号 #311
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 科学计算器：四则运算、三角函数、对数、开方、阶乘（mathjs 表达式语法）
 */
export const meta: ToolMeta = {
  id: 'calculator',
  slug: 'calculator',
  title: '科学计算器',
  description: '多功能科学计算：四则运算、三角函数、对数、开方、阶乘，支持 mathjs 表达式语法',
  titleEn: 'Scientific Calculator',
  descriptionEn:
    'Scientific calculator: arithmetic, trig, logs, roots, factorial with mathjs expression syntax',

  category: 'math',
  group: 'life',
  tags: ['calculator', 'math', 'scientific'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['mathjs'],
  worker: false,
  wasm: false,
  api: false,
}

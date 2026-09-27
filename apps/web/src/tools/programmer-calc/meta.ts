import type { ToolMeta } from '@toolbox/catalog'

/**
 * programmer-calc —— 全局编号 #312
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 程序员计算器：表达式求值并输出十/十六/八/二进制四对照，支持位运算（& | ^ ~ << >>）
 */
export const meta: ToolMeta = {
  id: 'programmer-calc',
  slug: 'programmer-calc',
  title: '程序员计算器',
  description: '表达式求值并输出十/十六/八/二进制四对照，支持位运算（& | ^ ~ << >>）',
  titleEn: 'Programmer Calculator',
  descriptionEn: 'Evaluate expressions with bitwise ops; show result in DEC/HEX/OCT/BIN',

  category: 'math',
  group: 'life',
  tags: ['programmer', 'bitwise', 'binary'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

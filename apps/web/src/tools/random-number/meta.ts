import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-number —— 全局编号 #345
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T3
 * 随机数：在指定范围内生成随机数，支持整数 / 小数、不重复与批量生成（纯 JS）
 */
export const meta: ToolMeta = {
  id: 'random-number',
  slug: 'random-number',
  title: '随机数',
  description: '在指定范围内生成随机数：支持整数 / 小数、不重复抽取与批量生成',
  titleEn: 'Random Number Generator',
  descriptionEn:
    'Generate random numbers within a range: integers or decimals, unique draws, batch output',

  category: 'math',
  group: 'life',
  tags: ['random', 'number', 'generator'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'min', 'max', 'decimals'],
  outputs: ['text'],
  options: ['unique'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

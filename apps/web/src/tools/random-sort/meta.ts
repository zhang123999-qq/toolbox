import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-sort —— 全局编号 #417
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 随机排序：对输入的每一行做 Fisher-Yates 洗牌，输出打乱后的顺序
 */
export const meta: ToolMeta = {
  id: 'random-sort',
  slug: 'random-sort',
  title: '随机排序',
  description: '把输入的每一行随机打乱：Fisher-Yates 洗牌，适合抽签排序、随机出场顺序',
  titleEn: 'Random Sort',
  descriptionEn:
    'Shuffle every input line into a random order with the Fisher-Yates algorithm; great for lotteries and random line-ups',

  category: 'random',
  group: 'design',
  tags: ['random', 'shuffle', 'sort', 'list'],

  priority: 'P1',
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

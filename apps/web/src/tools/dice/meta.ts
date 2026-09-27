import type { ToolMeta } from '@toolbox/catalog'

/**
 * dice —— 全局编号 #414
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 骰子：掷 N 个 M 面骰，CSS 抖动动画呈现结果；不引入动画库
 */
export const meta: ToolMeta = {
  id: 'dice',
  slug: 'dice',
  title: '骰子',
  description: '掷 N 个 M 面骰：自定义骰子个数与面数，点击掷骰子看 CSS 动画开奖',
  titleEn: 'Dice',
  descriptionEn:
    'Roll N dice with M sides: customize count and sides, then roll with a pure-CSS shake animation',

  category: 'random',
  group: 'design',
  tags: ['random', 'dice', 'roll', 'game'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'sides'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

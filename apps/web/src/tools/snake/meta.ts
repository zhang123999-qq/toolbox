import type { ToolMeta } from '@toolbox/catalog'

/**
 * snake —— 全局编号 #843
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 贪吃蛇：方向键控制蛇移动吃食物变长，撞墙或撞到自身结束，网格逻辑为纯函数。
 */
export const meta: ToolMeta = {
  id: 'snake',
  slug: 'snake',
  title: '贪吃蛇',
  description: '经典贪吃蛇：方向键控制，吃食物变长加分，撞墙或撞身结束',
  titleEn: 'Snake',
  descriptionEn: 'Classic snake game: eat food to grow, avoid walls and yourself',

  category: 'education',
  group: 'life',
  tags: ['game', 'snake', 'fun', 'classic'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

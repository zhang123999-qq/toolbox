import type { ToolMeta } from '@toolbox/catalog'

/**
 * puzzle —— 全局编号 #849
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 数字华容道：点击与空格相邻的数字滑入，打乱从目标态随机合法移动保证可解。
 */
export const meta: ToolMeta = {
  id: 'puzzle',
  slug: 'puzzle',
  title: '拼图',
  description: '数字华容道滑动拼图：多种尺寸，打乱保证可解，计步挑战复原',
  titleEn: 'Sliding Puzzle',
  descriptionEn: 'Number sliding puzzle: multiple sizes, guaranteed solvable shuffle, move counter',

  category: 'education',
  group: 'life',
  tags: ['game', 'puzzle', 'sliding', 'fun'],

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

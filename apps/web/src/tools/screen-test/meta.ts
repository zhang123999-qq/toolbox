import type { ToolMeta } from '@toolbox/catalog'

/**
 * screen-test —— 全局编号 #834
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'screen-test',
  slug: 'screen-test',
  title: '屏幕测试',
  description: '屏幕坏点与色彩测试：纯色、灰阶、网格、渐变测试图，全屏切换排查坏点亮点',
  titleEn: 'Screen Test',
  descriptionEn:
    'Screen dead-pixel and color test: solid colors, grayscale, grid and gradient patterns with fullscreen cycling',

  category: 'education',
  group: 'life',
  tags: ['screen', 'display', 'test', 'education'],

  priority: 'P1',
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

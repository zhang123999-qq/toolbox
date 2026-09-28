import type { ToolMeta } from '@toolbox/catalog'

/**
 * focus-order —— 全局编号 #720
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 焦点顺序可视化：HTML 实际 Tab 键顺序列表展示 */
export const meta: ToolMeta = {
  id: 'focus-order',
  slug: 'focus-order',
  title: '焦点顺序可视化',
  description:
    '可视化 HTML 的实际 Tab 键顺序：正 tabindex 优先、其余按 DOM 先后、tabindex=-1 跳过单独列出',
  titleEn: 'Focus Order Visualizer',
  descriptionEn:
    'Visualize the actual Tab key order of HTML: positive tabindex first, DOM order otherwise, tabindex=-1 listed separately',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'tabindex', 'focus', 'keyboard'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

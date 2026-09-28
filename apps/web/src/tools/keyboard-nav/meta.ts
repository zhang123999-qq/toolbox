import type { ToolMeta } from '@toolbox/catalog'

/**
 * keyboard-nav —— 全局编号 #719
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 键盘导航分析：HTML 可聚焦元素统计与 Tab 顺序问题检查 */
export const meta: ToolMeta = {
  id: 'keyboard-nav',
  slug: 'keyboard-nav',
  title: '键盘导航分析',
  description: '分析 HTML 的可聚焦元素与 Tab 顺序：正 tabindex、非法 tabindex、div 模拟按钮、跳过链接缺失等问题检查',
  titleEn: 'Keyboard Navigation Analyzer',
  descriptionEn: 'Analyze focusable elements and tab order in HTML: positive/illegal tabindex, div-as-button, missing skip links',

  category: 'a11y',
  group: 'life',
  tags: ['keyboard', 'a11y', 'tabindex', 'focus'],

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

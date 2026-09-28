import type { ToolMeta } from '@toolbox/catalog'

/**
 * color-a11y —— 全局编号 #729
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 颜色无障碍：四种色盲模拟 + AA 判定（与 #716 wcag-contrast 的区别：本工具做色盲模拟，而非通用对比度检测） */
export const meta: ToolMeta = {
  id: 'color-a11y',
  slug: 'color-a11y',
  title: '颜色无障碍',
  description:
    '颜色无障碍检查：红/绿/蓝/全色盲四种模拟下分别计算对比度，判定色盲用户是否仍能通过 WCAG AA（区别于 #716 对比度检测）',
  titleEn: 'Color Accessibility',
  descriptionEn:
    'Color accessibility: simulate protanopia/deuteranopia/tritanopia/achromatopsia and check WCAG AA for color-blind users',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'color-blind', 'contrast'],

  priority: 'P1',
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

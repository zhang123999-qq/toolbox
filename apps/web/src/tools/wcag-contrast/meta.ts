import type { ToolMeta } from '@toolbox/catalog'

/**
 * wcag-contrast —— 全局编号 #716
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * WCAG 对比度检测：前景 / 背景色对比度计算与 AA / AAA 判定，附修复建议 */
export const meta: ToolMeta = {
  id: 'wcag-contrast',
  slug: 'wcag-contrast',
  title: 'WCAG 对比度',
  description: '检测前景色与背景色的 WCAG 对比度，给出 AA / AAA 级别判定与配色修复建议',
  titleEn: 'WCAG Contrast Checker',
  descriptionEn: 'Check WCAG contrast ratio between foreground and background colors with AA / AAA ratings and fix suggestions',

  category: 'a11y',
  group: 'life',
  tags: ['wcag', 'contrast', 'a11y', 'color'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['culori'],
  worker: false,
  wasm: false,
  api: false,
}

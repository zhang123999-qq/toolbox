import type { ToolMeta } from '@toolbox/catalog'

/**
 * high-contrast —— 全局编号 #737
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 高对比度 CSS：生成高对比主题与 forced-colors 系统色适配，校验对比度 */
export const meta: ToolMeta = {
  id: 'high-contrast',
  slug: 'high-contrast',
  title: '高对比度',
  description:
    '生成高对比度主题 CSS（含 forced-colors 系统色适配），并用 WCAG 公式校验正文与链接的对比度',
  titleEn: 'High Contrast CSS',
  descriptionEn:
    'Generate high-contrast theme CSS with forced-colors support and WCAG contrast check',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'css', 'contrast', 'forced-colors'],

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

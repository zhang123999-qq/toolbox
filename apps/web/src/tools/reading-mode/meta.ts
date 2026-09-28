import type { ToolMeta } from '@toolbox/catalog'

/**
 * reading-mode —— 全局编号 #739
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 阅读模式：从 HTML 提取正文，渲染干净的阅读视图（字号/行高/主题可调） */
export const meta: ToolMeta = {
  id: 'reading-mode',
  slug: 'reading-mode',
  title: '阅读模式',
  description: '从 HTML 提取正文并渲染干净的阅读视图：字号、行高、浅色 / 墨色 / 深色主题可调',
  titleEn: 'Reading Mode',
  descriptionEn: 'Extract article text from HTML and render a clean reading view',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'reading', 'html', 'accessibility'],

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

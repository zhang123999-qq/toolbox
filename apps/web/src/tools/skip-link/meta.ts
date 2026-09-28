import type { ToolMeta } from '@toolbox/catalog'

/**
 * skip-link —— 全局编号 #734
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 跳转链接生成与检测：生成"跳转到主要内容"代码，并检测页面是否已有 */
export const meta: ToolMeta = {
  id: 'skip-link',
  slug: 'skip-link',
  title: '跳转链接',
  description: '生成"跳转到主要内容"的跳过链接 HTML 与 CSS，并检测已有页面是否包含跳过链接',
  titleEn: 'Skip Link Generator',
  descriptionEn:
    'Generate "skip to main content" link HTML/CSS and detect existing skip links in a page',

  category: 'a11y',
  group: 'life',
  tags: ['skip-link', 'a11y', 'keyboard', 'navigation'],

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

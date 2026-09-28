import type { ToolMeta } from '@toolbox/catalog'

/**
 * reduced-motion —— 全局编号 #736
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 减少动画 CSS：生成 prefers-reduced-motion 样式，扫描现有 CSS 的动画声明 */
export const meta: ToolMeta = {
  id: 'reduced-motion',
  slug: 'reduced-motion',
  title: '减少动画',
  description:
    '生成 prefers-reduced-motion 减少动画 CSS，并扫描现有 CSS 列出 animation / transition / @keyframes 声明',
  titleEn: 'Reduced Motion CSS',
  descriptionEn:
    'Generate prefers-reduced-motion CSS and scan existing CSS for animation declarations',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'css', 'reduced-motion', 'animation'],

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

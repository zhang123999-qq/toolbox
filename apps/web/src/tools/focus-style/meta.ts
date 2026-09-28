import type { ToolMeta } from '@toolbox/catalog'

/**
 * focus-style —— 全局编号 #735
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * :focus-visible 焦点样式生成器：参数化生成 CSS，实时预览，校验对比度 */
export const meta: ToolMeta = {
  id: 'focus-style',
  slug: 'focus-style',
  title: '焦点样式生成',
  description: '生成 :focus-visible 焦点样式 CSS：自定义颜色、宽度、偏移、圆角，实时预览并校验与背景的对比度',
  titleEn: 'Focus Style Generator',
  descriptionEn: 'Generate :focus-visible CSS: color, width, offset, radius; live preview and contrast check',

  category: 'a11y',
  group: 'life',
  tags: ['focus', 'a11y', 'css', 'outline'],

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

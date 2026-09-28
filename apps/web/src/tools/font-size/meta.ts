import type { ToolMeta } from '@toolbox/catalog'

/**
 * font-size —— 全局编号 #738
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 字体大小：流式字号 clamp() 生成、px/rem 换算、正文可读性评估 */
export const meta: ToolMeta = {
  id: 'font-size',
  slug: 'font-size',
  title: '字体大小',
  description: '生成 clamp() 流式字号 CSS，px/rem 互转，并按字号 / 行宽 / 行高评估正文可读性',
  titleEn: 'Font Size Toolkit',
  descriptionEn: 'Generate clamp() fluid type CSS, px/rem conversion and readability assessment',

  category: 'a11y',
  group: 'life',
  tags: ['a11y', 'css', 'font-size', 'readability'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * screen-reader —— 全局编号 #718
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 屏幕阅读器预览：解析 HTML，输出朗读大纲与无障碍问题 */
export const meta: ToolMeta = {
  id: 'screen-reader',
  slug: 'screen-reader',
  title: '屏幕阅读器预览',
  description:
    '模拟屏幕阅读器视角：解析 HTML 生成朗读大纲，检查标题层级、图片 alt、表单 label 与链接文本等问题',
  titleEn: 'Screen Reader Preview',
  descriptionEn:
    'Preview HTML from a screen reader perspective: reading outline plus heading, alt, label and link-text checks',

  category: 'a11y',
  group: 'life',
  tags: ['screen-reader', 'a11y', 'html', 'outline'],

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

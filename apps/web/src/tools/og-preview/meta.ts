import type { ToolMeta } from '@toolbox/catalog'

/**
 * og-preview —— 全局编号 #653
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 *
 * 抓取或粘贴网页 HTML，提取 og/twitter 标签，渲染 X / Facebook / LinkedIn
 * 三种分享卡片预览（纯 CSS 样式模拟，不加载平台 SDK），并给出缺失标签补充建议。
 */
export const meta: ToolMeta = {
  id: 'og-preview',
  slug: 'og-preview',
  title: 'OG 预览',
  description: '抓取或粘贴网页 HTML，提取 og 标签渲染分享卡片预览',
  titleEn: 'OG Preview',
  descriptionEn: 'Fetch or paste page HTML, extract Open Graph tags and render share card previews',

  category: 'seo',
  group: 'dev',
  tags: ['og', 'opengraph', 'preview', 'seo'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}

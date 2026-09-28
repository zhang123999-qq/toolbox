import type { ToolMeta } from '@toolbox/catalog'

/**
 * og —— 全局编号 #623
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'og',
  slug: 'og',
  title: 'Open Graph',
  description: '填写 og:title / 描述 / 图片等表单，生成社交分享用的 OG 标签代码',
  titleEn: 'Open Graph Generator',
  descriptionEn: 'Fill in og:title, description, image and more to generate Open Graph tag code',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'og', 'opengraph', 'share'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['description', 'image', 'url', 'type', 'siteName'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

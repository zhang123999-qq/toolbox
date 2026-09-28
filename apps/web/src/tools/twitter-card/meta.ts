import type { ToolMeta } from '@toolbox/catalog'

/**
 * twitter-card —— 全局编号 #624
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'twitter-card',
  slug: 'twitter-card',
  title: 'Twitter Card',
  description: '选择卡片类型并填写标题 / 描述 / 图片，生成 Twitter Card 标签代码',
  titleEn: 'Twitter Card Generator',
  descriptionEn: 'Pick a card type and fill in title, description and image to generate Twitter Card tags',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'twitter', 'card', 'share'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['card', 'description', 'image', 'site'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * meta —— 全局编号 #622
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'meta',
  slug: 'meta',
  title: 'Meta 标签',
  description: '填写标题 / 描述 / 关键词等表单，一键生成 HTML meta 标签代码',
  titleEn: 'Meta Tags Generator',
  descriptionEn: 'Fill in title, description, keywords and more to generate HTML meta tag code',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'meta', 'html', 'head'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['description', 'keywords', 'author', 'viewport', 'charset', 'theme-color'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

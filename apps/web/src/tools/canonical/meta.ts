import type { ToolMeta } from '@toolbox/catalog'

/**
 * canonical —— 全局编号 #626
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * Canonical 规范链接生成：输入页面 URL 与规范 URL，双 URL 合法性校验后
 * 输出 <link rel="canonical"> 标签代码。
 */
export const meta: ToolMeta = {
  id: 'canonical',
  slug: 'canonical',
  title: 'Canonical',
  description:
    '生成规范链接标签：填写页面 URL 与规范 URL，校验合法后输出 <link rel="canonical"> 代码',
  titleEn: 'Canonical Tag Generator',
  descriptionEn:
    'Generate a canonical link tag: enter the page URL and the canonical URL, validated before output',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'canonical', 'url'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['canonicalUrl'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * social-share —— 全局编号 #652
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 *
 * 输入一个 URL（可选标题与摘要），纯前端拼出 X / Facebook / LinkedIn / 微博 /
 * Telegram / WhatsApp / Reddit / 邮件 8 个平台的分享链接，无网络请求、无登录。
 */
export const meta: ToolMeta = {
  id: 'social-share',
  slug: 'social-share',
  title: '社交分享链接',
  description: '输入文章 URL，一键生成 X / Facebook / 微博等 8 个平台的分享链接',
  titleEn: 'Social Share Links',
  descriptionEn: 'Generate share links for X, Facebook, Weibo and 5 more platforms from a URL',

  category: 'seo',
  group: 'dev',
  tags: ['share', 'social', 'sns', 'link'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['shareTitle', 'shareText'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

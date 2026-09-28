import type { ToolMeta } from '@toolbox/catalog'

/**
 * link-check —— 全局编号 #659
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 *
 * 提取页面全部链接（去重、转绝对地址、站内/站外分类），逐个 HEAD 检测存活状态；
 * 支持抓取页面 URL（需同源或目标允许 CORS）与粘贴 HTML + 基准 URL 两种模式。
 * 浏览器直连目标站点，无后端、无 Key。
 */
export const meta: ToolMeta = {
  id: 'link-check',
  slug: 'link-check',
  title: '链接检查',
  description: '提取页面全部链接并逐个检测状态：正常、重定向、死链、超时，支持抓取页面或粘贴 HTML',
  titleEn: 'Link Checker',
  descriptionEn: 'Extract all links from a page and check each: ok, redirect, dead, timeout; fetch page or paste HTML',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'link', 'dead-link'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  // D：浏览器 fetch 直连目标站点（无后端、无 Key）
  api: true,
}

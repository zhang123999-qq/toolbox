import type { ToolMeta } from '@toolbox/catalog'

/**
 * dead-link —— 全局编号 #660
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 *
 * 直接输入 URL 列表（每行一个，最多 200 行），浏览器 fetch 批量检测存活状态，
 * 输出死链清单、存活率统计，支持复制 / 导出。与 link-check 的区别：不做页面链接提取。
 * 浏览器直连目标站点，无后端、无 Key。
 */
export const meta: ToolMeta = {
  id: 'dead-link',
  slug: 'dead-link',
  title: '死链检查',
  description: '批量检测 URL 列表的存活状态：存活、重定向、死链、超时，输出死链清单与存活率',
  titleEn: 'Dead Link Checker',
  descriptionEn:
    'Batch-check a URL list for liveness: alive, redirect, dead, timeout, with dead list and survival rate',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'dead-link', 'url'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  // D：浏览器 fetch 直连目标站点（无后端、无 Key）
  api: true,
}

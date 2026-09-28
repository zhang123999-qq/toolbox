import type { ToolMeta } from '@toolbox/catalog'

/**
 * redirect-check —— 全局编号 #634
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P2｜可行性：D｜模板：T2
 *
 * 浏览器 fetch 手动跟随 Location 头跟踪重定向链（最多 10 跳），
 * 另支持粘贴原始 HTTP 响应做离线分析。跨域时浏览器只返回 opaque-redirect，
 * 读不到状态码与 Location，如实报告不编造。
 */
export const meta: ToolMeta = {
  id: 'redirect-check',
  slug: 'redirect-check',
  title: '重定向检测',
  description: '跟踪 URL 的重定向链：每跳状态码、跳转目标、跳数与成环检测',
  titleEn: 'Redirect Checker',
  descriptionEn:
    'Trace a URL redirect chain: per-hop status, targets, hop count and loop detection',

  category: 'seo',
  group: 'dev',
  tags: ['redirect', 'http', 'seo', 'network'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  // D：浏览器 fetch 直连目标站点（无后端、无 Key）
  api: true,
}

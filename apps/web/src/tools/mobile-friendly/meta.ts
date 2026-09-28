import type { ToolMeta } from '@toolbox/catalog'

/**
 * mobile-friendly —— 全局编号 #646
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P2｜可行性：D｜模板：T2
 *
 * 粘贴 HTML 做移动友好离线分析（viewport / 媒体查询 / 固定宽度 / table 布局），
 * 也支持实时抓取页面（需同源或目标允许 CORS）。纯静态分析，不渲染页面。
 */
export const meta: ToolMeta = {
  id: 'mobile-friendly',
  slug: 'mobile-friendly',
  title: '移动友好检测',
  description: '分析网页 HTML 的移动友好度：viewport、媒体查询、固定宽度，打分并给改进建议',
  titleEn: 'Mobile-Friendly Checker',
  descriptionEn: 'Score page HTML for mobile-friendliness: viewport, media queries, fixed widths',

  category: 'seo',
  group: 'dev',
  tags: ['mobile', 'responsive', 'seo', 'html'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  // D：实时抓取模式浏览器 fetch 直连目标站点（无后端、无 Key）
  api: true,
}

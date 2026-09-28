import type { ToolMeta } from '@toolbox/catalog'

/**
 * seo-audit —— 全局编号 #649
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P3｜可行性：D｜模板：T3
 *
 * 在浏览器内对页面做 11 项 SEO 审计（title / meta / OG / h1 / alt / viewport /
 * JSON-LD / lang 等），纯正则解析 HTML，给出 0–100 分与逐项结论。
 * 实时抓取受浏览器同源策略限制，跨域目标未开放 CORS 时改用粘贴 HTML 模式。
 */
export const meta: ToolMeta = {
  id: 'seo-audit',
  slug: 'seo-audit',
  title: 'SEO 审计',
  description: '对页面做 11 项 SEO 审计（title / meta / OG / h1 / alt 等），给出评分与改进建议',
  titleEn: 'SEO Audit',
  descriptionEn:
    'Run an 11-point SEO audit (title/meta/OG/h1/alt/viewport/JSON-LD) on a page, with score and findings',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'audit', 'html', 'meta'],

  priority: 'P3',
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

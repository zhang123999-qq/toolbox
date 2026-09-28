import type { ToolMeta } from '@toolbox/catalog'

/**
 * hreflang —— 全局编号 #627
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * hreflang 多语言标注生成：维护语言-地区对列表（BCP47 语言代码下拉 + URL），
 * 生成 <link rel="alternate" hreflang="…"> 标签组。
 */
export const meta: ToolMeta = {
  id: 'hreflang',
  slug: 'hreflang',
  title: 'hreflang',
  description:
    '生成多语言标注标签：添加语言-地区对（语言代码 + 对应 URL），输出 hreflang link 标签组',
  titleEn: 'hreflang Generator',
  descriptionEn:
    'Generate hreflang tags: add language-region pairs (BCP47 code + URL) and output the link tag group',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'hreflang', 'i18n'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['entries'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

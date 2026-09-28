import type { ToolMeta } from '@toolbox/catalog'

/**
 * desc-check —— 全局编号 #656
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 *
 * 纯本地分析 meta description：显示宽度（CJK 计 2）、长度评级、
 * 关键词前置检查、重复词、行动号召词，给出评分与改写建议。
 */
export const meta: ToolMeta = {
  id: 'desc-check',
  slug: 'desc-check',
  title: '页面描述检查',
  description: '分析 meta description 的长度、关键词前置与行动号召，给出 SEO 评分与改写建议',
  titleEn: 'Meta Description Checker',
  descriptionEn:
    'Analyze meta description length, keyword placement and CTA with SEO score and suggestions',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'meta', 'description'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

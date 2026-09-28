import type { ToolMeta } from '@toolbox/catalog'

/**
 * title-check —— 全局编号 #655，域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 *
 * 页面标题检查：计算显示宽度（半角 1 / 全角 2）、按 Google SERP 约 60 宽度截断、
 * 检测目标关键词是否前置、找出重复词，给出中文优化建议。纯前端本地计算。
 */
export const meta: ToolMeta = {
  id: 'title-check',
  slug: 'title-check',
  title: '页面标题检查',
  description: '检查页面标题的显示宽度、SERP 截断、关键词前置与重复词，给出 SEO 优化建议',
  titleEn: 'Page Title Check',
  descriptionEn:
    'Check page title display width, SERP truncation, keyword placement and duplicate words, with SEO suggestions',

  category: 'seo',
  group: 'dev',
  tags: ['title', 'seo', 'serp'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['keyword'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

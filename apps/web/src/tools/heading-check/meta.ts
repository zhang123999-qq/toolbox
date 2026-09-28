import type { ToolMeta } from '@toolbox/catalog'

/**
 * heading-check —— 全局编号 #657
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 *
 * 纯本地解析 HTML 中的 h1–h6：层级结构大纲、h1 唯一性、层级跳跃、
 * 空标题、过长与重复标题检查，给出评分。
 */
export const meta: ToolMeta = {
  id: 'heading-check',
  slug: 'heading-check',
  title: '标题标签检查',
  description: '检查页面 h1–h6 层级结构：h1 唯一性、层级跳跃、空标题与重复标题，给出大纲与评分',
  titleEn: 'Heading Structure Checker',
  descriptionEn:
    'Audit h1–h6 hierarchy: single h1, skipped levels, empty or duplicate headings, with outline and score',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'heading', 'html'],

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

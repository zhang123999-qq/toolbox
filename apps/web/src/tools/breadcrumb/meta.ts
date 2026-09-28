import type { ToolMeta } from '@toolbox/catalog'

/**
 * breadcrumb —— 全局编号 #665
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'breadcrumb',
  slug: 'breadcrumb',
  title: '面包屑生成',
  description: '由层级列表生成语义化面包屑 HTML（含 aria）与 JSON-LD BreadcrumbList',
  titleEn: 'Breadcrumb Generator',
  descriptionEn: 'Generate semantic breadcrumb HTML with aria and JSON-LD BreadcrumbList',

  category: 'seo',
  group: 'dev',
  tags: ['breadcrumb', 'seo', 'html', 'json-ld'],

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

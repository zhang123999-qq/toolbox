import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-ld —— 全局编号 #625
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * JSON-LD 结构化数据生成：按类型（Article/Product/FAQPage/BreadcrumbList/Organization）
 * 填写表单，生成可直接嵌入页面的 <script type="application/ld+json"> 代码。
 */
export const meta: ToolMeta = {
  id: 'json-ld',
  slug: 'json-ld',
  title: 'JSON-LD',
  description:
    '生成结构化数据代码：Article / Product / FAQPage / 面包屑 / Organization 五种类型，输出 JSON-LD script 标签',
  titleEn: 'JSON-LD Generator',
  descriptionEn:
    'Generate structured data: Article, Product, FAQPage, BreadcrumbList and Organization types, output as a JSON-LD script tag',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'json-ld', 'structured-data', 'schema'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [
    'type',
    'headline',
    'name',
    'description',
    'author',
    'datePublished',
    'image',
    'url',
    'brand',
    'price',
    'priceCurrency',
    'questions',
    'breadcrumbs',
    'logo',
    'sameAs',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

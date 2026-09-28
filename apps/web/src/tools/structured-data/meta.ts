import type { ToolMeta } from '@toolbox/catalog'

/**
 * structured-data —— 全局编号 #647
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 *
 * 纯 JS 提取网页 HTML 中的 JSON-LD 并逐块校验（JSON 合法性 / @type / @context），
 * 也支持直接粘贴 JSON-LD 文本校验。与 #625 json-ld（生成器）功能不同。
 */
export const meta: ToolMeta = {
  id: 'structured-data',
  slug: 'structured-data',
  title: '结构化数据校验',
  description: '提取网页中的 JSON-LD 并校验：JSON 合法性、@type、@context 缺失提醒',
  titleEn: 'Structured Data Validator',
  descriptionEn: 'Extract JSON-LD from page HTML and validate syntax, @type and @context',

  category: 'seo',
  group: 'dev',
  tags: ['json-ld', 'seo', 'schema', 'validate'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['source'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * mixed-content —— 全局编号 #645
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 *
 * 纯 JS 扫描网页 HTML，找出 http:// 资源引用并评估混合内容风险。
 * 主动混合内容（script/iframe）比被动（img）风险更高。
 */
export const meta: ToolMeta = {
  id: 'mixed-content',
  slug: 'mixed-content',
  title: '混合内容检测',
  description: '扫描网页 HTML，找出 http:// 资源引用并评估混合内容风险等级',
  titleEn: 'Mixed Content Checker',
  descriptionEn: 'Scan page HTML for http:// subresources and assess mixed-content risk',

  category: 'seo',
  group: 'dev',
  tags: ['mixed-content', 'https', 'security', 'seo'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'pageUrl'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

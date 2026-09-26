import type { ToolMeta } from '@toolbox/catalog'

/**
 * cors-check —— 全局编号 #128
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 *
 * 说明：规划为 D 级（浏览器 fetch 实测）。但浏览器对跨源响应本身受限、无法稳定读取任意站点的
 * CORS 头，故实现为「粘贴响应头 → 离线规则分析」，确定性可测、零网络（见 README）。
 */
export const meta: ToolMeta = {
  id: 'cors-check',
  slug: 'cors-check',
  title: 'CORS 检测',
  description: '粘贴 HTTP 响应头，离线分析 CORS 跨域配置是否正确与安全',
  titleEn: 'CORS Check',
  descriptionEn: 'Paste HTTP response headers to offline-audit CORS configuration',

  category: 'encoding',
  group: 'dev',
  tags: ['cors', 'security', 'http'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

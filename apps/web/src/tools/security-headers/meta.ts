import type { ToolMeta } from '@toolbox/catalog'

/**
 * security-headers —— 全局编号 #129
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 *
 * 说明：规划为 D 级（浏览器 fetch 实测）。与 cors-check 同理，改为「粘贴响应头 → 离线规则分析」，
 * 确定性可测、零网络（见 README）。
 */
export const meta: ToolMeta = {
  id: 'security-headers',
  slug: 'security-headers',
  title: '安全头检测',
  description: '粘贴 HTTP 响应头，离线检测安全响应头是否齐全及配置是否安全',
  titleEn: 'Security Headers Check',
  descriptionEn: 'Paste HTTP response headers to offline-audit security headers',

  category: 'encoding',
  group: 'dev',
  tags: ['security', 'http', 'headers'],

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

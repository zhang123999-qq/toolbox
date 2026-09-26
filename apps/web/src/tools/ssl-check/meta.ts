import type { ToolMeta } from '@toolbox/catalog'

/**
 * ssl-check —— 全局编号 #130
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 *
 * 说明：规划为 D 级（在线抓取任意 URL 的 TLS 证书）。浏览器无法稳定、可复现地对任意站点
 * 完成 TLS 握手并读取证书链，故改为「粘贴 PEM 证书 → 离线规则体检」，确定性可测、零网络。
 * 证书解析复用 pem-parse / node-forge（见 README）。
 */
export const meta: ToolMeta = {
  id: 'ssl-check',
  slug: 'ssl-check',
  title: 'SSL 证书体检',
  description: '粘贴 PEM 证书，离线检查有效期、签名算法、密钥强度、SAN 与自签名等问题',
  titleEn: 'SSL Certificate Check',
  descriptionEn: 'Paste a PEM certificate to offline-audit validity, signature, key size and SAN',

  category: 'encoding',
  group: 'dev',
  tags: ['ssl', 'tls', 'certificate', 'security', 'x509'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['node-forge'],
  worker: false,
  wasm: false,
  api: false,
}

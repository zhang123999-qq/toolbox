import type { ToolMeta } from '@toolbox/catalog'

/**
 * pem-parse —— 全局编号 #109
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'pem-parse',
  slug: 'pem-parse',
  title: 'PEM 解析',
  description: '解析 PEM 证书 / 私钥 / 公钥 / CSR 的关键字段',
  titleEn: 'PEM Parser',
  descriptionEn: 'Inspect key fields of a PEM certificate, private key, public key or CSR',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'pem', 'x509', 'certificate', 'csr'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * cert-parser —— 全局编号 #247
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'cert-parser',
  slug: 'cert-parser',
  title: '证书解析',
  description: '解析 PEM 格式 X.509 证书的主体、签发者、有效期、公钥、SAN 与指纹',
  titleEn: 'X.509 Certificate Parser',
  descriptionEn:
    'Parse a PEM X.509 certificate: subject, issuer, validity, key, SAN and fingerprint',

  category: 'devops',
  group: 'dev',
  tags: ['ssl', 'tls', 'x509', 'certificate', 'devops'],

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

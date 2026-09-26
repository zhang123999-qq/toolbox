import type { ToolMeta } from '@toolbox/catalog'

/**
 * csr-generate —— 全局编号 #110
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'csr-generate',
  slug: 'csr-generate',
  title: 'CSR 生成',
  description: '在本地生成 RSA 密钥对与 PKCS#10 证书签名请求（CSR）',
  titleEn: 'CSR Generator',
  descriptionEn: 'Generate an RSA key pair and a PKCS#10 certificate signing request locally',

  category: 'encoding',
  group: 'dev',
  tags: ['csr', 'certificate', 'tls', 'pki'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [
    'commonName',
    'organization',
    'organizationalUnit',
    'country',
    'altNames',
    'keySize',
    'includePrivateKey',
  ],

  deps: ['node-forge'],
  worker: false,
  wasm: false,
  api: false,
}

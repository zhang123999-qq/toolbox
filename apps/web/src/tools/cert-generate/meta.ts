import type { ToolMeta } from '@toolbox/catalog'

/**
 * cert-generate —— 全局编号 #248
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'cert-generate',
  slug: 'cert-generate',
  title: '证书生成',
  description: '在本地生成自签名 X.509 证书与私钥（RSA 2048/4096），含 SAN',
  titleEn: 'Self-signed Certificate Generator',
  descriptionEn: 'Generate a self-signed X.509 certificate and private key locally',

  category: 'devops',
  group: 'dev',
  tags: ['ssl', 'tls', 'x509', 'certificate', 'devops'],

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
    'days',
    'keySize',
    'altNames',
  ],

  deps: ['node-forge'],
  worker: false,
  wasm: false,
  api: false,
}

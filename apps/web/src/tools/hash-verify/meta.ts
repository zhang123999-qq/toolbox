import type { ToolMeta } from '@toolbox/catalog'

/**
 * hash-verify —— 全局编号 #714
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 * 哈希校验：计算数据哈希并与期望值比对，验证完整性（WebCrypto，digest 可注入） */
export const meta: ToolMeta = {
  id: 'hash-verify',
  slug: 'hash-verify',
  title: '哈希校验',
  description: '计算数据哈希并与期望值比对：SHA-2 / SHA-1 完整性验证，长度不符直接提示',
  titleEn: 'Hash Verify',
  descriptionEn: 'Verify data integrity: compute SHA-2 / SHA-1 digests and compare against expected values',

  category: 'encoding',
  group: 'dev',
  tags: ['hash', 'sha256', 'verify', 'integrity', 'encoding'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['expected', 'algo', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

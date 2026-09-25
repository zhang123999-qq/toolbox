import type { ToolMeta } from '@toolbox/catalog'

/**
 * crc-checksum —— 全局编号 #121
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'crc-checksum',
  slug: 'crc-checksum',
  title: 'CRC 校验',
  description: 'CRC-32 / CRC-32C / CRC-16 校验和（查表法）',
  titleEn: 'CRC Checksum',
  descriptionEn: 'CRC-32, CRC-32C and CRC-16 checksums (table driven)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crc', 'checksum'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['algorithm', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * uuencode-codec —— 全局编号 #89
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P3｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'uuencode-codec',
  slug: 'uuencode-codec',
  title: 'UUencode 编解码',
  description: '经典 UUencode / UUDecode，输出带 begin / end 包裹',
  titleEn: 'UUencode / UUDecode',
  descriptionEn: 'Classic UUencode and UUDecode with begin / end wrapper',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'uuencode', 'codec'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'prefix'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

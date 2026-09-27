import type { ToolMeta } from '@toolbox/catalog'

/**
 * data-storage —— 全局编号 #325
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 数据存储：字节/比特/KB/MiB 等数据存储单位换算
 */
export const meta: ToolMeta = {
  id: 'data-storage',
  slug: 'data-storage',
  title: '数据存储',
  description: '字节/比特/KB/MiB 等数据存储单位换算',
  titleEn: 'Data Storage Converter',
  descriptionEn: 'Convert between data storage units: bit, B, KB, MB, GB, KiB, MiB, GiB and more',

  category: 'math',
  group: 'life',
  tags: ['data', 'storage', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['from', 'to'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

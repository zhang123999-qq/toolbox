import type { ToolMeta } from '@toolbox/catalog'

/**
 * temperature —— 全局编号 #319
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T2
 * 温度换算：摄氏度/华氏度/开尔文互转，带绝对零度校验
 */
export const meta: ToolMeta = {
  id: 'temperature',
  slug: 'temperature',
  title: '温度换算',
  description: '摄氏度/华氏度/开尔文互转，带绝对零度校验',
  titleEn: 'Temperature Converter',
  descriptionEn: 'Convert between °C, °F and K, with absolute-zero validation',

  category: 'math',
  group: 'life',
  tags: ['temperature', 'celsius', 'convert'],

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

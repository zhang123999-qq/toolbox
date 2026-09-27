import type { ToolMeta } from '@toolbox/catalog'

/**
 * volume —— 全局编号 #318
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 体积换算：毫升、升、立方米、加仑、液盎司等体积/容积单位互转
 */
export const meta: ToolMeta = {
  id: 'volume',
  slug: 'volume',
  title: '体积换算',
  description: '体积/容积单位互转（毫升、升、立方米、加仑等）',
  titleEn: 'Volume Converter',
  descriptionEn: 'Convert between volume units (ml, L, m³, gallons, etc.)',

  category: 'math',
  group: 'life',
  tags: ['volume', 'capacity', 'convert'],

  priority: 'P1',
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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * zodiac-match —— 全局编号 #363
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P3｜可行性：A｜模板：T2
 *
 * 与存量 #288 zodiac（星座查询：输入月日查单个太阳星座）功能不同：
 * 本工具不做日期→星座查询，只做双人星座配对（12×12 配对矩阵：评分 + 文案）。
 */
export const meta: ToolMeta = {
  id: 'zodiac-match',
  slug: 'zodiac-match',
  title: '星座配对',
  description: '选两个星座，查 12×12 配对矩阵的配对评分、元素组合解析与相处建议',
  titleEn: 'Zodiac Compatibility',
  descriptionEn:
    'Pick two zodiac signs for a 12×12 compatibility score, element analysis and dating advice',

  category: 'math',
  group: 'life',
  tags: ['zodiac', 'match', 'horoscope', 'fun'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['signA', 'signB'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

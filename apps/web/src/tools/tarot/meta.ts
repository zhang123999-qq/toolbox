import type { ToolMeta } from '@toolbox/catalog'

/**
 * tarot —— 全局编号 #840
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 塔罗牌阵：22 张大阿卡纳，单张 / 三张 / 十字牌阵抽取，含正逆位解读。娱乐占卜，非预测工具。
 */
export const meta: ToolMeta = {
  id: 'tarot',
  slug: 'tarot',
  title: '塔罗',
  description: '塔罗牌阵占卜：22 张大阿卡纳，单张/三张/十字牌阵，正逆位解读（娱乐）',
  titleEn: 'Tarot Reading',
  descriptionEn: 'Tarot spreads with 22 major arcana, upright/reversed meanings (for fun)',

  category: 'education',
  group: 'life',
  tags: ['tarot', 'divination', 'fun', 'cards'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

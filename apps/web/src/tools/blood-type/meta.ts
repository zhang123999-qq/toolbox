import type { ToolMeta } from '@toolbox/catalog'

/**
 * blood-type —— 全局编号 #362
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P3｜可行性：A｜模板：T2
 * 血型配对：ABO/Rh 配对表，穷举 8×8 供受者组合，查受血者可接受的供血者与可捐献对象（红细胞/血浆）
 */
export const meta: ToolMeta = {
  id: 'blood-type',
  slug: 'blood-type',
  title: '血型配对',
  description: '查询 ABO/Rh 血型输血相容性：受血者可接受的供血者与可捐献对象',
  titleEn: 'Blood Type Compatibility',
  descriptionEn:
    'Look up ABO/Rh transfusion compatibility: compatible donors for a recipient and whom they can donate to',

  category: 'math',
  group: 'life',
  tags: ['blood-type', 'transfusion', 'health', 'abo'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

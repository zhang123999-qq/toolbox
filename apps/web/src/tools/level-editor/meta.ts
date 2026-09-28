import type { ToolMeta } from '@toolbox/catalog'

/**
 * level-editor —— 全局编号 #801
 * 域：game（游戏开发）｜大组：design｜优先级：P3｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'level-editor',
  slug: 'level-editor',
  title: '关卡编辑',
  description: '关卡对象（敌人/道具/出生点/出口/触发器）放置，非瓦片绘制：校验关卡合法性并导出/导入关卡 JSON',
  titleEn: 'Level Editor',
  descriptionEn:
    'Place level objects (enemies/items/spawns/exits/triggers), not tile painting: validate levels and export/import level JSON',

  category: 'game',
  group: 'design',
  tags: ['game', 'level', 'editor', 'gamedesign'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

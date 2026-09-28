import type { ToolMeta } from '@toolbox/catalog'

/**
 * damage —— 全局编号 #804
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'damage',
  slug: 'damage',
  title: '伤害计算',
  description: '攻防暴击伤害公式：atk²/(atk+def) 减伤、暴击率/倍率、伤害浮动',
  titleEn: 'Damage Calculator',
  descriptionEn:
    'Attack/defense/crit damage formula: atk²/(atk+def) mitigation, crit rate/multiplier, damage variance',

  category: 'game',
  group: 'design',
  tags: ['game', 'damage', 'combat', 'balance'],

  priority: 'P2',
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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * physics —— 全局编号 #791
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'physics',
  slug: 'physics',
  title: '物理参数',
  description: '计算游戏常用物理参数：斜抛射程/高度/时间、自由落体、摩擦滑行、弹性碰撞、圆周运动',
  titleEn: 'Game Physics Calculator',
  descriptionEn:
    'Compute common game physics: projectile range/height/time, free fall, friction slide, elastic collision, circular motion',

  category: 'game',
  group: 'design',
  tags: ['game', 'physics', 'projectile', 'collision'],

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

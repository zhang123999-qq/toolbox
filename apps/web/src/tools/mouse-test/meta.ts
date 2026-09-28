import type { ToolMeta } from '@toolbox/catalog'

/**
 * mouse-test —— 全局编号 #833
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'mouse-test',
  slug: 'mouse-test',
  title: '鼠标测试',
  description: '鼠标硬件检测：左/中/右键点击、双击间隔判定、滚轮方向与坐标记录',
  titleEn: 'Mouse Test',
  descriptionEn:
    'Mouse hardware test: left/middle/right click detection, double-click timing, wheel direction and coordinates',

  category: 'education',
  group: 'life',
  tags: ['mouse', 'test', 'click', 'education'],

  priority: 'P1',
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

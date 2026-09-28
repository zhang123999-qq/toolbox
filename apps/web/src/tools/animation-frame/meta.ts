import type { ToolMeta } from '@toolbox/catalog'

/**
 * animation-frame —— 全局编号 #797
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'animation-frame',
  slug: 'animation-frame',
  title: '动画帧',
  description: '管理精灵动画帧序列：增删/排序帧、设置单帧时长与循环，时间轴定位当前帧，导出 JSON',
  titleEn: 'Animation Frames',
  descriptionEn:
    'Manage sprite animation frame sequences: add/remove/reorder frames, per-frame duration and looping, locate current frame on timeline, export JSON',

  category: 'game',
  group: 'design',
  tags: ['game', 'animation', 'sprite', 'timeline'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['file', 'text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * sprite-preview —— 全局编号 #799
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'sprite-preview',
  slug: 'sprite-preview',
  title: '精灵图预览',
  description: '预览精灵帧动画：输入帧序列与 fps，播放/暂停/单步查看，canvas 实时渲染当前帧',
  titleEn: 'Sprite Preview',
  descriptionEn:
    'Preview sprite frame animation: enter frame sequence and fps, play/pause/step through, render current frame on canvas',

  category: 'game',
  group: 'design',
  tags: ['game', 'sprite', 'preview', 'animation'],

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

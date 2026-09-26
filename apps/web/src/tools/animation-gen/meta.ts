import type { ToolMeta } from '@toolbox/catalog'

/**
 * animation-gen —— 全局编号 #238
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * CSS 动画生成
 */
export const meta: ToolMeta = {
  id: 'animation-gen',
  slug: 'animation-gen',
  title: '动画生成',
  description: '配置时长/缓动/次数/方向与关键帧，生成 @keyframes + animation CSS',
  titleEn: 'Animation Generator',
  descriptionEn:
    'Configure duration / timing / iteration / direction and keyframes, generate @keyframes CSS',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'animation', 'keyframes', 'generator'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['name', 'duration', 'timing', 'delay', 'iteration', 'direction', 'from', 'to'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

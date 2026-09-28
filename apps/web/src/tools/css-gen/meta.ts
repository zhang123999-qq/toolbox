import type { ToolMeta } from '@toolbox/catalog'

/**
 * css-gen —— 全局编号 #391
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * CSS 动画生成：内置弹跳/淡入/旋转等预设，输出 @keyframes + animation 完整代码
 */
export const meta: ToolMeta = {
  id: 'css-gen',
  slug: 'css-gen',
  title: 'CSS 动画生成',
  description:
    '选择预设动画（弹跳/淡入/旋转/脉冲等）与时长缓动，生成 @keyframes + animation 完整 CSS',
  titleEn: 'CSS Animation Generator',
  descriptionEn:
    'Pick a preset animation (bounce / fade / rotate / pulse ...), duration and timing, and get full @keyframes + animation CSS',

  category: 'random',
  group: 'design',
  tags: ['css', 'animation', 'keyframes', 'design'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['preset', 'duration', 'timing', 'infinite'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

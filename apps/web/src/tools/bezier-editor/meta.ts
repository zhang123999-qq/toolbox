import type { ToolMeta } from '@toolbox/catalog'

/**
 * bezier-editor —— 全局编号 #239
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 贝塞尔曲线编辑（自研数学，输出 cubic-bezier 值 + 坐标点）
 */
export const meta: ToolMeta = {
  id: 'bezier-editor',
  slug: 'bezier-editor',
  title: '贝塞尔曲线',
  description: '调整两个控制点，输出 cubic-bezier 值并计算曲线上的采样坐标',
  titleEn: 'Bezier Editor',
  descriptionEn:
    'Tune two control points and output the cubic-bezier value with sampled curve points',

  category: 'devops',
  group: 'dev',
  tags: ['css', 'bezier', 'cubic-bezier', 'animation', 'easing'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['x1', 'y1', 'x2', 'y2'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

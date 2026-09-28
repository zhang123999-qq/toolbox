import type { ToolMeta } from '@toolbox/catalog'

/**
 * color-blind-test —— 全局编号 #854
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 色盲测试：伪等色图数字辨认，canvas 绘制圆点图，用户辨认图中数字。
 */
export const meta: ToolMeta = {
  id: 'color-blind-test',
  slug: 'color-blind-test',
  title: '色盲测试',
  description: '色觉筛查小测试：辨认伪等色图中的数字，仅供娱乐参考不能替代医学诊断',
  titleEn: 'Color Blindness Test',
  descriptionEn:
    'Ishihara-style plate digit recognition; screening reference only, not a diagnosis',

  category: 'education',
  group: 'life',
  tags: ['vision', 'color', 'test', 'health', 'fun'],

  priority: 'P2',
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

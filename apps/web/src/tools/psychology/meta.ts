import type { ToolMeta } from '@toolbox/catalog'

/**
 * psychology —— 全局编号 #839
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * 心理自评量表：压力（PSS 简化）与焦虑（GAD-7 简化）自评。
 * 与 #838 personality（性格类型问卷）差异化：本工具是状态自评，非人格分类。
 * 自评参考，非医学诊断。
 */
export const meta: ToolMeta = {
  id: 'psychology',
  slug: 'psychology',
  title: '心理测试',
  description: '压力/焦虑自评量表：PSS 与 GAD-7 简化版自评（自评参考，非医学诊断）',
  titleEn: 'Mental Health Self-Check',
  descriptionEn:
    'Stress/anxiety self-rating scales: simplified PSS & GAD-7 (self reference, not diagnosis)',

  category: 'education',
  group: 'life',
  tags: ['psychology', 'stress', 'anxiety', 'self-check'],

  priority: 'P3',
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

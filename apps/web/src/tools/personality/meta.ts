import type { ToolMeta } from '@toolbox/catalog'

/**
 * personality —— 全局编号 #838
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：A｜模板：T3
 *
 * MBTI 四维度简化问卷：16 题自测，输出人格类型与解读。娱乐参考，非专业心理测评。
 */
export const meta: ToolMeta = {
  id: 'personality',
  slug: 'personality',
  title: '性格测试',
  description: 'MBTI 四维度简化问卷：16 题自测人格类型（娱乐参考，非专业测评）',
  titleEn: 'Personality Test',
  descriptionEn:
    'Simplified MBTI-style 16-question quiz for personality type (for fun, not clinical)',

  category: 'education',
  group: 'life',
  tags: ['personality', 'mbti', 'quiz', 'fun'],

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

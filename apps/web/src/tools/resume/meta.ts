import type { ToolMeta } from '@toolbox/catalog'

/**
 * resume —— 全局编号 #405
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 简历生成：表单填写 → 右侧实时预览排版 → 导出 PNG（html-to-image）
 */
export const meta: ToolMeta = {
  id: 'resume',
  slug: 'resume',
  title: '简历生成',
  description: '填写姓名、经历、技能等信息，实时预览排版并导出 PNG 简历图片',
  titleEn: 'Resume Builder',
  descriptionEn:
    'Fill in your profile, experience and skills, preview the layout live and export it as a PNG image',

  category: 'random',
  group: 'design',
  tags: ['resume', 'cv', 'generator', 'export'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'title', 'phone', 'email', 'summary', 'experience', 'education', 'skills'],
  outputs: ['text'],
  options: [],

  deps: ['html-to-image'],
  worker: false,
  wasm: false,
  api: false,
}

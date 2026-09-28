import type { ToolMeta } from '@toolbox/catalog'

/**
 * resume-pdf —— 全局编号 #514
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'resume-pdf',
  slug: 'resume-pdf',
  title: '简历 PDF 生成',
  description: '填写个人信息、经历与技能，生成一页式简历 PDF，纯本地生成',
  titleEn: 'Resume PDF Generator',
  descriptionEn: 'Fill in profile, experience and skills to generate a one-page resume PDF locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'resume', 'cv', 'document'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: [
    'name',
    'title',
    'email',
    'phone',
    'location',
    'summary',
    'experience',
    'education',
    'skills',
  ],
  outputs: ['file'],
  options: [],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

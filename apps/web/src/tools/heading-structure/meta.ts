import type { ToolMeta } from '@toolbox/catalog'

/**
 * heading-structure —— 全局编号 #732
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 标题层级结构检查：大纲、评分与修复建议（与 #718 朗读预览差异化） */
export const meta: ToolMeta = {
  id: 'heading-structure',
  slug: 'heading-structure',
  title: '标题结构检查',
  description: '检查 HTML 标题层级：生成 h1–h6 大纲，输出结构评分，发现多 h1、层级跳跃、空标题等问题',
  titleEn: 'Heading Structure Checker',
  descriptionEn: 'Check HTML heading hierarchy: outline, structure score, multiple h1, skipped levels, empty headings',

  category: 'a11y',
  group: 'life',
  tags: ['heading', 'a11y', 'h1', 'outline'],

  priority: 'P1',
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

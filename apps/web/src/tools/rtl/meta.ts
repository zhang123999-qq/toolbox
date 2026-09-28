import type { ToolMeta } from '@toolbox/catalog'

/**
 * rtl —— 全局编号 #725
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * RTL 预览：双向文本方向分析 + RTL/LTR/自动三栏渲染对照 */
export const meta: ToolMeta = {
  id: 'rtl',
  slug: 'rtl',
  title: 'RTL 预览',
  description: '双向文本方向分析：统计 LTR/RTL 字符、判定主导方向、标出混合位置，并按 RTL/LTR/自动三栏渲染对照',
  titleEn: 'RTL Preview',
  descriptionEn: 'Bidirectional text analysis: LTR/RTL character stats, dominant direction, mixed-direction spots, with RTL/LTR/auto render comparison',

  category: 'a11y',
  group: 'life',
  tags: ['i18n', 'rtl', 'bidi', 'arabic'],

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

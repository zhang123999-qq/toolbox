import type { ToolMeta } from '@toolbox/catalog'

/**
 * landmark —— 全局编号 #733
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * HTML 地标角色分析：识别 banner/navigation/main 等地标，检查缺失与命名问题 */
export const meta: ToolMeta = {
  id: 'landmark',
  slug: 'landmark',
  title: '地标角色分析',
  description:
    '分析 HTML 的 ARIA 地标角色：识别 banner、导航、main 等地标，检查缺失 main、无名地标等问题并生成标准骨架',
  titleEn: 'Landmark Analyzer',
  descriptionEn:
    'Analyze ARIA landmarks in HTML: banner, navigation, main; missing/unnamed landmark checks and skeleton generation',

  category: 'a11y',
  group: 'life',
  tags: ['landmark', 'a11y', 'aria', 'role'],

  priority: 'P2',
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

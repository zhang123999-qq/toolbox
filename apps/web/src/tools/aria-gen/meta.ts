import type { ToolMeta } from '@toolbox/catalog'

/**
 * aria-gen —— 全局编号 #717
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * ARIA 代码片段生成：按组件类型生成无障碍 HTML 片段与使用说明 */
export const meta: ToolMeta = {
  id: 'aria-gen',
  slug: 'aria-gen',
  title: 'ARIA 生成',
  description: '按组件类型生成 ARIA 无障碍 HTML 代码片段：按钮、输入框、对话框、导航、选项卡、开关、滑块、提示',
  titleEn: 'ARIA Snippet Generator',
  descriptionEn: 'Generate accessible ARIA HTML snippets by component type: button, input, dialog, nav, tabs, switch, slider, alert',

  category: 'a11y',
  group: 'life',
  tags: ['aria', 'a11y', 'html', 'accessibility'],

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

import type { ToolMeta } from '@toolbox/catalog'

/**
 * keyboard-test —— 全局编号 #832
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'keyboard-test',
  slug: 'keyboard-test',
  title: '键盘测试',
  description:
    '键盘按键检测：按下任意键显示键名/键码/分区，并记录已按下的键集合（与无障碍键盘导航 keyboard-nav 不同，本工具只做按键硬件检测）',
  titleEn: 'Keyboard Test',
  descriptionEn:
    'Keyboard key detection: shows key name, code and zone for each press and tracks the pressed-key set (hardware test, not keyboard navigation)',

  category: 'education',
  group: 'life',
  tags: ['keyboard', 'test', 'key', 'education'],

  priority: 'P1',
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

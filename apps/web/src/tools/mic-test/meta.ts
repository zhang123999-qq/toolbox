import type { ToolMeta } from '@toolbox/catalog'

/**
 * mic-test —— 全局编号 #835
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'mic-test',
  slug: 'mic-test',
  title: '麦克风测试',
  description: '麦克风检测：申请麦克风权限并实时显示输入电平，验证麦克风是否正常工作',
  titleEn: 'Microphone Test',
  descriptionEn:
    'Microphone test: requests mic permission via MediaDevices and shows real-time input level',

  category: 'education',
  group: 'life',
  tags: ['microphone', 'test', 'audio', 'education'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

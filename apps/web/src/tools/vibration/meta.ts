import type { ToolMeta } from '@toolbox/catalog'

/**
 * vibration —— 全局编号 #866
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'vibration',
  slug: 'vibration',
  title: '震动测试',
  description: '通过 Vibration API 触发设备震动，内置短震/长震/双震/SOS 预设模式',
  titleEn: 'Vibration Test',
  descriptionEn:
    'Triggers device vibration via the Vibration API, with short/long/double/SOS presets',

  category: 'education',
  group: 'life',
  tags: ['vibration', 'haptic', 'mobile', 'test'],

  priority: 'P2',
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

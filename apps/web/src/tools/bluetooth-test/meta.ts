import type { ToolMeta } from '@toolbox/catalog'

/**
 * bluetooth-test —— 全局编号 #868
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'bluetooth-test',
  slug: 'bluetooth-test',
  title: '蓝牙测试',
  description: '通过 Web Bluetooth API 检测蓝牙能力、请求并列出已配对的蓝牙设备',
  titleEn: 'Bluetooth Test',
  descriptionEn:
    'Detects Web Bluetooth capability and requests paired Bluetooth devices via the Web Bluetooth API',

  category: 'education',
  group: 'life',
  tags: ['bluetooth', 'ble', 'hardware', 'test'],

  priority: 'P3',
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

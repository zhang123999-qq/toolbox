import type { ToolMeta } from '@toolbox/catalog'

/**
 * usb-test —— 全局编号 #869
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'usb-test',
  slug: 'usb-test',
  title: 'USB 测试',
  description: '通过 WebUSB API 检测 USB 能力、请求并列出已授权的 USB 设备（含厂商/产品 ID）',
  titleEn: 'USB Test',
  descriptionEn:
    'Detects WebUSB capability and requests authorized USB devices via the WebUSB API',

  category: 'education',
  group: 'life',
  tags: ['usb', 'webusb', 'hardware', 'test'],

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

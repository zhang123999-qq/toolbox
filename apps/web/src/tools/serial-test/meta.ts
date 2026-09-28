import type { ToolMeta } from '@toolbox/catalog'

/**
 * serial-test —— 全局编号 #870
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P3｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'serial-test',
  slug: 'serial-test',
  title: '串口测试',
  description: '通过 Web Serial API 检测串口能力、请求并管理串口连接（波特率/打开/关闭）',
  titleEn: 'Serial Test',
  descriptionEn:
    'Detects Web Serial capability and manages serial ports (baud rate/open/close) via the Web Serial API',

  category: 'education',
  group: 'life',
  tags: ['serial', 'uart', 'hardware', 'test'],

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

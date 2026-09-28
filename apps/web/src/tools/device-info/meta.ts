import type { ToolMeta } from '@toolbox/catalog'

/**
 * device-info —— 全局编号 #860
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A（纯 JS）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'device-info',
  slug: 'device-info',
  title: '设备信息',
  description: '读取设备平台、CPU 核心数、内存、语言、触屏支持并判断设备类型（手机/平板/桌面）',
  titleEn: 'Device Info',
  descriptionEn:
    'Reads device platform, CPU cores, memory, language and touch support, and classifies device type (mobile/tablet/desktop)',

  category: 'education',
  group: 'life',
  tags: ['device', 'hardware', 'detect', 'test'],

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

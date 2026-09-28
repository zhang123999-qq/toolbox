import type { ToolMeta } from '@toolbox/catalog'

/**
 * browser-info —— 全局编号 #859
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A（纯 JS）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'browser-info',
  slug: 'browser-info',
  title: '浏览器信息',
  description: '解析 User-Agent 识别浏览器/版本/操作系统/渲染引擎，并检测常用 Web 特性支持情况',
  titleEn: 'Browser Info',
  descriptionEn:
    'Parses the User-Agent to identify browser, version, OS and engine, and detects common Web feature support',

  category: 'education',
  group: 'life',
  tags: ['browser', 'user-agent', 'detect', 'test'],

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

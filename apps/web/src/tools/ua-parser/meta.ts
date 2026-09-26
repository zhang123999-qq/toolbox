import type { ToolMeta } from '@toolbox/catalog'

/**
 * ua-parser —— 全局编号 #206
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * User-Agent 解析：自研规则匹配浏览器 / 版本 / 操作系统 / 设备类型 / 引擎
 */
export const meta: ToolMeta = {
  id: 'ua-parser',
  slug: 'ua-parser',
  title: 'UA 解析',
  description: '解析 User-Agent 字符串，识别浏览器 / 系统 / 设备 / 渲染引擎',
  titleEn: 'User-Agent Parser',
  descriptionEn: 'Parse a User-Agent string into browser, OS, device type and engine (rule-based)',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'user-agent', 'browser', 'os', 'device'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

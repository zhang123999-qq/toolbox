import type { ToolMeta } from '@toolbox/catalog'

/**
 * screenshot-dev —— 全局编号 #271
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P3｜可行性：C｜模板：T2
 *
 * 说明：原规划 E（服务端截图）。浏览器端改用 navigator.mediaDevices.getDisplayMedia
 * 真实截取屏幕 / 窗口 / 标签页，再用 canvas 导出 PNG dataURL。需用户手动授权。
 */
export const meta: ToolMeta = {
  id: 'screenshot-dev',
  slug: 'screenshot-dev',
  title: '网站截图',
  description: '调用浏览器 getDisplayMedia 截取屏幕 / 窗口 / 标签页，导出 PNG dataURL',
  titleEn: 'Screen Capture',
  descriptionEn: 'Capture screen or a tab via getDisplayMedia and export a PNG dataURL',

  category: 'devops',
  group: 'dev',
  tags: ['screenshot', 'getdisplaymedia', 'screen-capture', 'browser-api'],

  priority: 'P3',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * resolution —— 全局编号 #858
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：A（纯 JS）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'resolution',
  slug: 'resolution',
  title: '屏幕分辨率',
  description: '读取屏幕分辨率、浏览器视口尺寸、设备像素比（DPR）与色深，并换算宽高比',
  titleEn: 'Screen Resolution',
  descriptionEn:
    'Reads screen resolution, browser viewport size, device pixel ratio (DPR) and color depth, with aspect ratio conversion',

  category: 'education',
  group: 'life',
  tags: ['resolution', 'screen', 'display', 'test'],

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

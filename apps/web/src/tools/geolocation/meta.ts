import type { ToolMeta } from '@toolbox/catalog'

/**
 * geolocation —— 全局编号 #863
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'geolocation',
  slug: 'geolocation',
  title: '地理位置',
  description: '通过 Geolocation API 获取经纬度与定位精度，并生成地图链接',
  titleEn: 'Geolocation',
  descriptionEn:
    'Reads latitude, longitude and accuracy via the Geolocation API, and builds a map link',

  category: 'education',
  group: 'life',
  tags: ['geolocation', 'gps', 'map', 'location'],

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

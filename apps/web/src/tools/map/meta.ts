import type { ToolMeta } from '@toolbox/catalog'

/**
 * map —— 全局编号 #674
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：D｜模板：T3
 * 地图可视化：地区数值渲染中国/世界 choropleth，geoJSON 运行时从 CDN 获取，支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'map',
  slug: 'map',
  title: '地图可视化',
  description: '输入地区数值，用 ECharts 渲染中国 / 世界分级设色地图，地图数据运行时从 CDN 加载',
  titleEn: 'Map Visualization',
  descriptionEn: 'Render ECharts choropleth maps of China / world from region values, GeoJSON loaded at runtime',
  category: 'random',
  group: 'design',
  tags: ['map', 'echarts', 'geojson', 'choropleth'],
  priority: 'P2',
  feasibility: 'D',
  template: 'T3',
  inputs: ['text'],
  outputs: ['text'],
  options: ['kind', 'title', 'width', 'height'],
  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: true,
}

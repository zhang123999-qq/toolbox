import type { ToolMeta } from '@toolbox/catalog'

/**
 * speed-test-net —— 全局编号 #837
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：D（浏览器 fetch 直连）｜模板：T2
 *
 * 带宽测速：下载/上传速率（Mbps）测量与评级。
 * 与 #648 speed-test（网站 fetch 计时）差异化：本工具测的是网络带宽，而非单个页面的加载耗时。
 */
export const meta: ToolMeta = {
  id: 'speed-test-net',
  slug: 'speed-test-net',
  title: '网速测试',
  description: '带宽测速：下载/上传速率（Mbps）测量与评级（测带宽，非 #648 的网站加载计时）',
  titleEn: 'Internet Speed Test',
  descriptionEn:
    'Bandwidth speed test: download/upload throughput in Mbps with grading (bandwidth, not page load timing)',

  category: 'education',
  group: 'life',
  tags: ['speed', 'bandwidth', 'network', 'test'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  // D：浏览器 fetch 直连测速端点（无后端、无 Key）
  api: true,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * sse —— 全局编号 #754
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：C｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'sse',
  slug: 'sse',
  title: 'SSE 测试',
  description: '连接 SSE 事件流并查看实时事件日志，支持自定义事件名监听',
  titleEn: 'SSE Tester',
  descriptionEn:
    'Connect to a Server-Sent Events stream and inspect the live event log with custom event listeners',

  category: 'devops',
  group: 'dev',
  tags: ['sse', 'eventsource', 'stream', 'test'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

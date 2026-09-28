import type { ToolMeta } from '@toolbox/catalog'

/**
 * websocket —— 全局编号 #753
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：C｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'websocket',
  slug: 'websocket',
  title: 'WebSocket 测试',
  description: '连接 WebSocket 服务并收发消息，查看实时消息日志与连接状态',
  titleEn: 'WebSocket Tester',
  descriptionEn:
    'Connect to a WebSocket server, send and receive messages with a live log and status',

  category: 'devops',
  group: 'dev',
  tags: ['websocket', 'ws', 'realtime', 'test', 'api'],

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

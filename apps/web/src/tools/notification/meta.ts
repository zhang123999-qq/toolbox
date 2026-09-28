import type { ToolMeta } from '@toolbox/catalog'

/**
 * notification —— 全局编号 #865
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'notification',
  slug: 'notification',
  title: '通知测试',
  description: '通过 Notification API 申请通知权限并发送一条测试通知',
  titleEn: 'Notification Test',
  descriptionEn:
    'Requests notification permission and sends a test notification via the Notification API',

  category: 'education',
  group: 'life',
  tags: ['notification', 'permission', 'browser'],

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

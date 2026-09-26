import type { ToolMeta } from '@toolbox/catalog'

/**
 * webhook-test —— 全局编号 #213
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'webhook-test',
  slug: 'webhook-test',
  title: 'Webhook 测试',
  description: '向 Webhook 地址发送一条 POST JSON，查看响应或错误，验证回调是否通',
  titleEn: 'Webhook Tester',
  descriptionEn: 'Send a POST JSON payload to a webhook URL and inspect the response',

  category: 'devops',
  group: 'dev',
  tags: ['webhook', 'http', 'testing', 'devops'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'payload'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

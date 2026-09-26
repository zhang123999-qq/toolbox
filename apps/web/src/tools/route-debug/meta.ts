import type { ToolMeta } from '@toolbox/catalog'

/**
 * route-debug —— 全局编号 #255
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 路由规则调试（路径匹配测试）
 */
export const meta: ToolMeta = {
  id: 'route-debug',
  slug: 'route-debug',
  title: '路由调试',
  description: '输入路由规则与测试路径，输出是否匹配及提取到的路径参数',
  titleEn: 'Route Debug',
  descriptionEn:
    'Test a route pattern against a path and see whether it matches and the extracted params',

  category: 'devops',
  group: 'dev',
  tags: ['route', 'router', 'path', 'debug', 'params'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['pattern'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

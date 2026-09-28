import type { ToolMeta } from '@toolbox/catalog'

/**
 * edge-log —— 全局编号 #819
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'edge-log',
  slug: 'edge-log',
  title: '边缘日志',
  description: '构造边缘日志查询参数并解析访问日志行：时间范围校验、状态码/节点过滤、combined 格式转 JSON',
  titleEn: 'Edge Log Query & Parser',
  descriptionEn:
    'Build edge log query params and parse access log lines: time range validation, status/colo filters, combined format to JSON',

  category: 'edge',
  group: 'life',
  tags: ['log', 'query', 'access-log', 'debug'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

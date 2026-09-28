import type { ToolMeta } from '@toolbox/catalog'

/**
 * postman-import —— 全局编号 #751
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'postman-import',
  slug: 'postman-import',
  title: 'Postman 导入',
  description: '解析 Postman Collection v2.1，提取请求列表并可导出为 HTTP 断言任务',
  titleEn: 'Postman Collection Import',
  descriptionEn:
    'Parse a Postman Collection v2.1, extract requests and export as HTTP assertion tasks',

  category: 'devops',
  group: 'dev',
  tags: ['postman', 'api', 'import', 'devtools'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

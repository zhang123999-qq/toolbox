import type { ToolMeta } from '@toolbox/catalog'

/**
 * http-assert —— 全局编号 #748
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'http-assert',
  slug: 'http-assert',
  title: 'HTTP 断言测试',
  description: '向 URL 发起请求并按断言规则校验状态码、响应头、响应体与耗时，输出测试报告',
  titleEn: 'HTTP Assertion Tester',
  descriptionEn:
    'Send a request to a URL and assert on status, headers, body and timing with a test report',

  category: 'devops',
  group: 'dev',
  tags: ['http', 'assert', 'test', 'api'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text', 'headers', 'body', 'assertions'],
  outputs: ['text'],
  options: ['method'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}

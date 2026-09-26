import type { ToolMeta } from '@toolbox/catalog'

/**
 * jsonpath —— 全局编号 #138
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'jsonpath',
  slug: 'jsonpath',
  title: 'JSONPath',
  description: '用 JSONPath 表达式从 JSON 里取出节点，支持值与路径两种输出',
  titleEn: 'JSONPath',
  descriptionEn: 'Query JSON with JSONPath expressions and get values or paths',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'jsonpath', 'query'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  // 表达式走选项（option.pattern），不额外占一个输入框
  inputs: ['text'],
  outputs: ['text'],
  options: ['pattern', 'mode'],

  // 规划表列的是 jsonpath-plus；禁止新增依赖，改为自己实现子集，缺口写在 README
  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-validate —— 全局编号 #132
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-validate',
  slug: 'json-validate',
  title: 'JSON 校验',
  description: '校验 JSON 是否合法，并给出语法错误所在的行与列',
  titleEn: 'JSON Validate',
  descriptionEn: 'Check whether JSON is valid and report the error line and column',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'validate', 'lint'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['strict'],

  // 规划表列的是 ajv，但新增依赖被禁止：本工具只判语法合法性，自己写解析器即可
  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

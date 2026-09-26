import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-java —— 全局编号 #143
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-java',
  slug: 'json-to-java',
  title: 'JSON 转 Java',
  description: '由 JSON 样本生成 Java POJO / Record / Lombok 类',
  titleEn: 'JSON to Java',
  descriptionEn: 'Generate Java POJO, record or Lombok classes from a JSON sample',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'java', 'codegen'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['style', 'mode', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

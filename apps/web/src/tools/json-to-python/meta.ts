import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-python —— 全局编号 #145
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-python',
  slug: 'json-to-python',
  title: 'JSON 转 Python',
  description: '由 JSON 样本生成 dataclass / Pydantic / TypedDict 模型',
  titleEn: 'JSON to Python',
  descriptionEn: 'Generate Python dataclass, Pydantic model or TypedDict from a JSON sample',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'python', 'codegen'],

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

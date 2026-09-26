import type { ToolMeta } from '@toolbox/catalog'

/**
 * yaml-to-json —— 全局编号 #153
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 * 说明：规划表的依赖列写的是 yaml 库；按「禁止新增 npm 依赖」规范改为纯 TS 自实现，
 *       故 deps 为空，支持范围见 README「限制」。
 */
export const meta: ToolMeta = {
  id: 'yaml-to-json',
  slug: 'yaml-to-json',
  title: 'YAML 转 JSON',
  description: 'YAML 与 JSON 双向互转，保留类型与嵌套结构',
  titleEn: 'YAML to JSON',
  descriptionEn: 'Convert YAML and JSON in both directions, keeping types and nesting',

  category: 'data-format',
  group: 'dev',
  tags: ['yaml', 'json', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

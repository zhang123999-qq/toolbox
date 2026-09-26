import type { ToolMeta } from '@toolbox/catalog'

/**
 * yaml-formatter —— 全局编号 #152
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 * 说明：规划表的依赖列写的是 yaml 库；按「禁止新增 npm 依赖」规范改为纯 TS 自实现，
 *       故 deps 为空，支持范围见 README「限制」。
 */
export const meta: ToolMeta = {
  id: 'yaml-formatter',
  slug: 'yaml-formatter',
  title: 'YAML 格式化',
  description: 'YAML 缩进重排与语法校验，保留注释与常见块结构',
  titleEn: 'YAML Formatter',
  descriptionEn: 'Re-indent and validate YAML while keeping comments and common block structures',

  category: 'data-format',
  group: 'dev',
  tags: ['yaml', 'format', 'lint'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'indent', 'sortKeys'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

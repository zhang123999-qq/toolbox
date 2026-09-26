import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-to-json —— 全局编号 #169
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 *
 * 复用 sql-to-orm 的 CREATE TABLE 词法解析（纯 TS，零新依赖）。
 */
export const meta: ToolMeta = {
  id: 'sql-to-json',
  slug: 'sql-to-json',
  title: 'SQL 转 JSON Schema',
  description: '把 CREATE TABLE 建表语句转成 JSON Schema（draft 2020-12）',
  titleEn: 'SQL to JSON Schema',
  descriptionEn: 'Convert CREATE TABLE statements into a JSON Schema (draft 2020-12)',

  category: 'data-format',
  group: 'dev',
  tags: ['sql', 'json-schema', 'ddl', 'convert'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

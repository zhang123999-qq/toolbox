import type { ToolMeta } from '@toolbox/catalog'

/**
 * er-diagram —— 全局编号 #185
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 *
 * 由 CREATE TABLE DDL 生成 Mermaid erDiagram「源码文本」。
 * 注意：规划标注依赖 mermaid，但该库未安装且本仓库零新增网络依赖，
 * 这里只产出可粘贴到任意 Mermaid 渲染器的源码，不内置渲染（README 已注明）。
 */
export const meta: ToolMeta = {
  id: 'er-diagram',
  slug: 'er-diagram',
  title: 'ER 图',
  description: '由 CREATE TABLE 建表语句生成 Mermaid erDiagram 源码（实体、字段、外键关系）',
  titleEn: 'ER Diagram',
  descriptionEn: 'Generate a Mermaid erDiagram from CREATE TABLE statements',

  category: 'data-format',
  group: 'dev',
  tags: ['er-diagram', 'mermaid', 'sql', 'ddl', 'database'],

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

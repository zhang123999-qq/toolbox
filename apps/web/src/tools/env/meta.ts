import type { ToolMeta } from '@toolbox/catalog'

/**
 * env —— 全局编号 #250
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'env',
  slug: 'env',
  title: '环境变量',
  description: '解析 .env 内容为 key=value 表格，支持注释 / export / 引号',
  titleEn: 'Env File Parser',
  descriptionEn:
    'Parse a .env file into a key=value table, handling comments, export prefix and quotes',

  category: 'devops',
  group: 'dev',
  tags: ['env', 'dotenv', 'config', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['keepComments'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

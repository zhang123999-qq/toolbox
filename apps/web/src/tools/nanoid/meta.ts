import type { ToolMeta } from '@toolbox/catalog'

/**
 * nanoid —— 全局编号 #377
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 用 crypto.getRandomValues（CSPRNG）经拒绝采样生成 NanoID 风格的 URL 安全随机 ID，
 * 默认 21 字符、URL 安全字母表 A–Z a–z 0–9 _ -，可自定义长度与字母表。
 */
export const meta: ToolMeta = {
  id: 'nanoid',
  slug: 'nanoid',
  title: 'NanoID 生成',
  description:
    '用加密安全随机数生成 NanoID 风格的 URL 安全随机 ID，默认 21 位，可自定义长度与字母表',
  titleEn: 'NanoID Generator',
  descriptionEn:
    'Generate URL-safe NanoID-style random IDs with a CSPRNG: default 21 chars, customisable length and alphabet',

  category: 'random',
  group: 'design',
  tags: ['nanoid', 'id', 'random', 'url-safe'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['length', 'alphabet'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

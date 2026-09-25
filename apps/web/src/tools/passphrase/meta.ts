import type { ToolMeta } from '@toolbox/catalog'

/**
 * passphrase —— 全局编号 #115
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'passphrase',
  slug: 'passphrase',
  title: '密码短语',
  description: '用内置词表生成易记的多词口令',
  titleEn: 'Passphrase Generator',
  descriptionEn: 'Generate memorable multi-word passphrases from a built-in wordlist',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'passphrase', 'random', 'security'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['words', 'separator', 'noAmbiguous', 'uppercase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

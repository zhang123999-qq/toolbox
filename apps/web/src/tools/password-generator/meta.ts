import type { ToolMeta } from '@toolbox/catalog'

/**
 * password-generator —— 全局编号 #114
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'password-generator',
  slug: 'password-generator',
  title: '密码生成',
  description: '用 CSPRNG 生成随机密码，可排除易混字符',
  titleEn: 'Password Generator',
  descriptionEn: 'Generate random passwords with a CSPRNG',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'password', 'random', 'security'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [
    'length',
    'noAmbiguous',
    'eachClass',
    'includeLower',
    'includeUpper',
    'includeNumbers',
    'includeSymbols',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-password —— 全局编号 #371
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 用 crypto.getRandomValues（CSPRNG）经拒绝采样无偏生成随机密码，
 * 可配置长度、是否包含大写/小写/数字/符号，可选排除易混淆字符。
 */
export const meta: ToolMeta = {
  id: 'random-password',
  slug: 'random-password',
  title: '随机密码',
  description:
    '用加密安全随机数生成随机密码，可配置长度与字符集（大写/小写/数字/符号），可选排除易混淆字符',
  titleEn: 'Random Password',
  descriptionEn:
    'Generate random passwords with a CSPRNG: configurable length and character sets, optional exclusion of ambiguous characters',

  category: 'random',
  group: 'design',
  tags: ['password', 'random', 'security', 'crypto'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [
    'length',
    'includeUpper',
    'includeLower',
    'includeNumbers',
    'includeSymbols',
    'noAmbiguous',
  ],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * short-id —— 全局编号 #379
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 用 crypto.getRandomValues（CSPRNG）经拒绝采样生成短 ID，
 * 支持 alnum/alpha/hex/custom 字符集，可选排除易混淆字符。
 */
export const meta: ToolMeta = {
  id: 'short-id',
  slug: 'short-id',
  title: '短 ID 生成',
  description:
    '用加密安全随机数生成短 ID，支持字母数字/字母/十六进制/自定义字符集，可选排除易混淆字符',
  titleEn: 'Short ID Generator',
  descriptionEn:
    'Generate short random IDs with a CSPRNG: alnum / alpha / hex / custom charset, optional exclusion of ambiguous characters',

  category: 'random',
  group: 'design',
  tags: ['short', 'id', 'random', 'slug'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['length', 'charset', 'noAmbiguous', 'customCharset'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

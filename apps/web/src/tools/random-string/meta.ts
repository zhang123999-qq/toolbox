import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-string —— 全局编号 #372
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 用 crypto.getRandomValues（CSPRNG）经拒绝采样无偏生成随机字符串，
 * 支持 alnum/alpha/lower/upper/numeric/hex/base64 预设与自定义字符集。
 */
export const meta: ToolMeta = {
  id: 'random-string',
  slug: 'random-string',
  title: '随机字符串',
  description:
    '用加密安全随机数生成指定长度的随机字符串，支持字母数字/十六进制/base64 等预设与自定义字符集',
  titleEn: 'Random String',
  descriptionEn:
    'Generate random strings of a given length with a CSPRNG: alnum / alpha / numeric / hex / base64 presets or a custom charset',

  category: 'random',
  group: 'design',
  tags: ['random', 'string', 'token', 'crypto'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['length', 'charset', 'customCharset'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

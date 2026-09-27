import type { ToolMeta } from '@toolbox/catalog'

/**
 * passphrase-gen —— 全局编号 #419
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 密码短语生成：从内置英文词表随机取词组成易记短语（如 correct-horse-battery-staple）。
 * 与「随机密码」（password-generator，单个高熵随机字符串）不同：本工具产出的是
 * 「多个单词组成的短语」，适合用作需要人脑记忆的主密码；随机源为 crypto.getRandomValues。
 */
export const meta: ToolMeta = {
  id: 'passphrase-gen',
  slug: 'passphrase-gen',
  title: '密码短语生成',
  description:
    '生成易记的英文单词密码短语（如 correct-horse-battery-staple），适合做主密码；区别于「随机密码」的单个高熵字符串',
  titleEn: 'Passphrase Generator',
  descriptionEn:
    'Generate memorable multi-word passphrases (e.g. correct-horse-battery-staple) for master passwords; unlike Random Password which outputs a single high-entropy string',

  category: 'random',
  group: 'design',
  tags: ['password', 'passphrase', 'security', 'words'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['words', 'separator', 'capitalize'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { LoremInput, LoremOptions } from './schema'

/** 内置英文词库（经典 lorem 词表的一段） */
const EN_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'labore',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'aliquip',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
]

/** 内置中文词库：常见双字词，拼起来像正常中文 */
const ZH_WORDS = [
  '我们',
  '文本',
  '工具',
  '可以',
  '处理',
  '数据',
  '并且',
  '生成',
  '示例',
  '内容',
  '用于',
  '测试',
  '排版',
  '显示',
  '效果',
  '这里',
  '一段',
  '中文',
  '假文',
  '用来',
  '占位',
  '长度',
  '合适',
  '阅读',
  '流畅',
  '段落',
  '句子',
  '词语',
  '随机',
  '组合',
]

/** 内置拉丁词库（与英文词库区分：更接近传统 lorem ipsum 的拼写） */
const LATIN_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'amet',
  'consectetur',
  'adipisci',
  'elit',
  'eiusmod',
  'tempor',
  'incididunt',
  'labore',
  'dolore',
  'aliqua',
  'enim',
  'veniam',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'aliquip',
  'commodo',
  'consequat',
  'reprehenderit',
  'voluptate',
  'velit',
  'fugiat',
  'pariatur',
  'curabitur',
  'pretium',
  'tincidunt',
]

/** 中文词之间不加空格，英文 / 拉丁用空格连接 */
const JOINER: Record<LoremOptions['language'], string> = { zh: '', en: ' ', latin: ' ' }

/** 自定义词库优先：按空白、逗号、顿号、分号切分；为空则回落内置词库 */
export function lexiconOf(input: LoremInput, options: LoremOptions): string[] {
  const custom = input.text.split(/[\s,，、;；]+/).filter((word) => word !== '')
  if (custom.length > 0) return custom
  if (options.language === 'zh') return ZH_WORDS
  return options.language === 'latin' ? LATIN_WORDS : EN_WORDS
}

function pick(words: readonly string[]): string {
  return words[Math.floor(Math.random() * words.length)]
}

/** 一句：5–15 个词；中文以。结尾，其余首字母大写并以 . 结尾 */
export function makeSentence(words: readonly string[], joiner: string): string {
  const size = 5 + Math.floor(Math.random() * 11)
  const body = Array.from({ length: size }, () => pick(words)).join(joiner)
  if (joiner === ' ') {
    return body.charAt(0).toUpperCase() + body.slice(1) + '.'
  }
  return body + '。'
}

/** 一段：3–6 句 */
export function makeParagraph(words: readonly string[], joiner: string): string {
  const size = 3 + Math.floor(Math.random() * 4)
  return Array.from({ length: size }, () => makeSentence(words, joiner)).join(
    joiner === ' ' ? ' ' : '',
  )
}

/** 生成乱数假文；输入可给自定义词库，留空用内置词库 */
export function transform(input: LoremInput, options: LoremOptions): string {
  const words = lexiconOf(input, options)
  const joiner = JOINER[options.language]
  const count = Math.max(1, Number(options.count) || 1)

  if (options.unit === 'word') {
    return Array.from({ length: count }, () => pick(words)).join(joiner)
  }
  const units =
    options.unit === 'sentence'
      ? Array.from({ length: count }, () => makeSentence(words, joiner))
      : Array.from({ length: count }, () => makeParagraph(words, joiner))
  return units.join('\n')
}

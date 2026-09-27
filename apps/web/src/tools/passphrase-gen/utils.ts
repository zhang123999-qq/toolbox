import type { Translate } from '../../i18n'
import { inputSchema, optionsSchema } from './schema'
import type { PassphraseInput, PassphraseOptions } from './schema'

/**
 * 内置英文单词表：217 个常见 3–8 字母小写单词。
 * 规模在中英 README 与页面描述中均有注明；词表固定、可审计，不依赖外部接口。
 */
export const WORDS: readonly string[] = [
  'abandon',
  'ability',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'access',
  'accuse',
  'achieve',
  'across',
  'actor',
  'adapt',
  'address',
  'adjust',
  'admit',
  'adopt',
  'adult',
  'advance',
  'advice',
  'affair',
  'afford',
  'afraid',
  'again',
  'agent',
  'agree',
  'ahead',
  'alarm',
  'album',
  'alert',
  'alien',
  'align',
  'alike',
  'alive',
  'allow',
  'alloy',
  'almost',
  'alone',
  'along',
  'aloud',
  'alpha',
  'already',
  'alter',
  'always',
  'amber',
  'amend',
  'among',
  'amount',
  'ample',
  'anchor',
  'ancient',
  'angel',
  'anger',
  'angle',
  'angry',
  'animal',
  'ankle',
  'announce',
  'annual',
  'answer',
  'antenna',
  'anthem',
  'antique',
  'anxiety',
  'apart',
  'apple',
  'apply',
  'arena',
  'argue',
  'arise',
  'armor',
  'aroma',
  'arrow',
  'arctic',
  'aspect',
  'assault',
  'asset',
  'assist',
  'assume',
  'asthma',
  'athlete',
  'atom',
  'attach',
  'attack',
  'attend',
  'attic',
  'audio',
  'audit',
  'august',
  'aunt',
  'author',
  'auto',
  'autumn',
  'avoid',
  'awake',
  'award',
  'aware',
  'away',
  'awesome',
  'awful',
  'bacon',
  'badge',
  'bagel',
  'baker',
  'balance',
  'balcony',
  'ball',
  'bamboo',
  'banana',
  'banner',
  'barely',
  'bargain',
  'barrel',
  'basic',
  'basil',
  'basin',
  'basis',
  'basket',
  'batch',
  'battle',
  'beach',
  'beacon',
  'beard',
  'beast',
  'become',
  'bedroom',
  'before',
  'begin',
  'behave',
  'behind',
  'being',
  'belly',
  'below',
  'bench',
  'berry',
  'beyond',
  'bicycle',
  'big',
  'bike',
  'bill',
  'binary',
  'birth',
  'biscuit',
  'bitter',
  'black',
  'blade',
  'blame',
  'blanket',
  'blast',
  'blaze',
  'blend',
  'bless',
  'blind',
  'blink',
  'bliss',
  'block',
  'blog',
  'bloom',
  'blossom',
  'blouse',
  'blunder',
  'board',
  'boat',
  'bonus',
  'boost',
  'booth',
  'border',
  'borrow',
  'boss',
  'bottle',
  'bounce',
  'bound',
  'bowl',
  'brace',
  'brain',
  'brand',
  'brave',
  'bread',
  'break',
  'breeze',
  'brick',
  'bridge',
  'brief',
  'bright',
  'bring',
  'brisk',
  'broad',
  'bronze',
  'brook',
  'brown',
  'brush',
  'bubble',
  'buddy',
  'budget',
  'build',
  'bulb',
  'bulk',
  'bullet',
  'bundle',
  'cabin',
  'cable',
  'cage',
  'camel',
  'camera',
  'camp',
  'candy',
  'canoe',
  'canyon',
  'cargo',
  'carpet',
  'carry',
  'carve',
  'castle',
  'casual',
  'cattle',
  'cause',
  'cease',
]

/** 单词数上限：再多就不好记、不好输了 */
export const MAX_WORDS = 6
/** 分隔符最大长度（字符） */
export const MAX_SEPARATOR_LENGTH = 8

/**
 * 安全随机源：crypto.getRandomValues（CSPRNG）。
 * 不可用时抛双语错误——密码场景不静默降级为 Math.random，那等于安全降级。
 */
export function secureRandom(t: Translate): number {
  const source = globalThis.crypto
  if (!source?.getRandomValues) {
    throw new Error(t('error.cryptoUnavailable'))
  }
  const buffer = new Uint32Array(1)
  source.getRandomValues(buffer)
  return buffer[0] / 0x100000000
}

/** 解析单词数：须为 1–MAX_WORDS 的整数 */
export function parseWordCount(raw: string, t: Translate): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error(
      t('passphraseGen.error.invalidWordCount', { value: raw, max: String(MAX_WORDS) }),
    )
  }
  const count = Number(value)
  if (count < 1 || count > MAX_WORDS) {
    throw new Error(
      t('passphraseGen.error.invalidWordCount', { value: raw, max: String(MAX_WORDS) }),
    )
  }
  return count
}

/** 解析分隔符：允许为空（单词直接拼接），超长抛双语错误 */
export function parseSeparator(raw: string, t: Translate): string {
  if (raw.length > MAX_SEPARATOR_LENGTH) {
    throw new Error(
      t('passphraseGen.error.separatorTooLong', { max: String(MAX_SEPARATOR_LENGTH) }),
    )
  }
  return raw
}

/** 首字母大写 */
export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** 生成密码短语：从词表等概率取词，用分隔符连接 */
export function generatePassphrase(
  wordCount: number,
  separator: string,
  capitalizeWords: boolean,
  t: Translate,
  rand: () => number = () => secureRandom(t),
): string {
  const picked: string[] = []
  for (let i = 0; i < wordCount; i++) {
    const word = WORDS[Math.floor(rand() * WORDS.length)]
    picked.push(capitalizeWords ? capitalize(word) : word)
  }
  return picked.join(separator)
}

/**
 * T2 同步入口。
 * 输入框只作触发用：为空返回空串（不进入错误态），非空即生成。
 */
export function transform(
  input: PassphraseInput,
  options: PassphraseOptions,
  t: Translate,
  rand: () => number = () => secureRandom(t),
): string {
  const parsedInput = inputSchema.parse(input)
  if (parsedInput.text.trim() === '') return ''
  const parsedOptions = optionsSchema.parse(options)
  const wordCount = parseWordCount(parsedOptions.words, t)
  const separator = parseSeparator(parsedOptions.separator, t)
  return generatePassphrase(wordCount, separator, parsedOptions.capitalize, t, rand)
}

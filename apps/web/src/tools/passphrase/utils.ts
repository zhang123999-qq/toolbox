import type { PassphraseInput, PassphraseOptions } from './schema'

/**
 * 随机源：返回 [0, 1) 的浮点数。
 * 默认实现走 crypto.getRandomValues（CSPRNG）；单测传入确定性实现即可断言词序与分隔符。
 */
export type RandomSource = () => number

/**
 * 内置词表：256 个常用英文短词，全小写、3~8 字母，按字母分组书写便于维护。
 * 启动时一次性切成数组；抽取按下标等概率，因此每词熵 = log2(256) = 8 bit。
 */
const WORD_SOURCE = `
  apple anchor arrow autumn amber angel artist atlas almond apex
  bacon badge baker bamboo banana basket beacon beetle bottle branch
  cable cactus camel candle canoe canyon carbon carpet carrot castle
  daisy dancer dawn delta denim desert diamond dinner dolphin dragon
  eagle earth ember emerald engine ethics echo elder energy export
  fabric falcon farmer feather fiddle figure filter finger flavor flint
  galaxy garden garlic gentle ginger glacier globe glory golden granite
  hammer harbor harmony harvest hazel helmet heron hidden honey hunter
  igloo ivory index inland insect island indent infant invent iron
  jacket jaguar jasmine jelly jigsaw jungle juniper jargon jockey jolly
  kayak kernel kettle kitten koala kiosk knight kimono kestrel kumquat
  ladder lagoon lantern laser lattice lava legend lemon lettuce lilac
  magnet mango maple marble marina market meadow medal melon mentor
  nectar needle nickel nimbus noble nomad noodle nugget nutmeg napkin
  oasis ocean olive onion opal orange orbit orchid otter oyster
  paddle palace panda panther paper parade parrot pastel peacock pearl
  quartz quill quilt quiver quest quarry quiche quince quokka quasar
  rabbit radar rainbow ranger raven ribbon rider river robin rocket
  sailor salmon scarlet scooter season shadow shell shelter sierra signal
  tabby talent teapot temple tenor terrace tiger timber toast tomato
  umber unicorn union upgrade uphill urban utopia ukulele umbrella unify
  valley vanilla velvet vendor venus vertex vessel vintage violet violin
  wagon walnut wander wasabi water weasel wheat whisper willow window
  xenon xylem xerus xenial xystus xebec
  yarrow yellow yogurt yonder yearly yeoman yodel yurt yoga yankee
  zephyr zebra zenith zipper zinnia zodiac zircon zither zealot zigzag
`

/** 词表：去空白后按下标等概率抽取 */
export const WORDLIST: readonly string[] = WORD_SOURCE.trim().split(/\s+/)

/** 可选词数 */
export const WORD_COUNTS = ['3', '4', '5', '6'] as const

/** 分隔符：选项值是命名值，落到输出时再换成真正的字符 */
const SEPARATORS: Readonly<Record<string, string>> = {
  hyphen: '-',
  underscore: '_',
  space: ' ',
  dot: '.',
}

/** 易混字母：勾选「排除易混字符」后剔除含 l / o 的词（它们与 1 / 0 肉眼难分） */
const AMBIGUOUS = /[lo]/

/** 默认随机源：CSPRNG。注意它是函数，模块加载与渲染期都不会被调用 */
export function secureRandom(): number {
  const source = globalThis.crypto
  if (!source?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法安全生成口令')
  }
  const buffer = new Uint32Array(1)
  source.getRandomValues(buffer)
  return buffer[0] / 0x100000000
}

/** 取词池；勾选排除易混后词池会明显变小，README 里给了对应的熵估算 */
export function wordPool(noAmbiguous: boolean): readonly string[] {
  return noAmbiguous ? WORDLIST.filter((word) => !AMBIGUOUS.test(word)) : WORDLIST
}

/** 解析词数选项；非法取值直接报错，不静默兜底 */
export function parseWordCount(value: string): number {
  if (!(WORD_COUNTS as readonly string[]).includes(value)) {
    throw new Error('不支持的词数：' + value)
  }
  return Number(value)
}

/** 解析分隔符选项 */
export function resolveSeparator(value: string): string {
  const separator = SEPARATORS[value]
  if (separator === undefined) throw new Error('不支持的分隔符：' + value)
  return separator
}

/** 首字母大写 */
export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** 从词池里等概率取一个词 */
function pick(pool: readonly string[], rng: RandomSource): string {
  const index = Math.min(Math.floor(rng() * pool.length), pool.length - 1)
  return pool[index] ?? pool[0]
}

/** 生成密码短语 */
export function generatePassphrase(
  options: PassphraseOptions,
  rng: RandomSource = secureRandom,
): string {
  const count = parseWordCount(options.words)
  const separator = resolveSeparator(options.separator)
  const pool = wordPool(options.noAmbiguous)
  const words: string[] = []
  for (let i = 0; i < count; i += 1) {
    const word = pick(pool, rng)
    words.push(options.uppercase ? capitalize(word) : word)
  }
  return words.join(separator)
}

/**
 * 输入为空串时返回空串，**不会**调用随机源——
 * 这样 SSG 预渲染与首次进入页面都不会烘焙出随机短语。
 * 输入任意内容（或点「示例」）即视为触发一次生成。
 */
export function transform(
  input: PassphraseInput,
  options: PassphraseOptions,
  rng: RandomSource = secureRandom,
): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return generatePassphrase(options, rng)
}

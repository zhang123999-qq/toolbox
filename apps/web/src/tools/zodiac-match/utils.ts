import type { MessageKey, Translate } from '../../i18n'
import { createTranslator } from '../../i18n'
import { inputSchema, optionsSchema } from './schema'
import type { ZodiacMatchInput, ZodiacMatchOptions } from './schema'

/** 十二星座 id（按黄道顺序排列） */
export const SIGN_IDS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const

export type SignId = (typeof SIGN_IDS)[number]

/** 四象元素 */
export type Element = 'fire' | 'earth' | 'air' | 'water'

/** 星座 → 四象元素 */
const SIGN_ELEMENT: Record<SignId, Element> = {
  aries: 'fire',
  taurus: 'earth',
  gemini: 'air',
  cancer: 'water',
  leo: 'fire',
  virgo: 'earth',
  libra: 'air',
  scorpio: 'water',
  sagittarius: 'fire',
  capricorn: 'earth',
  aquarius: 'air',
  pisces: 'water',
}

/** 星座 id → 展示名 i18n key（全类型化映射，避免字符串拼接 key） */
const SIGN_NAME_KEY: Record<SignId, MessageKey> = {
  aries: 'zodiacMatch.sign.aries',
  taurus: 'zodiacMatch.sign.taurus',
  gemini: 'zodiacMatch.sign.gemini',
  cancer: 'zodiacMatch.sign.cancer',
  leo: 'zodiacMatch.sign.leo',
  virgo: 'zodiacMatch.sign.virgo',
  libra: 'zodiacMatch.sign.libra',
  scorpio: 'zodiacMatch.sign.scorpio',
  sagittarius: 'zodiacMatch.sign.sagittarius',
  capricorn: 'zodiacMatch.sign.capricorn',
  aquarius: 'zodiacMatch.sign.aquarius',
  pisces: 'zodiacMatch.sign.pisces',
}

/** 元素 id → 展示名 i18n key */
const ELEMENT_NAME_KEY: Record<Element, MessageKey> = {
  fire: 'zodiacMatch.element.fire',
  earth: 'zodiacMatch.element.earth',
  air: 'zodiacMatch.element.air',
  water: 'zodiacMatch.element.water',
}

/** 无序元素对 key（10 种，字母序拼接） */
type ElementPairKey =
  | 'air-air'
  | 'air-earth'
  | 'air-fire'
  | 'air-water'
  | 'earth-earth'
  | 'earth-fire'
  | 'earth-water'
  | 'fire-fire'
  | 'fire-water'
  | 'water-water'

/**
 * 元素无序对 → 基础配对分。
 * 经验规则：同元素最稳；火+风、土+水互旺；火+水、风+土需要更多磨合。
 */
const ELEMENT_BASE_SCORE: Record<ElementPairKey, number> = {
  'air-air': 82,
  'air-earth': 62,
  'air-fire': 88,
  'air-water': 58,
  'earth-earth': 84,
  'earth-fire': 60,
  'earth-water': 86,
  'fire-fire': 80,
  'fire-water': 55,
  'water-water': 83,
}

/** 同星座配对分：高度同频 */
const SAME_SIGN_SCORE = 92

/** 经典对宫组合（互补型）的配对分，覆盖元素基础分 */
const OPPOSITION_PAIR_SCORE: Record<string, number> = {
  'aries-libra': 93,
  'cancer-capricorn': 90,
  'gemini-sagittarius': 90,
  'leo-aquarius': 89,
  'scorpio-taurus': 91,
  'pisces-virgo': 92,
}

/** 结论档位阈值（分数 ≥ 阈值进入该档） */
const TIER_THRESHOLD_5 = 90
const TIER_THRESHOLD_4 = 80
const TIER_THRESHOLD_3 = 70
const TIER_THRESHOLD_2 = 60

/** 配对结论档位：5=天作之合 … 1=挑战不小 */
export type Tier = 1 | 2 | 3 | 4 | 5

/** 两个元素拼成无序对 key（字母序，保证 (a,b) 与 (b,a) 同 key） */
function elementPairKey(a: Element, b: Element): ElementPairKey {
  return [a, b].sort().join('-') as ElementPairKey
}

/** 两个星座拼成无序对 key（字母序，保证对称） */
function signPairKey(a: SignId, b: SignId): string {
  return [a, b].sort().join('-')
}

/** 星座展示名（随当前语言变化）；导出供下拉框取值 */
export function signDisplayName(id: SignId, t: Translate): string {
  return t(SIGN_NAME_KEY[id])
}

/** 元素展示名 */
function elementDisplayName(element: Element, t: Translate): string {
  return t(ELEMENT_NAME_KEY[element])
}

/** 展示名反查星座 id；查不到返回 null（由调用方抛双语错误） */
function findSignId(displayName: string, t: Translate): SignId | null {
  for (const id of SIGN_IDS) {
    if (signDisplayName(id, t) === displayName) return id
  }
  // 语言切换后下拉框旧值仍是另一语言的展示名：用中英双语再查一遍，保证旧值可反查
  for (const locale of ['zh', 'en'] as const) {
    const fallback = createTranslator(locale)
    for (const id of SIGN_IDS) {
      if (signDisplayName(id, fallback) === displayName) return id
    }
  }
  // 兜底：直接传星座 id 也认
  if ((SIGN_IDS as readonly string[]).includes(displayName)) return displayName as SignId
  return null
}

/**
 * 12×12 配对矩阵的评分函数。
 * 规则（按优先级）：同星座 → 经典对宫 → 元素无序对基础分。
 * 矩阵对称：score(a,b) === score(b,a) 恒成立。
 */
export function pairScore(a: SignId, b: SignId): number {
  if (a === b) return SAME_SIGN_SCORE
  const opposition = OPPOSITION_PAIR_SCORE[signPairKey(a, b)]
  if (opposition !== undefined) return opposition
  return ELEMENT_BASE_SCORE[elementPairKey(SIGN_ELEMENT[a], SIGN_ELEMENT[b])]
}

/** 分数 → 结论档位 */
export function tierOf(score: number): Tier {
  if (score >= TIER_THRESHOLD_5) return 5
  if (score >= TIER_THRESHOLD_4) return 4
  if (score >= TIER_THRESHOLD_3) return 3
  if (score >= TIER_THRESHOLD_2) return 2
  return 1
}

/** 档位 → 结论文案 i18n key */
function tierKey(tier: Tier): MessageKey {
  return ('zodiacMatch.tier.' + tier) as MessageKey
}

/** 档位 → 相处建议 i18n key */
function adviceKey(tier: Tier): MessageKey {
  return ('zodiacMatch.advice.' + tier) as MessageKey
}

/** 元素无序对 → 组合解析 i18n key */
function comboKey(a: Element, b: Element): MessageKey {
  return ('zodiacMatch.combo.' + elementPairKey(a, b)) as MessageKey
}

/**
 * T2 同步入口：输出配对报告（评分 / 元素组合 / 结论 / 解析 / 建议）。
 * 名字留空时用星座名展示；星座展示名非法时抛双语错误。
 */
export function transform(
  input: ZodiacMatchInput,
  options: ZodiacMatchOptions,
  t: Translate,
): string {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)

  const signA = findSignId(parsedOptions.signA, t)
  if (signA === null)
    throw new Error(t('zodiacMatch.error.unknownSign', { sign: parsedOptions.signA }))
  const signB = findSignId(parsedOptions.signB, t)
  if (signB === null)
    throw new Error(t('zodiacMatch.error.unknownSign', { sign: parsedOptions.signB }))

  const score = pairScore(signA, signB)
  const tier = tierOf(score)
  const elementA = SIGN_ELEMENT[signA]
  const elementB = SIGN_ELEMENT[signB]

  const nameA = parsedInput.text.trim()
  const nameB = parsedInput.textB.trim()
  const labelA =
    nameA === '' ? signDisplayName(signA, t) : `${nameA}（${signDisplayName(signA, t)}）`
  const labelB =
    nameB === '' ? signDisplayName(signB, t) : `${nameB}（${signDisplayName(signB, t)}）`

  return [
    `${t('zodiacMatch.pair')}：${labelA} × ${labelB}`,
    `${t('zodiacMatch.score')}：${score} / 100`,
    `${t('zodiacMatch.elements')}：${elementDisplayName(elementA, t)} × ${elementDisplayName(elementB, t)}`,
    `${t('zodiacMatch.verdict')}：${t(tierKey(tier))}`,
    `${t('zodiacMatch.analysis')}：${t(comboKey(elementA, elementB))}`,
    `${t('zodiacMatch.advice')}：${t(adviceKey(tier))}`,
  ].join('\n')
}

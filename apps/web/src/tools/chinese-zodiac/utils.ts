import type { ChineseZodiacInput, ChineseZodiacOptions } from './schema'

/** 覆盖范围（与农历表一致） */
export const MIN_YEAR = 1900
export const MAX_YEAR = 2100

/** 生肖顺序：(year-4) % 12 的下标 → 鼠为 0 */
export const ANIMALS: readonly { zh: string; en: string }[] = [
  { zh: '鼠', en: 'Rat' },
  { zh: '牛', en: 'Ox' },
  { zh: '虎', en: 'Tiger' },
  { zh: '兔', en: 'Rabbit' },
  { zh: '龙', en: 'Dragon' },
  { zh: '蛇', en: 'Snake' },
  { zh: '马', en: 'Horse' },
  { zh: '羊', en: 'Goat' },
  { zh: '猴', en: 'Monkey' },
  { zh: '鸡', en: 'Rooster' },
  { zh: '狗', en: 'Dog' },
  { zh: '猪', en: 'Pig' },
]

/** 天干：(year-4) % 10 的下标 → 甲为 0 */
export const STEMS: readonly { zh: string; element: string; elementEn: string }[] = [
  { zh: '甲', element: '木', elementEn: 'Wood' },
  { zh: '乙', element: '木', elementEn: 'Wood' },
  { zh: '丙', element: '火', elementEn: 'Fire' },
  { zh: '丁', element: '火', elementEn: 'Fire' },
  { zh: '戊', element: '土', elementEn: 'Earth' },
  { zh: '己', element: '土', elementEn: 'Earth' },
  { zh: '庚', element: '金', elementEn: 'Metal' },
  { zh: '辛', element: '金', elementEn: 'Metal' },
  { zh: '壬', element: '水', elementEn: 'Water' },
  { zh: '癸', element: '水', elementEn: 'Water' },
]

/** 地支：与生肖同位（子鼠、丑牛…） */
export const BRANCHES: readonly string[] = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
]

/** 解析年份文本为整数 */
export function parseYear(text: string): number {
  const cleaned = text.trim()
  const match = cleaned.match(/^(-?\d{1,5})$/)
  if (!match) throw new Error('无法识别年份，请输入四位整数年份，例如 2025')
  const year = Number(match[1])
  if (!Number.isInteger(year)) throw new Error('年份必须是整数')
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error(`年份超出覆盖范围：仅支持 ${MIN_YEAR}–${MAX_YEAR}`)
  }
  return year
}

export interface ZodiacResult {
  readonly year: number
  readonly animalZh: string
  readonly animalEn: string
  readonly branch: string
  readonly stem: string
  readonly element: string
  readonly elementEn: string
  readonly order: number
  readonly ganzhi: string
}

/** 按 (year-4) 同时映射天干与地支/生肖 */
export function lookupYear(year: number): ZodiacResult {
  const a = (((year - 4) % 12) + 12) % 12
  const s = (((year - 4) % 10) + 10) % 10
  return {
    year,
    animalZh: ANIMALS[a].zh,
    animalEn: ANIMALS[a].en,
    branch: BRANCHES[a],
    stem: STEMS[s].zh,
    element: STEMS[s].element,
    elementEn: STEMS[s].elementEn,
    order: a + 1,
    ganzhi: STEMS[s].zh + BRANCHES[a],
  }
}

/** 主转换 */
export function transform(input: ChineseZodiacInput, _options: ChineseZodiacOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const year = parseYear(input.text)
  const r = lookupYear(year)
  return [
    `${r.year} 年：${r.animalZh}（${r.animalEn}）`,
    `干支：${r.ganzhi}（${r.stem}${r.branch}）`,
    `天干五行：${r.element}（${r.elementEn}）`,
    `生肖排序：第 ${r.order} 位（${r.branch}${r.animalZh}）`,
  ].join('\n')
}

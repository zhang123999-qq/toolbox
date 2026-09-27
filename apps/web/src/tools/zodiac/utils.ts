import type { ZodiacInput, ZodiacOptions } from './schema'

export interface ZodiacSign {
  /** 起始月（用于顺序匹配） */
  readonly startM: number
  readonly startD: number
  readonly zh: string
  readonly en: string
  /** 日期区间，例如 `3/21 – 4/19` */
  readonly range: string
  /** 四象元素 */
  readonly element: string
  readonly elementEn: string
  /** 一句特质 */
  readonly trait: string
}

/**
 * 十二星座表（太阳星座 / 回归黄道坐标）。
 * 按「起始日」在公历年中的先后顺序排列；摩羯跨年（12/22 起，盖到次年 1/19）。
 * 边界归属明确：3/20 属双鱼（Pisces），3/21 才进入白羊。
 */
export const ZODIAC: readonly ZodiacSign[] = [
  {
    startM: 1,
    startD: 20,
    zh: '水瓶座',
    en: 'Aquarius',
    range: '1/20 – 2/18',
    element: '风',
    elementEn: 'Air',
    trait: '独立、理性、人道主义',
  },
  {
    startM: 2,
    startD: 19,
    zh: '双鱼座',
    en: 'Pisces',
    range: '2/19 – 3/20',
    element: '水',
    elementEn: 'Water',
    trait: '感性、共情、富有想象力',
  },
  {
    startM: 3,
    startD: 21,
    zh: '白羊座',
    en: 'Aries',
    range: '3/21 – 4/19',
    element: '火',
    elementEn: 'Fire',
    trait: '热情、冲动、行动力强',
  },
  {
    startM: 4,
    startD: 20,
    zh: '金牛座',
    en: 'Taurus',
    range: '4/20 – 5/20',
    element: '土',
    elementEn: 'Earth',
    trait: '稳重、务实、重视感官',
  },
  {
    startM: 5,
    startD: 21,
    zh: '双子座',
    en: 'Gemini',
    range: '5/21 – 6/21',
    element: '风',
    elementEn: 'Air',
    trait: '好奇、善变、擅长沟通',
  },
  {
    startM: 6,
    startD: 22,
    zh: '巨蟹座',
    en: 'Cancer',
    range: '6/22 – 7/22',
    element: '水',
    elementEn: 'Water',
    trait: '念家、敏感、保护欲强',
  },
  {
    startM: 7,
    startD: 23,
    zh: '狮子座',
    en: 'Leo',
    range: '7/23 – 8/22',
    element: '火',
    elementEn: 'Fire',
    trait: '自信、表现欲、慷慨',
  },
  {
    startM: 8,
    startD: 23,
    zh: '处女座',
    en: 'Virgo',
    range: '8/23 – 9/22',
    element: '土',
    elementEn: 'Earth',
    trait: '细致、完美主义、分析力',
  },
  {
    startM: 9,
    startD: 23,
    zh: '天秤座',
    en: 'Libra',
    range: '9/23 – 10/23',
    element: '风',
    elementEn: 'Air',
    trait: '优雅、权衡、追求和谐',
  },
  {
    startM: 10,
    startD: 24,
    zh: '天蝎座',
    en: 'Scorpio',
    range: '10/24 – 11/22',
    element: '水',
    elementEn: 'Water',
    trait: '深刻、执着、爱憎分明',
  },
  {
    startM: 11,
    startD: 23,
    zh: '射手座',
    en: 'Sagittarius',
    range: '11/23 – 12/21',
    element: '火',
    elementEn: 'Fire',
    trait: '乐观、爱自由、好哲学',
  },
  {
    startM: 12,
    startD: 22,
    zh: '摩羯座',
    en: 'Capricorn',
    range: '12/22 – 1/19',
    element: '土',
    elementEn: 'Earth',
    trait: '自律、务实、有野心',
  },
]

/** 把 (m,d) 换算成年内的序号，便于跨月比较 */
function dayOfYear(m: number, d: number): number {
  const days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  return days[m - 1] + d
}

/**
 * 解析输入为 { month, day }。
 * 接受 `3/21`、`3-21`、`3.21`、`2025-03-21`、`3 21` 等写法，
 * 非法月日直接抛中文错误。
 */
export function parseBirthday(text: string): { month: number; day: number } {
  const cleaned = text.trim()
  const match = cleaned.match(/(\d{1,4})[/\-.\s月](\d{1,2})日?/)
  if (!match) throw new Error('无法识别日期，请用「月/日」格式，例如 3/21')
  // 若给了 4 位年，第一段是年；此时再取月。优先按「最后两段是月/日」处理
  let month: number
  let day: number
  if (cleaned.match(/^\d{4}[/.-]/)) {
    const parts = cleaned.split(/[/.-]/)
    month = Number(parts[1])
    day = Number(parts[2])
  } else {
    month = Number(match[1])
    day = Number(match[2])
  }
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error('月和日必须是整数')
  }
  if (month < 1 || month > 12) throw new Error('月份须在 1–12 之间')
  const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  if (day < 1 || day > dim) throw new Error(`非法日期：${month} 月没有 ${day} 日`)
  return { month, day }
}

/** 给定月日返回星座；边界日按上表明确归属 */
export function findZodiac(month: number, day: number): ZodiacSign {
  const target = dayOfYear(month, day)
  let chosen: ZodiacSign | null = null
  for (const sign of ZODIAC) {
    if (dayOfYear(sign.startM, sign.startD) <= target) chosen = sign
  }
  // 落在 1/1–1/19：没有任何「起始日」早于它，归到上一年末尾的摩羯
  return (chosen ?? ZODIAC[ZODIAC.length - 1]) as ZodiacSign
}

/** 主转换：空输入返回空串；非法输入抛中文错误 */
export function transform(input: ZodiacInput, _options: ZodiacOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const { month, day } = parseBirthday(input.text)
  const sign = findZodiac(month, day)
  return [
    `${sign.zh}（${sign.en}）`,
    `日期区间：${sign.range}`,
    `四象元素：${sign.element}（${sign.elementEn}）`,
    `性格特质：${sign.trait}`,
  ].join('\n')
}

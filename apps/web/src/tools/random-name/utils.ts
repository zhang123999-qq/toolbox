import { inputSchema, optionsSchema } from './schema'
import type { RandomNameInput, RandomNameOptions } from './schema'

export const MAX_COUNT = 50
export const GENDERS = ['male', 'female', 'random'] as const
export type Gender = (typeof GENDERS)[number]
export const LANGUAGES = ['zh', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** 中文常见姓氏（约 50 个） */
export const ZH_SURNAMES = [
  '王',
  '李',
  '张',
  '刘',
  '陈',
  '杨',
  '黄',
  '赵',
  '吴',
  '周',
  '徐',
  '孙',
  '马',
  '朱',
  '胡',
  '郭',
  '何',
  '林',
  '罗',
  '郑',
  '梁',
  '谢',
  '宋',
  '唐',
  '许',
  '韩',
  '冯',
  '邓',
  '曹',
  '彭',
  '曾',
  '肖',
  '田',
  '董',
  '潘',
  '袁',
  '蔡',
  '蒋',
  '余',
  '杜',
  '叶',
  '程',
  '苏',
  '魏',
  '吕',
  '丁',
  '沈',
  '姚',
  '卢',
  '姜',
] as const

/** 中文男名（约 30 个） */
export const ZH_MALE = [
  '伟',
  '强',
  '磊',
  '军',
  '洋',
  '勇',
  '杰',
  '涛',
  '明',
  '超',
  '刚',
  '平',
  '辉',
  '鹏',
  '华',
  '飞',
  '鑫',
  '波',
  '斌',
  '宇',
  '浩',
  '凯',
  '健',
  '俊杰',
  '志强',
  '建国',
  '国栋',
  '子轩',
  '浩然',
  '宇航',
] as const

/** 中文女名（约 30 个） */
export const ZH_FEMALE = [
  '芳',
  '娜',
  '敏',
  '静',
  '丽',
  '艳',
  '娟',
  '霞',
  '秀英',
  '燕',
  '玲',
  '桂英',
  '丹',
  '萍',
  '红',
  '玉兰',
  '慧',
  '莹',
  '雪',
  '婷',
  '雅静',
  '淑珍',
  '佳丽',
  '雨欣',
  '欣怡',
  '梓涵',
  '诗涵',
  '梦洁',
  '雪梅',
  '倩',
] as const

/** 英文男名（约 30 个） */
export const EN_MALE = [
  'James',
  'John',
  'Robert',
  'Michael',
  'William',
  'David',
  'Richard',
  'Joseph',
  'Thomas',
  'Charles',
  'Christopher',
  'Daniel',
  'Matthew',
  'Anthony',
  'Mark',
  'Donald',
  'Steven',
  'Paul',
  'Andrew',
  'Joshua',
  'Kenneth',
  'Kevin',
  'Brian',
  'George',
  'Edward',
  'Ronald',
  'Timothy',
  'Jason',
  'Ryan',
  'Jacob',
] as const

/** 英文女名（约 30 个） */
export const EN_FEMALE = [
  'Mary',
  'Patricia',
  'Jennifer',
  'Linda',
  'Elizabeth',
  'Barbara',
  'Susan',
  'Jessica',
  'Sarah',
  'Karen',
  'Nancy',
  'Lisa',
  'Betty',
  'Margaret',
  'Sandra',
  'Ashley',
  'Dorothy',
  'Emily',
  'Donna',
  'Michelle',
  'Carol',
  'Amanda',
  'Melissa',
  'Deborah',
  'Stephanie',
  'Rebecca',
  'Sharon',
  'Laura',
  'Cynthia',
  'Kathleen',
] as const

/** 英文姓氏（约 30 个） */
export const EN_SURNAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Miller',
  'Davis',
  'Garcia',
  'Rodriguez',
  'Wilson',
  'Taylor',
  'Martinez',
  'Anderson',
  'Thomas',
  'Moore',
  'Martin',
  'Jackson',
  'Thompson',
  'White',
  'Lopez',
  'Lee',
  'Gonzalez',
  'Harris',
  'Clark',
  'Lewis',
  'Robinson',
  'Walker',
  'Perez',
  'Hall',
  'Young',
] as const

/** 基于 Web Crypto 的 [0,1) 随机数（禁 Math.random） */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 0x100000000
}

/** 从数组随机取一项 */
export function pick<T>(arr: readonly T[], rand: () => number = cryptoRandom): T {
  return arr[Math.floor(rand() * arr.length)]
}

/** 解析数量：空串默认 1；1–MAX_COUNT 整数，否则抛中文错 */
export function parseCount(raw: string | undefined): number {
  const value = (raw ?? '').trim()
  if (value === '') return 1
  if (!/^\d+$/.test(value)) throw new Error(`数量必须为 1 到 ${MAX_COUNT} 之间的整数`)
  const count = Number(value)
  if (count < 1 || count > MAX_COUNT) throw new Error(`数量必须为 1 到 ${MAX_COUNT} 之间的整数`)
  return count
}

/** 解析性别：空串默认 random；非法抛中文错 */
export function parseGender(raw: string | undefined): Gender {
  const value = (raw ?? '').trim()
  if (value === '') return 'random'
  if ((GENDERS as readonly string[]).includes(value)) return value as Gender
  throw new Error('不支持的性别，可选 male / female / random')
}

/** 解析语言：空串默认 zh；非法抛中文错 */
export function parseLanguage(raw: string | undefined): Language {
  const value = (raw ?? '').trim()
  if (value === '') return 'zh'
  if ((LANGUAGES as readonly string[]).includes(value)) return value as Language
  throw new Error('不支持的语言，可选 zh / en')
}

/** 解析当次性别：random 时逐次随机男 / 女 */
export function resolveGender(gender: Gender, rand: () => number): 'male' | 'female' {
  if (gender === 'male') return 'male'
  if (gender === 'female') return 'female'
  return rand() < 0.5 ? 'male' : 'female'
}

/** 生成单个名字 */
export function makeName(
  gender: Gender,
  language: Language,
  rand: () => number = cryptoRandom,
): string {
  const g = resolveGender(gender, rand)
  if (language === 'zh') {
    const surname = pick(ZH_SURNAMES, rand)
    const given = g === 'male' ? pick(ZH_MALE, rand) : pick(ZH_FEMALE, rand)
    return surname + given
  }
  const given = g === 'male' ? pick(EN_MALE, rand) : pick(EN_FEMALE, rand)
  return `${given} ${pick(EN_SURNAMES, rand)}`
}

/** T2 入口：每行一个名字 */
export function transform(input: RandomNameInput, options: RandomNameOptions): string {
  inputSchema.parse(input)
  optionsSchema.parse(options)
  const count = parseCount(options.count)
  const gender = parseGender(options.gender)
  const language = parseLanguage(options.language)
  const lines: string[] = []
  for (let i = 0; i < count; i++) lines.push(makeName(gender, language))
  return lines.join('\n')
}

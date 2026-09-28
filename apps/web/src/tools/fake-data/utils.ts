import { inputSchema, optionsSchema } from './schema'
import type { FakeDataInput, FakeDataOptions } from './schema'

export const MAX_COUNT = 20
export const FIELD_TYPES = [
  'name',
  'email',
  'phone',
  'address',
  'idcard',
  'company',
  'ip',
  'date',
  'username',
  'uuid',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]
export const LANGUAGES = ['zh', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
export const FORMATS = ['json', 'lines'] as const
export type OutputFormat = (typeof FORMATS)[number]

/* ------------------------------ 内置词库 ------------------------------ */

const ZH_SURNAMES = [
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
]
const ZH_MALE = [
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
  '浩',
  '宇',
  '凯',
  '健',
  '鹏',
]
const ZH_FEMALE = [
  '芳',
  '娜',
  '敏',
  '静',
  '丽',
  '艳',
  '娟',
  '霞',
  '燕',
  '玲',
  '丹',
  '萍',
  '雪',
  '婷',
  '欣',
]
const EN_MALE = [
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
]
const EN_FEMALE = [
  'Mary',
  'Patricia',
  'Jennifer',
  'Linda',
  'Elizabeth',
  'Susan',
  'Jessica',
  'Sarah',
  'Karen',
  'Nancy',
]
const EN_SURNAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Miller',
  'Davis',
  'Garcia',
  'Wilson',
  'Taylor',
]

const DOMAINS = [
  'example.com',
  'gmail.com',
  'outlook.com',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
]
const PROVINCES = [
  '北京市',
  '上海市',
  '广东省',
  '江苏省',
  '浙江省',
  '四川省',
  '山东省',
  '河南省',
  '湖北省',
  '湖南省',
]
const CITIES = [
  '北京市',
  '上海市',
  '广州市',
  '深圳市',
  '南京市',
  '杭州市',
  '成都市',
  '济南市',
  '郑州市',
  '武汉市',
]
const DISTRICTS = [
  '朝阳区',
  '海淀区',
  '浦东新区',
  '天河区',
  '南山区',
  '鼓楼区',
  '西湖区',
  '武侯区',
  '历下区',
  '金水区',
]
const STREETS = [
  '中山路',
  '解放大道',
  '人民路',
  '建设街',
  '和平路',
  '青年路',
  '文化街',
  '科技大道',
  '滨江路',
  '学府路',
]
const STREETS_EN = [
  'Main St',
  'Oak Ave',
  'Pine Rd',
  'Maple Dr',
  'Cedar Ln',
  'Sunset Blvd',
  'Elm St',
  'Washington Ave',
]
const CITIES_EN = [
  'Springfield',
  'Riverside',
  'Fairview',
  'Greenville',
  'Madison',
  'Georgetown',
  'Franklin',
  'Bristol',
]
const STATES_EN = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'MA', 'CO']
const COMPANY_PREFIX_ZH = ['华', '中', '新', '恒', '金', '宏', '博', '天', '瑞', '东方']
const COMPANY_INDUSTRY_ZH = [
  '科技',
  '贸易',
  '建筑',
  '食品',
  '电子',
  '机械',
  '医药',
  '文化传媒',
  '环保',
  '物流',
]
const COMPANY_PREFIX_EN = [
  'Acme',
  'Global',
  'Northern',
  'Summit',
  'Blue',
  'Redwood',
  'Vertex',
  'Apex',
]
const COMPANY_INDUSTRY_EN = ['Tech', 'Solutions', 'Industries', 'Labs', 'Group', 'Dynamics']
const ID_REGIONS = [
  '110101',
  '310104',
  '440305',
  '320102',
  '330106',
  '510107',
  '370102',
  '410105',
  '420106',
  '430104',
]

/* ------------------------------ 随机工具 ------------------------------ */

/** 基于 Web Crypto 的 [0,1) 随机数（禁 Math.random） */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 0x100000000
}

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

function digit(rand: () => number): number {
  return Math.floor(rand() * 10)
}

/* ------------------------------ 各字段生成器 ------------------------------ */

export function genName(lang: Language, rand: () => number): string {
  if (lang === 'zh') {
    const given = rand() < 0.5 ? pick(ZH_MALE, rand) : pick(ZH_FEMALE, rand)
    return pick(ZH_SURNAMES, rand) + given
  }
  const given = rand() < 0.5 ? pick(EN_MALE, rand) : pick(EN_FEMALE, rand)
  return `${given} ${pick(EN_SURNAMES, rand)}`
}

export function genEmail(rand: () => number): string {
  const given = (rand() < 0.5 ? pick(EN_MALE, rand) : pick(EN_FEMALE, rand)).toLowerCase()
  const num = Math.floor(rand() * 9000) + 100
  return `${given}${num}@${pick(DOMAINS, rand)}`
}

export function genPhone(lang: Language, rand: () => number): string {
  if (lang === 'zh') {
    const lead = 10 + Math.floor(rand() * 9) // 13x–19x
    let rest = ''
    for (let i = 0; i < 8; i++) rest += digit(rand)
    return `1${lead} ${rest.slice(0, 4)} ${rest.slice(4)}`
  }
  const a = 200 + Math.floor(rand() * 800)
  const b = 200 + Math.floor(rand() * 800)
  const c = Math.floor(rand() * 10000)
  return `${a}-${b}-${String(c).padStart(4, '0')}`
}

export function genAddress(lang: Language, rand: () => number): string {
  if (lang === 'zh') {
    return `${pick(PROVINCES, rand)}${pick(CITIES, rand)}${pick(DISTRICTS, rand)}${pick(STREETS, rand)}${
      Math.floor(rand() * 900) + 1
    }号`
  }
  return `${Math.floor(rand() * 9000) + 1} ${pick(STREETS_EN, rand)}, ${pick(CITIES_EN, rand)}, ${pick(
    STATES_EN,
    rand,
  )} ${Math.floor(rand() * 90000) + 10000}`
}

/** 身份证 18 位：前 17 位 + GB 11643 校验位 */
export function genIdCard(rand: () => number): string {
  const region = pick(ID_REGIONS, rand)
  const year = 1960 + Math.floor(rand() * 46)
  const month = 1 + Math.floor(rand() * 12)
  const day = 1 + Math.floor(rand() * 28)
  const seq = Math.floor(rand() * 1000)
  const body = `${region}${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(
    seq,
  ).padStart(3, '0')}`
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = '10X98765432'
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(body[i]) * weights[i]
  return body + codes[sum % 11]
}

export function genCompany(lang: Language, rand: () => number): string {
  if (lang === 'zh') {
    return `${pick(COMPANY_PREFIX_ZH, rand)}${pick(COMPANY_INDUSTRY_ZH, rand)}有限公司`
  }
  return `${pick(COMPANY_PREFIX_EN, rand)} ${pick(COMPANY_INDUSTRY_EN, rand)} Inc.`
}

export function genIp(rand: () => number): string {
  return `${Math.floor(rand() * 255) + 1}.${Math.floor(rand() * 256)}.${Math.floor(rand() * 256)}.${
    Math.floor(rand() * 254) + 1
  }`
}

/** 近 5 年内的随机日期（ISO yyyy-mm-dd） */
export function genDate(rand: () => number): string {
  const now = Date.now()
  const fiveYears = 5 * 365 * 24 * 3600 * 1000
  const t = now - rand() * fiveYears
  const d = new Date(t)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function genUsername(rand: () => number): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  let s = letters[Math.floor(rand() * letters.length)]
  const len = 5 + Math.floor(rand() * 5)
  for (let i = 0; i < len; i++) {
    if (rand() < 0.5) s += letters[Math.floor(rand() * letters.length)]
    else s += Math.floor(rand() * 10)
  }
  return s
}

export function genUuid(): string {
  return crypto.randomUUID()
}

/* ------------------------------ 解析与入口 ------------------------------ */

/** 解析字段类型列表：空输入返回空数组（调用方输出 ''） */
export function parseFields(text: string): FieldType[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  for (const line of lines) {
    if (!(FIELD_TYPES as readonly string[]).includes(line)) {
      throw new Error(`不支持的字段类型：${line}，可选 ${FIELD_TYPES.join(' / ')}`)
    }
  }
  return lines as FieldType[]
}

export function parseCount(raw: string | undefined): number {
  const value = (raw ?? '').trim()
  if (value === '') return 1
  if (!/^\d+$/.test(value)) throw new Error(`数量必须为 1 到 ${MAX_COUNT} 之间的整数`)
  const count = Number(value)
  if (count < 1 || count > MAX_COUNT) throw new Error(`数量必须为 1 到 ${MAX_COUNT} 之间的整数`)
  return count
}

export function parseLanguage(raw: string | undefined): Language {
  const value = (raw ?? '').trim()
  if (value === '') return 'zh'
  if ((LANGUAGES as readonly string[]).includes(value)) return value as Language
  throw new Error('不支持的语言，可选 zh / en')
}

export function parseFormat(raw: string | undefined): OutputFormat {
  const value = (raw ?? '').trim()
  if (value === '') return 'json'
  if ((FORMATS as readonly string[]).includes(value)) return value as OutputFormat
  throw new Error('不支持的输出格式，可选 json / lines')
}

/** 按字段类型生成一行记录 */
export function genRecord(
  fields: FieldType[],
  lang: Language,
  rand: () => number = cryptoRandom,
): Record<string, string> {
  const rec: Record<string, string> = {}
  for (const field of fields) {
    switch (field) {
      case 'name':
        rec[field] = genName(lang, rand)
        break
      case 'email':
        rec[field] = genEmail(rand)
        break
      case 'phone':
        rec[field] = genPhone(lang, rand)
        break
      case 'address':
        rec[field] = genAddress(lang, rand)
        break
      case 'idcard':
        rec[field] = genIdCard(rand)
        break
      case 'company':
        rec[field] = genCompany(lang, rand)
        break
      case 'ip':
        rec[field] = genIp(rand)
        break
      case 'date':
        rec[field] = genDate(rand)
        break
      case 'username':
        rec[field] = genUsername(rand)
        break
      case 'uuid':
        rec[field] = genUuid()
        break
    }
  }
  return rec
}

/** T2 入口：空字段列表返回 ''；否则按格式输出 */
export function transform(input: FakeDataInput, options: FakeDataOptions): string {
  inputSchema.parse(input)
  optionsSchema.parse(options)
  const fields = parseFields(input.text)
  if (fields.length === 0) return ''
  const count = parseCount(options.count)
  const lang = parseLanguage(options.language)
  const format = parseFormat(options.format)
  const rows: Record<string, string>[] = []
  for (let i = 0; i < count; i++) rows.push(genRecord(fields, lang))
  if (format === 'lines') return rows.map((r) => JSON.stringify(r)).join('\n')
  return JSON.stringify(rows, null, 2)
}

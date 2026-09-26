import type { MockDataInput, MockDataOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class MockDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MockDataError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 20_000

/** count 的保护上限：即便绕过 select，也不让生成上万行把页面写死 */
const MAX_COUNT = 200

/** 随机数发生器：只要 next() ∈ [0,1)，便于单测时换成固定桩 */
export interface Rng {
  next(): number
}

/** mulberry32：32 位状态、统计性质够好且实现只有几行，适合生成器这类场景 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

/** FNV-1a 32 位：把模板文本折成一个整数种子，同文本必同种子 */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** 按 options 造 RNG：stable 时种子只由模板内容决定 */
export function makeRng(template: string, options: MockDataOptions): Rng {
  return options.stable ? createRng(seedFrom(template)) : createRng((Math.random() * 2 ** 32) >>> 0)
}

/** 整数 [min,max]（含端点） */
export function randomInt(rng: Rng, min: number, max: number): number {
  const low = Math.ceil(Math.min(min, max))
  const high = Math.floor(Math.max(min, max))
  return low + Math.floor(rng.next() * (high - low + 1))
}

/** 保留 digits 位小数的浮点数 */
export function randomFloat(rng: Rng, min: number, max: number, digits: number): number {
  const value = min + rng.next() * (max - min)
  const factor = 10 ** Math.max(0, Math.min(8, Math.floor(digits)))
  return Math.round(value * factor) / factor
}

/** 从数组里取一个 */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(rng.next() * items.length)]
}

/** 逐池取词拼接：姓名、公司名这类复合字段用它 */
function combine(rng: Rng, pools: readonly (readonly string[])[]): string {
  let out = ''
  for (const pool of pools) out += pick(rng, pool) ?? ''
  return out
}

/** 解析 token 参数：`@number(18, 60)` → ['18','60']；没有括号时返回空元组 */
export function parseArgs(raw: string): readonly string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

/** 取第 i 个参数并转成数字，缺省用给定默认值 */
function numberArg(args: readonly string[], index: number, fallback: number): number {
  const value = Number(args[index])
  return Number.isFinite(value) ? value : fallback
}

// ---------------------------------------------------------------------------
// 词库（中文优先；覆盖范围的限制见 README）
// ---------------------------------------------------------------------------

const SURNAMES = [
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
  '高',
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
]

const GIVEN_SINGLE = [
  '伟',
  '芳',
  '娜',
  '敏',
  '静',
  '丽',
  '强',
  '磊',
  '军',
  '洋',
  '勇',
  '艳',
  '杰',
  '娟',
  '涛',
  '明',
  '超',
  '霞',
  '平',
  '刚',
  '云',
  '文',
  '华',
  '琳',
  '宇',
]

const GIVEN_DOUBLE = [
  '建国',
  '文轩',
  '雨桐',
  '思远',
  '梦琪',
  '子豪',
  '佳怡',
  '泽宇',
  '浩然',
  '若曦',
  '秀英',
  '宇轩',
  '芯怡',
  '慕白',
]

const EN_FIRST = [
  'James',
  'Mary',
  'Robert',
  'Linda',
  'Michael',
  'Emma',
  'David',
  'Olivia',
  'Daniel',
  'Sophia',
  'Henry',
  'Ava',
  'Lucas',
  'Mia',
  'Ethan',
  'Chloe',
  'Noah',
  'Zoe',
]

const EN_LAST = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Miller',
  'Davis',
  'Wilson',
  'Anderson',
  'Taylor',
  'Moore',
  'Clark',
  'Lewis',
  'Walker',
  'Hall',
]

const DOMAINS = ['example.com', 'gmail.com', 'outlook.com', 'qq.com', '163.com', 'hotmail.com']

const PROVINCES = [
  '北京市',
  '上海市',
  '广东省',
  '江苏省',
  '浙江省',
  '四川省',
  '湖北省',
  '陕西省',
  '福建省',
  '山东省',
]

const CITIES = [
  '海淀区',
  '朝阳区',
  '浦东新区',
  '徐汇区',
  '天河区',
  '南山区',
  '鼓楼区',
  '西湖区',
  '武侯区',
  '思明区',
  '中关村',
  '科技园',
  '滨江区',
  '雨花区',
  '番禺区',
]

const STREETS = [
  '中山路',
  '人民路',
  '解放大道',
  '南京东路',
  '文化街',
  '建设路',
  '望江路',
  '科苑路',
  '长虹大道',
  '和平路',
]

const COMPANY_PREFIX = [
  '星辰',
  '云图',
  '博远',
  '恒信',
  '鼎峰',
  '启明',
  '天工',
  '智联',
  '海纳',
  '同方',
]

const COMPANY_INDUSTRY = ['科技', '网络', '数据', '智能', '软件', '信息', '数字', '能源']

const COMPANY_SUFFIX = ['有限公司', '股份有限公司', '技术有限公司', '（集团）有限公司']

const TLDS = ['com', 'net', 'org', 'io', 'cn', 'dev']

const WORDS = [
  '数据',
  '接口',
  '缓存',
  '服务',
  '任务',
  '队列',
  '索引',
  '日志',
  '权限',
  '配置',
  '流程',
  '模板',
  '指标',
  '报表',
  '容器',
  '网关',
  '节点',
  '版本',
  '依赖',
  '事件',
]

const DEPARTMENTS = ['研发部', '产品部', '测试部', '运维部', '设计部', '市场部', '销售部', '客服部']

const TITLES = ['工程师', '高级工程师', '架构师', '产品经理', '测试工程师', '技术总监', '设计师']

const LOREM = [
  '这是一段用于填充接口的示例文本，不含真实业务含义。',
  '系统会在超时后自动重试三次，并把失败原因写入审计日志。',
  '为保证数据一致性，写操作在同一事务内完成。',
  '返回体中每个字段都有明确的类型说明与取值范围。',
  '调用方需要在请求头中携带有效的访问令牌。',
]

// ---------------------------------------------------------------------------
// 占位符实现
// ---------------------------------------------------------------------------

/** 生成上下文：`index` 是当前行的序号（从 0 开始），`@id` 这类要用 */
export interface GenContext {
  readonly rng: Rng
  readonly index: number
}

/** 一个占位符的实现 */
export interface TokenDef {
  /** 帮助信息，报错时列出可用占位符用 */
  readonly desc: string
  readonly build: (ctx: GenContext, args: readonly string[]) => unknown
}

/** 两位数字、月、日、时分秒统一补零 */
function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

/** 日期格式化 YYYY-MM-DD */
function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** 时间格式化 HH:mm:ss */
function formatTime(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}

/** 由参数取时间范围：默认与 @ 自身默认跨度一致（最近 365 天） */
const BASE_TIME = Date.UTC(2023, 0, 1)

function dateRange(ctx: GenContext, args: readonly string[]): Date {
  const spanDays = numberArg(args, 0, 365)
  const offset = Math.floor(ctx.rng.next() * Math.max(1, spanDays) * 86400_000)
  return new Date(BASE_TIME + offset)
}

/** UUID v4：分组写成标准的 8-4-4-4-12，版本号位固定为 4、变体位落在 8–b */
function uuid(ctx: GenContext): string {
  const group = (length: number): string => {
    let out = ''
    for (let i = 0; i < length; i += 1) out += Math.floor(ctx.rng.next() * 16).toString(16)
    return out
  }
  const variant = (ctx.rng.next() * 4 + 8).toString(16)
  return [group(8), group(4), `4${group(3)}`, `${variant[0]}${group(3)}`, group(12)].join('-')
}

/** 占位符注册表：键一律小写，取用时再 lower */
const TOKEN_LIST: Readonly<Record<string, TokenDef>> = {
  name: {
    desc: '英文姓名，如 James Smith',
    build: (ctx) => `${pick(ctx.rng, EN_FIRST)} ${pick(ctx.rng, EN_LAST)}`,
  },
  cname: {
    desc: '中文姓名，如 张伟',
    build: (ctx) =>
      ctx.rng.next() < 0.7
        ? `${pick(ctx.rng, SURNAMES)}${pick(ctx.rng, GIVEN_SINGLE)}`
        : `${pick(ctx.rng, SURNAMES)}${pick(ctx.rng, GIVEN_DOUBLE)}`,
  },
  firstname: { desc: '中文姓氏（向后兼容的别名）', build: (ctx) => pick(ctx.rng, SURNAMES) },
  surname: { desc: '中文姓氏', build: (ctx) => pick(ctx.rng, SURNAMES) },
  lastname: { desc: '中文名（单字）', build: (ctx) => pick(ctx.rng, GIVEN_SINGLE) },
  givenname: { desc: '中文名（双字）', build: (ctx) => pick(ctx.rng, GIVEN_DOUBLE) },
  email: {
    desc: '邮箱地址',
    build: (ctx) => {
      const user = ['linda', 'neo', 'kite', 'amber', 'reece', 'yuki'][
        Math.floor(ctx.rng.next() * 6)
      ]
      return `${user}${randomInt(ctx.rng, 100, 999)}@${pick(ctx.rng, DOMAINS)}`
    },
  },
  phone: {
    desc: '中国手机号 1[3-9]xxxxxxxxx',
    build: (ctx) => {
      const prefix = pick(ctx.rng, ['3', '5', '7', '8', '9'])
      let rest = ''
      for (let i = 0; i < 9; i += 1) rest += String(randomInt(ctx.rng, 0, 9))
      return `1${prefix}${rest}`
    },
  },
  telephone: {
    desc: '座机号 0XX-XXXXXXX',
    build: (ctx) => `0${randomInt(ctx.rng, 10, 99)}-${randomInt(ctx.rng, 1_000_000, 9_999_999)}`,
  },
  address: {
    desc: '中文地址（省市区 + 街道 + 门牌）',
    build: (ctx) =>
      `${pick(ctx.rng, PROVINCES)}${pick(ctx.rng, CITIES)}${pick(ctx.rng, STREETS)}${randomInt(
        ctx.rng,
        1,
        999,
      )}号`,
  },
  province: { desc: '省级行政区', build: (ctx) => pick(ctx.rng, PROVINCES) },
  city: { desc: '城市 / 区', build: (ctx) => pick(ctx.rng, CITIES) },
  street: { desc: '街道名', build: (ctx) => pick(ctx.rng, STREETS) },
  company: {
    desc: '公司名',
    build: (ctx) => combine(ctx.rng, [COMPANY_PREFIX, COMPANY_INDUSTRY, COMPANY_SUFFIX]),
  },
  department: { desc: '部门名', build: (ctx) => pick(ctx.rng, DEPARTMENTS) },
  title: { desc: '职位名', build: (ctx) => pick(ctx.rng, TITLES) },
  date: {
    desc: '日期 YYYY-MM-DD，参数可给跨度天数',
    build: (ctx, args) => formatDate(dateRange(ctx, args)),
  },
  datetime: {
    desc: '日期时间 YYYY-MM-DD HH:mm:ss',
    build: (ctx, args) => {
      const base = dateRange(ctx, args)
      const seconds = randomInt(ctx.rng, 0, 86_399)
      return `${formatDate(base)} ${formatTime(new Date(base.getTime() + seconds * 1000))}`
    },
  },
  time: { desc: '时间 HH:mm:ss', build: (ctx) => formatTime(dateRange(ctx, ['1'])) },
  timestamp: {
    desc: 'Unix 毫秒时间戳',
    build: (ctx, args) => dateRange(ctx, args).getTime(),
  },
  number: {
    desc: '整数或浮点，参数为 min,max,digits',
    build: (ctx, args) => {
      const digits = args.length >= 3 ? numberArg(args, 2, 0) : 0
      const min = numberArg(args, 0, 0)
      const max = numberArg(args, 1, digits > 0 ? 100 : 1000)
      return digits > 0 ? randomFloat(ctx.rng, min, max, digits) : randomInt(ctx.rng, min, max)
    },
  },
  int: {
    desc: '同 @number',
    build: (ctx, args) => randomInt(ctx.rng, numberArg(args, 0, 0), numberArg(args, 1, 1000)),
  },
  float: {
    desc: '浮点数，参数为 min,max,digits',
    build: (ctx, args) =>
      randomFloat(ctx.rng, numberArg(args, 0, 0), numberArg(args, 1, 100), numberArg(args, 2, 2)),
  },
  boolean: { desc: '布尔值', build: (ctx) => ctx.rng.next() < 0.5 },
  uuid: { desc: 'UUID v4', build: (ctx) => uuid(ctx) },
  id: { desc: '行序号，从 1 开始', build: (ctx) => ctx.index + 1 },
  index: { desc: '行序号，从 0 开始', build: (ctx) => ctx.index },
  url: {
    desc: 'URL',
    build: (ctx) => {
      const host = pick(ctx.rng, DOMAINS) ?? 'example.com'
      return `https://${host.split('.')[0]}.${pick(ctx.rng, TLDS)}/${randomInt(ctx.rng, 100, 999)}`
    },
  },
  ip: {
    desc: 'IPv4 地址',
    build: (ctx) => [0, 1, 2, 3].map(() => String(randomInt(ctx.rng, 1, 254))).join('.'),
  },
  ipv6: {
    desc: 'IPv6 地址（简化写法）',
    build: (ctx) =>
      [0, 1, 2, 3, 4, 5, 6, 7].map(() => randomInt(ctx.rng, 0, 0xffff).toString(16)).join(':'),
  },
  word: { desc: '一个技术名词', build: (ctx) => pick(ctx.rng, WORDS) },
  sentence: {
    desc: '一句中文示例文本',
    build: (ctx) => pick(ctx.rng, LOREM) ?? '',
  },
  paragraph: {
    desc: '一段中文示例文本（2–4 句）',
    build: (ctx) => {
      const count = randomInt(ctx.rng, 2, 4)
      const parts: string[] = []
      for (let i = 0; i < count; i += 1) parts.push(pick(ctx.rng, LOREM) ?? '')
      return parts.join('')
    },
  },
  username: {
    desc: '小写字母用户名',
    build: (ctx) => `${pick(ctx.rng, EN_FIRST)?.toLowerCase()}_${randomInt(ctx.rng, 100, 999)}`,
  },
  gender: { desc: '性别：男 / 女', build: (ctx) => (ctx.rng.next() < 0.5 ? '男' : '女') },
  hex: {
    desc: '十六进制串，参数为字符数量',
    build: (ctx, args) => {
      const length = Math.max(1, Math.min(64, numberArg(args, 0, 8)))
      let out = ''
      for (let i = 0; i < length; i += 1) out += randomInt(ctx.rng, 0, 15).toString(16)
      return out
    },
  },
  pick: {
    desc: '从给定候选里随机取一个，如 @pick(男|女)',
    build: (ctx, args) => {
      const candidates = args[0]?.split(/[|/]/).filter((item) => item !== '') ?? []
      if (candidates.length === 0)
        throw new MockDataError('@pick 至少要给一个候选值，如 @pick(男|女)')
      return pick(ctx.rng, candidates)
    },
  },
  skip: { desc: '生成 null', build: () => null },
}

/** 占位符查表用的 Map */
const TOKENS = new Map<string, TokenDef>(Object.entries(TOKEN_LIST))

/** 所有占位符名，报错时列出给用户看 */
export function tokenNames(): readonly string[] {
  return [...TOKENS.keys()].sort()
}

/** `@name`、`@number(1,10)` 这类占位符 */
const TOKEN_PATTERN = /@([a-z_][a-z0-9_]*)(?:\(([^)]*)\))?/gi

/**
 * 解析一个字符串：遍历其中的占位符做替换。
 * 整串只有一个占位符时直接返回生成器产出的值 —— 于是 `"age": "@number(18,60)"`
 * 得到的是 JSON 数字而不是 `"42"`，布尔同理。
 */
export function resolveString(text: string, ctx: GenContext): unknown {
  const tokens = [...text.matchAll(TOKEN_PATTERN)]
  if (tokens.length === 0) return text

  const only = tokens[0]
  if (tokens.length === 1 && (only?.[0] ?? '').length === text.length) {
    const name = (only?.[1] ?? '').toLowerCase()
    const def = TOKENS.get(name)
    if (!def) throw unknownToken(name)
    return def.build(ctx, parseArgs(only?.[2] ?? ''))
  }

  // 混合文本：认不出的 @xxx 原样保留（`user@example.com` 这类字面量不能被当成占位符而报错）
  let out = ''
  let cursor = 0
  for (const match of tokens) {
    const name = (match[1] ?? '').toLowerCase()
    const def = TOKENS.get(name)
    if (!def) continue
    const value = def.build(ctx, parseArgs(match[2] ?? ''))
    const at = match.index ?? 0
    out += text.slice(cursor, at) + String(value ?? '')
    cursor = at + (match[0]?.length ?? 0)
  }
  return out + text.slice(cursor)
}

/** 未知占位符的统一报错：顺带列出可用的名字，省得来回翻 README */
function unknownToken(name: string): MockDataError {
  return new MockDataError(`未知的占位符 @${name}。可用占位符：${tokenNames().join('、')}`)
}

/** 递归套用模板：字符串交给 resolveString，容器结构照原样重建 */
export function fillTemplate(node: unknown, ctx: GenContext): unknown {
  if (typeof node === 'string') return resolveString(node, ctx)
  if (Array.isArray(node)) return node.map((item) => fillTemplate(item, ctx))
  if (node !== null && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      // 键名也支持占位符，便于造「每条数据的 key 不同」的场景
      const resolvedKey = String(resolveString(key, ctx) ?? key)
      out[resolvedKey] = fillTemplate(value, ctx)
    }
    return out
  }
  return node
}

/**
 * 内置演示模板的内容：Tool.tsx 的「示例」用它，README 里的示例也照抄这段。
 * 放在 utils 里是为了让单测与组件共用同一份写法，避免示例漂移。
 */
export const DEFAULT_TEMPLATE: Readonly<Record<string, string>> = {
  id: '@uuid',
  name: '@cname',
  email: '@email',
  phone: '@phone',
  gender: '@pick(男|女)',
  age: '@number(18,60)',
  city: '@city',
  address: '@address',
  company: '@company',
  score: '@float(0,100,1)',
  vip: '@boolean',
  createdAt: '@datetime',
}

/** 生成 count 条数据 */
export function generate(templateText: string, options: MockDataOptions): readonly unknown[] {
  const trimmed = templateText.trim()
  let template: unknown
  try {
    template = JSON.parse(trimmed)
  } catch {
    throw new MockDataError('模板不是合法的 JSON，请检查引号与逗号')
  }

  const count = Math.min(MAX_COUNT, Math.max(1, Number(options.count) || 1))
  const rng = makeRng(trimmed, options)
  const rows: unknown[] = []
  for (let index = 0; index < count; index += 1) {
    rows.push(fillTemplate(template, { rng, index }))
  }
  return rows
}

/**
 * Mock 数据生成 —— 纯函数，不依赖 React / DOM，可独立单测。
 * 空输入返回空串；超长模板按此项目的统一口径抛错。
 */
export function transform(input: MockDataInput, options: MockDataOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new MockDataError('模板超过 20,000 字符上限')
  }
  return JSON.stringify(generate(input.text, options), null, 2)
}

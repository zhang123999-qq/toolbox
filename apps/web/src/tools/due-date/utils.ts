// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import { INPUT_MAX_CHARS, inputSchema, optionsSchema } from './schema'
import type { DueDateInput, DueDateOptions } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class DueDateError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'DueDateError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：DueDateError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof DueDateError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** 一天的毫秒数（UTC 日期加减的步长） */
const MS_PER_DAY = 86_400_000
/** 孕周换算 */
const DAYS_PER_WEEK = 7
/** 历法常量 */
const MONTHS_PER_YEAR = 12
/** 奈格勒规则：末次月经 + 280 天 = 预产期 */
const GESTATION_DAYS = 280
/** 周期长度缺省值（天） */
const DEFAULT_CYCLE_DAYS = 28
/** 周期长度的合理范围（天）：超出视为笔误 */
const MIN_CYCLE_DAYS = 10
const MAX_CYCLE_DAYS = 90
/** 孕期阶段的分界（周） */
const SECOND_TRIMESTER_WEEK = 14
const THIRD_TRIMESTER_WEEK = 28

const TRIMESTER_KEYS = {
  1: 'dueDate.trimester.first',
  2: 'dueDate.trimester.second',
  3: 'dueDate.trimester.third',
} as const

const DATE_RE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

/**
 * 严格解析 YYYY-MM-DD（兼容 YYYY/M/D），一律按 UTC 午夜构造，
 * 避免本地时区 / 夏令时把日期算偏一天。
 */
export function parseDate(text: string): Date {
  const raw = text.trim()
  if (raw === '') throw new DueDateError('dueDate.error.emptyDate')
  const m = DATE_RE.exec(raw)
  if (!m) throw new DueDateError('dueDate.error.invalidDate', { value: raw })
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > MONTHS_PER_YEAR) {
    throw new DueDateError('dueDate.error.dateOutOfRange', { value: raw })
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new DueDateError('dueDate.error.dateOutOfRange', { value: raw })
  }
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatYmd(d: Date): string {
  const pad = (n: number): string => (n < 10 ? '0' + String(n) : String(n))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY)
}

/** a - b 的整天数（UTC，午夜对齐故无小数） */
export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY)
}

/** 今天的 UTC 日期（去掉时分秒，跨时区一致） */
export function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** 解析周期长度：留空=28；须为正整数；超出 10–90 天视为笔误 */
export function parseCycleDays(raw: string): number {
  const s = raw.trim()
  if (s === '') return DEFAULT_CYCLE_DAYS
  if (!/^[0-9]+$/.test(s)) throw new DueDateError('dueDate.error.invalidCycle', { value: s })
  const n = Number(s)
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new DueDateError('dueDate.error.invalidCycle', { value: s })
  }
  if (n < MIN_CYCLE_DAYS || n > MAX_CYCLE_DAYS) {
    throw new DueDateError('dueDate.error.cycleOutOfRange', {
      value: s,
      min: MIN_CYCLE_DAYS,
      max: MAX_CYCLE_DAYS,
    })
  }
  return n
}

export interface DueDateResult {
  readonly lmp: Date
  readonly ref: Date
  readonly cycleDays: number
  /** 相对 28 天标准周期的调整天数（周期-28，可为负） */
  readonly adjustmentDays: number
  readonly edd: Date
  readonly weeks: number
  readonly days: number
  /** 距预产期天数；为负表示已过期 */
  readonly daysLeft: number
  readonly overdue: boolean
  readonly trimester: 1 | 2 | 3
}

/**
 * 预产期计算（纯函数）。
 * 末次月经留空 → 返回 null（上层渲染空态，不报错）。
 */
export function computeDueDate(input: DueDateInput, options: DueDateOptions): DueDateResult | null {
  if (input.text.trim() === '') return null
  if (input.text.length > INPUT_MAX_CHARS) throw new DueDateError('dueDate.error.tooLong')
  inputSchema.parse(input)
  optionsSchema.parse(options)

  const lmp = parseDate(input.text)
  const cycleDays = parseCycleDays(input.cycleLength)
  const adjustmentDays = cycleDays - DEFAULT_CYCLE_DAYS
  const edd = addDays(lmp, GESTATION_DAYS + adjustmentDays)

  const refText = input.textB.trim()
  const ref = refText === '' ? todayUtc() : parseDate(refText)
  const pregnantDays = diffDays(ref, lmp)
  if (pregnantDays < 0) throw new DueDateError('dueDate.error.refBeforeLmp')

  const weeks = Math.floor(pregnantDays / DAYS_PER_WEEK)
  const days = pregnantDays % DAYS_PER_WEEK
  const daysLeft = diffDays(edd, ref)
  const overdue = daysLeft < 0
  const trimester: 1 | 2 | 3 =
    weeks < SECOND_TRIMESTER_WEEK ? 1 : weeks < THIRD_TRIMESTER_WEEK ? 2 : 3
  return { lmp, ref, cycleDays, adjustmentDays, edd, weeks, days, daysLeft, overdue, trimester }
}

/** 结果的纯文本版本（复制 / 下载用），双语由 t 决定 */
export function formatDueDate(result: DueDateResult, t: Translate): string {
  const lines = [
    `${t('dueDate.label.lmp')}：${formatYmd(result.lmp)}`,
    `${t('dueDate.label.cycleLength')}：${t('dueDate.unit.days', { days: result.cycleDays })}`,
    `${t('dueDate.label.edd')}：${formatYmd(result.edd)}`,
    `${t('dueDate.label.gestationalAge')}：${t('dueDate.text.gestationalAge', { weeks: result.weeks, days: result.days })}`,
    `${t('dueDate.label.daysLeft')}：${
      result.overdue
        ? t('dueDate.text.overdue', { days: -result.daysLeft })
        : t('dueDate.text.daysLeft', { days: result.daysLeft })
    }`,
    `${t('dueDate.label.trimester')}：${t(TRIMESTER_KEYS[result.trimester])}`,
  ]
  if (result.adjustmentDays !== 0) {
    lines.push(
      t('dueDate.text.cycleAdjusted', {
        cycle: result.cycleDays,
        adjustment: result.adjustmentDays,
      }),
    )
  }
  return lines.join('\n')
}

/**
 * T2/T3 模板的同步入口：空输入返回 ''，非法输入抛本地化后的 Error。
 * t 由调用方显式传入（Tool 传 useTranslate()，单测传 createTranslator('zh'/'en')）。
 */
export function transform(input: DueDateInput, options: DueDateOptions, t: Translate): string {
  try {
    const result = computeDueDate(input, options)
    if (!result) return ''
    return formatDueDate(result, t)
  } catch (error) {
    throw new Error(localizeError(error, t), { cause: error })
  }
}

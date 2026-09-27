// 纯函数模块：只做 import type，不引入 i18n 的 React runtime
import type { MessageKey, MessageParams, Translate } from '../../i18n'
import { INPUT_MAX_CHARS, inputSchema, optionsSchema } from './schema'
import type { OvulationInput, OvulationOptions } from './schema'

/** 输入非法时抛出；UI 层用 t(key, params) 翻译后展示，保证中英双语 */
export class OvulationError extends Error {
  readonly key: MessageKey
  readonly params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(key)
    this.name = 'OvulationError'
    this.key = key
    this.params = params
  }
}

/** 把未知错误转为本地化文案：OvulationError 走 i18n，其余原样展示 */
export function localizeError(error: unknown, t: Translate): string {
  if (error instanceof OvulationError) return t(error.key, error.params)
  return error instanceof Error ? error.message : String(error)
}

/** 一天的毫秒数（UTC 日期加减的步长） */
const MS_PER_DAY = 86_400_000
/** 历法常量 */
const MONTHS_PER_YEAR = 12
/** 黄体期长度：排卵通常发生在下次月经前 14 天 */
const LUTEAL_PHASE_DAYS = 14
/** 易孕期：排卵日前 5 天至排卵日后 1 天（含精子存活期） */
const FERTILE_DAYS_BEFORE = 5
const FERTILE_DAYS_AFTER = 1
/** 周期长度缺省值（天） */
const DEFAULT_CYCLE_DAYS = 28
/** 周期长度的合理范围（天）：超出视为笔误 */
const MIN_CYCLE_DAYS = 10
const MAX_CYCLE_DAYS = 90
/** 常规周期范围（天）：超出则提示异常而非报错 */
const MIN_NORMAL_CYCLE_DAYS = 21
const MAX_NORMAL_CYCLE_DAYS = 35
/** 月经期按前 5 天估算 */
const MENSTRUAL_DAYS = 5

const PHASE_KEYS = {
  menstrual: 'ovulation.phase.menstrual',
  follicular: 'ovulation.phase.follicular',
  fertile: 'ovulation.phase.fertile',
  luteal: 'ovulation.phase.luteal',
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
  if (raw === '') throw new OvulationError('ovulation.error.emptyDate')
  const m = DATE_RE.exec(raw)
  if (!m) throw new OvulationError('ovulation.error.invalidDate', { value: raw })
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > MONTHS_PER_YEAR) {
    throw new OvulationError('ovulation.error.dateOutOfRange', { value: raw })
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new OvulationError('ovulation.error.dateOutOfRange', { value: raw })
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
  if (!/^[0-9]+$/.test(s)) throw new OvulationError('ovulation.error.invalidCycle', { value: s })
  const n = Number(s)
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new OvulationError('ovulation.error.invalidCycle', { value: s })
  }
  if (n < MIN_CYCLE_DAYS || n > MAX_CYCLE_DAYS) {
    throw new OvulationError('ovulation.error.cycleOutOfRange', {
      value: s,
      min: MIN_CYCLE_DAYS,
      max: MAX_CYCLE_DAYS,
    })
  }
  return n
}

/** 周期阶段 */
export type CyclePhase = 'menstrual' | 'follicular' | 'fertile' | 'luteal'

export function phaseLabelKey(phase: CyclePhase): MessageKey {
  return PHASE_KEYS[phase]
}

export interface OvulationResult {
  readonly lmp: Date
  readonly ref: Date
  readonly cycleDays: number
  /** 参考日期所在周期的起始日 */
  readonly cycleStart: Date
  /** 参考日期是该周期的第几天（从 1 开始） */
  readonly cycleDay: number
  readonly ovulationDate: Date
  readonly fertileStart: Date
  readonly fertileEnd: Date
  readonly nextPeriodDate: Date
  /** 距排卵天数：>0 未到，=0 今天，<0 已过 */
  readonly daysToOvulation: number
  readonly phase: CyclePhase
  /** 周期 <21 或 >35 天 */
  readonly abnormalCycle: boolean
}

/** 按参考日期落在的区间判定阶段 */
function phaseOf(
  cycleDay: number,
  ref: Date,
  fertileStart: Date,
  fertileEnd: Date,
  ovulationDate: Date,
): CyclePhase {
  if (cycleDay <= MENSTRUAL_DAYS) return 'menstrual'
  const t = ref.getTime()
  if (t >= fertileStart.getTime() && t <= fertileEnd.getTime()) return 'fertile'
  if (t > ovulationDate.getTime()) return 'luteal'
  return 'follicular'
}

/**
 * 排卵期计算（纯函数）。
 * 末次月经留空 → 返回 null（上层渲染空态，不报错）。
 */
export function computeOvulation(
  input: OvulationInput,
  options: OvulationOptions,
): OvulationResult | null {
  if (input.text.trim() === '') return null
  if (input.text.length > INPUT_MAX_CHARS) throw new OvulationError('ovulation.error.tooLong')
  inputSchema.parse(input)
  optionsSchema.parse(options)

  const lmp = parseDate(input.text)
  const cycleDays = parseCycleDays(input.cycleLength)

  const refText = input.textB.trim()
  const ref = refText === '' ? todayUtc() : parseDate(refText)
  const sinceLmp = diffDays(ref, lmp)
  if (sinceLmp < 0) throw new OvulationError('ovulation.error.refBeforeLmp')

  // 参考日期落在第几个周期（从末次月经起算）
  const cycleStart = addDays(lmp, Math.floor(sinceLmp / cycleDays) * cycleDays)
  const cycleDay = diffDays(ref, cycleStart) + 1
  const ovulationDate = addDays(cycleStart, cycleDays - LUTEAL_PHASE_DAYS)
  const fertileStart = addDays(ovulationDate, -FERTILE_DAYS_BEFORE)
  const fertileEnd = addDays(ovulationDate, FERTILE_DAYS_AFTER)
  const nextPeriodDate = addDays(cycleStart, cycleDays)
  const daysToOvulation = diffDays(ovulationDate, ref)
  const phase = phaseOf(cycleDay, ref, fertileStart, fertileEnd, ovulationDate)
  const abnormalCycle = cycleDays < MIN_NORMAL_CYCLE_DAYS || cycleDays > MAX_NORMAL_CYCLE_DAYS
  return {
    lmp,
    ref,
    cycleDays,
    cycleStart,
    cycleDay,
    ovulationDate,
    fertileStart,
    fertileEnd,
    nextPeriodDate,
    daysToOvulation,
    phase,
    abnormalCycle,
  }
}

/** 距排卵文案：未到 / 今天 / 已过 */
export function daysToOvulationText(days: number, t: Translate): string {
  if (days > 0) return t('ovulation.text.daysToOvulation', { days })
  if (days === 0) return t('ovulation.text.ovulationToday')
  return t('ovulation.text.ovulationPassed', { days: -days })
}

/** 结果的纯文本版本（复制 / 下载用），双语由 t 决定 */
export function formatOvulation(result: OvulationResult, t: Translate): string {
  const lines = [
    `${t('ovulation.label.lmp')}：${formatYmd(result.lmp)}`,
    `${t('ovulation.label.cycleLength')}：${t('dueDate.unit.days', { days: result.cycleDays })}`,
    `${t('ovulation.label.ovulationDate')}：${formatYmd(result.ovulationDate)}`,
    `${t('ovulation.label.fertileWindow')}：${t('ovulation.text.fertileRange', {
      start: formatYmd(result.fertileStart),
      end: formatYmd(result.fertileEnd),
    })}`,
    `${t('ovulation.label.nextPeriod')}：${formatYmd(result.nextPeriodDate)}`,
    `${t('ovulation.label.phase')}：${t(phaseLabelKey(result.phase))}（${t(
      'ovulation.text.cycleDay',
      { day: result.cycleDay },
    )}）`,
    `${t('ovulation.label.daysToOvulation')}：${daysToOvulationText(result.daysToOvulation, t)}`,
  ]
  if (result.abnormalCycle) {
    lines.push(t('ovulation.warn.abnormalCycle', { cycle: result.cycleDays }))
  }
  return lines.join('\n')
}

/**
 * 模板同步入口：空输入返回 ''，非法输入抛本地化后的 Error。
 * t 由调用方显式传入（Tool 传 useTranslate()，单测传 createTranslator('zh'/'en')）。
 */
export function transform(input: OvulationInput, options: OvulationOptions, t: Translate): string {
  try {
    const result = computeOvulation(input, options)
    if (!result) return ''
    return formatOvulation(result, t)
  } catch (error) {
    throw new Error(localizeError(error, t), { cause: error })
  }
}

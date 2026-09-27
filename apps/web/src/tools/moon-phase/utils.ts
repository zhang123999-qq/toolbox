import type { MoonPhaseInput, MoonPhaseOptions } from './schema'

/**
 * moon-phase —— 月相
 *
 * 算法来源：朔望月（synodic month）线性外推。
 *   基准新月：2000-01-06 18:14 UTC（已知新月历元）
 *   朔望月长度：29.530588853 天（平均月龄周期）
 * 纯自研，不依赖任何库。
 *
 * 公式：
 *   月龄 age = (目标日 − 基准新月) mod 朔望月，归一化到 [0, 29.53059)
 *   照明比例 = (1 − cos(2π·age / 朔望月)) / 2   （0=新月，1=满月）
 *   月相名：按 8 个等分相位区间映射
 *
 * 精度：精度到天即可。线性外推在数百年尺度内月龄误差 < 0.5 天，
 * 照明比例误差 < 5%；不做月球轨道扰动（出差方程等）的修正。
 */

/** 基准新月历元：2000-01-06 18:14 UTC */
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14)
/** 朔望月（天） */
const SYNODIC = 29.530588853

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 由日期（UTC 日）计算月龄（天，[0, 29.53059)） */
export function moonAge(y: number, m: number, d: number): number {
  const target = Date.UTC(y, m - 1, d)
  const elapsedDays = (target - REF_NEW_MOON_MS) / 86400000
  let age = elapsedDays % SYNODIC
  if (age < 0) age += SYNODIC
  return age
}

/** 照明比例 0~100（百分比） */
export function illumination(age: number): number {
  return ((1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2) * 100
}

/**
 * 八个月相名（按月龄区间，每相宽 29.5306/8 ≈ 3.69 天）：
 * 新月 <1.85 / 蛾眉月 / 上弦月 / 盈凸月 / 满月 / 亏凸月 / 下弦月 / 残月
 */
export function phaseName(age: number): string {
  if (age < 1.85 || age >= 28.68) return '新月'
  if (age < 5.54) return '蛾眉月'
  if (age < 9.23) return '上弦月'
  if (age < 12.92) return '盈凸月'
  if (age < 16.61) return '满月'
  if (age < 20.3) return '亏凸月'
  if (age < 23.99) return '下弦月'
  return '残月'
}

/** ms → "YYYY-MM-DD"（UTC） */
function fmtDate(ms: number): string {
  const dt = new Date(ms)
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

export interface NextEvents {
  nextNew: string
  nextFull: string
}

/** 计算严格晚于目标日的下一次新月与下一次满月日期（UTC，精度到天） */
export function nextEvents(y: number, m: number, d: number): NextEvents {
  const target = Date.UTC(y, m - 1, d)
  const elapsed = (target - REF_NEW_MOON_MS) / 86400000
  // 下一个朔望月周期序号（严格晚于当前）
  const k = Math.ceil(elapsed / SYNODIC - 1e-9)
  const nextNewMs = REF_NEW_MOON_MS + k * SYNODIC * 86400000
  // 满月发生在新月后约半个朔望月；候选为「上一周期满月」与「本周期满月」，取严格晚于目标者
  const candA = nextNewMs - (SYNODIC / 2) * 86400000
  const candB = nextNewMs + (SYNODIC / 2) * 86400000
  const nextFullMs = candA > target ? candA : candB
  return { nextNew: fmtDate(nextNewMs), nextFull: fmtDate(nextFullMs) }
}

/** 解析输入为合法公历日 */
export function parseMoonDate(text: string): { y: number; m: number; d: number } {
  const t = text.trim()
  const dm = t.match(/(\d{4})\s*[-/](\d{1,2})\s*[-/](\d{1,2})/)
  if (!dm) throw new Error('无法识别日期，请使用 YYYY-MM-DD')
  const y = Number(dm[1])
  const m = Number(dm[2])
  const d = Number(dm[3])
  const probe = new Date(y, m - 1, d)
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    throw new Error('非法日期：' + dm[0])
  }
  return { y, m, d }
}

/** T2 同步入口 */
export function transform(input: MoonPhaseInput, _options: MoonPhaseOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const { y, m, d } = parseMoonDate(text)
  const age = moonAge(y, m, d)
  const illum = illumination(age)
  const next = nextEvents(y, m, d)

  return [
    `日期：${y}-${pad2(m)}-${pad2(d)}`,
    `月龄：${age.toFixed(2)} 天（0–29.53）`,
    `照明比例：${illum.toFixed(1)}%`,
    `月相：${phaseName(age)}`,
    `下一次满月：${next.nextFull}`,
    `下一次新月：${next.nextNew}`,
  ].join('\n')
}

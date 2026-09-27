import type { BodyFatInput, BodyFatOptions } from './schema'

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** 合法性别 */
export const GENDERS: readonly string[] = ['男', '女']

/** 美国海军法：男性（单位 cm，log10） */
export function navyMale(waist: number, neck: number, height: number): number {
  return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450
}

/** 美国海军法：女性（单位 cm，log10） */
export function navyFemale(waist: number, hip: number, neck: number, height: number): number {
  return (
    495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450
  )
}

/**
 * 体脂分级。
 * 男：<14 偏低 / 14–18 健康 / 18–25 超重 / >25 肥胖；
 * 女：<21 偏低 / 21–25 健康 / 25–32 超重 / >32 肥胖。
 * 分界值归入较低（更健康）一档：18→健康、25→男超重/女健康、32→超重。
 */
export function classifyBodyFat(pct: number, gender: string): string {
  if (gender === '男') {
    if (pct < 14) return '偏低'
    if (pct <= 18) return '健康'
    if (pct <= 25) return '超重'
    return '肥胖'
  }
  if (pct < 21) return '偏低'
  if (pct <= 25) return '健康'
  if (pct <= 32) return '超重'
  return '肥胖'
}

/** 围度/身高校验：有效数字且 >0 */
function parsePositive(text: string, label: string): number {
  const value = Number(text.trim())
  if (Number.isNaN(value)) throw new Error(`${label}请输入有效的数字`)
  if (value <= 0) throw new Error(`${label}必须大于 0`)
  return value
}

/** T2 同步入口 */
export function transform(input: BodyFatInput, options: BodyFatOptions): string {
  const waistText = input.text.trim()
  if (waistText === '') return ''

  const { gender } = options
  if (!GENDERS.includes(gender)) throw new Error('性别非法')

  const waist = parsePositive(input.text, '腰围')
  const neck = parsePositive(input.textB, '颈围')
  const height = parsePositive(input.textC, '身高')

  let pct: number
  if (gender === '男') {
    // 男性不使用臀围：留空或乱填都不校验
    if (waist <= neck) throw new Error('腰围必须大于颈围')
    pct = navyMale(waist, neck, height)
  } else {
    const hipText = input.textD.trim()
    if (hipText === '') throw new Error('女性需填写臀围')
    const hip = parsePositive(input.textD, '臀围')
    if (waist + hip <= neck) throw new Error('腰围与臀围之和必须大于颈围')
    pct = navyFemale(waist, hip, neck, height)
  }

  const standard = gender === '男' ? '男性标准' : '女性标准'
  return [
    `体脂率：${pct.toFixed(1)}%`,
    `分级：${classifyBodyFat(pct, gender)}（${standard}）`,
  ].join('\n')
}

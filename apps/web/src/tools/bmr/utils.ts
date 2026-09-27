import type { BmrInput, BmrOptions } from './schema'

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** 合法性别 */
export const GENDERS: readonly string[] = ['男', '女']

/** 合法公式 */
export const FORMULAS: readonly string[] = ['Mifflin-St Jeor', 'Harris-Benedict']

/** Mifflin-St Jeor 公式（w=kg，h=cm，a=岁） */
export function mifflin(w: number, h: number, a: number, gender: string): number {
  return gender === '男' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161
}

/** Harris-Benedict 公式（w=kg，h=cm，a=岁） */
export function harris(w: number, h: number, a: number, gender: string): number {
  return gender === '男'
    ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
    : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a
}

/** 按选项计算 BMR：先校验性别与公式 */
export function calcBmr(w: number, h: number, a: number, gender: string, formula: string): number {
  if (!GENDERS.includes(gender)) throw new Error('性别非法')
  if (formula === 'Mifflin-St Jeor') return mifflin(w, h, a, gender)
  if (formula === 'Harris-Benedict') return harris(w, h, a, gender)
  throw new Error('公式非法')
}

/** 身高（cm）校验：50–300 */
function parseHeight(text: string): number {
  const value = Number(text.trim())
  if (Number.isNaN(value)) throw new Error('身高请输入有效的数字')
  if (value < 50 || value > 300) throw new Error('身高应在 50–300 cm 之间')
  return value
}

/** 体重（kg）校验：>0 且 ≤1000 */
function parseWeight(text: string): number {
  const value = Number(text.trim())
  if (Number.isNaN(value)) throw new Error('体重请输入有效的数字')
  if (value <= 0) throw new Error('体重必须大于 0')
  if (value > 1000) throw new Error('体重超出合理范围')
  return value
}

/** 年龄校验：1–120 的整数 */
function parseAge(text: string): number {
  const s = text.trim()
  if (s === '') throw new Error('年龄不能为空')
  const value = Number(s)
  if (Number.isNaN(value) || !Number.isInteger(value) || value < 1 || value > 120) {
    throw new Error('年龄应为 1–120 的整数')
  }
  return value
}

/** T2 同步入口 */
export function transform(input: BmrInput, options: BmrOptions): string {
  const heightText = input.text.trim()
  if (heightText === '') return ''

  const height = parseHeight(heightText)
  const weight = parseWeight(input.textB)
  const age = parseAge(options.age)
  const { gender, formula } = options

  const bmr = calcBmr(weight, height, age, gender, formula)
  return `BMR：${bmr.toFixed(1)} kcal/天（${formula}，${gender}，${age} 岁）`
}

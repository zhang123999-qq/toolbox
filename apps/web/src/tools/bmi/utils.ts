import type { BmiInput, BmiOptions } from './schema'

/** 数字格式化：12 位有效数字，去掉浮点尾巴 */
export function fmt(n: number): string {
  return Number(n.toPrecision(12)).toString()
}

/** BMI 分级（中国标准）：<18.5 偏瘦 / 18.5–24 正常 / 24–28 超重 / ≥28 肥胖 */
export function classifyBmi(bmi: number): string {
  if (bmi < 18.5) return '偏瘦'
  if (bmi < 24) return '正常'
  if (bmi < 28) return '超重'
  return '肥胖'
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

/** T2 同步入口 */
export function transform(input: BmiInput, _options: BmiOptions): string {
  const heightText = input.text.trim()
  if (heightText === '') return ''

  const height = parseHeight(heightText)
  const weight = parseWeight(input.textB)

  const meter = height / 100
  const bmi = weight / meter ** 2
  const low = 18.5 * meter ** 2
  const high = 24 * meter ** 2

  return [
    `身高：${heightText} cm 体重：${input.textB.trim()} kg`,
    `BMI：${bmi.toFixed(1)}`,
    `分级：${classifyBmi(bmi)}`,
    `健康体重范围：${low.toFixed(1)} – ${high.toFixed(1)} kg`,
  ].join('\n')
}

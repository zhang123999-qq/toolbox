import { Decimal as DecimalBase } from 'decimal.js'
import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { PrecisionInput, PrecisionOperator, PrecisionOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/**
 * 本工具的 decimal.js 构造器：有效数字提到 50 位。
 * 默认 20 位在极大 / 极小数上同样会丢精度（如 1e21+1 会被舍入成 1e21），
 * 对一个叫「数值精度」的工具这是误导；clone 只影响本工具，不污染全局 Decimal 配置。
 * 用法（new / plus / div / isZero / toString）与 #330 decimal 工具保持一致。
 */
/** decimal.js 有效数字位数：默认 20 位在 1e21+1 这类输入上同样丢精度，50 位覆盖常规演示与测试范围 */
const DECIMAL_PRECISION = 50
const Decimal = DecimalBase.clone({ precision: DECIMAL_PRECISION })

/** clone 出的构造器所产出的实例类型（值与类型同名，此处取实例侧） */
type DecimalValue = InstanceType<typeof Decimal>

type MessageParams = Record<string, string | number>

/** `{name}` 占位符替换（与 i18n.createTranslator 同规则的轻量实现） */
function fill(template: string, params?: MessageParams): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  )
}

/** 双语错误（中文 / English）：文案全部取自 i18n 词典，无硬编码 */
export function bilingualError(key: MessageKey, params?: MessageParams): Error {
  return new Error(fill(zh[key], params) + ' / ' + fill(en[key], params))
}

/**
 * 数字解析：走 decimal.js 构造器，非法字符串抛双语错误。
 * 与 #330 decimal 工具一致的用法：new Decimal(raw) + try/catch。
 * Infinity / NaN 这类非有限值同样拒绝（须为普通数字）。
 */
export function parseDecimal(raw: string): DecimalValue {
  const s = raw.trim()
  let value: DecimalValue
  try {
    value = new Decimal(s)
  } catch {
    throw bilingualError('precision.error.invalidNumber', { value: s })
  }
  if (!value.isFinite()) throw bilingualError('precision.error.invalidNumber', { value: s })
  return value
}

/** decimal.js 精确运算；除零直接抛错（与 #330 保持一致） */
export function applyExact(
  a: DecimalValue,
  b: DecimalValue,
  operator: PrecisionOperator,
): DecimalValue {
  if (operator === '+') return a.plus(b)
  if (operator === '-') return a.minus(b)
  if (operator === '×') return a.times(b)
  if (b.isZero()) throw bilingualError('precision.error.divideByZero')
  return a.div(b)
}

/** JS 原生浮点运算：演示对照用，不做任何修正 */
export function applyFloat(a: number, b: number, operator: PrecisionOperator): number {
  if (operator === '+') return a + b
  if (operator === '-') return a - b
  if (operator === '×') return a * b
  return a / b
}

export interface PrecisionResult {
  readonly expression: string
  /** decimal.js 精确结果（修正值） */
  readonly exact: string
  /** JS 原生浮点结果 */
  readonly floatText: string
  /** 误差 = JS 结果 − 精确结果（decimal.js 计算，仅 hasError 时有意义） */
  readonly errorText: string
  readonly hasError: boolean
}

/**
 * 精度对照计算：任一输入留空返回 null（上层渲染空态，不报错）。
 * 数字非法 / 除零 → 抛双语错误。
 */
export function computePrecision(
  input: PrecisionInput,
  options: PrecisionOptions,
): PrecisionResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  const aText = parsedInput.text.trim()
  const bText = parsedInput.textB.trim()
  if (aText === '' || bText === '') return null

  const exact = applyExact(parseDecimal(aText), parseDecimal(bText), parsedOptions.operator)
  const floatResult = applyFloat(Number(aText), Number(bText), parsedOptions.operator)
  // 用 Decimal 比较两者：NaN / Infinity 等极端值也能正确判定
  const floatAsDecimal = new Decimal(floatResult)
  const hasError = !floatAsDecimal.equals(exact)
  return {
    expression: `${aText} ${parsedOptions.operator} ${bText}`,
    exact: exact.toString(),
    floatText: String(floatResult),
    errorText: floatAsDecimal.minus(exact).toString(),
    hasError,
  }
}

/** T2 同步入口：任一输入留空 → 空串 */
export function transform(input: PrecisionInput, options: PrecisionOptions, t: Translate): string {
  const result = computePrecision(input, options)
  if (result === null) return ''
  const lines = [
    `${t('precision.expr')}：${result.expression}`,
    `${t('precision.exact')}：${result.exact}`,
    `${t('precision.float')}：${result.floatText}`,
  ]
  if (result.hasError) {
    lines.push(`${t('precision.diff')}：${result.errorText}`, t('precision.verdict.mismatch'))
  } else {
    lines.push(t('precision.verdict.match'))
  }
  return lines.join('\n')
}

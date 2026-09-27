import type { Translate } from '../../i18n'
import type { ProbabilityInput, ProbabilityOptions } from './schema'

/** 输入字符上限（与 schema 的 max 保持一致） */
const MAX_INPUT_LENGTH = 200000

/** 参数行格式：key=value（key 不区分大小写） */
const PARAM_LINE_RE = /^([a-zA-Z]+)\s*=\s*(.+)$/

/**
 * 对数阶乘的分界：n 不超过该值时直接求和（精确），
 * 更大时用 Stirling 公式（O(1)，避免上亿次循环卡死）。
 */
const LOG_FACTORIAL_EXACT_MAX = 1000000

/**
 * 二项分布累积概率的分界：n 不超过该值时逐项求和（精确），
 * 更大时用带连续性修正的正态近似（O(1)）。
 */
const BINOMIAL_CDF_EXACT_MAX = 10000

/** 独立性判定容差：|P(A∩B) − P(A)P(B)| 小于它视为独立 */
const INDEPENDENCE_TOLERANCE = 1e-12

/** erf 的 Abramowitz & Stegun 7.1.26 近似系数（|误差| ≤ 1.5e-7） */
const ERF_P = 0.3275911
const ERF_A1 = 0.254829592
const ERF_A2 = -0.284496736
const ERF_A3 = 1.421413741
const ERF_A4 = -1.453152027
const ERF_A5 = 1.061405429

const SQRT_2PI = Math.sqrt(2 * Math.PI)
const SQRT2 = Math.SQRT2

/** 解析「key=value」参数行；key 转小写，重复 key 取最后一个 */
export function parseParams(text: string, t: Translate): Record<string, number> {
  const params: Record<string, number> = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    const m = line.match(PARAM_LINE_RE)
    if (!m) throw new Error(t('probability.error.unknownKey', { key: line }))
    const key = m[1].toLowerCase()
    const value = Number(m[2].trim())
    if (!Number.isFinite(value)) {
      throw new Error(t('probability.error.notNumber', { key, value: m[2].trim() }))
    }
    params[key] = value
  }
  return params
}

/** 取必填参数，缺失抛错 */
export function requireParam(params: Record<string, number>, key: string, t: Translate): number {
  const value = params[key]
  if (value === undefined) throw new Error(t('probability.error.missingParam', { key }))
  return value
}

/** 取必填的概率参数（必须在 [0, 1] 内） */
export function requireProbability(
  params: Record<string, number>,
  key: string,
  t: Translate,
): number {
  const value = requireParam(params, key, t)
  if (value < 0 || value > 1) {
    throw new Error(t('probability.error.probRange', { key, value: String(value) }))
  }
  return value
}

/** 对数阶乘 ln(n!)：小 n 直接求和，大 n 用 Stirling 公式 */
export function logFactorial(n: number): number {
  if (n > LOG_FACTORIAL_EXACT_MAX) {
    // Stirling：ln(n!) ≈ n·ln(n) − n + ln(2πn)/2 + 1/(12n)
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n)
  }
  let acc = 0
  for (let i = 2; i <= n; i += 1) acc += Math.log(i)
  return acc
}

/** 对数组合数 ln(C(n,k)) */
export function logBinomialCoefficient(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
}

/**
 * 二项分布对数概率质量 ln P(X=k)。
 * 越界 k 返回 −Infinity（对应概率 0）；p=0/1 的退化情形按定义处理，避免 0·(−∞)=NaN。
 */
export function binomialLogPmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY
  if (p === 0) return k === 0 ? 0 : Number.NEGATIVE_INFINITY
  if (p === 1) return k === n ? 0 : Number.NEGATIVE_INFINITY
  return logBinomialCoefficient(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)
}

/** 二项分布 P(X=k) */
export function binomialPmf(n: number, k: number, p: number): number {
  return Math.exp(binomialLogPmf(n, k, p))
}

/**
 * 二项分布累积 P(X≤k)。
 * n 很大时用带连续性修正的正态近似 Φ((k+0.5−np)/√(np(1−p)))，避免 O(n) 求和；
 * 精确路径用对数域递推（O(k)，无溢出 / 下溢）。
 */
export function binomialCdf(n: number, k: number, p: number): number {
  if (k < 0) return 0
  if (k >= n) return 1
  if (p === 0) return 1 // X ≡ 0，k ≥ 0（k<0 已在前面返回）
  if (p === 1) return 0 // X ≡ n，k < n（k≥n 已在前面返回）
  if (n > BINOMIAL_CDF_EXACT_MAX) {
    const mean = n * p
    const sd = Math.sqrt(n * p * (1 - p))
    return normalCdf(k + 0.5, mean, sd)
  }
  // 精确求和：ln(C(n,i+1)) = ln(C(n,i)) + ln(n−i) − ln(i+1)，全程对数域
  const lnp = Math.log(p)
  const ln1p = Math.log(1 - p)
  let logC = 0 // ln(C(n,0))
  let acc = 0
  for (let i = 0; i <= k; i += 1) {
    acc += Math.exp(logC + i * lnp + (n - i) * ln1p)
    logC += Math.log(n - i) - Math.log(i + 1)
  }
  return acc
}

/** 误差函数 erf（Abramowitz & Stegun 7.1.26，|误差| ≤ 1.5e-7） */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const w = 1 / (1 + ERF_P * ax)
  const poly = ((((ERF_A5 * w + ERF_A4) * w + ERF_A3) * w + ERF_A2) * w + ERF_A1) * w
  return sign * (1 - poly * Math.exp(-ax * ax))
}

/** 正态 CDF：Φ((x−μ)/σ) */
export function normalCdf(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * SQRT2)))
}

/** 正态 PDF */
export function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * SQRT_2PI)
}

/** 校验二项分布参数：n/k 为非负整数，p ∈ [0,1] */
export function validateBinomialParams(
  params: Record<string, number>,
  t: Translate,
): { n: number; k: number; p: number } {
  const n = requireParam(params, 'n', t)
  const k = requireParam(params, 'k', t)
  const p = requireParam(params, 'p', t)
  if (!Number.isInteger(n) || n < 0) throw new Error(t('probability.error.badN'))
  if (!Number.isInteger(k) || k < 0) throw new Error(t('probability.error.badK'))
  if (p < 0 || p > 1) throw new Error(t('probability.error.badP'))
  return { n, k, p }
}

export interface BinomialResult {
  readonly pmf: number
  readonly cdfLe: number
  readonly cdfGe: number
  readonly mean: number
  readonly variance: number
}

/** 二项分布结果：P(X=k)、P(X≤k)、P(X≥k)、期望、方差 */
export function binomialResults(n: number, k: number, p: number): BinomialResult {
  const pmf = binomialPmf(n, k, p)
  const cdfLe = binomialCdf(n, k, p)
  const cdfGe = 1 - binomialCdf(n, k - 1, p)
  return { pmf, cdfLe, cdfGe, mean: n * p, variance: n * p * (1 - p) }
}

export interface ConditionalResult {
  readonly condAB: number
  readonly condBA: number
  readonly independent: boolean
}

/** 条件概率：P(A|B)=P(A∩B)/P(B)，P(B|A)=P(A∩B)/P(A)；分母为 0 无定义 */
export function conditionalResults(
  pa: number,
  pb: number,
  pab: number,
  t: Translate,
): ConditionalResult {
  if (pb === 0 || pa === 0) throw new Error(t('probability.error.zeroDenominator'))
  return {
    condAB: pab / pb,
    condBA: pab / pa,
    independent: Math.abs(pab - pa * pb) < INDEPENDENCE_TOLERANCE,
  }
}

export interface NormalResult {
  readonly cdf: number
  readonly pdf: number
  readonly tail: number
}

/** 正态分布结果：P(X≤x)、密度 f(x)、P(X>x)；σ 必须 > 0 */
export function normalResults(x: number, mu: number, sigma: number, t: Translate): NormalResult {
  if (!(sigma > 0)) throw new Error(t('probability.error.badSigma'))
  const cdf = normalCdf(x, mu, sigma)
  return { cdf, pdf: normalPdf(x, mu, sigma), tail: 1 - cdf }
}

/** 按指定小数位数格式化，并去掉无意义的尾零（2.5000 → 2.5） */
export function fmtFixed(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return String(n)
  const s = n.toFixed(decimals)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

function formatBinomial(n: number, k: number, p: number, t: Translate, decimals: number): string {
  const r = binomialResults(n, k, p)
  const f = (v: number): string => fmtFixed(v, decimals)
  return [
    `${t('probability.label.pmf')}: ${f(r.pmf)}`,
    `${t('probability.label.cdfLe')}: ${f(r.cdfLe)}`,
    `${t('probability.label.cdfGe')}: ${f(r.cdfGe)}`,
    `${t('probability.label.mean')}: ${f(r.mean)}`,
    `${t('probability.label.variance')}: ${f(r.variance)}`,
  ].join('\n')
}

function formatConditional(
  pa: number,
  pb: number,
  pab: number,
  t: Translate,
  decimals: number,
): string {
  const r = conditionalResults(pa, pb, pab, t)
  const f = (v: number): string => fmtFixed(v, decimals)
  return [
    `${t('probability.label.condAB')}: ${f(r.condAB)}`,
    `${t('probability.label.condBA')}: ${f(r.condBA)}`,
    `${t('probability.label.independent')}: ${r.independent ? t('probability.label.yes') : t('probability.label.no')}`,
  ].join('\n')
}

function formatNormal(
  x: number,
  mu: number,
  sigma: number,
  t: Translate,
  decimals: number,
): string {
  const r = normalResults(x, mu, sigma, t)
  const f = (v: number): string => fmtFixed(v, decimals)
  return [
    `${t('probability.label.normalCdf')}: ${f(r.cdf)}`,
    `${t('probability.label.normalPdf')}: ${f(r.pdf)}`,
    `${t('probability.label.tail')}: ${f(r.tail)}`,
  ].join('\n')
}

/** T3 文本入口：空输入返回空串；错误信息经 i18n 双语输出 */
export function transform(
  input: ProbabilityInput,
  options: ProbabilityOptions,
  t: Translate,
): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT_LENGTH) throw new Error(t('probability.error.tooLong'))

  const mode = options.mode ?? 'binomial'
  const decimals = Number(options.decimals ?? '6')
  const params = parseParams(input.text, t)

  if (mode === 'conditional') {
    const pa = requireProbability(params, 'pa', t)
    const pb = requireProbability(params, 'pb', t)
    const pab = requireProbability(params, 'pab', t)
    return formatConditional(pa, pb, pab, t, decimals)
  }
  if (mode === 'normal') {
    const x = requireParam(params, 'x', t)
    const mu = requireParam(params, 'mu', t)
    const sigma = requireParam(params, 'sigma', t)
    return formatNormal(x, mu, sigma, t, decimals)
  }
  const { n, k, p } = validateBinomialParams(params, t)
  return formatBinomial(n, k, p, t, decimals)
}

import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  binomialCdf,
  binomialLogPmf,
  binomialPmf,
  binomialResults,
  conditionalResults,
  erf,
  fmtFixed,
  logFactorial,
  normalCdf,
  normalPdf,
  normalResults,
  parseParams,
  requireParam,
  requireProbability,
  transform,
  validateBinomialParams,
} from './utils'
import type { ProbabilityOptions } from './schema'

const t = createTranslator('zh')
const ten = createTranslator('en')
const baseOptions = (): ProbabilityOptions => ({ mode: 'binomial', decimals: '6' })

describe('probability / parseParams', () => {
  it('解析 key=value，key 不区分大小写', () => {
    expect(parseParams('N=10\nk=3\nP=0.5', t)).toEqual({ n: 10, k: 3, p: 0.5 })
  })

  it('空行跳过', () => {
    expect(parseParams('\nn=10\n\n', t)).toEqual({ n: 10 })
  })

  it('重复 key 取最后一个', () => {
    expect(parseParams('n=10\nn=20', t)).toEqual({ n: 20 })
  })

  it('非法行抛错', () => {
    expect(() => parseParams('n10', t)).toThrow('未知参数：n10')
  })

  it('非数字值抛错', () => {
    expect(() => parseParams('n=abc', t)).toThrow('参数 n 不是有效数字：abc')
  })

  it('Infinity 值抛错', () => {
    expect(() => parseParams('n=Infinity', t)).toThrow('参数 n 不是有效数字')
  })

  it('英文报错', () => {
    expect(() => parseParams('n=abc', ten)).toThrow('Parameter n is not a valid number: abc')
  })
})

describe('probability / requireParam & requireProbability', () => {
  it('缺失参数抛错，存在参数返回值', () => {
    expect(() => requireParam({}, 'n', t)).toThrow('缺少参数：n')
    expect(requireParam({ n: 1 }, 'n', t)).toBe(1)
  })

  it('概率越界抛错', () => {
    expect(() => requireProbability({ p: -0.1 }, 'p', t)).toThrow('概率必须在 0 到 1 之间')
    expect(() => requireProbability({ p: 1.5 }, 'p', t)).toThrow('概率必须在 0 到 1 之间')
    expect(requireProbability({ p: 0.5 }, 'p', t)).toBe(0.5)
  })

  it('边界 0 和 1 合法', () => {
    expect(requireProbability({ p: 0 }, 'p', t)).toBe(0)
    expect(requireProbability({ p: 1 }, 'p', t)).toBe(1)
  })
})

describe('probability / validateBinomialParams', () => {
  it('n 非整数或为负抛错', () => {
    expect(() => validateBinomialParams({ n: 2.5, k: 1, p: 0.5 }, t)).toThrow(
      'n（试验次数）必须是非负整数',
    )
    expect(() => validateBinomialParams({ n: -1, k: 1, p: 0.5 }, t)).toThrow(
      'n（试验次数）必须是非负整数',
    )
  })

  it('k 非整数或为负抛错', () => {
    expect(() => validateBinomialParams({ n: 10, k: 1.5, p: 0.5 }, t)).toThrow(
      'k（成功次数）必须是非负整数',
    )
    expect(() => validateBinomialParams({ n: 10, k: -1, p: 0.5 }, t)).toThrow(
      'k（成功次数）必须是非负整数',
    )
  })

  it('p 越界抛错', () => {
    expect(() => validateBinomialParams({ n: 10, k: 1, p: -0.1 }, t)).toThrow(
      'p（成功概率）必须在 0 到 1 之间',
    )
    expect(() => validateBinomialParams({ n: 10, k: 1, p: 1.2 }, t)).toThrow(
      'p（成功概率）必须在 0 到 1 之间',
    )
  })

  it('合法参数通过', () => {
    expect(validateBinomialParams({ n: 10, k: 3, p: 0.5 }, t)).toEqual({ n: 10, k: 3, p: 0.5 })
  })
})

describe('probability / logFactorial', () => {
  it('小 n 精确：ln(5!) = ln(120)', () => {
    expect(logFactorial(5)).toBeCloseTo(Math.log(120), 12)
    expect(logFactorial(0)).toBe(0)
    expect(logFactorial(1)).toBe(0)
  })

  it('大 n 走 Stirling 近似且有限', () => {
    const v = logFactorial(2000000)
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBeGreaterThan(logFactorial(1000000))
  })
})

describe('probability / binomialPmf', () => {
  it('已知值：n=10,k=3,p=0.5 → 120/1024', () => {
    expect(binomialPmf(10, 3, 0.5)).toBeCloseTo(0.1171875, 10)
  })

  it('对数域中间值一致', () => {
    expect(Math.exp(binomialLogPmf(10, 3, 0.5))).toBeCloseTo(0.1171875, 10)
  })

  it('k 越界时概率为 0', () => {
    expect(binomialPmf(10, 11, 0.5)).toBe(0)
    expect(binomialPmf(10, -1, 0.5)).toBe(0)
  })

  it('p=0 的退化分布', () => {
    expect(binomialPmf(10, 0, 0)).toBe(1)
    expect(binomialPmf(10, 3, 0)).toBe(0)
  })

  it('p=1 的退化分布', () => {
    expect(binomialPmf(10, 10, 1)).toBe(1)
    expect(binomialPmf(10, 3, 1)).toBe(0)
  })

  it('n=0 时只有 k=0 概率为 1', () => {
    expect(binomialPmf(0, 0, 0.5)).toBe(1)
    expect(binomialPmf(0, 1, 0.5)).toBe(0)
  })

  it('大 n 不溢出（对数域）', () => {
    const v = binomialPmf(100000, 50000, 0.5)
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBeGreaterThan(0)
  })
})

describe('probability / binomialCdf', () => {
  it('已知值：n=10,k=3,p=0.5 → 176/1024', () => {
    expect(binomialCdf(10, 3, 0.5)).toBeCloseTo(0.171875, 10)
  })

  it('k<0 → 0；k≥n → 1', () => {
    expect(binomialCdf(10, -1, 0.5)).toBe(0)
    expect(binomialCdf(10, 10, 0.5)).toBe(1)
    expect(binomialCdf(10, 15, 0.5)).toBe(1)
  })

  it('p=0 时 k≥0 累积为 1', () => {
    expect(binomialCdf(10, 3, 0)).toBe(1)
  })

  it('p=1 时 k<n 累积为 0', () => {
    expect(binomialCdf(10, 3, 1)).toBe(0)
  })

  it('大 n 用正态近似（O(1)，不卡死）', () => {
    const start = Date.now()
    const v = binomialCdf(100000, 50000, 0.5)
    expect(Date.now() - start).toBeLessThan(1000)
    // 对称点附近 ≈ 0.5（连续性修正带来微小偏移）
    expect(v).toBeCloseTo(0.5, 2)
  })
})

describe('probability / binomialResults', () => {
  it('n=10,k=3,p=0.5 的完整结果', () => {
    const r = binomialResults(10, 3, 0.5)
    expect(r.pmf).toBeCloseTo(0.1171875, 10)
    expect(r.cdfLe).toBeCloseTo(0.171875, 10)
    expect(r.cdfGe).toBeCloseTo(1 - 0.0546875, 10)
    expect(r.mean).toBe(5)
    expect(r.variance).toBe(2.5)
  })
})

describe('probability / erf & normal', () => {
  it('erf(0)≈0（近似公式精度 1.5e-7 内），erf 对称', () => {
    expect(erf(0)).toBeCloseTo(0, 7)
    expect(erf(1)).toBe(-erf(-1))
    expect(erf(2)).toBeCloseTo(0.995322265, 6)
  })

  it('标准正态 CDF 查表值：Φ(1.96)≈0.9750', () => {
    expect(normalCdf(1.96, 0, 1)).toBeCloseTo(0.975, 3)
  })

  it('Φ(0)≈0.5，Φ(−1.96)=1−Φ(1.96)', () => {
    expect(normalCdf(0, 0, 1)).toBeCloseTo(0.5, 7)
    expect(normalCdf(-1.96, 0, 1)).toBe(1 - normalCdf(1.96, 0, 1))
  })

  it('正态 PDF：φ(0)=1/√(2π)', () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(0.3989422804, 8)
  })

  it('σ≤0 抛错', () => {
    expect(() => normalResults(0, 0, 0, t)).toThrow('σ（标准差）必须大于 0')
    expect(() => normalResults(0, 0, -1, t)).toThrow('σ（标准差）必须大于 0')
  })

  it('normalResults 返回 cdf/pdf/tail 且 tail=1−cdf', () => {
    const r = normalResults(1.96, 0, 1, t)
    expect(r.cdf).toBeCloseTo(0.975, 3)
    expect(r.tail).toBeCloseTo(1 - r.cdf, 12)
    expect(r.pdf).toBeGreaterThan(0)
  })
})

describe('probability / conditionalResults', () => {
  it('已知值：P(A|B)=0.24/0.4=0.6', () => {
    const r = conditionalResults(0.6, 0.4, 0.24, t)
    expect(r.condAB).toBeCloseTo(0.6, 12)
    expect(r.condBA).toBeCloseTo(0.4, 12)
    expect(r.independent).toBe(true)
  })

  it('不独立的情形', () => {
    const r = conditionalResults(0.6, 0.4, 0.3, t)
    expect(r.independent).toBe(false)
  })

  it('P(B)=0 时抛错', () => {
    expect(() => conditionalResults(0.5, 0, 0, t)).toThrow('分母为 0')
  })

  it('P(A)=0 时抛错', () => {
    expect(() => conditionalResults(0, 0.5, 0, t)).toThrow('分母为 0')
  })

  it('英文报错', () => {
    expect(() => conditionalResults(0.5, 0, 0, ten)).toThrow(
      'Denominator is 0, conditional probability is undefined',
    )
  })
})

describe('probability / fmtFixed', () => {
  it('去尾零', () => {
    expect(fmtFixed(0.5, 6)).toBe('0.5')
    expect(fmtFixed(2, 2)).toBe('2')
  })

  it('指数记数法无小数点时原样返回', () => {
    expect(fmtFixed(1e21, 2)).toBe('1e+21')
  })

  it('非有限数原样输出', () => {
    expect(fmtFixed(Infinity, 2)).toBe('Infinity')
  })
})

describe('probability / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, baseOptions(), t)).toBe('')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, baseOptions(), t)).toThrow(
      '输入超过 200,000 字符上限',
    )
  })

  it('二项分布输出五项', () => {
    const out = transform({ text: 'n=10\nk=3\np=0.5' }, baseOptions(), t)
    expect(out).toContain('P(X = k): 0.117188')
    expect(out).toContain('P(X ≤ k): 0.171875')
    expect(out).toContain('P(X ≥ k): 0.94531')
    expect(out).toContain('期望 E[X]: 5')
    expect(out).toContain('方差 Var(X): 2.5')
  })

  it('二项分布英文输出', () => {
    const out = transform({ text: 'n=10\nk=3\np=0.5' }, baseOptions(), ten)
    expect(out).toContain('Mean E[X]: 5')
    expect(out).toContain('Variance Var(X): 2.5')
  })

  it('条件概率模式', () => {
    const options = baseOptions()
    options.mode = 'conditional'
    const out = transform({ text: 'pa=0.6\npb=0.4\npab=0.24' }, options, t)
    expect(out).toContain('P(A|B): 0.6')
    expect(out).toContain('P(B|A): 0.4')
    expect(out).toContain('A 与 B 是否独立: 是')
  })

  it('条件概率不独立时输出"否"', () => {
    const options = baseOptions()
    options.mode = 'conditional'
    const out = transform({ text: 'pa=0.6\npb=0.4\npab=0.3' }, options, t)
    expect(out).toContain('A 与 B 是否独立: 否')
  })

  it('正态分布模式', () => {
    const options = baseOptions()
    options.mode = 'normal'
    const out = transform({ text: 'x=1.96\nmu=0\nsigma=1' }, options, t)
    expect(out).toContain('P(X ≤ x): 0.975002')
    expect(out).toContain('P(X > x): 0.024998')
  })

  it('缺失参数抛错', () => {
    expect(() => transform({ text: 'n=10\nk=3' }, baseOptions(), t)).toThrow('缺少参数：p')
  })

  it('缺省选项走默认值分支', () => {
    const partial = {} as ProbabilityOptions
    const out = transform({ text: 'n=10\nk=3\np=0.5' }, partial, t)
    expect(out).toContain('P(X = k): 0.117188')
  })

  it('小数位数选项生效', () => {
    const options = baseOptions()
    options.decimals = '2'
    const out = transform({ text: 'n=10\nk=3\np=0.5' }, options, t)
    expect(out).toContain('P(X = k): 0.12')
  })
})

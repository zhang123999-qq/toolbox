import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  applyExact,
  applyFloat,
  bilingualError,
  computePrecision,
  parseDecimal,
  transform,
} from './utils'

const t = createTranslator('zh')
const plus = { operator: '+' } as const
const minus = { operator: '-' } as const
const times = { operator: '×' } as const
const divide = { operator: '÷' } as const

describe('precision / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('precision.error.divideByZero')
    expect(error.message).toContain('除数不能为 0')
    expect(error.message).toContain('Division by zero')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('precision.error.invalidNumber', { value: 'abc' })
    expect(error.message).toContain('数字无效：abc')
    expect(error.message).toContain('Invalid number: abc')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('precision.error.invalidNumber', {})
    expect(error.message).toContain('{value}')
  })
})

describe('precision / parseDecimal 边界', () => {
  it('合法数字解析正确', () => {
    expect(parseDecimal('0.1').toString()).toBe('0.1')
    expect(parseDecimal('  -2.5  ').toString()).toBe('-2.5')
    expect(parseDecimal('1e-7').toString()).toBe('1e-7')
  })

  it('空输入报错', () => {
    expect(() => parseDecimal('')).toThrow(/数字无效/)
    expect(() => parseDecimal('   ')).toThrow(/Invalid number/)
  })

  it('非数字字符串报错', () => {
    expect(() => parseDecimal('abc')).toThrow(/数字无效：abc/)
    expect(() => parseDecimal('12a')).toThrow(/数字无效/)
  })

  it('NaN 报错', () => {
    expect(() => parseDecimal('NaN')).toThrow(/数字无效/)
  })

  it('Infinity 报错（非有限值拒绝）', () => {
    expect(() => parseDecimal('Infinity')).toThrow(/数字无效/)
    expect(() => parseDecimal('-Infinity')).toThrow(/数字无效/)
  })

  it('0 与负数合法', () => {
    expect(parseDecimal('0').isZero()).toBe(true)
    expect(parseDecimal('-0.3').toString()).toBe('-0.3')
  })
})

describe('precision / applyExact', () => {
  it('四则运算精确', () => {
    expect(applyExact(new Decimal('0.1'), new Decimal('0.2'), '+').toString()).toBe('0.3')
    expect(applyExact(new Decimal('1'), new Decimal('0.9'), '-').toString()).toBe('0.1')
    expect(applyExact(new Decimal('0.1'), new Decimal('0.2'), '×').toString()).toBe('0.02')
    expect(applyExact(new Decimal('1'), new Decimal('4'), '÷').toString()).toBe('0.25')
  })

  it('除零抛双语错误', () => {
    expect(() => applyExact(new Decimal('1'), new Decimal('0'), '÷')).toThrow(/除数不能为 0/)
    expect(() => applyExact(new Decimal('1'), new Decimal('0'), '÷')).toThrow(/Division by zero/)
  })
})

describe('precision / applyFloat', () => {
  it('原生浮点四则运算（0.1+0.2 复现经典误差）', () => {
    expect(applyFloat(0.1, 0.2, '+')).toBe(0.30000000000000004)
    expect(applyFloat(1, 0.9, '-')).toBe(0.09999999999999998)
    expect(applyFloat(0.1, 0.2, '×')).toBe(0.020000000000000004)
    expect(applyFloat(1, 4, '÷')).toBe(0.25)
  })
})

describe('precision / computePrecision', () => {
  it('任一输入留空返回 null', () => {
    expect(computePrecision({ text: '', textB: '' }, plus)).toBeNull()
    expect(computePrecision({ text: '0.1', textB: '' }, plus)).toBeNull()
    expect(computePrecision({ text: '', textB: '0.2' }, plus)).toBeNull()
    expect(computePrecision({ text: '  ', textB: '0.2' }, plus)).toBeNull()
  })

  it('0.1 + 0.2：检出浮点误差并给出修正值', () => {
    const result = computePrecision({ text: '0.1', textB: '0.2' }, plus)!
    expect(result.hasError).toBe(true)
    expect(result.exact).toBe('0.3')
    expect(result.floatText).toBe('0.30000000000000004')
    expect(result.expression).toBe('0.1 + 0.2')
    expect(result.errorText).toBe('4e-17')
  })

  it('无误差时 hasError 为 false（0.5 + 0.25）', () => {
    const result = computePrecision({ text: '0.5', textB: '0.25' }, plus)!
    expect(result.hasError).toBe(false)
    expect(result.exact).toBe('0.75')
    expect(result.floatText).toBe('0.75')
  })

  it('极大数精度对照：1e21 + 1', () => {
    const result = computePrecision({ text: '1e21', textB: '1' }, plus)!
    expect(result.hasError).toBe(true)
    expect(result.exact).toBe('1.000000000000000000001e+21')
    expect(result.floatText).toBe('1e+21')
  })

  it('极小数精度对照：1e-325 + 1e-325（JS 下溢为 0）', () => {
    const result = computePrecision({ text: '1e-325', textB: '1e-325' }, plus)!
    expect(result.hasError).toBe(true)
    expect(result.exact).toBe('2e-325')
    expect(result.floatText).toBe('0')
  })

  it('减法误差：1 − 0.9', () => {
    const result = computePrecision({ text: '1', textB: '0.9' }, minus)!
    expect(result.hasError).toBe(true)
    expect(result.exact).toBe('0.1')
  })

  it('乘法精确对照：0.1 × 3', () => {
    const result = computePrecision({ text: '0.1', textB: '3' }, times)!
    expect(result.exact).toBe('0.3')
    expect(result.hasError).toBe(true)
  })

  it('除法对照：1 ÷ 3（50 位有效数字）', () => {
    const result = computePrecision({ text: '1', textB: '3' }, divide)!
    expect(result.hasError).toBe(true)
    expect(result.exact).toBe('0.' + '3'.repeat(50))
  })

  it('除零抛错', () => {
    expect(() => computePrecision({ text: '1', textB: '0' }, divide)).toThrow(/除数不能为 0/)
  })

  it('非法数字抛错', () => {
    expect(() => computePrecision({ text: 'abc', textB: '1' }, plus)).toThrow(/数字无效/)
    expect(() => computePrecision({ text: '1', textB: 'NaN' }, plus)).toThrow(/数字无效/)
  })

  it('负数参与运算', () => {
    const result = computePrecision({ text: '-0.1', textB: '0.2' }, plus)!
    expect(result.exact).toBe('0.1')
  })

  it('0 参与运算无误差', () => {
    const result = computePrecision({ text: '0', textB: '0' }, plus)!
    expect(result.hasError).toBe(false)
    expect(result.exact).toBe('0')
  })
})

describe('precision / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, plus, t)).toBe('')
  })

  it('0.1 + 0.2 输出误差演示三行 + 修正结论', () => {
    const out = transform({ text: '0.1', textB: '0.2' }, plus, t)
    expect(out).toContain('表达式：0.1 + 0.2')
    expect(out).toContain('精确结果（decimal.js）：0.3')
    expect(out).toContain('JS 原生浮点结果：0.30000000000000004')
    expect(out).toContain('误差（JS − 精确）：4e-17')
    expect(out).toContain('存在浮点误差')
  })

  it('无误差时输出一致结论', () => {
    const out = transform({ text: '0.5', textB: '0.25' }, plus, t)
    expect(out).toContain('精确结果（decimal.js）：0.75')
    expect(out).toContain('结论：两者一致，无浮点误差')
    expect(out).not.toContain('误差（JS')
  })

  it('除零抛双语错误', () => {
    expect(() => transform({ text: '1', textB: '0' }, divide, t)).toThrow(/除数不能为 0/)
  })
})

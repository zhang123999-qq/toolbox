import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import { buildFormatter, parseNumberToken, transform } from './utils'
import type { NumberFormatOptions } from './schema'

const t = createTranslator('zh')
const ten = createTranslator('en')
const OPT = { mode: 'decimal', grouping: true, decimals: '2' } as const
const baseOptions = (): NumberFormatOptions => ({ ...OPT })

describe('number-format / parseNumberToken', () => {
  it('空串抛错', () => {
    expect(() => parseNumberToken('', t)).toThrow('不是有效数字')
    expect(() => parseNumberToken('   ', t)).toThrow('不是有效数字')
  })

  it('非数字字符串抛错', () => {
    expect(() => parseNumberToken('abc', t)).toThrow('不是有效数字：abc')
  })

  it('NaN 字面量抛错', () => {
    expect(() => parseNumberToken('NaN', t)).toThrow('不是有效数字')
  })

  it('Infinity 抛错（非有限数）', () => {
    expect(() => parseNumberToken('Infinity', t)).toThrow('不是有效数字')
    expect(() => parseNumberToken('-Infinity', t)).toThrow('不是有效数字')
  })

  it('英文报错走 i18n', () => {
    expect(() => parseNumberToken('abc', ten)).toThrow('Not a valid number: abc')
  })

  it('合法数字正常解析', () => {
    expect(parseNumberToken(' 1234.5 ', t)).toBe(1234.5)
    expect(parseNumberToken('-0.5', t)).toBe(-0.5)
    expect(parseNumberToken('1e3', t)).toBe(1000)
  })
})

describe('number-format / buildFormatter', () => {
  it('decimal 模式带千分位', () => {
    const f = buildFormatter('decimal', true, 2)
    expect(f.format(1234567.891)).toBe('1,234,567.89')
  })

  it('percent 模式自动乘以 100', () => {
    const f = buildFormatter('percent', true, 2)
    expect(f.format(0.5)).toBe('50.00%')
  })

  it('scientific 模式', () => {
    const f = buildFormatter('scientific', true, 2)
    expect(f.format(12345)).toBe('1.23E4')
  })
})

describe('number-format / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, baseOptions(), t)).toBe('')
    expect(transform({ text: '   \n  ' }, baseOptions(), t)).toBe('')
  })

  it('非法输入行抛错', () => {
    expect(() => transform({ text: '12\nabc\n34' }, baseOptions(), t)).toThrow('不是有效数字：abc')
  })

  it('负数格式化', () => {
    expect(transform({ text: '-1234.5' }, baseOptions(), t)).toBe('-1,234.50')
  })

  it('零格式化', () => {
    expect(transform({ text: '0' }, baseOptions(), t)).toBe('0.00')
  })

  it('极大值 1e15 格式化', () => {
    expect(transform({ text: '1000000000000000' }, baseOptions(), t)).toBe(
      '1,000,000,000,000,000.00',
    )
  })

  it('Infinity 输入抛错', () => {
    expect(() => transform({ text: 'Infinity' }, baseOptions(), t)).toThrow('不是有效数字')
  })

  it('精度边界：0.1+0.2 按 2 位小数四舍五入', () => {
    expect(transform({ text: String(0.1 + 0.2) }, baseOptions(), t)).toBe('0.30')
  })

  it('关闭千分位', () => {
    const options = baseOptions()
    options.grouping = false
    expect(transform({ text: '1234567.891' }, options, t)).toBe('1234567.89')
  })

  it('百分比模式', () => {
    const options = baseOptions()
    options.mode = 'percent'
    expect(transform({ text: '0.1234' }, options, t)).toBe('12.34%')
  })

  it('科学计数法模式', () => {
    const options = baseOptions()
    options.mode = 'scientific'
    expect(transform({ text: '12345' }, options, t)).toBe('1.23E4')
  })

  it('多行输入逐行格式化，空行跳过', () => {
    expect(transform({ text: '1\n\n22\n333' }, baseOptions(), t)).toBe('1.00\n22.00\n333.00')
  })

  it('小数位数选项生效', () => {
    const options = baseOptions()
    options.decimals = '0'
    expect(transform({ text: '1234.567' }, options, t)).toBe('1,235')
  })

  it('缺省选项走默认值分支', () => {
    const partial = {} as NumberFormatOptions
    expect(transform({ text: '1234.5' }, partial, t)).toBe('1,234.50')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, baseOptions(), t)).toThrow(
      '输入超过 200,000 字符上限',
    )
  })

  it('超长输入英文报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, baseOptions(), ten)).toThrow(
      'Input exceeds the 200,000 character limit',
    )
  })
})

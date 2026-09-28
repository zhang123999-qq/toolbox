import { describe, expect, it } from 'vitest'
import {
  UNIT_DECIMALS,
  convertTokenAmount,
  resolveDecimals,
  toRawInteger,
  transform,
} from './utils'

describe('token-decimals · resolveDecimals', () => {
  it('预置单位返回正确 decimals', () => {
    expect(resolveDecimals('wei', '')).toBe(0)
    expect(resolveDecimals('gwei', '')).toBe(9)
    expect(resolveDecimals('ether', '')).toBe(18)
  })

  it('自定义 decimals 合法值', () => {
    expect(resolveDecimals('自定义', '6')).toBe(6)
    expect(resolveDecimals('自定义', ' 0 ')).toBe(0)
    expect(resolveDecimals('自定义', '255')).toBe(255)
  })

  it('自定义为空报错', () => {
    expect(() => resolveDecimals('自定义', '  ')).toThrow('decimals')
  })

  it('自定义非整数报错', () => {
    expect(() => resolveDecimals('自定义', '6.5')).toThrow('非负整数')
    expect(() => resolveDecimals('自定义', '-1')).toThrow('非负整数')
  })

  it('自定义超过 255 报错', () => {
    expect(() => resolveDecimals('自定义', '256')).toThrow('过大')
  })

  it('未知单位报错', () => {
    expect(() => resolveDecimals('finney', '')).toThrow('未知单位')
  })

  it('UNIT_DECIMALS 与预置一致', () => {
    expect(UNIT_DECIMALS).toEqual({ wei: 0, gwei: 9, ether: 18 })
  })
})

describe('token-decimals · convertTokenAmount', () => {
  it('1 ether → wei', () => {
    expect(convertTokenAmount('1', 18, 0)).toBe('1000000000000000000')
  })

  it('1 wei → ether', () => {
    expect(convertTokenAmount('1', 0, 18)).toBe('0.000000000000000001')
  })

  it('1 gwei → wei', () => {
    expect(convertTokenAmount('1', 9, 0)).toBe('1000000000')
  })

  it('小数换算去尾零', () => {
    expect(convertTokenAmount('1.5', 18, 18)).toBe('1.5')
    expect(convertTokenAmount('0.1', 18, 9)).toBe('100000000')
  })

  it('同精度恒等', () => {
    expect(convertTokenAmount('123.456', 6, 6)).toBe('123.456')
  })

  it('千分位逗号被忽略', () => {
    expect(convertTokenAmount('1,000', 18, 0)).toBe('1000000000000000000000')
  })

  it('零值', () => {
    expect(convertTokenAmount('0', 18, 0)).toBe('0')
    expect(convertTokenAmount('0.0', 0, 18)).toBe('0')
  })

  it('超出精度的尾零不报错（无精度损失）', () => {
    expect(convertTokenAmount('1.50', 1, 1)).toBe('1.5')
    expect(toRawInteger('2.00', 0)).toBe('2')
  })

  it('空输入报错', () => {
    expect(() => convertTokenAmount('  ', 18, 18)).toThrow('请输入')
  })

  it('非法格式报错', () => {
    expect(() => convertTokenAmount('abc', 18, 18)).toThrow('格式错误')
    expect(() => convertTokenAmount('-1', 18, 18)).toThrow('格式错误')
    expect(() => convertTokenAmount('1.2.3', 18, 18)).toThrow('格式错误')
  })

  it('小数位数超出源精度报错', () => {
    expect(() => convertTokenAmount('1.0000000001', 9, 9)).toThrow('超出源精度')
  })

  it('大数精确无浮点误差', () => {
    // 0.1 + 0.2 类场景：直接换算 0.3 ether
    expect(convertTokenAmount('0.3', 18, 0)).toBe('300000000000000000')
  })
})

describe('token-decimals · toRawInteger', () => {
  it('1.5 ether → raw', () => {
    expect(toRawInteger('1.5', 18)).toBe('1500000000000000000')
  })

  it('整数 wei', () => {
    expect(toRawInteger('42', 0)).toBe('42')
  })

  it('空输入报错', () => {
    expect(() => toRawInteger('', 18)).toThrow('请输入')
  })

  it('非法格式报错', () => {
    expect(() => toRawInteger('x', 18)).toThrow('格式错误')
  })

  it('小数位数超出源精度报错', () => {
    expect(() => toRawInteger('1.0000000001', 9)).toThrow('超出源精度')
  })
})

describe('token-decimals · transform', () => {
  const opts = { fromUnit: 'ether', toUnit: 'wei', customFrom: '', customTo: '' }

  it('空输入返回空串', () => {
    expect(transform({ text: '  ' }, opts)).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, opts)).toThrow('200,000')
  })

  it('正常换算输出三行', () => {
    const out = transform({ text: '1' }, opts)
    expect(out).toContain('输入：1（ether）')
    expect(out).toContain('结果：1000000000000000000（wei）')
    expect(out).toContain('最小单位整数：1000000000000000000')
  })

  it('源为 wei 时不输出最小单位行', () => {
    const out = transform(
      { text: '1000000000' },
      { fromUnit: 'wei', toUnit: 'gwei', customFrom: '', customTo: '' },
    )
    expect(out).toContain('结果：1（gwei）')
    expect(out).not.toContain('最小单位整数')
  })

  it('自定义单位显示 decimals', () => {
    const out = transform(
      { text: '1' },
      { fromUnit: '自定义', toUnit: '自定义', customFrom: '6', customTo: '6' },
    )
    expect(out).toContain('6 decimals')
    expect(out).toContain('结果：1（6 decimals）')
  })

  it('非法数值透出中文错误', () => {
    expect(() => transform({ text: 'abc' }, opts)).toThrow('格式错误')
  })
})

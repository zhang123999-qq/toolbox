import { describe, expect, it } from 'vitest'
import { transform } from './utils'

const empty = {}

describe('calculator / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
    expect(transform({ text: '   ' }, empty)).toBe('')
  })

  it('四则运算与优先级', () => {
    expect(transform({ text: '2+3*4' }, empty)).toBe('14')
    expect(transform({ text: '(2+3)*4' }, empty)).toBe('20')
    expect(transform({ text: '10/4' }, empty)).toBe('2.5')
    expect(transform({ text: '10%3' }, empty)).toBe('1')
  })

  it('压平 0.1+0.2 浮点噪声', () => {
    expect(transform({ text: '0.1+0.2' }, empty)).toBe('0.3')
  })

  it('三角函数（deg 单位）', () => {
    expect(transform({ text: 'sin(45 deg)' }, empty)).toBe('0.70710678118655')
    expect(transform({ text: 'sin(pi/2)' }, empty)).toBe('1')
  })

  it('对数 / 开方 / 阶乘 / 常量', () => {
    expect(transform({ text: 'sqrt(16)' }, empty)).toBe('4')
    expect(transform({ text: 'log(100, 10)' }, empty)).toBe('2')
    expect(transform({ text: 'log(e)' }, empty)).toBe('1')
    expect(transform({ text: '5!' }, empty)).toBe('120')
    expect(transform({ text: '2^10' }, empty)).toBe('1024')
  })

  it('示例表达式', () => {
    expect(transform({ text: 'sqrt(2^10) + sin(45 deg)' }, empty)).toBe('32.707106781187')
  })

  it('无效表达式抛中文错', () => {
    expect(() => transform({ text: '2+' }, empty)).toThrow(/表达式无效，请检查语法/)
    expect(() => transform({ text: 'foo(' }, empty)).toThrow(/表达式无效，请检查语法/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, empty)).toThrow(/200,000/)
  })
})

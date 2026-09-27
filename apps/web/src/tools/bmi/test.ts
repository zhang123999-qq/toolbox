import { describe, expect, it } from 'vitest'
import { classifyBmi, fmt, transform } from './utils'

const noOptions = {}

describe('bmi / 示例输出', () => {
  it('175cm / 70kg → BMI 22.9 正常', () => {
    expect(transform({ text: '175', textB: '70' }, noOptions)).toBe(
      ['身高：175 cm 体重：70 kg', 'BMI：22.9', '分级：正常', '健康体重范围：56.7 – 73.5 kg'].join(
        '\n',
      ),
    )
  })
})

describe('bmi / 四个分级', () => {
  it('偏瘦：170cm / 50kg', () => {
    const out = transform({ text: '170', textB: '50' }, noOptions)
    expect(out).toContain('BMI：17.3')
    expect(out).toContain('分级：偏瘦')
  })

  it('正常：175cm / 70kg', () => {
    expect(transform({ text: '175', textB: '70' }, noOptions)).toContain('分级：正常')
  })

  it('超重：170cm / 75kg', () => {
    const out = transform({ text: '170', textB: '75' }, noOptions)
    expect(out).toContain('BMI：26.0')
    expect(out).toContain('分级：超重')
  })

  it('肥胖：170cm / 90kg', () => {
    const out = transform({ text: '170', textB: '90' }, noOptions)
    expect(out).toContain('BMI：31.1')
    expect(out).toContain('分级：肥胖')
  })
})

describe('bmi / classifyBmi 分界点', () => {
  it('18.5 → 正常（200cm / 74kg）', () => {
    expect(transform({ text: '200', textB: '74' }, noOptions)).toContain('分级：正常')
  })

  it('24 → 超重（200cm / 96kg）', () => {
    expect(transform({ text: '200', textB: '96' }, noOptions)).toContain('分级：超重')
  })

  it('28 → 肥胖（200cm / 112kg）', () => {
    expect(transform({ text: '200', textB: '112' }, noOptions)).toContain('分级：肥胖')
  })

  it('classifyBmi 直接断言四档', () => {
    expect(classifyBmi(17)).toBe('偏瘦')
    expect(classifyBmi(22)).toBe('正常')
    expect(classifyBmi(26)).toBe('超重')
    expect(classifyBmi(30)).toBe('肥胖')
  })
})

describe('bmi / 身高校验', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '70' }, noOptions)).toBe('')
    expect(transform({ text: '   ', textB: '70' }, noOptions)).toBe('')
  })

  it('非数字报错', () => {
    expect(() => transform({ text: 'abc', textB: '70' }, noOptions)).toThrow(/身高请输入有效的数字/)
  })

  it('低于 50 报错', () => {
    expect(() => transform({ text: '49', textB: '70' }, noOptions)).toThrow(
      /身高应在 50–300 cm 之间/,
    )
  })

  it('高于 300 报错', () => {
    expect(() => transform({ text: '301', textB: '70' }, noOptions)).toThrow(
      /身高应在 50–300 cm 之间/,
    )
  })

  it('边界 50 / 300 通过', () => {
    expect(transform({ text: '50', textB: '20' }, noOptions)).toContain('BMI：')
    expect(transform({ text: '300', textB: '100' }, noOptions)).toContain('BMI：')
  })
})

describe('bmi / 体重校验', () => {
  it('非数字报错', () => {
    expect(() => transform({ text: '175', textB: 'abc' }, noOptions)).toThrow(
      /体重请输入有效的数字/,
    )
  })

  it('0 与负数报错', () => {
    expect(() => transform({ text: '175', textB: '0' }, noOptions)).toThrow(/体重必须大于 0/)
    expect(() => transform({ text: '175', textB: '-5' }, noOptions)).toThrow(/体重必须大于 0/)
  })

  it('超过 1000 报错', () => {
    expect(() => transform({ text: '175', textB: '1001' }, noOptions)).toThrow(/体重超出合理范围/)
  })

  it('边界 1000 通过', () => {
    expect(transform({ text: '175', textB: '1000' }, noOptions)).toContain('BMI：')
  })
})

describe('bmi / fmt', () => {
  it('去掉浮点尾巴', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
    expect(fmt(22.857142857142858)).toBe('22.8571428571')
  })
})

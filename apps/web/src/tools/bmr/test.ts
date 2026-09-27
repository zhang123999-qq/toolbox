import { describe, expect, it } from 'vitest'
import { calcBmr, fmt, harris, mifflin, transform } from './utils'

const base = { text: '175', textB: '70' }
const male30Mifflin = { gender: '男', age: '30', formula: 'Mifflin-St Jeor' }

describe('bmr / 2 公式 × 2 性别', () => {
  it('Mifflin 男：175/70/30 → 1648.8', () => {
    expect(transform(base, male30Mifflin)).toBe('BMR：1648.8 kcal/天（Mifflin-St Jeor，男，30 岁）')
  })

  it('Mifflin 女：175/70/30 → 1482.8', () => {
    expect(transform(base, { gender: '女', age: '30', formula: 'Mifflin-St Jeor' })).toBe(
      'BMR：1482.8 kcal/天（Mifflin-St Jeor，女，30 岁）',
    )
  })

  it('Harris 男：175/70/30 → 1695.7', () => {
    expect(transform(base, { gender: '男', age: '30', formula: 'Harris-Benedict' })).toBe(
      'BMR：1695.7 kcal/天（Harris-Benedict，男，30 岁）',
    )
  })

  it('Harris 女：165/60/25 → 1405.3', () => {
    expect(
      transform(
        { text: '165', textB: '60' },
        { gender: '女', age: '25', formula: 'Harris-Benedict' },
      ),
    ).toBe('BMR：1405.3 kcal/天（Harris-Benedict，女，25 岁）')
  })
})

describe('bmr / mifflin / harris / calcBmr', () => {
  it('公式函数直接断言', () => {
    expect(mifflin(70, 175, 30, '男')).toBe(1648.75)
    expect(mifflin(70, 175, 30, '女')).toBe(1482.75)
    expect(harris(70, 175, 30, '男')).toBeCloseTo(1695.667, 3)
    expect(harris(60, 165, 25, '女')).toBeCloseTo(1405.333, 3)
  })

  it('calcBmr 非法性别/公式抛错', () => {
    expect(() => calcBmr(70, 175, 30, 'X', 'Mifflin-St Jeor')).toThrow(/性别非法/)
    expect(() => calcBmr(70, 175, 30, '男', 'X')).toThrow(/公式非法/)
  })
})

describe('bmr / 年龄校验', () => {
  it('空年龄报错', () => {
    expect(() => transform(base, { ...male30Mifflin, age: '' })).toThrow(/年龄不能为空/)
    expect(() => transform(base, { ...male30Mifflin, age: '   ' })).toThrow(/年龄不能为空/)
  })

  it('非数字 / 非整数 / 越界报错', () => {
    for (const age of ['abc', '30.5', '0', '121', '-3']) {
      expect(() => transform(base, { ...male30Mifflin, age })).toThrow(/年龄应为 1–120 的整数/)
    }
  })

  it('边界 1 / 120 通过', () => {
    expect(transform(base, { ...male30Mifflin, age: '1' })).toContain('1 岁')
    expect(transform(base, { ...male30Mifflin, age: '120' })).toContain('120 岁')
  })
})

describe('bmr / 性别与公式校验', () => {
  it('非法性别报错', () => {
    expect(() => transform(base, { ...male30Mifflin, gender: 'X' })).toThrow(/性别非法/)
  })

  it('非法公式报错', () => {
    expect(() => transform(base, { ...male30Mifflin, formula: 'X' })).toThrow(/公式非法/)
  })
})

describe('bmr / 身高体重校验（同 bmi）', () => {
  it('空身高返回空串', () => {
    expect(transform({ text: '', textB: '70' }, male30Mifflin)).toBe('')
  })

  it('非法身高/体重报错', () => {
    expect(() => transform({ text: 'abc', textB: '70' }, male30Mifflin)).toThrow(
      /身高请输入有效的数字/,
    )
    expect(() => transform({ text: '40', textB: '70' }, male30Mifflin)).toThrow(
      /身高应在 50–300 cm 之间/,
    )
    expect(() => transform({ text: '175', textB: 'abc' }, male30Mifflin)).toThrow(
      /体重请输入有效的数字/,
    )
    expect(() => transform({ text: '175', textB: '0' }, male30Mifflin)).toThrow(/体重必须大于 0/)
    expect(() => transform({ text: '175', textB: '1001' }, male30Mifflin)).toThrow(
      /体重超出合理范围/,
    )
  })
})

describe('bmr / fmt', () => {
  it('去掉浮点尾巴', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })
})

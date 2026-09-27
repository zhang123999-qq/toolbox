import { describe, expect, it } from 'vitest'
import { classifyBodyFat, fmt, navyFemale, navyMale, transform } from './utils'

const male = { gender: '男' }
const female = { gender: '女' }
const maleExample = { text: '85', textB: '38', textC: '175', textD: '' }

describe('body-fat / 男女各一例', () => {
  it('男：腰 85 / 颈 38 / 身高 175 → 16.9% 健康', () => {
    expect(transform(maleExample, male)).toBe('体脂率：16.9%\n分级：健康（男性标准）')
  })

  it('女：腰 70 / 臀 95 / 颈 32 / 身高 165 → 24.9% 健康', () => {
    expect(transform({ text: '70', textB: '32', textC: '165', textD: '95' }, female)).toBe(
      '体脂率：24.9%\n分级：健康（女性标准）',
    )
  })
})

describe('body-fat / navyMale / navyFemale（±0.2 误差）', () => {
  it('男公式已知值', () => {
    expect(navyMale(85, 38, 175)).toBeCloseTo(16.93, 1)
  })

  it('女公式已知值', () => {
    expect(navyFemale(70, 95, 32, 165)).toBeCloseTo(24.86, 1)
  })
})

describe('body-fat / classifyBodyFat 分级边界', () => {
  it('男性边界：分界值归入更健康一档', () => {
    expect(classifyBodyFat(13.9, '男')).toBe('偏低')
    expect(classifyBodyFat(14, '男')).toBe('健康')
    expect(classifyBodyFat(18, '男')).toBe('健康')
    expect(classifyBodyFat(18.1, '男')).toBe('超重')
    expect(classifyBodyFat(25, '男')).toBe('超重')
    expect(classifyBodyFat(25.1, '男')).toBe('肥胖')
  })

  it('女性边界', () => {
    expect(classifyBodyFat(20.9, '女')).toBe('偏低')
    expect(classifyBodyFat(21, '女')).toBe('健康')
    expect(classifyBodyFat(25, '女')).toBe('健康')
    expect(classifyBodyFat(25.1, '女')).toBe('超重')
    expect(classifyBodyFat(32, '女')).toBe('超重')
    expect(classifyBodyFat(32.1, '女')).toBe('肥胖')
  })
})

describe('body-fat / 空输入与性别校验', () => {
  it('腰围留空返回空串', () => {
    expect(transform({ text: '', textB: '38', textC: '175', textD: '' }, male)).toBe('')
    expect(transform({ text: '   ', textB: '38', textC: '175', textD: '' }, male)).toBe('')
  })

  it('非法性别报错', () => {
    expect(() => transform(maleExample, { gender: 'X' })).toThrow(/性别非法/)
  })
})

describe('body-fat / 围度数值校验', () => {
  it('腰围非数字 / 非正数报错', () => {
    expect(() => transform({ ...maleExample, text: 'abc' }, male)).toThrow(/腰围请输入有效的数字/)
    expect(() => transform({ ...maleExample, text: '0' }, male)).toThrow(/腰围必须大于 0/)
    expect(() => transform({ ...maleExample, text: '-5' }, male)).toThrow(/腰围必须大于 0/)
  })

  it('颈围非数字 / 非正数报错', () => {
    expect(() => transform({ ...maleExample, textB: 'abc' }, male)).toThrow(/颈围请输入有效的数字/)
    expect(() => transform({ ...maleExample, textB: '0' }, male)).toThrow(/颈围必须大于 0/)
  })

  it('身高非数字 / 非正数报错', () => {
    expect(() => transform({ ...maleExample, textC: 'abc' }, male)).toThrow(/身高请输入有效的数字/)
    expect(() => transform({ ...maleExample, textC: '-1' }, male)).toThrow(/身高必须大于 0/)
  })
})

describe('body-fat / 男性特有校验', () => {
  it('腰围 ≤ 颈围报错', () => {
    expect(() => transform({ ...maleExample, text: '38', textB: '38' }, male)).toThrow(
      /腰围必须大于颈围/,
    )
  })

  it('男性不校验臀围：留空或乱填都通过', () => {
    expect(transform(maleExample, male)).toContain('体脂率：')
    expect(transform({ ...maleExample, textD: 'abc' }, male)).toContain('体脂率：')
  })
})

describe('body-fat / 女性特有校验', () => {
  const femaleBase = { text: '70', textB: '32', textC: '165', textD: '95' }

  it('臀围留空报错', () => {
    expect(() => transform({ ...femaleBase, textD: '' }, female)).toThrow(/女性需填写臀围/)
    expect(() => transform({ ...femaleBase, textD: '   ' }, female)).toThrow(/女性需填写臀围/)
  })

  it('臀围非数字 / 非正数报错', () => {
    expect(() => transform({ ...femaleBase, textD: 'abc' }, female)).toThrow(/臀围请输入有效的数字/)
    expect(() => transform({ ...femaleBase, textD: '0' }, female)).toThrow(/臀围必须大于 0/)
  })

  it('腰围 + 臀围 ≤ 颈围报错', () => {
    expect(() => transform({ text: '30', textB: '70', textC: '165', textD: '40' }, female)).toThrow(
      /腰围与臀围之和必须大于颈围/,
    )
  })
})

describe('body-fat / fmt', () => {
  it('去掉浮点尾巴', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })
})

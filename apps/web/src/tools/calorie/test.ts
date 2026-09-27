import { describe, expect, it } from 'vitest'
import { fmt, mifflin, transform } from './utils'

const base = { text: '175', textB: '70' }
const male30 = { gender: '男', age: '30', activity: '中度活动' }

describe('calorie / 示例输出（中度活动）', () => {
  it('175/70/男/30/中度活动', () => {
    expect(transform(base, male30)).toBe(
      [
        '基础代谢（BMR）：1648.8 kcal/天',
        '每日所需（TDEE，中度活动）：2556 kcal/天',
        '减重建议：约 2056 kcal/天 增重建议：约 3056 kcal/天',
      ].join('\n'),
    )
  })
})

describe('calorie / 5 档活动系数', () => {
  it('久坐 ×1.2', () => {
    const out = transform(base, { ...male30, activity: '久坐' })
    expect(out).toContain('每日所需（TDEE，久坐）：1979 kcal/天')
    expect(out).toContain('减重建议：约 1479 kcal/天')
    expect(out).toContain('增重建议：约 2479 kcal/天')
  })

  it('轻度活动 ×1.375', () => {
    const out = transform(base, { ...male30, activity: '轻度活动' })
    expect(out).toContain('每日所需（TDEE，轻度活动）：2267 kcal/天')
    expect(out).toContain('减重建议：约 1767 kcal/天')
    expect(out).toContain('增重建议：约 2767 kcal/天')
  })

  it('中度活动 ×1.55', () => {
    const out = transform(base, { ...male30, activity: '中度活动' })
    expect(out).toContain('每日所需（TDEE，中度活动）：2556 kcal/天')
  })

  it('高度活动 ×1.725', () => {
    const out = transform(base, { ...male30, activity: '高度活动' })
    expect(out).toContain('每日所需（TDEE，高度活动）：2844 kcal/天')
    expect(out).toContain('减重建议：约 2344 kcal/天')
    expect(out).toContain('增重建议：约 3344 kcal/天')
  })

  it('极高强度 ×1.9', () => {
    const out = transform(base, { ...male30, activity: '极高强度' })
    expect(out).toContain('每日所需（TDEE，极高强度）：3133 kcal/天')
    expect(out).toContain('减重建议：约 2633 kcal/天')
    expect(out).toContain('增重建议：约 3633 kcal/天')
  })
})

describe('calorie / mifflin（与 bmr 各自实现）', () => {
  it('男女公式', () => {
    expect(mifflin(70, 175, 30, '男')).toBe(1648.75)
    expect(mifflin(70, 175, 30, '女')).toBe(1482.75)
  })
})

describe('calorie / 非法输入全分支', () => {
  it('空身高返回空串', () => {
    expect(transform({ text: '', textB: '70' }, male30)).toBe('')
  })

  it('身高/体重校验', () => {
    expect(() => transform({ text: 'abc', textB: '70' }, male30)).toThrow(/身高请输入有效的数字/)
    expect(() => transform({ text: '40', textB: '70' }, male30)).toThrow(/身高应在 50–300 cm 之间/)
    expect(() => transform({ text: '175', textB: 'abc' }, male30)).toThrow(/体重请输入有效的数字/)
    expect(() => transform({ text: '175', textB: '0' }, male30)).toThrow(/体重必须大于 0/)
    expect(() => transform({ text: '175', textB: '1001' }, male30)).toThrow(/体重超出合理范围/)
  })

  it('年龄校验', () => {
    expect(() => transform(base, { ...male30, age: '' })).toThrow(/年龄不能为空/)
    expect(() => transform(base, { ...male30, age: 'abc' })).toThrow(/年龄应为 1–120 的整数/)
    expect(() => transform(base, { ...male30, age: '30.5' })).toThrow(/年龄应为 1–120 的整数/)
    expect(() => transform(base, { ...male30, age: '0' })).toThrow(/年龄应为 1–120 的整数/)
    expect(() => transform(base, { ...male30, age: '121' })).toThrow(/年龄应为 1–120 的整数/)
  })

  it('性别非法报错', () => {
    expect(() => transform(base, { ...male30, gender: 'X' })).toThrow(/性别非法/)
  })

  it('活动强度非法报错', () => {
    expect(() => transform(base, { ...male30, activity: '躺平' })).toThrow(/活动强度非法/)
  })
})

describe('calorie / fmt', () => {
  it('去掉浮点尾巴', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })
})

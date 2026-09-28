/**
 * rtl（#725）utils 单测：双向文本分析。
 */
import { describe, expect, it } from 'vitest'
import { analyzeBidi, charDir, formatBidi } from './utils'

describe('charDir 方向分支', () => {
  it('覆盖全部方向分支', () => {
    // RTL 各范围
    expect(charDir('א')).toBe('rtl') // 希伯来 \u05D0
    expect(charDir('م')).toBe('rtl') // 阿拉伯 \u0645
    expect(charDir('ݐ')).toBe('rtl') // \u0750 范围
    expect(charDir('ࢠ')).toBe('rtl') // \u08A0 范围
    expect(charDir('ﭐ')).toBe('rtl') // \uFB50 范围
    expect(charDir('ﹰ')).toBe('rtl') // \uFE70 范围
    // LTR 各范围
    expect(charDir('A')).toBe('ltr')
    expect(charDir('z')).toBe('ltr')
    expect(charDir('Ω')).toBe('ltr') // 希腊
    expect(charDir('Ж')).toBe('ltr') // 西里尔
    expect(charDir('中')).toBe('ltr') // 中日韩
    // 中性
    expect(charDir('5')).toBe('neutral')
    expect(charDir(' ')).toBe('neutral')
    expect(charDir('😀')).toBe('neutral')
  })
})

describe('analyzeBidi', () => {
  it('空输入抛中文错', () => {
    expect(() => analyzeBidi('')).toThrow('请输入文本')
  })
  it('纯 LTR', () => {
    const a = analyzeBidi('Hello 世界')
    expect(a).toMatchObject({ ltr: 7, rtl: 0, neutral: 1, dominant: 'ltr', mixed: false })
    expect(a.total).toBe(8)
    expect(a.suspicious).toEqual([])
  })
  it('纯 RTL', () => {
    const a = analyzeBidi('مرحبا')
    expect(a.dominant).toBe('rtl')
    expect(a.rtl).toBe(5)
    expect(a.mixed).toBe(false)
  })
  it('纯中性', () => {
    const a = analyzeBidi('123 !')
    expect(a.dominant).toBe('neutral')
    expect(a.neutral).toBe(5)
  })
  it('数量相等时主导为中性', () => {
    const a = analyzeBidi('Aم')
    expect(a.dominant).toBe('neutral')
    expect(a.mixed).toBe(true)
  })
  it('混合文本标出少数方向位置', () => {
    const a = analyzeBidi('Helloمworld')
    expect(a.mixed).toBe(true)
    expect(a.dominant).toBe('ltr')
    expect(a.suspicious).toEqual([{ index: 5, char: 'م', dir: 'rtl' }])
  })
  it('RTL 主导时少数方向为 LTR', () => {
    const a = analyzeBidi('مرحباA')
    expect(a.dominant).toBe('rtl')
    expect(a.suspicious).toEqual([{ index: 5, char: 'A', dir: 'ltr' }])
  })
  it('可疑位置最多 10 个', () => {
    const a = analyzeBidi('A'.repeat(20) + 'م'.repeat(15))
    expect(a.suspicious).toHaveLength(10)
    expect(a.suspicious[0].index).toBe(20)
    expect(a.suspicious[9].index).toBe(29)
  })
  it('UTF-16 下标对增补字符正确', () => {
    const a = analyzeBidi('A😀م')
    expect(a.suspicious).toEqual([{ index: 3, char: 'م', dir: 'rtl' }])
    expect(a.total).toBe(3)
  })
})

describe('formatBidi', () => {
  it('纯 LTR 输出', () => {
    const text = formatBidi(analyzeBidi('Hello'))
    expect(text).toContain('主导方向：从左到右（LTR）')
    expect(text).toContain('共 5 个（LTR 5 / RTL 0 / 中性 0）')
    expect(text).toContain('未发现方向混合 ✓')
  })
  it('混合输出警告与位置', () => {
    const text = formatBidi(analyzeBidi('Aم'))
    expect(text).toContain('⚠')
    expect(text).toContain('下标 1 处「م」（RTL）')
  })
  it('超过 10 处截断提示', () => {
    const text = formatBidi(analyzeBidi('A'.repeat(20) + 'م'.repeat(15)))
    expect(text).toContain('仅显示前 10 处')
  })
  it('RTL 主导输出', () => {
    const text = formatBidi(analyzeBidi('مرحبا'))
    expect(text).toContain('主导方向：从右到左（RTL）')
  })
  it('少数方向为 LTR 时标注 LTR', () => {
    const text = formatBidi(analyzeBidi('مرحباA'))
    expect(text).toContain('下标 5 处「A」（LTR）')
  })
})

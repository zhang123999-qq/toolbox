import { describe, expect, it } from 'vitest'
import { LEVELS, assess, format, transform, translateDuration, translateMessage } from './utils'

const WEAK = '123456'
const MEDIUM_KIND = 'P@ssw0rd'
const STRONG = 'X9#kL2!qZa7$vT3p'

describe('password-strength / 文案翻译', () => {
  it('耗时短语翻成中文', () => {
    expect(translateDuration('less than a second')).toBe('不到 1 秒')
    expect(translateDuration('centuries')).toBe('数百年')
    expect(translateDuration('3 hours')).toBe('3 小时')
    expect(translateDuration('11 months')).toBe('11 个月')
    expect(translateDuration('unknown thing')).toBe('unknown thing')
  })

  it('提示语翻成中文，未收录的原样返回', () => {
    expect(translateMessage('This is a top-10 common password')).toBe('这是排名前十的常见密码')
    expect(translateMessage('从未收录的提示')).toBe('从未收录的提示')
  })

  it('档位表与 zxcvbn 的 0–4 分对齐', () => {
    expect(LEVELS).toEqual(['极弱', '弱', '一般', '较强', '强'])
  })
})

describe('password-strength / 评估', () => {
  it('常见弱口令得 0 分并给出风险提示', () => {
    const result = assess(WEAK)
    expect(result.score).toBe(0)
    expect(result.level).toBe('极弱')
    expect(result.warning).not.toBe('')
  })

  it('“P@ssw0rd” 这类花活仍是 0 分（与常见密码过于接近）', () => {
    const result = assess(MEDIUM_KIND)
    expect(result.score).toBe(0)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('长且无规律的口令得 4 分', () => {
    const result = assess(STRONG)
    expect(result.score).toBe(4)
    expect(result.level).toBe('强')
    // 快哈希场景（1e10 次/秒）下也扛得住：这里断言的是「不是瞬时」，具体数字随字典版本浮动
    expect(result.offlineSlow).toMatch(/年|世纪|数百年|个月/)
  })

  it('评估是确定性的', () => {
    expect(assess(MEDIUM_KIND)).toEqual(assess(MEDIUM_KIND))
  })

  it('输出含强度、三种破解场景与建议', () => {
    const output = format(assess(MEDIUM_KIND))
    expect(output).toContain('强度 0 / 4（极弱）')
    expect(output).toContain('在线破解')
    expect(output).toContain('建议：')
  })

  it('没有风险提示时就不输出「风险」段', () => {
    expect(format(assess(STRONG))).not.toContain('风险：')
  })
})

describe('password-strength / transform', () => {
  it('按输入评估', () => {
    expect(transform({ text: WEAK }, {})).toContain('强度 0 / 4')
    expect(transform({ text: STRONG }, {})).toContain('强度 4 / 4')
  })

  it('空输入返回空串（不评估）', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })
})

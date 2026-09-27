import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import { SIGN_IDS, pairScore, signDisplayName, tierOf, transform } from './utils'
import type { SignId } from './utils'

const t = createTranslator('zh')
const nameOf = (id: SignId): string => signDisplayName(id, t)
const input = { text: '', textB: '' }

describe('zodiac-match / pairScore 评分规则', () => {
  it('同星座得同频分 92', () => {
    expect(pairScore('aries', 'aries')).toBe(92)
    expect(pairScore('pisces', 'pisces')).toBe(92)
  })

  it('经典对宫组合取对宫分（覆盖元素基础分）', () => {
    expect(pairScore('aries', 'libra')).toBe(93)
    expect(pairScore('libra', 'aries')).toBe(93)
    expect(pairScore('taurus', 'scorpio')).toBe(91)
    expect(pairScore('virgo', 'pisces')).toBe(92)
  })

  it('元素无序对基础分：火风互旺 88，火水相克 55', () => {
    expect(pairScore('leo', 'gemini')).toBe(88) // 火 × 风
    expect(pairScore('aries', 'cancer')).toBe(55) // 火 × 水
    expect(pairScore('taurus', 'pisces')).toBe(86) // 土 × 水
    expect(pairScore('gemini', 'virgo')).toBe(62) // 风 × 土
  })

  it('12×12 矩阵对称：score(a,b) === score(b,a)', () => {
    for (const a of SIGN_IDS) {
      for (const b of SIGN_IDS) {
        expect(pairScore(a, b)).toBe(pairScore(b, a))
      }
    }
  })

  it('12×12 矩阵全覆盖：144 格分数都是 0–100 的整数', () => {
    for (const a of SIGN_IDS) {
      for (const b of SIGN_IDS) {
        const score = pairScore(a, b)
        expect(Number.isInteger(score)).toBe(true)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('zodiac-match / tierOf 档位', () => {
  it('90 及以上为天作之合档', () => {
    expect(tierOf(90)).toBe(5)
    expect(tierOf(100)).toBe(5)
  })

  it('80–89 为非常合拍档', () => {
    expect(tierOf(89)).toBe(4)
    expect(tierOf(80)).toBe(4)
  })

  it('70–79 为相当合拍档', () => {
    expect(tierOf(79)).toBe(3)
    expect(tierOf(70)).toBe(3)
  })

  it('60–69 为需要磨合档', () => {
    expect(tierOf(69)).toBe(2)
    expect(tierOf(60)).toBe(2)
  })

  it('60 以下为挑战不小档', () => {
    expect(tierOf(59)).toBe(1)
    expect(tierOf(0)).toBe(1)
  })
})

describe('zodiac-match / signDisplayName', () => {
  it('中文展示名含中英两名', () => {
    expect(nameOf('aries')).toBe('白羊座 Aries')
    expect(nameOf('pisces')).toBe('双鱼座 Pisces')
  })

  it('英文展示名以英文开头', () => {
    const en = createTranslator('en')
    expect(signDisplayName('aries', en)).toBe('Aries (白羊座)')
  })
})

describe('zodiac-match / transform 配对报告', () => {
  it('名字留空时用星座名展示并输出完整报告', () => {
    const out = transform(input, { signA: nameOf('aries'), signB: nameOf('libra') }, t)
    expect(out).toContain('配对组合：白羊座 Aries × 天秤座 Libra')
    expect(out).toContain('配对评分：93 / 100')
    expect(out).toContain('元素组合：火象 × 风象')
    expect(out).toContain('配对结论：天作之合')
    expect(out).toContain('组合解析：')
    expect(out).toContain('相处建议：')
  })

  it('填了名字则名字拼在星座前', () => {
    const out = transform(
      { text: '小明', textB: '小红' },
      { signA: nameOf('aries'), signB: nameOf('libra') },
      t,
    )
    expect(out).toContain('小明（白羊座 Aries） × 小红（天秤座 Libra）')
  })

  it('只填一边名字时另一边用星座名', () => {
    const out = transform(
      { text: '  小明  ', textB: '' },
      { signA: nameOf('leo'), signB: nameOf('leo') },
      t,
    )
    expect(out).toContain('小明（狮子座 Leo） × 狮子座 Leo')
    expect(out).toContain('配对评分：92 / 100')
  })

  it('低分配对进入挑战档并给出对应建议', () => {
    const out = transform(input, { signA: nameOf('aries'), signB: nameOf('cancer') }, t)
    expect(out).toContain('配对评分：55 / 100')
    expect(out).toContain('配对结论：挑战不小')
  })

  it('语言切换后的旧展示名仍可反查（英文展示名 + 中文 t）', () => {
    const enName = signDisplayName('aries', createTranslator('en'))
    const out = transform({ text: '', textB: '' }, { signA: enName, signB: 'libra' }, t)
    expect(out).toContain('配对评分')
  })

  it('语言切换后的旧展示名仍可反查（中文展示名 + 英文 t）', () => {
    const en = createTranslator('en')
    const zhName = signDisplayName('libra', createTranslator('zh'))
    const out = transform({ text: '', textB: '' }, { signA: 'aries', signB: zhName }, en)
    expect(out).toContain('Compatibility score')
  })

  it('直接传星座 id 也认', () => {
    const out = transform({ text: '', textB: '' }, { signA: 'aries', signB: 'libra' }, t)
    expect(out).toContain('配对评分：93 / 100')
  })

  it('非法星座 A 抛双语错误', () => {
    expect(() => transform(input, { signA: '不是星座', signB: nameOf('libra') }, t)).toThrow(
      '未知星座：不是星座',
    )
  })

  it('非法星座 B 抛双语错误', () => {
    expect(() => transform(input, { signA: nameOf('aries'), signB: '??' }, t)).toThrow(
      '未知星座：??',
    )
  })
})

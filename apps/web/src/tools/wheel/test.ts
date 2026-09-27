import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  bilingualError,
  computeSpin,
  hashSeed,
  mulberry32,
  parseSegments,
  parseWinnerCount,
  spin,
  transform,
} from './utils'

const t = createTranslator('zh')
const emptyOptions = {}

describe('wheel / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('wheel.error.tooFew')
    expect(error.message).toContain('至少需要 2 个选项')
    expect(error.message).toContain('at least 2 options')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('wheel.error.tooMany', { max: 24 })
    expect(error.message).toContain('上限 24 个')
    expect(error.message).toContain('max 24')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('wheel.error.countInvalid', {})
    expect(error.message).toContain('{value}')
  })

  it('无参数时模板原样返回', () => {
    const error = bilingualError('wheel.error.empty')
    expect(error.message).toContain('请先输入选项')
  })

  it('hashSeed 空字符串返回 FNV 偏移基数', () => {
    expect(hashSeed('')).toBe(2166136261)
  })

  it('hashSeed 非空字符串：循环体执行，相同输入哈希一致', () => {
    expect(hashSeed('wheel-seed')).toBe(hashSeed('wheel-seed'))
    expect(hashSeed('wheel-seed')).not.toBe(hashSeed(''))
  })
})

describe('wheel / parseSegments 边界', () => {
  it('按行切分、去空白、丢空行', () => {
    expect(parseSegments('苹果\n\n  香蕉  \n橙子\n')).toEqual(['苹果', '香蕉', '橙子'])
  })

  it('空输入 → 空数组（上层按空态处理，不报错）', () => {
    expect(parseSegments('')).toEqual([])
    expect(parseSegments('  \n \n')).toEqual([])
  })

  it('单选项报错（1 个扇区的转盘无意义）', () => {
    expect(() => parseSegments('唯一选项')).toThrow(/至少需要 2 个选项/)
    expect(() => parseSegments('唯一选项')).toThrow(/at least 2 options/)
  })

  it('2 个选项合法（下限边界）', () => {
    expect(parseSegments('a\nb')).toEqual(['a', 'b'])
  })

  it('24 个选项合法（上限边界），25 个报错', () => {
    const ok24 = Array.from({ length: 24 }, (_, i) => '选项' + i).join('\n')
    expect(parseSegments(ok24)).toHaveLength(24)
    const bad25 = Array.from({ length: 25 }, (_, i) => '选项' + i).join('\n')
    expect(() => parseSegments(bad25)).toThrow(/选项过多/)
  })
})

describe('wheel / parseWinnerCount 边界', () => {
  it('空输入报错', () => {
    expect(() => parseWinnerCount('')).toThrow(/请填写获奖人数/)
    expect(() => parseWinnerCount('')).toThrow(/Enter how many winners/)
  })

  it('非整数报错', () => {
    expect(() => parseWinnerCount('abc')).toThrow(/获奖人数无效/)
    expect(() => parseWinnerCount('1.5')).toThrow(/须为非负整数/)
    expect(() => parseWinnerCount('NaN')).toThrow(/获奖人数无效/)
  })

  it('负数报错，0 合法（转盘空转）', () => {
    expect(() => parseWinnerCount('-1')).toThrow(/获奖人数无效/)
    expect(parseWinnerCount('0')).toBe(0)
  })

  it('超上限报错', () => {
    expect(parseWinnerCount('1000')).toBe(1000)
    expect(() => parseWinnerCount('1001')).toThrow(/获奖人数过大/)
  })

  it('首尾空白自动去除', () => {
    expect(parseWinnerCount('  2 ')).toBe(2)
  })
})

describe('wheel / computeSpin', () => {
  const segments = ['a', 'b', 'c', 'd', 'e', 'f']

  it('抽出指定个数的获奖者，无重复', () => {
    const result = computeSpin(segments, 2, mulberry32(42))
    expect(result.winners).toHaveLength(2)
    expect(new Set(result.winners).size).toBe(2)
    expect(result.winnerIndexes).toHaveLength(2)
    for (const name of result.winners) expect(segments).toContain(name)
  })

  it('相同随机源 → 相同获奖者与旋转角度（确定性）', () => {
    const first = computeSpin(segments, 2, mulberry32(42))
    const second = computeSpin(segments, 2, mulberry32(42))
    expect(first.winners).toEqual(second.winners)
    expect(first.finalRotation).toBe(second.finalRotation)
  })

  it('几何正确：转完后顶部指针正对第一位获奖者扇区中心', () => {
    const result = computeSpin(segments, 3, mulberry32(7))
    // 指针在顶部时指向转盘上的角度 = (360 − R mod 360) mod 360
    const pointerAngle = (((360 - (result.finalRotation % 360)) % 360) + 360) % 360
    const expectedCenter = (result.winnerIndexes[0] + 0.5) * result.segmentAngle
    expect(pointerAngle).toBeCloseTo(expectedCenter, 9)
  })

  it('最终旋转角度包含整圈数（观感）', () => {
    const result = computeSpin(segments, 1, mulberry32(1))
    expect(result.fullSpins).toBe(5)
    expect(result.finalRotation).toBeGreaterThanOrEqual(5 * 360)
    expect(result.finalRotation).toBeLessThan(6 * 360)
  })

  it('获奖人数 = 0：空转（只转整圈，无偏移）', () => {
    const result = computeSpin(segments, 0, mulberry32(1))
    expect(result.winners).toEqual([])
    expect(result.winnerIndexes).toEqual([])
    expect(result.finalRotation).toBe(5 * 360)
  })

  it('获奖人数 > 扇区数时报错（中英双语）', () => {
    expect(() => computeSpin(segments, 7, mulberry32(1))).toThrow(/不能大于选项数/)
    expect(() => computeSpin(segments, 7, mulberry32(1))).toThrow(/cannot exceed the option count/)
  })

  it('获奖人数 = 扇区数时全员获奖', () => {
    const result = computeSpin(segments, 6, mulberry32(2))
    expect(result.winners).toHaveLength(6)
    expect([...result.winners].sort()).toEqual([...segments].sort())
  })

  it('每个扇区角度 = 360 / 扇区数', () => {
    expect(computeSpin(segments, 1, mulberry32(1)).segmentAngle).toBeCloseTo(60, 9)
  })
})

describe('wheel / spin', () => {
  it('选项留空返回 null（空态，不报错）', () => {
    expect(spin({ text: '', winners: '1' }, emptyOptions, mulberry32(1))).toBeNull()
  })

  it('正常旋转返回结果对象', () => {
    const outcome = spin({ text: 'a\nb\nc\nd', winners: '2' }, emptyOptions, mulberry32(3))
    expect(outcome).not.toBeNull()
    expect(outcome!.segmentCount).toBe(4)
    expect(outcome!.winnerCount).toBe(2)
    expect(outcome!.spin.winners).toHaveLength(2)
  })

  it('单选项进入错误态', () => {
    expect(() => spin({ text: '唯一', winners: '1' }, emptyOptions, mulberry32(1))).toThrow(
      /至少需要 2 个选项/,
    )
  })

  it('获奖人数非法时抛错', () => {
    expect(() => spin({ text: 'a\nb', winners: 'x' }, emptyOptions, mulberry32(1))).toThrow(
      /获奖人数无效/,
    )
  })

  it('获奖人数 > 选项数时抛错', () => {
    expect(() => spin({ text: 'a\nb', winners: '3' }, emptyOptions, mulberry32(1))).toThrow(
      /不能大于选项数/,
    )
  })
})

describe('wheel / transform', () => {
  it('选项留空返回空串', () => {
    expect(transform({ text: '', winners: '1' }, emptyOptions, mulberry32(1), t)).toBe('')
  })

  it('输出含扇区数 / 获奖人数 / 获奖名单行', () => {
    const out = transform(
      { text: '苹果\n香蕉\n橙子\n葡萄', winners: '2' },
      emptyOptions,
      mulberry32(5),
      t,
    )
    expect(out).toContain('扇区数：4')
    expect(out).toContain('获奖人数：2')
    expect(out).toContain('获奖名单：')
    expect(out.split('\n').filter((line) => /^\d+\. /.test(line))).toHaveLength(2)
  })

  it('获奖人数 = 0 时名单区为空（不报错）', () => {
    const out = transform({ text: 'a\nb\nc', winners: '0' }, emptyOptions, mulberry32(1), t)
    expect(out).toContain('获奖人数：0')
    expect(out.split('\n').filter((line) => /^\d+\. /.test(line))).toHaveLength(0)
  })
})

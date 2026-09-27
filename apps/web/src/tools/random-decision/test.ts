import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  bilingualError,
  decide,
  hashSeed,
  mulberry32,
  parseCount,
  parseOptions,
  pickOptions,
  transform,
} from './utils'

const t = createTranslator('zh')
const noRepeat = { allowRepeat: false }
const withRepeat = { allowRepeat: true }

describe('random-decision / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('randomDecision.error.countEmpty')
    expect(error.message).toContain('请填写抽取个数')
    expect(error.message).toContain('Enter how many to pick')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('randomDecision.error.countTooLarge', { max: 1000 })
    expect(error.message).toContain('上限 1000')
    expect(error.message).toContain('max 1000')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('randomDecision.error.countExceeds', {})
    expect(error.message).toContain('{count}')
  })

  it('无参数时模板原样返回', () => {
    const error = bilingualError('randomDecision.error.empty')
    expect(error.message).toContain('请先输入选项')
  })
})

describe('random-decision / mulberry32 & hashSeed', () => {
  it('相同种子产生相同序列', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('输出落在 [0, 1) 区间', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 500; i += 1) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('空字符串返回 FNV 偏移基数', () => {
    expect(hashSeed('')).toBe(2166136261)
  })

  it('相同字符串哈希一致', () => {
    expect(hashSeed('seed-42')).toBe(hashSeed('seed-42'))
  })
})

describe('random-decision / parseOptions 边界', () => {
  it('按行切分、去空白、丢空行', () => {
    expect(parseOptions('看电影\n\n  吃火锅  \n\r\n去爬山\n')).toEqual([
      '看电影',
      '吃火锅',
      '去爬山',
    ])
  })

  it('空选项列表 → 空数组', () => {
    expect(parseOptions('')).toEqual([])
    expect(parseOptions('  \n \n')).toEqual([])
  })

  it('单选项 → 长度为 1 的数组', () => {
    expect(parseOptions('唯一选项')).toEqual(['唯一选项'])
  })

  it('重复选项保留（按独立条目看待，中奖概率叠加）', () => {
    expect(parseOptions('a\na\nb')).toEqual(['a', 'a', 'b'])
  })
})

describe('random-decision / parseCount 边界', () => {
  it('空输入报错', () => {
    expect(() => parseCount('')).toThrow(/请填写抽取个数/)
    expect(() => parseCount('   ')).toThrow(/Enter how many to pick/)
  })

  it('非数字字符串报错', () => {
    expect(() => parseCount('abc')).toThrow(/抽取个数无效/)
    expect(() => parseCount('NaN')).toThrow(/抽取个数无效/)
    expect(() => parseCount('Infinity')).toThrow(/抽取个数无效/)
  })

  it('小数报错', () => {
    expect(() => parseCount('2.5')).toThrow(/须为非负整数/)
  })

  it('0 与负数：0 合法，负数报错', () => {
    expect(parseCount('0')).toBe(0)
    expect(() => parseCount('-1')).toThrow(/抽取个数无效/)
  })

  it('超上限报错', () => {
    expect(parseCount('1000')).toBe(1000)
    expect(() => parseCount('1001')).toThrow(/抽取个数过大/)
    expect(() => parseCount('1001')).toThrow(/max 1000/)
  })

  it('首尾空白自动去除', () => {
    expect(parseCount('  3 ')).toBe(3)
  })
})

describe('random-decision / pickOptions', () => {
  const options = ['a', 'b', 'c', 'd', 'e']

  it('不允许重复：结果无重复、数量正确、均为候选项', () => {
    const picked = pickOptions(options, 3, false, mulberry32(42))
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
    for (const item of picked) expect(options).toContain(item)
  })

  it('不允许重复 + 相同随机源 → 结果一致（确定性）', () => {
    expect(pickOptions(options, 3, false, mulberry32(42))).toEqual(
      pickOptions(options, 3, false, mulberry32(42)),
    )
  })

  it('不允许重复：个数 = 选项数时返回全排列', () => {
    const picked = pickOptions(options, 5, false, mulberry32(9))
    expect(picked).toHaveLength(5)
    expect([...picked].sort()).toEqual([...options].sort())
  })

  it('不允许重复：个数 > 选项数时报错（中英双语）', () => {
    expect(() => pickOptions(options, 6, false, mulberry32(1))).toThrow(/不能大于选项数/)
    expect(() => pickOptions(options, 6, false, mulberry32(1))).toThrow(
      /cannot exceed the number of options/,
    )
  })

  it('不允许重复：个数 = 0 返回空数组', () => {
    expect(pickOptions(options, 0, false, mulberry32(1))).toEqual([])
  })

  it('允许重复：同一选项可被多次抽中', () => {
    expect(pickOptions(['唯一'], 3, true, mulberry32(5))).toEqual(['唯一', '唯一', '唯一'])
  })

  it('允许重复：个数可大于选项数', () => {
    const picked = pickOptions(options, 8, true, mulberry32(3))
    expect(picked).toHaveLength(8)
    for (const item of picked) expect(options).toContain(item)
  })

  it('允许重复：个数 = 0 返回空数组', () => {
    expect(pickOptions(options, 0, true, mulberry32(1))).toEqual([])
  })

  it('单选项不允许重复抽 1 个', () => {
    expect(pickOptions(['唯一'], 1, false, mulberry32(1))).toEqual(['唯一'])
  })

  it('大量选项（1000 个）性能：一次抽完可接受', () => {
    const big = Array.from({ length: 1000 }, (_, i) => '选项-' + i)
    const start = Date.now()
    const picked = pickOptions(big, 1000, false, mulberry32(1))
    expect(picked).toHaveLength(1000)
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

describe('random-decision / decide', () => {
  it('选项列表留空返回 null（空态，不报错）', () => {
    expect(decide({ text: '', count: '1' }, noRepeat, mulberry32(1))).toBeNull()
    expect(decide({ text: ' \n ', count: '1' }, noRepeat, mulberry32(1))).toBeNull()
  })

  it('正常抽取返回结果对象', () => {
    const result = decide({ text: 'a\nb\nc\nd', count: '2' }, noRepeat, mulberry32(2))
    expect(result).not.toBeNull()
    expect(result!.optionCount).toBe(4)
    expect(result!.count).toBe(2)
    expect(result!.allowRepeat).toBe(false)
    expect(result!.picked).toHaveLength(2)
  })

  it('个数非法时抛错', () => {
    expect(() => decide({ text: 'a\nb', count: 'x' }, noRepeat, mulberry32(1))).toThrow(
      /抽取个数无效/,
    )
  })

  it('不允许重复且个数超选项数时抛错', () => {
    expect(() => decide({ text: 'a\nb', count: '3' }, noRepeat, mulberry32(1))).toThrow(
      /不能大于选项数/,
    )
  })

  it('允许重复时个数可超选项数', () => {
    const result = decide({ text: 'a\nb', count: '5' }, withRepeat, mulberry32(1))
    expect(result!.picked).toHaveLength(5)
    expect(result!.allowRepeat).toBe(true)
  })
})

describe('random-decision / transform', () => {
  it('选项留空返回空串', () => {
    expect(transform({ text: '', count: '1' }, noRepeat, mulberry32(1), t)).toBe('')
  })

  it('输出含候选项数 / 抽取个数 / 决定结果行', () => {
    const out = transform(
      { text: '看电影\n吃火锅\n去爬山', count: '2' },
      noRepeat,
      mulberry32(11),
      t,
    )
    expect(out).toContain('候选项：3')
    expect(out).toContain('抽取个数：2')
    expect(out).toContain('决定结果：')
    expect(out.split('\n').filter((line) => /^\d+\. /.test(line))).toHaveLength(2)
  })

  it('个数 = 0 时结果区为空（不报错）', () => {
    const out = transform({ text: 'a\nb', count: '0' }, noRepeat, mulberry32(1), t)
    expect(out).toContain('抽取个数：0')
    expect(out.split('\n').filter((line) => /^\d+\. /.test(line))).toHaveLength(0)
  })

  it('非法个数进入错误态（抛双语错误）', () => {
    expect(() => transform({ text: 'a\nb', count: '-1' }, noRepeat, mulberry32(1), t)).toThrow(
      /抽取个数无效/,
    )
  })
})

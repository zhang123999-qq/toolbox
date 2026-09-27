import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  bilingualError,
  draw,
  drawWinners,
  hashSeed,
  mulberry32,
  parseDrawCount,
  parseNames,
  transform,
} from './utils'

const t = createTranslator('zh')
const withoutReplacement = { withReplacement: false }
const withReplacement = { withReplacement: true }

describe('lottery / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('lottery.error.countNegative')
    expect(error.message).toContain('抽取人数不能为负数')
    expect(error.message).toContain('Draw count cannot be negative')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('lottery.error.countExceeds', { count: 5, total: 3 })
    expect(error.message).toContain('人数（5）')
    expect(error.message).toContain('count (5)')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('lottery.error.countInvalid', {})
    expect(error.message).toContain('{value}')
  })

  it('无参数时模板原样返回', () => {
    const error = bilingualError('lottery.error.empty')
    expect(error.message).toContain('请先输入名单')
  })
})

describe('lottery / parseNames 边界', () => {
  it('按行切分、去空白、丢空行', () => {
    expect(parseNames('张三\n\n  李四  \n\r\n王五\n')).toEqual(['张三', '李四', '王五'])
  })

  it('空名单 → 空数组', () => {
    expect(parseNames('')).toEqual([])
    expect(parseNames('  \n \n')).toEqual([])
  })

  it('单人名单 → 长度为 1 的数组', () => {
    expect(parseNames('张三')).toEqual(['张三'])
  })

  it('重复名字保留（按独立条目看待）', () => {
    expect(parseNames('张三\n张三\n李四')).toEqual(['张三', '张三', '李四'])
  })

  it('hashSeed 空字符串返回 FNV 偏移基数', () => {
    expect(hashSeed('')).toBe(2166136261)
  })

  it('hashSeed 非空字符串：循环体执行，不同输入大概率不同', () => {
    expect(hashSeed('lottery-seed')).not.toBe(hashSeed(''))
    expect(hashSeed('lottery-seed')).not.toBe(hashSeed('lottery-seed-2'))
  })

  it('mulberry32 相同种子序列一致', () => {
    const a = mulberry32(3)
    const b = mulberry32(3)
    expect([a(), a()]).toEqual([b(), b()])
  })
})

describe('lottery / parseDrawCount 边界', () => {
  it('空输入报错', () => {
    expect(() => parseDrawCount('')).toThrow(/请填写抽取人数/)
    expect(() => parseDrawCount('   ')).toThrow(/Enter how many to draw/)
  })

  it('非整数报错', () => {
    expect(() => parseDrawCount('abc')).toThrow(/抽取人数无效/)
    expect(() => parseDrawCount('2.5')).toThrow(/须为整数/)
    expect(() => parseDrawCount('NaN')).toThrow(/抽取人数无效/)
  })

  it('负数报错，0 合法', () => {
    expect(() => parseDrawCount('-1')).toThrow(/不能为负数/)
    expect(parseDrawCount('0')).toBe(0)
  })

  it('超上限报错', () => {
    expect(parseDrawCount('10000')).toBe(10000)
    expect(() => parseDrawCount('10001')).toThrow(/抽取人数过大/)
  })

  it('首尾空白自动去除', () => {
    expect(parseDrawCount('  7 ')).toBe(7)
  })
})

describe('lottery / drawWinners', () => {
  const names = ['张三', '李四', '王五', '赵六', '钱七']

  it('不放回：中奖者无重复、数量正确、均在名单中', () => {
    const winners = drawWinners(names, 3, false, mulberry32(42))
    expect(winners).toHaveLength(3)
    expect(new Set(winners).size).toBe(3)
    for (const name of winners) expect(names).toContain(name)
  })

  it('不放回 + 相同随机源 → 结果一致（确定性）', () => {
    expect(drawWinners(names, 3, false, mulberry32(42))).toEqual(
      drawWinners(names, 3, false, mulberry32(42)),
    )
  })

  it('不放回：人数 = 名单人数时全员中奖（顺序打乱）', () => {
    const winners = drawWinners(names, 5, false, mulberry32(9))
    expect(winners).toHaveLength(5)
    expect([...winners].sort()).toEqual([...names].sort())
  })

  it('不放回：人数 > 名单人数时报错（中英双语）', () => {
    expect(() => drawWinners(names, 6, false, mulberry32(1))).toThrow(/不能大于名单人数/)
    expect(() => drawWinners(names, 6, false, mulberry32(1))).toThrow(
      /cannot exceed the name list size/,
    )
  })

  it('不放回：人数 = 0 返回空数组', () => {
    expect(drawWinners(names, 0, false, mulberry32(1))).toEqual([])
  })

  it('有放回：同一人可重复中奖', () => {
    expect(drawWinners(['张三'], 3, true, mulberry32(5))).toEqual(['张三', '张三', '张三'])
  })

  it('有放回：人数可大于名单人数', () => {
    const winners = drawWinners(names, 8, true, mulberry32(3))
    expect(winners).toHaveLength(8)
    for (const name of winners) expect(names).toContain(name)
  })

  it('有放回：人数 = 0 返回空数组', () => {
    expect(drawWinners(names, 0, true, mulberry32(1))).toEqual([])
  })

  it('单人名单不放回抽 1 人', () => {
    expect(drawWinners(['张三'], 1, false, mulberry32(1))).toEqual(['张三'])
  })

  it('大量名单（1000 人）性能：抽取可接受', () => {
    const big = Array.from({ length: 1000 }, (_, i) => '候选人-' + i)
    const start = Date.now()
    const winners = drawWinners(big, 100, false, mulberry32(1))
    expect(winners).toHaveLength(100)
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

describe('lottery / draw', () => {
  it('名单留空返回 null（空态，不报错）', () => {
    expect(draw({ text: '', count: '2' }, withoutReplacement, mulberry32(1))).toBeNull()
  })

  it('正常抽签返回结果对象', () => {
    const result = draw({ text: 'a\nb\nc\nd\ne', count: '2' }, withoutReplacement, mulberry32(4))
    expect(result).not.toBeNull()
    expect(result!.poolSize).toBe(5)
    expect(result!.count).toBe(2)
    expect(result!.withReplacement).toBe(false)
    expect(result!.winners).toHaveLength(2)
  })

  it('人数非法时抛错', () => {
    expect(() => draw({ text: 'a\nb', count: '-2' }, withoutReplacement, mulberry32(1))).toThrow(
      /不能为负数/,
    )
  })

  it('不放回且人数超名单时抛错', () => {
    expect(() => draw({ text: 'a\nb', count: '3' }, withoutReplacement, mulberry32(1))).toThrow(
      /不能大于名单人数/,
    )
  })

  it('有放回时人数可超名单', () => {
    const result = draw({ text: 'a\nb', count: '5' }, withReplacement, mulberry32(1))
    expect(result!.winners).toHaveLength(5)
    expect(result!.withReplacement).toBe(true)
  })
})

describe('lottery / transform', () => {
  it('名单留空返回空串', () => {
    expect(transform({ text: '', count: '2' }, withoutReplacement, mulberry32(1), t)).toBe('')
  })

  it('输出含候选人数 / 抽取人数 / 中奖名单行', () => {
    const out = transform(
      { text: '张三\n李四\n王五\n赵六', count: '2' },
      withoutReplacement,
      mulberry32(8),
      t,
    )
    expect(out).toContain('候选人数：4')
    expect(out).toContain('抽取人数：2')
    expect(out).toContain('中奖名单：')
    expect(out.split('\n').filter((line) => /^\d+\. /.test(line))).toHaveLength(2)
  })

  it('人数 = 0 时名单区为空（不报错）', () => {
    const out = transform({ text: 'a\nb', count: '0' }, withoutReplacement, mulberry32(1), t)
    expect(out).toContain('抽取人数：0')
    expect(out.split('\n').filter((line) => /^\d+\. /.test(line))).toHaveLength(0)
  })
})

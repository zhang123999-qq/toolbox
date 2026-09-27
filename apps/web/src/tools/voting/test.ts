import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  bilingualError,
  castVote,
  computeResult,
  createVotes,
  parseCandidates,
  tally,
  totalVotes,
  transform,
} from './utils'

const t = createTranslator('zh')
const emptyOptions = {}

describe('voting / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('voting.error.tooFew')
    expect(error.message).toContain('至少需要 2 个选项')
    expect(error.message).toContain('at least 2 options')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('voting.error.badIndex', { index: 9 })
    expect(error.message).toContain('序号越界：9')
    expect(error.message).toContain('out of range: 9')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('voting.error.badIndex', {})
    expect(error.message).toContain('{index}')
  })

  it('无参数时模板原样返回', () => {
    const error = bilingualError('voting.error.empty')
    expect(error.message).toContain('请先输入投票选项')
  })
})

describe('voting / parseCandidates 边界', () => {
  it('按行切分、去空白、丢空行', () => {
    expect(parseCandidates('看电影\n\n  吃火锅  \n去爬山\n')).toEqual([
      '看电影',
      '吃火锅',
      '去爬山',
    ])
  })

  it('空输入 → 空数组（上层按空态处理，不报错）', () => {
    expect(parseCandidates('')).toEqual([])
    expect(parseCandidates('  \n \n')).toEqual([])
  })

  it('单选项报错（1 个选项没有投票意义）', () => {
    expect(() => parseCandidates('唯一选项')).toThrow(/至少需要 2 个选项/)
    expect(() => parseCandidates('唯一选项')).toThrow(/at least 2 options/)
  })

  it('2 个选项合法（下限边界）', () => {
    expect(parseCandidates('a\nb')).toEqual(['a', 'b'])
  })

  it('重复选项保留（按独立候选项看待）', () => {
    expect(parseCandidates('a\na\nb')).toEqual(['a', 'a', 'b'])
  })
})

describe('voting / createVotes & castVote', () => {
  it('新建票仓全 0', () => {
    expect(createVotes(3)).toEqual([0, 0, 0])
    expect(createVotes(0)).toEqual([])
  })

  it('投一票：对应序号 +1，返回新数组', () => {
    const before = [0, 0, 0]
    const after = castVote(before, 1)
    expect(after).toEqual([0, 1, 0])
    expect(before).toEqual([0, 0, 0]) // 入参不被修改（纯函数）
  })

  it('连续投票累加', () => {
    let votes = createVotes(2)
    votes = castVote(votes, 0)
    votes = castVote(votes, 0)
    votes = castVote(votes, 1)
    expect(votes).toEqual([2, 1])
  })

  it('序号越界抛错（中英双语）：负数 / 等于长度 / 非整数', () => {
    expect(() => castVote([0, 0], -1)).toThrow(/序号越界/)
    expect(() => castVote([0, 0], -1)).toThrow(/out of range/)
    expect(() => castVote([0, 0], 2)).toThrow(/序号越界/)
    expect(() => castVote([0, 0], 1.5)).toThrow(/序号越界/)
  })
})

describe('voting / totalVotes & tally', () => {
  it('总票数求和', () => {
    expect(totalVotes([2, 3, 0])).toBe(5)
    expect(totalVotes([])).toBe(0)
  })

  it('计票：票数与占比（保留 1 位小数）', () => {
    const rows = tally(['a', 'b', 'c'], [2, 1, 1])
    expect(rows).toEqual([
      { label: 'a', votes: 2, percent: 50 },
      { label: 'b', votes: 1, percent: 25 },
      { label: 'c', votes: 1, percent: 25 },
    ])
  })

  it('占比四舍五入到 1 位小数', () => {
    const rows = tally(['a', 'b', 'c'], [1, 1, 1])
    expect(rows[0].percent).toBe(33.3)
  })

  it('总票数为 0 时占比为 0（不除零）', () => {
    const rows = tally(['a', 'b'], [0, 0])
    expect(rows).toEqual([
      { label: 'a', votes: 0, percent: 0 },
      { label: 'b', votes: 0, percent: 0 },
    ])
  })
})

describe('voting / computeResult', () => {
  it('选项留空返回 null（空态，不报错）', () => {
    expect(computeResult({ text: '' }, emptyOptions, null)).toBeNull()
  })

  it('票仓为 null 返回 null（未开始投票）', () => {
    expect(computeResult({ text: 'a\nb' }, emptyOptions, null)).toBeNull()
  })

  it('票仓长度与选项不一致返回 null（过期票仓）', () => {
    expect(computeResult({ text: 'a\nb\nc' }, emptyOptions, [1, 2])).toBeNull()
  })

  it('正常返回结果对象', () => {
    const result = computeResult({ text: 'a\nb\nc' }, emptyOptions, [2, 1, 0])
    expect(result).not.toBeNull()
    expect(result!.candidates).toEqual(['a', 'b', 'c'])
    expect(result!.total).toBe(3)
    expect(result!.rows[0]).toEqual({ label: 'a', votes: 2, percent: 66.7 })
  })

  it('单选项进入错误态', () => {
    expect(() => computeResult({ text: '唯一' }, emptyOptions, [0])).toThrow(/至少需要 2 个选项/)
  })
})

describe('voting / transform', () => {
  it('未开始投票返回空串', () => {
    expect(transform({ text: 'a\nb' }, emptyOptions, null, t)).toBe('')
  })

  it('选项留空返回空串', () => {
    expect(transform({ text: '' }, emptyOptions, null, t)).toBe('')
  })

  it('输出含总票数 / 结果行（票数与占比）', () => {
    const out = transform({ text: '看电影\n吃火锅' }, emptyOptions, [3, 1], t)
    expect(out).toContain('总票数：4')
    expect(out).toContain('投票结果：')
    expect(out).toContain('1. 看电影：3票（75%）')
    expect(out).toContain('2. 吃火锅：1票（25%）')
  })

  it('过期票仓返回空串', () => {
    expect(transform({ text: 'a\nb\nc' }, emptyOptions, [1], t)).toBe('')
  })
})

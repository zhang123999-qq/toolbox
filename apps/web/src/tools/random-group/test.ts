import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import { parseGroupCount, parseNames, parseParams, shuffle, splitGroups, transform } from './utils'

const t = createTranslator('zh')
const noOptions = { groups: '2' }
/** 确定性随机源：恒返回 0，便于断言洗牌与分组结果 */
const randZero = () => 0

describe('random-group / parseNames', () => {
  it('按行切分并丢弃空行与首尾空白', () => {
    expect(parseNames('  张三  \n\n李四\n   \n王五  ')).toEqual(['张三', '李四', '王五'])
  })

  it('空输入得到空名单', () => {
    expect(parseNames('')).toEqual([])
    expect(parseNames('  \n ')).toEqual([])
  })
})

describe('random-group / parseGroupCount', () => {
  it('合法正整数', () => {
    expect(parseGroupCount('3', t)).toBe(3)
    expect(parseGroupCount(' 2 ', t)).toBe(2)
  })

  it('非数字字符串抛错', () => {
    expect(() => parseGroupCount('abc', t)).toThrow(/分组数无效/)
    expect(() => parseGroupCount('2.5', t)).toThrow(/分组数无效/)
    expect(() => parseGroupCount('-3', t)).toThrow(/分组数无效/)
  })

  it('空字符串抛错', () => {
    expect(() => parseGroupCount('', t)).toThrow(/分组数无效/)
  })

  it('0 与负数意图（"0" 能过正则但 < 1）抛错', () => {
    expect(() => parseGroupCount('0', t)).toThrow(/分组数无效/)
  })
})

describe('random-group / parseParams', () => {
  it('空名单返回 null（调用方输出空串，不进错误态）', () => {
    expect(parseParams({ text: '' }, noOptions, t)).toBeNull()
    expect(parseParams({ text: '  \n ' }, noOptions, t)).toBeNull()
  })

  it('正常解析', () => {
    expect(parseParams({ text: 'a\nb\nc' }, { groups: '2' }, t)).toEqual({
      names: ['a', 'b', 'c'],
      groupCount: 2,
    })
  })

  it('分组数 > 人数抛错', () => {
    expect(() => parseParams({ text: 'a\nb' }, { groups: '3' }, t)).toThrow(/不能超过人数/)
  })

  it('分组数非法透出 parseGroupCount 的错误', () => {
    expect(() => parseParams({ text: 'a\nb' }, { groups: 'x' }, t)).toThrow(/分组数无效/)
  })
})

describe('random-group / shuffle（Fisher-Yates）', () => {
  it('不修改原数组，返回等长新数组', () => {
    const input = ['a', 'b', 'c']
    const out = shuffle(input, randZero)
    expect(input).toEqual(['a', 'b', 'c'])
    expect(out).not.toBe(input)
    expect([...out].sort()).toEqual(['a', 'b', 'c'])
  })

  it('确定性随机源下结果可复现', () => {
    const input = ['a', 'b', 'c', 'd']
    expect(shuffle(input, randZero)).toEqual(shuffle(input, randZero))
  })

  it('空数组与单元素数组直接返回', () => {
    expect(shuffle([], randZero)).toEqual([])
    expect(shuffle(['a'], randZero)).toEqual(['a'])
  })

  it('默认随机源为 Math.random（不传 rand 也能跑）', () => {
    const out = shuffle(['a', 'b', 'c', 'd', 'e'])
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('random-group / splitGroups', () => {
  it('整除时每组等大', () => {
    const groups = splitGroups(['a', 'b', 'c', 'd', 'e', 'f'], 3, randZero)
    expect(groups.map((g) => g.length)).toEqual([2, 2, 2])
  })

  it('不整除时前 remainder 组多一人', () => {
    const groups = splitGroups(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3, randZero)
    expect(groups.map((g) => g.length)).toEqual([3, 2, 2])
  })

  it('单人一组：groupCount = 人数', () => {
    const groups = splitGroups(['a', 'b'], 2, randZero)
    expect(groups.map((g) => g.length)).toEqual([1, 1])
  })

  it('全员不重不漏', () => {
    const names = ['a', 'b', 'c', 'd', 'e']
    const groups = splitGroups(names, 2, randZero)
    expect(groups.flat().sort()).toEqual([...names].sort())
  })

  it('默认随机源可用', () => {
    const groups = splitGroups(['a', 'b', 'c'], 2)
    expect(groups.flat().sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('random-group / transform', () => {
  it('空名单 → 空串（不进入错误态）', () => {
    expect(transform({ text: '' }, noOptions, t)).toBe('')
  })

  it('输出含组标题与全部成员', () => {
    const out = transform({ text: '张三\n李四\n王五\n赵六' }, { groups: '2' }, t, randZero)
    expect(out).toContain('第 1 组（2 人）')
    expect(out).toContain('第 2 组（2 人）')
    for (const name of ['张三', '李四', '王五', '赵六']) expect(out).toContain(name)
  })

  it('单组时组间无空行分隔', () => {
    const out = transform({ text: 'a\nb' }, { groups: '1' }, t, randZero)
    expect(out).toContain('第 1 组（2 人）')
    expect(out).not.toContain('\n\n')
  })

  it('非法分组数进入错误态（抛错）', () => {
    expect(() => transform({ text: 'a\nb' }, { groups: '0' }, t)).toThrow(/分组数无效/)
    expect(() => transform({ text: 'a\nb' }, { groups: '9' }, t)).toThrow(/不能超过人数/)
  })
})

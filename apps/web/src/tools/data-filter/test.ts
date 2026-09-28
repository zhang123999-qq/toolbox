/**
 * data-filter（#689）utils 单测：条件解析 / 运算符语义 / 多条件过滤。
 */
import { describe, expect, it } from 'vitest'
import {
  applyFilters,
  matchCondition,
  parseCondition,
  parseConditions,
  parseCsv,
  parseLogic,
  toCsv,
  type Row,
} from './utils'

const HEADERS = ['姓名', '年龄', '城市', '备注']
const ROWS: Row[] = [
  ['张三', '28', '北京', ''],
  ['李四', '35', '上海', 'vip'],
  ['王五', '28', '广州', 'vip 会员'],
]

describe('parseCondition', () => {
  it('解析基本条件', () => {
    expect(parseCondition('年龄 > 30', 1)).toEqual({ column: '年龄', op: '>', value: '30' })
  })

  it('值内部可含空格', () => {
    expect(parseCondition('城市 包含 上海 市', 2)).toEqual({
      column: '城市',
      op: '包含',
      value: '上海 市',
    })
  })

  it('列名含运算符文本不误判', () => {
    expect(parseCondition('不包含测试 = 1', 3)).toEqual({
      column: '不包含测试',
      op: '=',
      value: '1',
    })
  })

  it('为空 / 不为空可省略值', () => {
    expect(parseCondition('备注 为空', 4)).toEqual({ column: '备注', op: '为空', value: '' })
    expect(parseCondition('备注 不为空', 5)).toEqual({ column: '备注', op: '不为空', value: '' })
  })

  it('为空带值抛错', () => {
    expect(() => parseCondition('备注 为空 x', 6)).toThrowError('不需要值')
  })

  it('普通运算符缺值抛错', () => {
    expect(() => parseCondition('年龄 >', 7)).toThrowError('需要一个值')
  })

  it('格式错误抛错并带行号', () => {
    expect(() => parseCondition('年龄大于30', 8)).toThrowError('第 8 个条件格式错误')
    expect(() => parseCondition('   ', 9)).toThrowError('第 9 个条件为空')
  })
})

describe('parseConditions', () => {
  it('多行解析并跳过空行', () => {
    const conds = parseConditions('年龄 > 30\n\n城市 包含 海\n')
    expect(conds).toHaveLength(2)
  })

  it('全空抛错', () => {
    expect(() => parseConditions('  \n ')).toThrowError('至少需要 1 个过滤条件')
  })

  it('超过 20 个条件抛错', () => {
    const many = Array.from({ length: 21 }, (_, i) => `年龄 > ${i}`).join('\n')
    expect(() => parseConditions(many)).toThrowError('最多支持 20 个条件')
  })
})

describe('matchCondition', () => {
  it('数字感知比较', () => {
    expect(matchCondition('28', { column: '年龄', op: '>', value: '30' })).toBe(false)
    expect(matchCondition('35', { column: '年龄', op: '>', value: '30' })).toBe(true)
    expect(matchCondition('35', { column: '年龄', op: '=', value: '35' })).toBe(true)
    expect(matchCondition('9', { column: '年龄', op: '<', value: '10' })).toBe(true)
    expect(matchCondition('9', { column: '年龄', op: '>', value: '10' })).toBe(false)
    expect(matchCondition('35', { column: '年龄', op: '>=', value: '35' })).toBe(true)
    expect(matchCondition('35', { column: '年龄', op: '<=', value: '34' })).toBe(false)
    expect(matchCondition('35', { column: '年龄', op: '!=', value: '35' })).toBe(false)
  })

  it('字符串比较', () => {
    expect(matchCondition('北京', { column: '城市', op: '=', value: '北京' })).toBe(true)
    expect(matchCondition('上海', { column: '城市', op: '包含', value: '海' })).toBe(true)
    expect(matchCondition('上海', { column: '城市', op: '不包含', value: '海' })).toBe(false)
    expect(matchCondition('上海', { column: '城市', op: '开头', value: '上' })).toBe(true)
    expect(matchCondition('上海', { column: '城市', op: '结尾', value: '海' })).toBe(true)
    // 非数字字符串不等：覆盖 compareValues 的 c < v 双分支
    expect(matchCondition('b', { column: '城市', op: '!=', value: 'a' })).toBe(true)
    expect(matchCondition('a', { column: '城市', op: '<', value: 'b' })).toBe(true)
    expect(matchCondition('b', { column: '城市', op: '<', value: 'a' })).toBe(false)
  })

  it('为空 / 不为空', () => {
    expect(matchCondition('', { column: '备注', op: '为空', value: '' })).toBe(true)
    expect(matchCondition('  ', { column: '备注', op: '为空', value: '' })).toBe(true)
    expect(matchCondition('vip', { column: '备注', op: '不为空', value: '' })).toBe(true)
  })

  it('缺失单元格按空字符串处理', () => {
    expect(
      matchCondition(undefined as unknown as string, { column: '备注', op: '为空', value: '' }),
    ).toBe(true)
  })
})

describe('parseLogic', () => {
  it('默认 AND，大小写不敏感', () => {
    expect(parseLogic('')).toBe('AND')
    expect(parseLogic('or')).toBe('OR')
    expect(parseLogic('AND')).toBe('AND')
  })

  it('非法值抛错', () => {
    expect(() => parseLogic('XOR')).toThrowError('AND 或 OR')
  })
})

describe('applyFilters', () => {
  const conds = [
    { column: '年龄', op: '>' as const, value: '30' },
    { column: '城市', op: '包含' as const, value: '海' },
  ]

  it('AND：全部命中', () => {
    const out = applyFilters(HEADERS, ROWS, conds, 'AND')
    expect(out).toEqual([['李四', '35', '上海', 'vip']])
  })

  it('OR：任一命中', () => {
    // 王五的"广州"不含"海"，只有李四命中
    const out = applyFilters(HEADERS, ROWS, conds, 'OR')
    expect(out.map((r) => r[0])).toEqual(['李四'])
  })

  it('不存在的列抛错', () => {
    expect(() =>
      applyFilters(HEADERS, ROWS, [{ column: '国家', op: '=', value: 'x' }], 'AND'),
    ).toThrowError('列「国家」不存在于表头')
  })

  it('缺列的行按空字符串处理', () => {
    const out = applyFilters(
      HEADERS,
      [['张三', '28']],
      [{ column: '城市', op: '为空', value: '' }],
      'AND',
    )
    expect(out).toEqual([['张三', '28']])
    // OR 分支同样处理缺列
    const outOr = applyFilters(
      HEADERS,
      [['张三', '28']],
      [{ column: '城市', op: '为空', value: '' }],
      'OR',
    )
    expect(outOr).toEqual([['张三', '28']])
  })
})

describe('parseCsv（复用实现冒烟）', () => {
  it('解析示例 CSV', () => {
    const { headers, rows } = parseCsv('a,b\n"x","y"')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['x', 'y']])
  })

  it('引号未闭合抛错', () => {
    expect(() => parseCsv('"oops')).toThrowError('引号未闭合')
  })

  it('支持 "" 转义', () => {
    const { rows } = parseCsv('a\n"x""y"')
    expect(rows).toEqual([['x"y']])
  })

  it('末尾换行不产生空行', () => {
    const { headers, rows } = parseCsv('a,b\n1,2\n')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['1', '2']])
  })

  it('空输入与空表头抛错', () => {
    expect(() => parseCsv('   ')).toThrowError('CSV 为空')
    expect(() => parseCsv(',b\n1,2')).toThrowError('表头不能为空')
  })
})

describe('toCsv', () => {
  it('普通字段直接拼接', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\n1,2')
  })

  it('含逗号 / 引号 / 换行的字段加引号转义', () => {
    expect(toCsv(['a'], [['x,y'], ['say "hi"'], ['l1\nl2']])).toBe(
      'a\n"x,y"\n"say ""hi"""\n"l1\nl2"',
    )
  })
})

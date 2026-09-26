import { describe, expect, it } from 'vitest'
import { BigJsonError, MAX_INPUT, transform } from './utils'
import type { BigJsonOptions } from './schema'

const baseOptions: BigJsonOptions = { mode: 'stats', topN: '25' }

function run(text: string, overrides: Partial<BigJsonOptions> = {}): string {
  return transform({ text }, { ...baseOptions, ...overrides })
}

const SAMPLE = '{\n  "name": "工具库",\n  "tags": ["json", "static"],\n  "n": 1\n}'

describe('big-json / transform', () => {
  it('统计模式给出规模与节点计数', () => {
    const result = run(SAMPLE)
    expect(result).toContain('字符数：')
    expect(result).toContain('行数：5')
    expect(result).toContain('对象数：1')
    expect(result).toContain('数组数：1')
    expect(result).toContain('键值对数：3')
    expect(result).toContain('字符串值：3')
    expect(result).toContain('数字值：1')
    expect(result).toContain('最大嵌套深度：2')
    expect(result).toContain('结构闭合：是')
  })

  it('路径模式按首次出现顺序给出键路径', () => {
    expect(run(SAMPLE, { mode: 'paths' })).toBe(
      [
        '键路径抽样（首次出现顺序，最多 25 条）',
        '$',
        '$.name',
        '$.tags',
        '$.tags[0]',
        '$.tags[1]',
        '$.n',
      ].join('\n'),
    )
  })

  it('topN 决定取样上限', () => {
    const result = run(SAMPLE, { mode: 'paths', topN: '10' })
    expect(result).toContain('最多 10 条')
  })

  it('语法错误定位到行列并给出行内容', () => {
    const result = run('{\n  "a": [1,]\n}', { mode: 'error' })
    expect(result).toContain('第 2 行第 11 列：出现了多余的逗号')
    expect(result).toContain('行内容："a": [1,]')
  })

  it('合法输入在错误模式下给出通过结论', () => {
    expect(run('{"a":1}', { mode: 'error' })).toBe('未发现语法错误（结构完全闭合，最深嵌套 1 层）')
  })

  it('统计模式遇到语法问题会给出提示', () => {
    expect(run('{"a": 1 "b": 2}')).toContain('注意：第 1 行第 9 列起有语法问题')
  })

  it('标量输入也能扫描（边界）', () => {
    expect(run('42')).toContain('数字值：1')
    expect(run('42', { mode: 'paths' })).toBe('键路径抽样（首次出现顺序，最多 25 条）\n$')
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '\n  ' }, baseOptions)).toBe('')
  })

  it('超长输入抛出 BigJsonError（边界）', () => {
    expect(() => transform({ text: 'x'.repeat(MAX_INPUT + 1) }, baseOptions)).toThrow(BigJsonError)
  })
})

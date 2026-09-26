import { describe, expect, it } from 'vitest'
import type { EnvOptions } from './schema'
import { parseEnv, transform } from './utils'

const opts: EnvOptions = { keepComments: false }

describe('env / parseEnv', () => {
  it('解析 key=value 与 export 前缀', () => {
    const r = parseEnv('export A=1\nB=2')
    expect(r.entries).toEqual([
      { key: 'A', value: '1' },
      { key: 'B', value: '2' },
    ])
  })

  it('去掉成对引号', () => {
    const r = parseEnv('A="hello"\nB=\'x\'')
    expect(r.entries[0]?.value).toBe('hello')
    expect(r.entries[1]?.value).toBe('x')
  })

  it('注释归入 comments', () => {
    const r = parseEnv('# 我的配置\nA=1')
    expect(r.comments).toEqual(['我的配置'])
  })

  it('无等号的行抛中文错', () => {
    expect(() => parseEnv('justaword')).toThrow(/不是合法的 KEY=VALUE/)
  })

  it('变量名不合法抛中文错', () => {
    expect(() => parseEnv('1BAD=1')).toThrow(/变量名不合法/)
  })
})

describe('env / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts)).toBe('')
  })

  it('输出变量表', () => {
    const out = transform({ text: 'A=1\nB=two' }, opts)
    expect(out).toContain('共 2 个变量')
    expect(out).toContain('A | 1')
    expect(out).toContain('B | two')
  })

  it('keepComments 时追加注释段', () => {
    const out = transform({ text: '# db\nA=1' }, { keepComments: true })
    expect(out).toContain('# db')
  })

  it('纯注释没有变量时报错', () => {
    expect(() => transform({ text: '# only comment\n\n' }, opts)).toThrow(/没有解析到/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'A=' + 'x'.repeat(200000) }, opts)).toThrow(/上限/)
  })
})

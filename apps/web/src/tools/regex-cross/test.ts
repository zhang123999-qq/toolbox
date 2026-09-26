import { describe, expect, it } from 'vitest'
import type { RegexCrossOptions } from './schema'
import {
  assertTarget,
  javaFlags,
  javaString,
  parseInput,
  pyFlags,
  pyString,
  toJava,
  toPython,
  transform,
} from './utils'

describe('regex-cross / parseInput', () => {
  it('识别 /pattern/flags 字面量', () => {
    expect(parseInput('/abc/g')).toEqual({ pattern: 'abc', flags: 'g' })
    expect(parseInput('/#([A-Z])(\\d+)/gi')).toEqual({
      pattern: '#([A-Z])(\\d+)',
      flags: 'gi',
    })
  })

  it('纯模式串无 flags', () => {
    expect(parseInput('\\d+')).toEqual({ pattern: '\\d+', flags: '' })
  })
})

describe('regex-cross / flag mapping', () => {
  it('Python：i/m/s 映射，g 丢弃', () => {
    expect(pyFlags('gims')).toBe('re.IGNORECASE | re.MULTILINE | re.DOTALL')
    expect(pyFlags('g')).toBe('0')
  })

  it('Java：i/m/s 映射，g 丢弃', () => {
    expect(javaFlags('gim')).toBe('Pattern.CASE_INSENSITIVE | Pattern.MULTILINE')
    expect(javaFlags('')).toBe('0')
  })
})

describe('regex-cross / string literal', () => {
  it('Python 优先 raw string，含双引号时转义', () => {
    expect(pyString('\\d+')).toBe('r"\\d+"')
    expect(pyString('a"b')).toBe('"a\\"b"')
  })

  it('Java 反斜杠双写', () => {
    expect(javaString('\\d+')).toBe('"\\\\d+"')
  })
})

describe('regex-cross / transform', () => {
  const py: RegexCrossOptions = { target: 'python' }
  const java: RegexCrossOptions = { target: 'java' }

  it('生成 Python 代码块', () => {
    const out = transform({ text: '/abc/gi' }, py)
    expect(out).toContain('import re')
    expect(out).toContain('re.compile(r"abc", re.IGNORECASE)')
    expect(out).toContain('findall')
  })

  it('生成 Java 代码块', () => {
    const out = transform({ text: '/\\d+/g' }, java)
    expect(out).toContain('Pattern p = Pattern.compile("\\\\d+", 0)')
    expect(out).toContain('while (m.find())')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, py)).toBe('')
  })

  it('非法目标语言报错', () => {
    expect(() => assertTarget('ruby')).toThrow(/不支持的目标语言/)
    const bad = { target: 'ruby' } as unknown as RegexCrossOptions
    expect(() => transform({ text: '/a/' }, bad)).toThrow(/不支持的目标语言/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, py)).toThrow(/上限/)
  })

  it('toPython / toJava 直调可用', () => {
    expect(toPython({ pattern: 'a', flags: 'i' })).toContain('re.IGNORECASE')
    expect(toJava({ pattern: 'a', flags: 'm' })).toContain('Pattern.MULTILINE')
  })
})

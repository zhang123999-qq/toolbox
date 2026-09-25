import { describe, expect, it } from 'vitest'
import { escapeCss, transform, unescapeCss } from './utils'

const esc = { direction: 'escape' } as const
const un = { direction: 'unescape' } as const

describe('css-escape / escape', () => {
  it('标识符安全字符保持原样', () => {
    expect(escapeCss('icon-home_1')).toBe('icon-home_1')
  })

  it('空格与标点转成「反斜杠 + 十六进制码点」', () => {
    expect(escapeCss('a b')).toBe('a\\20 b')
    expect(escapeCss('.a')).toBe('\\2e a')
  })

  it('中文也按码点转义，并以尾随空格消歧', () => {
    expect(escapeCss('中')).toBe('\\4e2d ')
  })

  it('emoji 用完整码点转义', () => {
    expect(escapeCss('🚀')).toBe('\\1f680 ')
  })

  it('NUL 按规范换成替换字符 U+FFFD', () => {
    expect(escapeCss('\u0000')).toBe('\uFFFD')
  })
})

describe('css-escape / unescape', () => {
  it('还原十六进制转义（尾随空格可有可无）', () => {
    expect(unescapeCss('\\4e2d ')).toBe('中')
    expect(unescapeCss('\\4e2d')).toBe('中')
  })

  it('反斜杠前缀的非十六进制字符取字符本身', () => {
    expect(unescapeCss('\\.icon')).toBe('.icon')
  })

  it('反斜杠后紧跟换行按续行处理（都不产生字符）', () => {
    expect(unescapeCss('a\\\nb')).toBe('ab')
  })

  it('超出 Unicode 范围的码点回落为替换字符', () => {
    expect(unescapeCss('\\110000 ')).toBe('\uFFFD')
  })
})

describe('css-escape / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: 'a b' }, esc)).toBe('a\\20 b')
    expect(transform({ text: 'a\\20 b' }, un)).toBe('a b')
  })

  it('往返一致（标点 + 中文 + emoji）', () => {
    const text = '.icon 中 🚀 a-b_c'
    expect(transform({ text: transform({ text }, esc) }, un)).toBe(text)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, esc)).toBe('')
    expect(transform({ text: '' }, un)).toBe('')
  })

  it('孤立的反斜杠抛出可读错误', () => {
    expect(() => transform({ text: 'abc\\' }, un)).toThrow(/孤立的反斜杠/)
  })
})

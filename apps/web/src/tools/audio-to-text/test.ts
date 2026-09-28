import { describe, expect, it } from 'vitest'
import {
  SUPPORTED_LANGS,
  appendFinalSegment,
  buildTranscript,
  countChars,
  normalizeLang,
  speechErrorToChinese,
  summarizeTranscript,
} from './utils'

describe('audio-to-text / 语言', () => {
  it('支持的语言通过校验并原样返回', () => {
    expect(normalizeLang('zh-CN')).toBe('zh-CN')
    expect(normalizeLang('en-US')).toBe('en-US')
    expect(SUPPORTED_LANGS.length).toBeGreaterThan(0)
    expect(SUPPORTED_LANGS[0]!.code).toBe('zh-CN')
  })

  it('不支持的语言抛中文错', () => {
    expect(() => normalizeLang('xx-YY')).toThrow(/不支持的语言/)
    expect(() => normalizeLang('')).toThrow(/不支持的语言/)
    expect(() => normalizeLang('zh')).toThrow(/不支持的语言/)
  })
})

describe('audio-to-text / 段落累积', () => {
  it('追加非空段落，返回新数组', () => {
    const prev: string[] = ['第一句']
    const next = appendFinalSegment(prev, '第二句')
    expect(next).toEqual(['第一句', '第二句'])
    expect(next).not.toBe(prev)
    expect(prev).toEqual(['第一句'])
  })

  it('空白文本被忽略', () => {
    expect(appendFinalSegment(['a'], '')).toEqual(['a'])
    expect(appendFinalSegment(['a'], '   \n ')).toEqual(['a'])
  })

  it('首尾空白被修剪', () => {
    expect(appendFinalSegment([], '  你好  ')).toEqual(['你好'])
  })
})

describe('audio-to-text / 文本合并', () => {
  it('段落与临时候选换行拼接', () => {
    expect(buildTranscript(['第一句', '第二句'], '正在说')).toBe('第一句\n第二句\n正在说')
  })

  it('无临时候选时只拼段落', () => {
    expect(buildTranscript(['第一句'], '')).toBe('第一句')
    expect(buildTranscript(['第一句'], '   ')).toBe('第一句')
  })

  it('空段落时只显示临时候选', () => {
    expect(buildTranscript([], '正在说')).toBe('正在说')
    expect(buildTranscript([], '')).toBe('')
  })
})

describe('audio-to-text / 统计', () => {
  it('字符数去空白、按码点计', () => {
    expect(countChars('你好 世界')).toBe(4)
    expect(countChars('hello world')).toBe(10)
    expect(countChars('')).toBe(0)
    expect(countChars(' \n\t ')).toBe(0)
    // emoji 按 1 个码点计
    expect(countChars('😀')).toBe(1)
  })

  it('摘要给出段数与字数', () => {
    expect(summarizeTranscript([])).toBe('共 0 段，0 字')
    expect(summarizeTranscript(['你好', '世界！'])).toBe('共 2 段，5 字')
  })
})

describe('audio-to-text / 错误码转中文', () => {
  it('常见错误码有中文提示', () => {
    expect(speechErrorToChinese('no-speech')).toContain('没有检测到语音')
    expect(speechErrorToChinese('audio-capture')).toContain('无法打开麦克风')
    expect(speechErrorToChinese('not-allowed')).toContain('权限被拒绝')
    expect(speechErrorToChinese('network')).toContain('网络异常')
    expect(speechErrorToChinese('aborted')).toContain('已中止')
  })

  it('未知错误码原样带出', () => {
    expect(speechErrorToChinese('weird-code')).toContain('weird-code')
  })
})

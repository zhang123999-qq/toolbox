/**
 * lib/text 单测（只覆盖跨工具共用、且口径容易写错的几处）。
 *
 * 字数统计与列宽是两把不同的尺子：前者按码点、后者按显示宽度（中文算 2）。
 * #61 对齐 / #62 折行依赖后者，混排中日韩时如果误用前者就会错位，这里把两条口径都钉住。
 */
import { describe, expect, it } from 'vitest'
import { byteLength, charWidth, countText, displayWidth, isCjk, readingMinutes } from './text'

describe('text / byteLength', () => {
  it('ASCII 一字节一个', () => {
    expect(byteLength('abc')).toBe(3)
  })

  it('中文按 UTF-8 三字节', () => {
    expect(byteLength('中')).toBe(3)
  })
})

describe('text / isCjk', () => {
  it('汉字与假名算中日韩', () => {
    expect(isCjk('中')).toBe(true)
    expect(isCjk('あ')).toBe(true)
  })

  it('拉丁字母与全角标点不算', () => {
    expect(isCjk('a')).toBe(false)
    expect(isCjk('。')).toBe(false)
  })
})

describe('text / countText', () => {
  it('字符数按码点计：emoji 算一个', () => {
    expect(countText('a😀').chars).toBe(2)
  })

  it('空串一律得 0', () => {
    const counts = countText('')
    expect(counts.chars).toBe(0)
    expect(counts.lines).toBe(0)
    expect(counts.sentences).toBe(0)
  })

  it('中日韩字数与拉丁词数分开统计', () => {
    const counts = countText('你好 hello world')
    expect(counts.cjk).toBe(2)
    expect(counts.latinWords).toBe(2)
  })

  it('阅读时间随速度缩放', () => {
    expect(readingMinutes('字'.repeat(600), 300)).toBe(2)
  })
})

describe('text / 显示列宽', () => {
  it('ASCII 占一列', () => {
    expect(charWidth(0x41)).toBe(1)
    expect(displayWidth('abc')).toBe(3)
  })

  it('汉字与全角占两列', () => {
    expect(charWidth('中'.codePointAt(0) ?? 0)).toBe(2)
    expect(displayWidth('中文')).toBe(4)
  })

  it('混排时按各自宽度累加', () => {
    expect(displayWidth('a中')).toBe(3)
  })

  it('宽度只用来排版，与字符数不是一回事', () => {
    expect(displayWidth('中文')).not.toBe(countText('中文').chars)
  })
})

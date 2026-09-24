/**
 * lib/zerowidth 单测。
 *
 * #42 不可见字符、#57 加水印、#58 去水印共用这一份实现；隐写是「编得进去就要解得回来」，
 * 因此这里的重点是往返一致性与「解不出来时返回 null」这两条边界。
 */
import { describe, expect, it } from 'vitest'
import {
  BIT_ONE,
  BIT_ZERO,
  countZeroWidth,
  decodeHidden,
  encodeHidden,
  hexOf,
  isZeroWidthCode,
  markZeroWidth,
  stripZeroWidth,
  zeroWidthName,
} from './zerowidth'

describe('zerowidth / isZeroWidthCode', () => {
  it('认识常见的零宽与方向控制字符', () => {
    expect(isZeroWidthCode(0x200b)).toBe(true)
    expect(isZeroWidthCode(0x200c)).toBe(true)
    expect(isZeroWidthCode(0xfeff)).toBe(true)
  })

  it('普通字符与全角空格不算零宽', () => {
    expect(isZeroWidthCode(0x41)).toBe(false)
    expect(isZeroWidthCode(0x3000)).toBe(false)
  })
})

describe('zerowidth / zeroWidthName 与 hexOf', () => {
  it('已知字符给出名字', () => {
    expect(zeroWidthName(0x200b)).not.toBe('')
  })

  it('无名字符退回统称', () => {
    expect(zeroWidthName(0x41)).toBe('零宽 / 方向控制字符')
  })

  it('hex 用大写、补满四位', () => {
    expect(hexOf(0x200b)).toMatch(/^U\+[0-9A-F]{4,}$/)
    expect(hexOf(0x41)).toBe('U+0041')
  })
})

describe('zerowidth / 隐写往返', () => {
  it('英文可完整往返', () => {
    expect(decodeHidden(encodeHidden('abc'))).toBe('abc')
  })

  it('中文按 UTF-8 编解码', () => {
    expect(decodeHidden(encodeHidden('水印'))).toBe('水印')
  })

  it('编出来的字符全在隐写字母表内', () => {
    const hidden = encodeHidden('x')
    for (const ch of hidden) {
      expect([BIT_ZERO, BIT_ONE]).toContain(ch.codePointAt(0))
    }
  })

  it('藏进正文后仍能解出', () => {
    const carrier = '前面' + encodeHidden('id-42') + '后面'
    expect(decodeHidden(carrier)).toBe('id-42')
  })

  it('没有隐写字符时返回 null', () => {
    expect(decodeHidden('普通文本')).toBeNull()
  })

  it('位流不足一个字节时返回 null', () => {
    expect(decodeHidden(String.fromCodePoint(BIT_ONE))).toBeNull()
  })
})

describe('zerowidth / stripZeroWidth', () => {
  it('去掉全部零宽字符，保留其余内容', () => {
    expect(stripZeroWidth('a\u200bb\u200bc')).toBe('abc')
  })

  it('没有零宽字符时原样返回', () => {
    expect(stripZeroWidth('abc')).toBe('abc')
  })
})

describe('zerowidth / markZeroWidth', () => {
  it('把零宽字符换成可见标记', () => {
    expect(markZeroWidth('a\u200bb', '[z]')).toBe('a[z]b')
  })
})

describe('zerowidth / countZeroWidth', () => {
  it('统计个数', () => {
    expect(countZeroWidth('a\u200bb\u200cc')).toBe(2)
  })

  it('零宽字符按码点计，代理对不会算成两个', () => {
    expect(countZeroWidth('😀')).toBe(0)
  })
})

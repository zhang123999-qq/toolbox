import { describe, expect, it } from 'vitest'
import { fixConfusables, mergeLineBreaks, normalizeSpaces, postProcess, unifyWidth } from './utils'

describe('ocr-post · utils', () => {
  it('fixConfusables 字母间 0→O、1→l', () => {
    expect(fixConfusables('h0me').text).toBe('hOme')
    expect(fixConfusables('he1lo').text).toBe('hello')
    const r = fixConfusables('h0me he1lo')
    expect(r.count).toBe(2)
  })

  it('fixConfusables 数字间 O/o→0、l/I→1', () => {
    expect(fixConfusables('138O123').text).toBe('1380123')
    expect(fixConfusables('12o34').text).toBe('12034')
    expect(fixConfusables('12l34').text).toBe('12134')
    expect(fixConfusables('12I34').text).toBe('12134')
  })

  it('fixConfusables 不误伤：孤立字符与正常字符不动', () => {
    expect(fixConfusables('0').text).toBe('0')
    expect(fixConfusables('abc').text).toBe('abc')
    expect(fixConfusables('123').text).toBe('123')
    expect(fixConfusables('1a2').text).toBe('1a2')
    expect(fixConfusables('a5b').text).toBe('a5b')
  })

  it('fixConfusables 中文间 0→O', () => {
    expect(fixConfusables('中0文').text).toBe('中O文')
  })

  it('fixConfusables 非字符串抛中文错', () => {
    expect(() => fixConfusables(undefined as never)).toThrow('内容必须是文本')
  })

  it('normalizeSpaces 中文间空格删除、多空格合并、行首尾清理', () => {
    const r = normalizeSpaces('你  好， 世   界！\n  缩进  行  ')
    expect(r.text).toBe('你好，世界！\n缩进行')
    expect(r.count).toBeGreaterThan(0)
  })

  it('normalizeSpaces 干净文本改动为 0', () => {
    expect(normalizeSpaces('你好，世界！').count).toBe(0)
  })

  it('normalizeSpaces 非字符串抛中文错', () => {
    expect(() => normalizeSpaces(null as never)).toThrow('内容必须是文本')
  })

  it('mergeLineBreaks 中文直连、英文加空格、连字符去杠', () => {
    const r = mergeLineBreaks('这是第一行\n这是第二行\nhello\nworld\nhel-\nlo\n\n第二段')
    expect(r.text).toBe('这是第一行这是第二行 hello world hello\n\n第二段')
    expect(r.count).toBe(5)
  })

  it('mergeLineBreaks 跳过段落内空行', () => {
    expect(mergeLineBreaks('a\n\n\nb').text).toBe('a\n\nb')
  })

  it('mergeLineBreaks 非字符串抛中文错', () => {
    expect(() => mergeLineBreaks(1 as never)).toThrow('内容必须是文本')
  })

  it('unifyWidth 全角转半角、中文标点不动', () => {
    const r = unifyWidth('Ｔｅｓｔ　１２３，。！？')
    expect(r.text).toBe('Test 123，。！？')
    expect(r.count).toBe(8)
  })

  it('unifyWidth 非字符串抛中文错', () => {
    expect(() => unifyWidth(undefined as never)).toThrow('内容必须是文本')
  })

  it('postProcess 按顺序执行全部规则', () => {
    const r = postProcess('Ｔｅｓｔ\n你 好', {
      confusables: true,
      spaces: true,
      lineBreaks: true,
      width: true,
    })
    expect(r.text).toBe('Test 你好')
    expect(r.changes).toBeGreaterThan(0)
    expect(r.applied).toEqual(['全半角统一', '形近字纠错', '多余空白清理', '多余换行合并'])
  })

  it('postProcess 可单独开关规则', () => {
    const r = postProcess('Ｔｅｓｔ', {
      confusables: false,
      spaces: false,
      lineBreaks: false,
      width: false,
    })
    expect(r.text).toBe('Ｔｅｓｔ')
    expect(r.changes).toBe(0)
    expect(r.applied).toEqual([])
  })

  it('postProcess 空文本直接返回', () => {
    expect(
      postProcess('', { confusables: true, spaces: true, lineBreaks: true, width: true }),
    ).toEqual({ text: '', changes: 0, applied: [] })
  })

  it('normalizeSpaces 英文多空格合并为一个', () => {
    const r = normalizeSpaces('hello   world')
    expect(r.text).toBe('hello world')
    expect(r.count).toBe(1)
  })

  it('mergeLineBreaks 全空段落返回空、不计数', () => {
    const r = mergeLineBreaks('\n\n')
    expect(r.text).toBe('\n\n')
    expect(r.count).toBe(0)
  })

  it('postProcess 非字符串抛中文错', () => {
    expect(() =>
      postProcess(undefined as never, {
        confusables: true,
        spaces: true,
        lineBreaks: true,
        width: true,
      }),
    ).toThrow('内容必须是文本')
  })
})

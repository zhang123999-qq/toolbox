import { describe, expect, it } from 'vitest'
import { convert, transform } from './utils'
import type { PinyinToolOptions } from './schema'

const symbol: PinyinToolOptions = { tone: 'symbol' }
const num: PinyinToolOptions = { tone: 'num' }
const none: PinyinToolOptions = { tone: 'none' }

describe('pinyin / convert', () => {
  it('默认输出带声调符号的拼音', () => {
    expect(convert('工具库', 'symbol')).toBe('gōng jù kù')
  })

  it('数字声调', () => {
    expect(convert('工具库', 'num')).toBe('gong1 ju4 ku4')
  })

  it('无声调', () => {
    expect(convert('工具库', 'none')).toBe('gong ju ku')
  })

  it('多音字按词组解析（重庆 → chóng qìng）', () => {
    expect(convert('重庆', 'symbol')).toBe('chóng qìng')
  })

  it('非中文字符会被逐字符分隔（拼音库的行为）', () => {
    expect(convert('A1', 'none')).toBe('A 1')
  })
})

describe('pinyin / transform', () => {
  it('多行文本逐行转换', () => {
    expect(transform({ text: '工具\n库' }, none)).toBe('gong ju\nku')
  })

  it('数字声调模式输出 gong1 ju4', () => {
    expect(transform({ text: '工具' }, num)).toBe('gong1 ju4')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '  ' }, symbol)).toBe('')
  })
})

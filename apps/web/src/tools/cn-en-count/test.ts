import { describe, expect, it } from 'vitest'
import { count, transform } from './utils'

describe('cn-en-count / count', () => {
  it('区分中文字符与英文单词', () => {
    const c = count('工具库 toolbox')
    expect(c.chinese).toBe(3)
    expect(c.englishWords).toBe(1)
  })

  it('拉丁字母计入「其他」，同时单独统计为英文单词', () => {
    const c = count('abc')
    expect(c.englishWords).toBe(1)
    expect(c.other).toBe(3)
  })

  it('数字与标点单独计数', () => {
    const c = count('870 个。')
    expect(c.digits).toBe(3)
    expect(c.punctuation).toBe(1)
  })

  it('空文本各类均为 0', () => {
    const c = count('')
    expect(c.total).toBe(0)
    expect(c.chinese).toBe(0)
  })
})

describe('cn-en-count / transform', () => {
  it('输出包含中文字符与英文单词两行', () => {
    const out = transform({ text: '工具库 toolbox' })
    expect(out).toContain('中文字符：3')
    expect(out).toContain('英文单词：1')
  })

  it('纯空白输入返回空串（边界）', () => {
    expect(transform({ text: '  \n ' })).toBe('')
  })
})

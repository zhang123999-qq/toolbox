import { describe, expect, it } from 'vitest'
import { formatMinutes, transform } from './utils'
import type { WordCountOptions } from './schema'

const withSpaces: WordCountOptions = { countSpaces: true }
const noSpaces: WordCountOptions = { countSpaces: false }

describe('word-count / transform', () => {
  it('中英混排：字符数含空格为 11', () => {
    expect(transform({ text: '工具库 toolbox' }, withSpaces)).toContain('字符数：11（含空格）')
  })

  it('不计空格时字符数为 10', () => {
    expect(transform({ text: '工具库 toolbox' }, noSpaces)).toContain('字符数：10（不含空格）')
  })

  it('词数 = 中文字符数 + 英文单词数', () => {
    expect(transform({ text: '工具库 toolbox' }, withSpaces)).toContain(
      '词数：4（中文 3 字 + 英文 1 词）',
    )
  })

  it('UTF-8 字节数按实际编码计算（汉字 3 字节）', () => {
    expect(transform({ text: '工具库 toolbox' }, withSpaces)).toContain('字节数（UTF-8）：17')
  })

  it('多行文本统计行数与段数', () => {
    const out = transform({ text: '第一段\n\n第二段\n第二段第二行' }, withSpaces)
    expect(out).toContain('行数：4')
    expect(out).toContain('段数：2')
  })

  it('空输入与纯空白输入返回空串（边界）', () => {
    expect(transform({ text: '' }, withSpaces)).toBe('')
    expect(transform({ text: '   \n  ' }, withSpaces)).toBe('')
  })
})

describe('word-count / formatMinutes', () => {
  it('0 与负值显示 0 秒', () => {
    expect(formatMinutes(0)).toBe('0 秒')
    expect(formatMinutes(-1)).toBe('0 秒')
  })

  it('不足 1 分钟按秒显示', () => {
    expect(formatMinutes(0.5)).toBe('30 秒')
  })

  it('满 1 分钟按分钟显示', () => {
    expect(formatMinutes(2.4)).toBe('约 2 分钟')
  })
})

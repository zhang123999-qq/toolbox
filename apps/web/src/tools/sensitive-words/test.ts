import { describe, expect, it } from 'vitest'
import { mark, scan, transform } from './utils'
import type { SensitiveWordsOptions } from './schema'

const mask: SensitiveWordsOptions = { mask: true }
const highlight: SensitiveWordsOptions = { mask: false }

describe('sensitive-words / scan', () => {
  it('命中内置词并统计次数', () => {
    const hits = scan('加微信，再加微信')
    expect(hits).toEqual([{ word: '加微信', count: 2 }])
  })

  it('未命中时返回空数组', () => {
    expect(scan('这是一段正常文本')).toEqual([])
  })

  it('多个词按次数降序', () => {
    const hits = scan('加微信 垃圾 垃圾')
    expect(hits[0].word).toBe('垃圾')
  })
})

describe('sensitive-words / mark', () => {
  it('mask 模式把命中词替换为等长星号', () => {
    expect(mark('请加微信联系', true)).toBe('请***联系')
  })

  it('高亮模式用【】包裹命中词', () => {
    expect(mark('请加微信联系', false)).toBe('请【加微信】联系')
  })
})

describe('sensitive-words / transform', () => {
  it('输出命中统计', () => {
    expect(transform({ text: '加微信' }, mask)).toContain('命中 1 个词，共 1 次')
  })

  it('mask 模式输出打码文本', () => {
    expect(transform({ text: '加微信' }, mask)).toContain('打码后的文本：')
  })

  it('关闭 mask 输出高亮文本', () => {
    expect(transform({ text: '加微信' }, highlight)).toContain('【加微信】')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: ' ' }, mask)).toBe('')
  })
})

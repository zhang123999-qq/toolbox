import { describe, expect, it } from 'vitest'
import { convert, splitSyllable, syllableToZhuyin, transform } from './utils'
import type { ZhuyinOptions } from './schema'

const symbol: ZhuyinOptions = { tone: 'symbol' }
const none: ZhuyinOptions = { tone: 'none' }

describe('zhuyin / splitSyllable', () => {
  it('拆出声母、韵母与声调', () => {
    expect(splitSyllable('gong1')).toEqual({ initial: 'g', final: 'ong', tone: 1 })
  })

  it('j / q / x 后的 u 视为 ü', () => {
    expect(splitSyllable('ju4')).toEqual({ initial: 'j', final: 'v', tone: 4 })
  })

  it('翘舌后的 i 是空韵', () => {
    expect(splitSyllable('shi4')).toEqual({ initial: 'sh', final: '', tone: 4 })
  })

  it('零声母音节', () => {
    expect(splitSyllable('ai3')).toEqual({ initial: '', final: 'ai', tone: 3 })
  })
})

describe('zhuyin / syllableToZhuyin', () => {
  it('gong1 → ㄍㄨㄥ（一声不标调）', () => {
    expect(syllableToZhuyin('gong1', true)).toBe('ㄍㄨㄥ')
  })

  it('ju4 → ㄐㄩˋ', () => {
    expect(syllableToZhuyin('ju4', true)).toBe('ㄐㄩˋ')
  })

  it('none 模式不标声调', () => {
    expect(syllableToZhuyin('ku4', false)).toBe('ㄎㄨ')
  })

  it('解析不了时原样返回', () => {
    expect(syllableToZhuyin('A1', true)).toBe('A1')
  })
})

describe('zhuyin / convert', () => {
  it('工具库 → ㄍㄨㄥ ㄐㄩˋ ㄎㄨˋ', () => {
    expect(convert('工具库', 'symbol')).toBe('ㄍㄨㄥ ㄐㄩˋ ㄎㄨˋ')
  })

  it('多行逐行转换', () => {
    expect(convert('工具\n库', 'none')).toBe('ㄍㄨㄥ ㄐㄩ\nㄎㄨ')
  })
})

describe('zhuyin / transform', () => {
  it('输出注音串', () => {
    expect(transform({ text: '工具库' }, symbol)).toContain('ㄍㄨㄥ')
  })

  it('无声调模式不出现声调符号', () => {
    expect(transform({ text: '工具库' }, none)).not.toContain('ˋ')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: ' ' }, symbol)).toBe('')
  })
})

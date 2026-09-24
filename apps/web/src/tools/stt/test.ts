import { describe, expect, it } from 'vitest'
import { confidenceText, report, unsupportedText } from './utils'

describe('stt / confidenceText', () => {
  it('转成百分比', () => {
    expect(confidenceText(0.87)).toBe('置信度：87%')
  })

  it('没有置信度时给出说明', () => {
    expect(confidenceText(0)).toBe('（未给出置信度）')
    expect(confidenceText(Number.NaN)).toBe('（未给出置信度）')
  })
})

describe('stt / report', () => {
  it('给出语言与结果', () => {
    const out = report('你好', { language: 'zh-CN' }, 0.9)
    expect(out).toContain('识别语言：zh-CN')
    expect(out).toContain('识别结果：你好')
    expect(out).toContain('置信度：90%')
  })
})

describe('stt / unsupportedText', () => {
  it('说明哪些浏览器可用', () => {
    expect(unsupportedText()).toContain('Chrome')
  })
})

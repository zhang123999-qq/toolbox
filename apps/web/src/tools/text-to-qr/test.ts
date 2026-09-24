import { describe, expect, it } from 'vitest'
import { matrixOf, matrixToSvg, matrixToText, qrHtml, qrText } from './utils'

describe('text-to-qr / matrixOf', () => {
  it('同尺寸的版本 1 二维码是 21×21', () => {
    const m = matrixOf('A', 'M')
    expect(m.size).toBe(21)
    expect(m.version).toBeGreaterThanOrEqual(1)
  })

  it('三个定位角都是深色模块', () => {
    const m = matrixOf('A', 'M')
    expect(m.dark(0, 0)).toBe(true)
    expect(m.dark(m.size - 7, 0)).toBe(true)
    expect(m.dark(0, m.size - 7)).toBe(true)
  })

  it('内容越长版本越高、尺寸越大', () => {
    const short = matrixOf('A', 'M')
    const long = matrixOf('x'.repeat(200), 'M')
    expect(long.size).toBeGreaterThan(short.size)
  })

  it('同样内容两次生成一致（确定性）', () => {
    const a = matrixToText(matrixOf('abc', 'M'))
    const b = matrixToText(matrixOf('abc', 'M'))
    expect(a).toBe(b)
  })
})

describe('text-to-qr / matrixToSvg', () => {
  it('给出 svg 根标签与 viewBox', () => {
    const svg = matrixToSvg(matrixOf('A', 'M'), 4)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox="0 0 29 29"')
    expect(svg.endsWith('</svg>')).toBe(true)
  })
})

describe('text-to-qr / matrixToText', () => {
  it('行数等于模块数', () => {
    const text = matrixToText(matrixOf('A', 'M'))
    expect(text.split('\n')).toHaveLength(21)
  })

  it('只含深色与浅色两种块', () => {
    const text = matrixToText(matrixOf('A', 'M'))
    expect(/[^█ \n]/.test(text)).toBe(false)
  })
})

describe('text-to-qr / qrHtml 与 qrText', () => {
  const base = { level: 'M' } as const

  it('空输入返回空串', () => {
    expect(qrHtml({ text: '   ' }, base)).toBe('')
    expect(qrText({ text: '   ' }, base)).toBe('')
  })

  it('HTML 里带元信息', () => {
    expect(qrHtml({ text: 'abc' }, base)).toContain('容错等级 M')
  })
})

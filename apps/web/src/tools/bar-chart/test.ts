import { generateSvg } from './utils'

describe('bar-chart 工具', () => {
  it('生成空输入时返回空字符串', () => {
    expect(generateSvg({ text: '' }, { barColor: '#3b82f6' })).toBe('')
  })

  it('生成条形图包含 svg 标签', () => {
    const svg = generateSvg({ text: 'A,10' }, { barColor: '#ff0000' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('A')
    expect(svg).toContain('10')
  })
})

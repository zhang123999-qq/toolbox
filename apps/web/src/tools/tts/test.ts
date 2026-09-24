import { describe, expect, it } from 'vitest'
import { chunkText, estimateSeconds, report, voiceLabel } from './utils'

describe('tts / estimateSeconds', () => {
  it('中文按每分钟 240 字折算', () => {
    // 240 字 → 60 秒
    expect(estimateSeconds('字'.repeat(240), 1)).toBeCloseTo(60, 5)
  })

  it('语速加倍时长减半', () => {
    expect(estimateSeconds('字'.repeat(240), 2)).toBeCloseTo(30, 5)
  })

  it('空文本为 0', () => {
    expect(estimateSeconds('', 1)).toBe(0)
  })
})

describe('tts / chunkText', () => {
  it('够短时整段合成一段', () => {
    expect(chunkText('第一句。第二句。', 200)).toEqual(['第一句。第二句。'])
  })

  it('上限小于句长时逐句成段', () => {
    expect(chunkText('第一句。第二句。', 4)).toEqual(['第一句。', '第二句。'])
  })

  it('超长无标点文本按上限硬切', () => {
    const chunks = chunkText('a'.repeat(450), 200)
    expect(chunks).toHaveLength(3)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(200)
  })

  it('空文本返回空数组', () => {
    expect(chunkText('', 200)).toEqual([])
  })
})

describe('tts / voiceLabel', () => {
  it('带上语言', () => {
    expect(voiceLabel('Ting-Ting', 'zh-CN')).toBe('Ting-Ting（zh-CN）')
  })

  it('没语言时只给名字', () => {
    expect(voiceLabel('Ting-Ting', '')).toBe('Ting-Ting')
  })
})

describe('tts / report', () => {
  const base = { rate: '1' } as const

  it('给出字数与估算时长', () => {
    const out = report('中文测试', base, 'Ting-Ting（zh-CN）')
    expect(out).toContain('已朗读：')
    expect(out).toContain('估算时长：')
    expect(out).toContain('使用语音：Ting-Ting（zh-CN）')
  })

  it('没有语音名时省略该行', () => {
    expect(report('中文测试', base, '')).not.toContain('使用语音')
  })
})

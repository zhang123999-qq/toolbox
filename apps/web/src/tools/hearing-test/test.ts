import { describe, expect, it, vi } from 'vitest'
import {
  HEARING_FREQS,
  playTone,
  recordHearingResult,
  summarizeHearing,
  type AudioContextFactory,
  type ToneContext,
} from './utils'

function mockFactory(): { factory: AudioContextFactory; ctx: ToneContext } {
  const osc = {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gain = { gain: { value: 0 }, connect: vi.fn() }
  const ctx: ToneContext = {
    createOscillator: () => osc,
    createGain: () => gain,
    destination: {},
    currentTime: 10,
    resume: vi.fn().mockResolvedValue(undefined),
  }
  return { factory: () => ctx, ctx }
}

describe('听力测试逻辑', () => {
  it('HEARING_FREQS：7 个标准筛查频率', () => {
    expect(HEARING_FREQS).toEqual([125, 250, 500, 1000, 2000, 4000, 8000])
  })

  it('playTone：按给定频率播放正弦音', async () => {
    const { factory, ctx } = mockFactory()
    const osc = ctx.createOscillator()
    await playTone(factory, 440, 10)
    expect(osc.type).toBe('sine')
    expect(osc.frequency.value).toBe(440)
    expect(osc.start).toHaveBeenCalled()
    expect(osc.stop).toHaveBeenCalled()
  })

  it('playTone：非法频率抛中文错', async () => {
    const { factory } = mockFactory()
    await expect(playTone(factory, 0, 10)).rejects.toThrow('频率必须为正数')
    await expect(playTone(factory, -100, 10)).rejects.toThrow('频率必须为正数')
    await expect(playTone(factory, Number.NaN, 10)).rejects.toThrow('频率必须为正数')
  })

  it('playTone：无 Web Audio 支持抛中文错', async () => {
    await expect(playTone(() => null, 440, 10)).rejects.toThrow('当前浏览器不支持 Web Audio')
  })

  it('recordHearingResult：记录且不修改原对象', () => {
    const r = recordHearingResult({}, 1000, true)
    expect(r).toEqual({ 1000: true })
    const r2 = recordHearingResult(r, 1000, false)
    expect(r).toEqual({ 1000: true })
    expect(r2).toEqual({ 1000: false })
  })

  it('summarizeHearing：未测试', () => {
    expect(summarizeHearing({})).toBe('尚未测试')
  })

  it('summarizeHearing：全部听见', () => {
    const results: Record<number, boolean> = {}
    for (const f of HEARING_FREQS) results[f] = true
    const text = summarizeHearing(results)
    expect(text).toContain('听力筛查通过')
    expect(text).toContain('非医学诊断')
  })

  it('summarizeHearing：部分未听见', () => {
    const text = summarizeHearing({ 125: true, 8000: false })
    expect(text).toContain('8000')
    expect(text).toContain('未听见')
  })
})

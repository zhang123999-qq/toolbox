import { describe, expect, it, vi } from 'vitest'
import {
  actualAnswer,
  checkPitchAnswer,
  newPitchTrial,
  PITCH_ANSWERS,
  playTone,
  scorePitchTrials,
  type AudioContextFactory,
  type PitchTrial,
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

describe('音准测试逻辑', () => {
  it('PITCH_ANSWERS：三个中文选项', () => {
    expect(PITCH_ANSWERS.map((a) => a.value)).toEqual(['higher', 'lower', 'same'])
    expect(PITCH_ANSWERS[0].label).toBe('更高')
  })

  it('newPitchTrial：rng=0 时两个音均为 -4 半音', () => {
    const t = newPitchTrial(() => 0)
    const expected = Math.round(440 * 2 ** (-4 / 12))
    expect(t).toEqual({ freq1: expected, freq2: expected })
  })

  it('newPitchTrial：频率落在 ±4 半音范围', () => {
    for (let i = 0; i < 50; i++) {
      const t = newPitchTrial()
      expect(t.freq1).toBeGreaterThanOrEqual(Math.round(440 * 2 ** (-4 / 12)))
      expect(t.freq1).toBeLessThanOrEqual(Math.round(440 * 2 ** (4 / 12)))
      expect(t.freq2).toBeGreaterThanOrEqual(Math.round(440 * 2 ** (-4 / 12)))
      expect(t.freq2).toBeLessThanOrEqual(Math.round(440 * 2 ** (4 / 12)))
    }
  })

  it('actualAnswer：更高/更低/相同', () => {
    expect(actualAnswer({ freq1: 440, freq2: 494 })).toBe('higher')
    expect(actualAnswer({ freq1: 494, freq2: 440 })).toBe('lower')
    expect(actualAnswer({ freq1: 440, freq2: 440 })).toBe('same')
  })

  it('checkPitchAnswer：判分正确', () => {
    const t: PitchTrial = { freq1: 440, freq2: 494 }
    expect(checkPitchAnswer(t, 'higher')).toBe(true)
    expect(checkPitchAnswer(t, 'lower')).toBe(false)
    expect(checkPitchAnswer(t, 'same')).toBe(false)
  })

  it('checkPitchAnswer：非法答案抛中文错', () => {
    const t: PitchTrial = { freq1: 440, freq2: 440 }
    expect(() => checkPitchAnswer(t, 'up' as never)).toThrow('答案必须是 higher/lower/same 之一')
  })

  it('scorePitchTrials：正确率统计', () => {
    expect(scorePitchTrials([true, true, false])).toEqual({ correct: 2, total: 3, rate: '67%' })
    expect(scorePitchTrials([])).toEqual({ correct: 0, total: 0, rate: '0%' })
    expect(scorePitchTrials([true, true])).toEqual({ correct: 2, total: 2, rate: '100%' })
  })

  it('playTone：按给定频率播放', async () => {
    const { factory, ctx } = mockFactory()
    const osc = ctx.createOscillator()
    await playTone(factory, 440, 10)
    expect(osc.type).toBe('sine')
    expect(osc.frequency.value).toBe(440)
    expect(osc.start).toHaveBeenCalled()
  })

  it('playTone：非法频率抛中文错', async () => {
    const { factory } = mockFactory()
    await expect(playTone(factory, 0, 10)).rejects.toThrow('频率必须为正数')
  })

  it('playTone：无 Web Audio 支持抛中文错', async () => {
    await expect(playTone(() => null, 440, 10)).rejects.toThrow('当前浏览器不支持 Web Audio')
  })
})

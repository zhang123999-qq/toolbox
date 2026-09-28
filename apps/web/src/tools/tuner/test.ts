import { describe, expect, it } from 'vitest'
import {
  MAX_DETECT_FREQ,
  MIN_DETECT_FREQ,
  MIN_RMS,
  NOTE_NAMES,
  assertValidSampleRate,
  detectPitch,
  formatTunerResult,
  noteFromFrequency,
  parabolicRefine,
  tuningHint,
} from './utils'

/** 生成正弦测试信号 */
function makeSine(sampleRate: number, seconds: number, freqHz: number, amp = 0.5): Float32Array {
  const n = Math.floor(sampleRate * seconds)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freqHz * i) / sampleRate)
  return out
}

describe('tuner / 参数校验', () => {
  it('合法采样率通过', () => {
    expect(() => assertValidSampleRate(48000)).not.toThrow()
    expect(() => assertValidSampleRate(8000)).not.toThrow()
    expect(() => assertValidSampleRate(192000)).not.toThrow()
  })

  it('采样率非法抛中文错', () => {
    for (const bad of [7999, 192001, 44100.5, Number.NaN, -48000]) {
      expect(() => assertValidSampleRate(bad)).toThrow(/采样率非法/)
    }
  })
})

describe('tuner / 抛物线内插', () => {
  it('正常峰：顶点落在峰附近', () => {
    // 峰值 4，左右 1 / 3 → 顶点偏向右侧
    expect(parabolicRefine([1, 4, 3], 1)).toBeCloseTo(1.25, 10)
  })

  it('平顶（a = 0）直接返回整数峰', () => {
    expect(parabolicRefine([2, 2, 2], 1)).toBe(1)
  })

  it('内插结果非正时回退到整数峰', () => {
    // [0, 10, 30] → refined = 1 - 15/10 = -0.5，回退
    expect(parabolicRefine([0, 10, 30], 1)).toBe(1)
  })

  it('峰值位置非法抛中文错', () => {
    expect(() => parabolicRefine([1, 2, 1], 0)).toThrow(/峰值位置非法/)
    expect(() => parabolicRefine([1, 2, 1], 2)).toThrow(/峰值位置非法/)
    expect(() => parabolicRefine([1, 2, 1], 1.5)).toThrow(/峰值位置非法/)
    expect(() => parabolicRefine([1, 2], 1)).toThrow(/峰值位置非法/)
  })
})

describe('tuner / 自相关音高检测', () => {
  it('440Hz 正弦 → 约 440Hz', () => {
    const f = detectPitch(makeSine(48000, 0.2, 440), 48000)
    expect(f).not.toBeNull()
    expect(Math.abs(f! - 440)).toBeLessThan(2)
  })

  it('261.63Hz（C4）→ 约 261.6Hz', () => {
    const f = detectPitch(makeSine(44100, 0.3, 261.63), 44100)
    expect(f).not.toBeNull()
    expect(Math.abs(f! - 261.63)).toBeLessThan(2)
  })

  it('高频 2000Hz 也能检出', () => {
    const f = detectPitch(makeSine(48000, 0.2, 2000), 48000)
    expect(f).not.toBeNull()
    expect(Math.abs(f! - 2000)).toBeLessThan(5)
  })

  it('静音（RMS 过低）→ null', () => {
    expect(detectPitch(new Float32Array(4096), 48000)).toBeNull()
    const tiny = makeSine(48000, 0.1, 440, MIN_RMS / 2)
    expect(detectPitch(tiny, 48000)).toBeNull()
  })

  it('非有限采样值（NaN / Infinity）→ null', () => {
    expect(detectPitch(new Float32Array(100).fill(Number.NaN), 48000)).toBeNull()
    expect(detectPitch(new Float32Array(100).fill(Number.POSITIVE_INFINITY), 48000)).toBeNull()
  })

  it('首尾静音段被修剪，不影响检测', () => {
    const tone = makeSine(48000, 0.2, 440)
    const padded = new Float32Array(tone.length + 2000)
    padded.set(tone, 1000)
    const f = detectPitch(padded, 48000)
    expect(f).not.toBeNull()
    expect(Math.abs(f! - 440)).toBeLessThan(2)
  })

  it('过短的有效信号 → null', () => {
    expect(detectPitch(new Float32Array([0.5, -0.5, 0.5]), 48000)).toBeNull()
  })

  it('单调递减信号（峰在边界）→ null', () => {
    const ramp = new Float32Array([1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2])
    expect(detectPitch(ramp, 48000)).toBeNull()
  })

  it(`低于 ${MIN_DETECT_FREQ}Hz → null`, () => {
    expect(detectPitch(makeSine(48000, 0.3, 30), 48000)).toBeNull()
  })

  it(`高于 ${MAX_DETECT_FREQ}Hz（奈奎斯特交替信号）→ null`, () => {
    const alt = new Float32Array(4096)
    for (let i = 0; i < alt.length; i++) alt[i] = i % 2 === 0 ? 0.5 : -0.5
    expect(detectPitch(alt, 48000)).toBeNull()
  })

  it('空数据抛中文错', () => {
    expect(() => detectPitch(new Float32Array(0), 48000)).toThrow(/音频数据为空/)
  })

  it('采样率非法抛中文错', () => {
    expect(() => detectPitch(makeSine(48000, 0.1, 440), 7999)).toThrow(/采样率非法/)
  })
})

describe('tuner / 音名换算', () => {
  it('440Hz → A4，0 音分', () => {
    expect(noteFromFrequency(440)).toEqual({ name: 'A', octave: 4, midi: 69, cents: 0 })
  })

  it('261.63Hz → C4', () => {
    const n = noteFromFrequency(261.63)
    expect(n.name).toBe('C')
    expect(n.octave).toBe(4)
    expect(n.midi).toBe(60)
  })

  it('442Hz → A4，+8 音分', () => {
    const n = noteFromFrequency(442)
    expect(n.name).toBe('A')
    expect(n.cents).toBe(8)
  })

  it('低八度：110Hz → A2', () => {
    const n = noteFromFrequency(110)
    expect(n).toMatchObject({ name: 'A', octave: 2, midi: 45 })
  })

  it('升半音：466.16Hz → A#4', () => {
    expect(noteFromFrequency(466.16).name).toBe('A#')
  })

  it('音名表共 12 个', () => {
    expect(NOTE_NAMES.length).toBe(12)
  })

  it('频率非法抛中文错：0 / 负数 / NaN / Infinity', () => {
    for (const bad of [0, -440, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => noteFromFrequency(bad)).toThrow(/频率非法/)
    }
  })
})

describe('tuner / 音准提示', () => {
  it('±5 音分内算准', () => {
    expect(tuningHint(0)).toBe('音准')
    expect(tuningHint(5)).toBe('音准')
    expect(tuningHint(-5)).toBe('音准')
    expect(tuningHint(4)).toBe('音准')
  })

  it('超出 5 音分：正偏高、负偏低', () => {
    expect(tuningHint(6)).toBe('偏高')
    expect(tuningHint(20)).toBe('偏高')
    expect(tuningHint(-6)).toBe('偏低')
    expect(tuningHint(-20)).toBe('偏低')
  })

  it('非有限音分抛中文错', () => {
    expect(() => tuningHint(Number.NaN)).toThrow(/音分非法/)
    expect(() => tuningHint(Number.POSITIVE_INFINITY)).toThrow(/音分非法/)
  })
})

describe('tuner / 结果摘要', () => {
  it('生成中文摘要行', () => {
    expect(formatTunerResult(440)).toBe('A4 · 440.0 Hz · 0 音分（音准）')
    expect(formatTunerResult(442)).toContain('A4')
    expect(formatTunerResult(442)).toContain('+8 音分（偏高）')
    expect(formatTunerResult(435)).toContain('偏低')
  })
})

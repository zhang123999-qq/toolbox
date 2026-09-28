import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FLOOR_DB,
  MAX_FFT_SIZE,
  VALID_FFT_SIZES,
  analyzeSpectrum,
  applyHannWindow,
  assertPowerOfTwo,
  assertValidSampleRate,
  binToFreq,
  dbToUnit,
  fftReal,
  findPeakBin,
  magnitudeSpectrum,
  magnitudesToDb,
  nextPowerOfTwo,
  padToLength,
} from './utils'

/** 生成落在第 k 个频点的正弦（N 点，采样率 sr） */
function binSine(n: number, k: number): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * k * i) / n)
  return out
}

describe('spectrum / 参数校验', () => {
  it('合法采样率通过', () => {
    expect(() => assertValidSampleRate(44100)).not.toThrow()
  })

  it('采样率非法抛中文错', () => {
    for (const bad of [7999, 192001, 44100.5, Number.NaN]) {
      expect(() => assertValidSampleRate(bad)).toThrow(/采样率非法/)
    }
  })

  it('2 的幂校验', () => {
    expect(() => assertPowerOfTwo(1024, 'FFT 点数')).not.toThrow()
    expect(() => assertPowerOfTwo(2, 'FFT 点数')).not.toThrow()
    for (const bad of [0, 1, 3, 1000, 1024.5, Number.NaN]) {
      expect(() => assertPowerOfTwo(bad, 'FFT 点数')).toThrow(/应为 ≥2 的 2 的幂/)
    }
  })

  it('nextPowerOfTwo 向上取整', () => {
    expect(nextPowerOfTwo(1)).toBe(1)
    expect(nextPowerOfTwo(2)).toBe(2)
    expect(nextPowerOfTwo(3)).toBe(4)
    expect(nextPowerOfTwo(1024)).toBe(1024)
    expect(nextPowerOfTwo(1025)).toBe(2048)
    expect(() => nextPowerOfTwo(0)).toThrow(/长度非法/)
    expect(() => nextPowerOfTwo(1.5)).toThrow(/长度非法/)
    expect(() => nextPowerOfTwo(Number.NaN)).toThrow(/长度非法/)
  })

  it('允许的 FFT 点数表非空', () => {
    expect(VALID_FFT_SIZES.length).toBeGreaterThan(0)
    expect(MAX_FFT_SIZE).toBe(32768)
  })
})

describe('spectrum / 补齐与加窗', () => {
  it('padToLength：补零与截断，不修改输入', () => {
    const src = new Float32Array([1, 2])
    const padded = padToLength(src, 4)
    expect([...padded]).toEqual([1, 2, 0, 0])
    expect(src.length).toBe(2)
    const truncated = padToLength(new Float32Array([1, 2, 3, 4, 5]), 4)
    expect([...truncated]).toEqual([1, 2, 3, 4])
  })

  it('padToLength 目标长度非法抛中文错', () => {
    expect(() => padToLength(new Float32Array([1, 2]), 3)).toThrow(/目标长度非法/)
  })

  it('汉宁窗：两端为 0、中间隆起，不修改输入', () => {
    const src = new Float32Array([1, 1, 1, 1])
    const win = applyHannWindow(src)
    expect(win[0]).toBeCloseTo(0, 10)
    expect(win[3]).toBeCloseTo(0, 10)
    expect(win[1]).toBeCloseTo(0.75, 10)
    expect(win[2]).toBeCloseTo(0.75, 10)
    expect(src[0]).toBe(1)
  })

  it('空采样加窗抛中文错', () => {
    expect(() => applyHannWindow(new Float32Array(0))).toThrow(/采样数据为空/)
  })
})

describe('spectrum / FFT 正确性', () => {
  it('冲激信号 → 全频带幅度为 1', () => {
    const { real, imag } = fftReal(new Float32Array([1, 0, 0, 0]))
    for (let i = 0; i < 4; i++) {
      expect(real[i]).toBeCloseTo(1, 10)
      expect(imag[i]).toBeCloseTo(0, 10)
    }
  })

  it('直流信号 → 能量集中在 0 频点', () => {
    const { real, imag } = fftReal(new Float32Array([1, 1, 1, 1]))
    expect(real[0]).toBeCloseTo(4, 10)
    for (let i = 1; i < 4; i++) {
      expect(real[i]).toBeCloseTo(0, 10)
      expect(imag[i]).toBeCloseTo(0, 10)
    }
  })

  it('正弦落在第 10 频点 → 峰值在 bin 10，幅度 0.5', () => {
    const mags = magnitudeSpectrum(fftReal(binSine(1024, 10)))
    const { bin, magnitude } = findPeakBin(mags)
    expect(bin).toBe(10)
    expect(magnitude).toBeCloseTo(0.5, 6)
  })

  it('输入长度非 2 的幂抛中文错', () => {
    expect(() => fftReal(new Float32Array([1, 2, 3]))).toThrow(/FFT 输入长度非法/)
    expect(() => fftReal(new Float32Array(0))).toThrow(/FFT 输入长度非法/)
  })
})

describe('spectrum / 幅度与 dB', () => {
  it('幅度谱按 1/N 归一化', () => {
    const mags = magnitudeSpectrum(fftReal(new Float32Array([1, 1, 1, 1])))
    expect(mags[0]).toBeCloseTo(1, 10)
  })

  it('实部虚部长度不一致抛中文错', () => {
    expect(() =>
      magnitudeSpectrum({ real: new Float64Array(4), imag: new Float64Array(8) }),
    ).toThrow(/实部与虚部长度不一致/)
  })

  it('幅度转 dB：1 → 0dB，0.001 → -60dB', () => {
    const db = magnitudesToDb(new Float32Array([1, 0.001]))
    expect(db[0]).toBeCloseTo(0, 6)
    expect(db[1]).toBeCloseTo(-60, 6)
  })

  it('0 与极小值钳制到下限', () => {
    const db = magnitudesToDb(new Float32Array([0, 1e-20]))
    expect(db[0]).toBe(DEFAULT_FLOOR_DB)
    expect(db[1]).toBe(DEFAULT_FLOOR_DB)
  })

  it('自定义下限', () => {
    const db = magnitudesToDb(new Float32Array([0]), -60)
    expect(db[0]).toBe(-60)
  })

  it('分贝下限非有限数抛中文错', () => {
    expect(() => magnitudesToDb(new Float32Array([1]), Number.NaN)).toThrow(/分贝下限非法/)
  })
})

describe('spectrum / 频点与峰值', () => {
  it('binToFreq 换算', () => {
    expect(binToFreq(1, 48000, 1024)).toBeCloseTo(46.875, 10)
    expect(binToFreq(0, 48000, 1024)).toBe(0)
    expect(binToFreq(512, 48000, 1024)).toBe(24000)
  })

  it('binToFreq 参数非法抛中文错', () => {
    expect(() => binToFreq(-1, 48000, 1024)).toThrow(/频点序号非法/)
    expect(() => binToFreq(1024, 48000, 1024)).toThrow(/频点序号非法/)
    expect(() => binToFreq(1.5, 48000, 1024)).toThrow(/频点序号非法/)
    expect(() => binToFreq(1, 7999, 1024)).toThrow(/采样率非法/)
    expect(() => binToFreq(1, 48000, 1000)).toThrow(/FFT 点数非法/)
  })

  it('findPeakBin 找最大幅度', () => {
    const r1 = findPeakBin(new Float32Array([0.1, 0.5, 0.3]))
    expect(r1.bin).toBe(1)
    expect(r1.magnitude).toBeCloseTo(0.5, 6)
    const r2 = findPeakBin(new Float32Array([0.7]))
    expect(r2.bin).toBe(0)
    expect(r2.magnitude).toBeCloseTo(0.7, 6)
  })

  it('空频谱找峰抛中文错', () => {
    expect(() => findPeakBin(new Float32Array(0))).toThrow(/频谱数据为空/)
  })
})

describe('spectrum / 一站式分析', () => {
  it('468.75Hz 正弦（bin 10）→ 峰值频率约 468.75Hz', () => {
    const samples = binSine(1024, 10)
    const { freqs, db, peakFreq, peakDb } = analyzeSpectrum(samples, 48000)
    expect(freqs.length).toBe(513)
    expect(db.length).toBe(513)
    expect(freqs[0]).toBe(0)
    expect(freqs[512]).toBe(24000)
    expect(Math.abs(peakFreq - 468.75)).toBeLessThan(1)
    expect(peakDb).toBeLessThan(0)
    expect(peakDb).toBeGreaterThan(DEFAULT_FLOOR_DB)
  })

  it('非 2 的幂长度自动补齐', () => {
    const { freqs } = analyzeSpectrum(binSine(1000, 10), 48000)
    expect(freqs.length).toBe(513) // 补到 1024
  })

  it('空采样抛中文错', () => {
    expect(() => analyzeSpectrum(new Float32Array(0), 48000)).toThrow(/采样数据为空/)
  })

  it('采样率非法抛中文错', () => {
    expect(() => analyzeSpectrum(binSine(1024, 10), 7999)).toThrow(/采样率非法/)
  })
})

describe('spectrum / dB 归一化', () => {
  it('0dB → 1，下限 → 0，中间线性', () => {
    expect(dbToUnit(0)).toBe(1)
    expect(dbToUnit(DEFAULT_FLOOR_DB)).toBe(0)
    expect(dbToUnit(DEFAULT_FLOOR_DB / 2)).toBeCloseTo(0.5, 10)
  })

  it('超范围钳制到 [0, 1]', () => {
    expect(dbToUnit(10)).toBe(1)
    expect(dbToUnit(-1000)).toBe(0)
  })

  it('非法参数抛中文错', () => {
    expect(() => dbToUnit(Number.NaN)).toThrow(/分贝值非法/)
    expect(() => dbToUnit(0, Number.NaN)).toThrow(/分贝值非法/)
    expect(() => dbToUnit(0, 0)).toThrow(/分贝下限非法/)
    expect(() => dbToUnit(0, 10)).toThrow(/分贝下限非法/)
  })
})

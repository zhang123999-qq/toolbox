/**
 * spectrum —— 频谱分析的纯函数层（基 2 FFT + 汉宁窗 + dB 换算）
 *
 * 约定：
 * - FFT 输入长度必须为 2 的幂（≥ 2），Tool.tsx 负责按 fftSize 选项截取/补齐；
 * - 幅度谱按 1/N 归一化后转 dB；
 * - 本文件不触碰任何浏览器 API（AudioContext / canvas 都在 Tool.tsx），
 *   可在 node 下被 vitest 完整测试。
 */

/** 允许的 FFT 点数 */
export const VALID_FFT_SIZES = [512, 1024, 2048, 4096, 8192] as const
/** 单次分析的 FFT 点数上限（防大文件卡死） */
export const MAX_FFT_SIZE = 32768
/** dB 下限：低于此值的能量视为本底噪声 */
export const DEFAULT_FLOOR_DB = -100

/** FFT 复数结果 */
export interface FftResult {
  readonly real: Float64Array
  readonly imag: Float64Array
}

/** 频谱分析结果：单边谱（0～Nyquist）的频率轴与 dB 轴，外加峰值 */
export interface SpectrumResult {
  readonly freqs: Float32Array
  readonly db: Float32Array
  readonly peakFreq: number
  readonly peakDb: number
}

/** 采样率非法时抛中文错 */
export function assertValidSampleRate(sampleRate: number): void {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new Error(`采样率非法：${String(sampleRate)}（应为 8000～192000 的整数，单位 Hz）`)
  }
}

/** 长度必须为 ≥2 的 2 的幂，否则抛中文错 */
export function assertPowerOfTwo(n: number, what: string): void {
  if (!Number.isInteger(n) || n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`${what}非法：${String(n)}（应为 ≥2 的 2 的幂）`)
  }
}

/** n 向上取整到 2 的幂 */
export function nextPowerOfTwo(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`长度非法：${String(n)}（应为正整数）`)
  }
  let p = 1
  while (p < n) p <<= 1
  return p
}

/**
 * 截取/补零到目标长度（纯函数，不修改输入）。
 * 目标长度必须为 2 的幂。
 */
export function padToLength(samples: Float32Array, length: number): Float32Array {
  assertPowerOfTwo(length, '目标长度')
  const out = new Float32Array(length)
  out.set(samples.subarray(0, Math.min(samples.length, length)))
  return out
}

/** 汉宁窗（纯函数）：返回加窗后的拷贝，抑制频谱泄漏 */
export function applyHannWindow(samples: Float32Array): Float32Array {
  if (samples.length === 0) throw new Error('采样数据为空')
  const n = samples.length
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = samples[i]! * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
  }
  return out
}

/** 基 2 时间抽取 FFT（实数输入，复数输出），输入长度必须为 2 的幂 */
export function fftReal(input: Float32Array): FftResult {
  assertPowerOfTwo(input.length, 'FFT 输入长度')
  const n = input.length
  const real = new Float64Array(n)
  const imag = new Float64Array(n)
  for (let i = 0; i < n; i++) real[i] = input[i]!

  // 位反转重排
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = real[i]!
      real[i] = real[j]!
      real[j] = tr
      const ti = imag[i]!
      imag[i] = imag[j]!
      imag[j] = ti
    }
  }

  // 蝶形迭代
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      const half = len / 2
      for (let k = 0; k < half; k++) {
        const uRe = real[i + k]!
        const uIm = imag[i + k]!
        const aRe = real[i + k + half]!
        const aIm = imag[i + k + half]!
        const vRe = aRe * curRe - aIm * curIm
        const vIm = aRe * curIm + aIm * curRe
        real[i + k] = uRe + vRe
        imag[i + k] = uIm + vIm
        real[i + k + half] = uRe - vRe
        imag[i + k + half] = uIm - vIm
        const nRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nRe
      }
    }
  }
  return { real, imag }
}

/** 幅度谱（按 1/N 归一化）：|X[k]| / N */
export function magnitudeSpectrum(fft: FftResult): Float32Array {
  const n = fft.real.length
  if (n !== fft.imag.length) throw new Error('FFT 结果损坏：实部与虚部长度不一致')
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = Math.hypot(fft.real[i]!, fft.imag[i]!) / n
  return out
}

/** 幅度 → dB（20·log10），0 或极小值钳制到下限 */
export function magnitudesToDb(mags: Float32Array, floorDb = DEFAULT_FLOOR_DB): Float32Array {
  if (!Number.isFinite(floorDb)) throw new Error(`分贝下限非法：${String(floorDb)}`)
  const out = new Float32Array(mags.length)
  for (let i = 0; i < mags.length; i++) {
    const v = mags[i]!
    const db = v <= 0 ? floorDb : 20 * Math.log10(v)
    out[i] = db < floorDb ? floorDb : db
  }
  return out
}

/** 频点序号 → 频率（Hz） */
export function binToFreq(bin: number, sampleRate: number, fftSize: number): number {
  assertValidSampleRate(sampleRate)
  assertPowerOfTwo(fftSize, 'FFT 点数')
  if (!Number.isInteger(bin) || bin < 0 || bin >= fftSize) {
    throw new Error(`频点序号非法：${String(bin)}（应为 0～${fftSize - 1} 的整数）`)
  }
  return (bin * sampleRate) / fftSize
}

/** 找最大幅度所在的频点 */
export function findPeakBin(mags: Float32Array): { bin: number; magnitude: number } {
  if (mags.length === 0) throw new Error('频谱数据为空')
  let bin = 0
  let mag = mags[0]!
  for (let i = 1; i < mags.length; i++) {
    if (mags[i]! > mag) {
      mag = mags[i]!
      bin = i
    }
  }
  return { bin, magnitude: mag }
}

/**
 * 一站式频谱分析（纯函数）：加窗 → FFT → 单边幅度谱 → dB。
 * 输入长度按 2 的幂向上取整（上限 32768），不足补零。
 */
export function analyzeSpectrum(samples: Float32Array, sampleRate: number): SpectrumResult {
  if (samples.length === 0) throw new Error('采样数据为空')
  assertValidSampleRate(sampleRate)
  const n = Math.min(nextPowerOfTwo(samples.length), MAX_FFT_SIZE)
  const padded = padToLength(samples, n)
  const windowed = applyHannWindow(padded)
  const mags = magnitudeSpectrum(fftReal(windowed))
  const half = n / 2
  const halfMags = mags.slice(0, half + 1)
  const db = magnitudesToDb(halfMags)
  const freqs = new Float32Array(half + 1)
  for (let i = 0; i <= half; i++) freqs[i] = binToFreq(i, sampleRate, n)
  const { bin } = findPeakBin(halfMags)
  return { freqs, db, peakFreq: freqs[bin]!, peakDb: db[bin]! }
}

/** dB 值 → 0～1 归一化（供 canvas 绘制柱高） */
export function dbToUnit(db: number, floorDb = DEFAULT_FLOOR_DB): number {
  if (!Number.isFinite(db) || !Number.isFinite(floorDb)) {
    throw new Error('分贝值非法：必须为有限数')
  }
  if (floorDb >= 0) throw new Error(`分贝下限非法：${floorDb}（应为负数）`)
  const v = (db - floorDb) / -floorDb
  return Math.min(1, Math.max(0, v))
}

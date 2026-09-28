/**
 * audio-visualizer —— 音频可视化的纯函数层
 *
 * 约定：
 * - 本文件只做数值计算：样式定义、分贝→像素映射、平滑、柱状布局、
 *   极坐标换算、色相映射、示例音频 PCM/WAV 生成；
 * - AudioContext / AnalyserNode / Canvas 2D 的真实渲染只出现在 Tool.tsx，
 *   本文件不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 可视化样式
// ---------------------------------------------------------------------------

/** 可视化样式定义 */
export interface VisualStyleDef {
  readonly id: string
  readonly label: string
  readonly description: string
}

/** 三种内置样式：柱状频谱 / 波形 / 圆形频谱 */
export const VISUAL_STYLES: readonly VisualStyleDef[] = [
  { id: 'bars', label: '柱状频谱', description: '按频率分段的能量柱，颜色随频率渐变' },
  { id: 'wave', label: '波形', description: '时域波形曲线，实时起伏' },
  { id: 'circle', label: '圆形频谱', description: '频谱能量以径向条形环绕成圆' },
]

/** 取样式定义；未知 id 抛中文错 */
export function getVisualStyle(id: string): VisualStyleDef {
  const found = VISUAL_STYLES.find((s) => s.id === id)
  if (!found) throw new Error(`未知的可视化样式："${id}"`)
  return found
}

// ---------------------------------------------------------------------------
// 数值映射
// ---------------------------------------------------------------------------

/** 断言有限数 */
function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name}非法：${String(value)}（应为有限数）`)
}

/**
 * 分贝值 → 像素高度：线性映射后钳制到 [0, height]。
 * minDb 必须严格小于 maxDb，height 必须为正数。
 */
export function dbToHeight(db: number, minDb: number, maxDb: number, height: number): number {
  assertFiniteNumber(db, '分贝值')
  assertFiniteNumber(minDb, '最小分贝')
  assertFiniteNumber(maxDb, '最大分贝')
  assertFiniteNumber(height, '画布高度')
  if (!(maxDb > minDb)) throw new Error(`分贝区间非法：${minDb}～${maxDb}（最大值必须大于最小值）`)
  if (!(height > 0)) throw new Error(`画布高度非法：${height}（必须为正数）`)
  const ratio = (db - minDb) / (maxDb - minDb)
  const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio
  return clamped * height
}

/**
 * 指数平滑：factor=0 完全保留旧值，factor=1 完全采用新值。
 * factor 超出 [0, 1] 抛中文错。
 */
export function smoothValue(prev: number, next: number, factor: number): number {
  assertFiniteNumber(prev, '旧值')
  assertFiniteNumber(next, '新值')
  assertFiniteNumber(factor, '平滑系数')
  if (factor < 0 || factor > 1) throw new Error(`平滑系数非法：${factor}（应在 0～1 之间）`)
  return prev + (next - prev) * factor
}

/**
 * 给定画布宽度与柱数、间距，计算每根频谱柱的宽度（px）。
 * 宽度容不下时抛中文错（调用方可减少柱数）。
 */
export function barWidthFor(width: number, count: number, gap: number): number {
  assertFiniteNumber(width, '画布宽度')
  assertFiniteNumber(gap, '柱间距')
  if (!(width > 0)) throw new Error(`画布宽度非法：${width}（必须为正数）`)
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`频谱柱数量非法：${String(count)}（应为正整数）`)
  }
  if (gap < 0) throw new Error(`柱间距非法：${gap}（不能为负数）`)
  const w = (width - gap * (count - 1)) / count
  if (w < 1) throw new Error(`画布太窄：${width}px 容纳不下 ${count} 根频谱柱`)
  return w
}

/** 极坐标 → 直角坐标（圆形频谱用）；角度为弧度 */
export function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number,
): { readonly x: number; readonly y: number } {
  assertFiniteNumber(cx, '圆心 x')
  assertFiniteNumber(cy, '圆心 y')
  assertFiniteNumber(radius, '半径')
  assertFiniteNumber(angleRad, '角度')
  if (radius < 0) throw new Error(`半径非法：${radius}（不能为负数）`)
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) }
}

/** 序号 → 色相（0～360）：频谱柱颜色渐变用 */
export function indexToHue(index: number, total: number): number {
  assertFiniteNumber(index, '序号')
  assertFiniteNumber(total, '总数')
  if (!Number.isInteger(total) || total <= 0)
    throw new Error(`总数非法：${String(total)}（应为正整数）`)
  if (!Number.isInteger(index) || index < 0 || index >= total) {
    throw new Error(`序号非法：${String(index)}（应在 0～${total - 1} 之间）`)
  }
  return (index / total) * 360
}

/** AnalyserNode 的 byte 数据（0～255）钳制；非有限数抛中文错 */
export function clampByteValue(value: number): number {
  assertFiniteNumber(value, '字节值')
  if (value < 0) return 0
  if (value > 255) return 255
  return value
}

// ---------------------------------------------------------------------------
// 示例音频：正弦 PCM → 16 位 WAV（纯函数，供「载入示例音频」使用）
// ---------------------------------------------------------------------------

/** 生成单声道示例 PCM：440Hz 基频 + 谐波，幅度归一化到 [-1, 1] */
export function makeExamplePcm(sampleRate: number, seconds: number): Float32Array {
  assertFiniteNumber(sampleRate, '采样率')
  assertFiniteNumber(seconds, '时长')
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) {
    throw new Error(`采样率非法：${String(sampleRate)}（应为 8000～96000 的整数）`)
  }
  if (!(seconds > 0) || seconds > 30)
    throw new Error(`时长非法：${String(seconds)}（应为 0～30 秒）`)
  const frames = Math.floor(sampleRate * seconds)
  const out = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate
    // 随时间缓慢变化的和弦感：基频 + 二倍频 + 轻微颤音，幅度 0.6 以内
    out[i] =
      0.4 * Math.sin(2 * Math.PI * 440 * t) +
      0.15 * Math.sin(2 * Math.PI * 880 * t) +
      0.05 * Math.sin(2 * Math.PI * 220 * t + Math.sin(2 * Math.PI * 5 * t))
  }
  return out
}

/** 单声道 Float32 PCM → 16 位 PCM WAV 字节 */
export function encodeWavMono(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  assertFiniteNumber(sampleRate, '采样率')
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) {
    throw new Error(`采样率非法：${String(sampleRate)}（应为 8000～96000 的整数）`)
  }
  if (samples.length === 0) throw new Error('音频数据为空：没有可编码的采样点')
  const dataSize = samples.length * 2
  const out = new Uint8Array(44 + dataSize)
  const view = new DataView(out.buffer)
  const ascii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, dataSize, true)
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!
    const clamped = s < -1 ? -1 : s > 1 ? 1 : s
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true)
  }
  return out
}

import type { WaveGenInput, WaveGenOptions } from './schema'

/** FNV-1a 32 位哈希：把任意字符串种子转成确定性整数 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 PRNG：小巧、确定性、分布均匀 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 解析振幅：10–150，留空默认 50 */
export function parseAmplitude(raw: string): number {
  const v = raw.trim()
  if (v === '') return 50
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`振幅格式非法：${v}（须为数字）`)
  if (n < 10 || n > 150) throw new Error(`振幅须在 10–150 之间（当前 ${v}）`)
  return n
}

/** 解析频率：1–10，留空默认 2 */
export function parseFrequency(raw: string): number {
  const v = raw.trim()
  if (v === '') return 2
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`频率格式非法：${v}（须为数字）`)
  if (n < 1 || n > 10) throw new Error(`频率须在 1–10 之间（当前 ${v}）`)
  return n
}

/** 解析层数：1–6，留空默认 3 */
export function parseLayers(raw: string): number {
  const v = raw.trim()
  if (v === '') return 3
  if (!/^\d+$/.test(v)) throw new Error(`层数格式非法：${v}（须为整数）`)
  const n = Number(v)
  if (n < 1 || n > 6) throw new Error(`层数须在 1–6 之间（当前 ${v}）`)
  return n
}

/** 校验 #rgb / #rrggbb，统一小写并把 3 位展开成 6 位 */
export function parseHex(raw: string, name: string): string {
  const v = raw.trim()
  if (v === '') throw new Error(`${name}不能为空`)
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(v)
  if (!m) throw new Error(`${name}格式非法：${v}（须为 #rgb / #rrggbb）`)
  let h = m[1].toLowerCase()
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  return '#' + h
}

/** 把 #rgb / #rrggbb 解析成 [r,g,b]（0–255） */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** 在两个 hex 颜色之间做线性插值（t: 0–1），返回 #rrggbb */
export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  const to = (v: number): string => v.toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/**
 * 生成单层波浪的 SVG path：从左到右采样正弦波，再沿底边闭合形成填充区域。
 * phase 控制左右相位偏移，layerAmp / layerFreq 在基值上做轻微扰动，使各层不完全重合。
 */
export function buildWavePath(
  width: number,
  height: number,
  amp: number,
  freq: number,
  phase: number,
  baseY: number,
): string {
  const steps = 120
  let d = `M 0 ${baseY.toFixed(1)}`
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width
    const y = baseY + Math.sin((i / steps) * Math.PI * 2 * freq + phase) * amp
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  d += ` L ${width} ${height} L 0 ${height} Z`
  return d
}

/** 组装完整波浪 SVG：多层波浪自上而下叠加，颜色从 color1 渐变到 color2，半透明填充 */
export function buildWaveSvg(options: WaveGenOptions, rand: () => number): string {
  const amp = parseAmplitude(options.amplitude)
  const freq = parseFrequency(options.frequency)
  const layers = parseLayers(options.layers)
  const c1 = parseHex(options.color1, '起始色')
  const c2 = parseHex(options.color2, '结束色')

  const width = 800
  const height = 400
  // 层间距：把画布高度均分给各层基线
  const band = height / layers
  let paths = ''
  for (let i = 0; i < layers; i++) {
    // 每层在基值上做 ±15% 扰动，避免机械重复
    const layerAmp = amp * (0.85 + rand() * 0.3)
    const layerFreq = freq * (0.85 + rand() * 0.3)
    const phase = rand() * Math.PI * 2
    const baseY = band * (i + 0.5)
    const color = layers === 1 ? c1 : lerpColor(c1, c2, i / (layers - 1))
    const d = buildWavePath(width, height, layerAmp, layerFreq, phase, baseY)
    paths += `  <path d="${d}" fill="${color}" fill-opacity="0.45" />\n`
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    paths +
    `</svg>`
  )
}

/** T3 toText 入口：text 作为种子，相同种子+参数 → 相同波浪 */
export function transform(input: WaveGenInput, options: WaveGenOptions): string {
  const rand = mulberry32(hashSeed(JSON.stringify({ text: input.text, options })))
  return buildWaveSvg(options, rand)
}

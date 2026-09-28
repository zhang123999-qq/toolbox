import type { NoiseGenOptions } from './schema'

/** 支持的颜色映射 */
export type Colormap = 'grayscale' | 'viridis' | 'plasma'

/** 解析尺度：0.005–0.1，留空默认 0.02 */
export function parseScale(raw: string): number {
  const v = raw.trim()
  if (v === '') return 0.02
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`尺度格式非法：${v}（须为数字）`)
  if (n < 0.005 || n > 0.1) throw new Error(`尺度须在 0.005–0.1 之间（当前 ${v}）`)
  return n
}

/** 解析八度：1–8，留空默认 4 */
export function parseOctaves(raw: string): number {
  const v = raw.trim()
  if (v === '') return 4
  if (!/^\d+$/.test(v)) throw new Error(`八度格式非法：${v}（须为整数）`)
  const n = Number(v)
  if (n < 1 || n > 8) throw new Error(`八度须在 1–8 之间（当前 ${v}）`)
  return n
}

/** 解析种子：0–99999，留空表示随机（调用方自行生成） */
export function parseSeed(raw: string): number | null {
  const v = raw.trim()
  if (v === '') return null
  if (!/^\d+$/.test(v)) throw new Error(`种子格式非法：${v}（须为 0–99999 整数）`)
  const n = Number(v)
  if (n < 0 || n > 99999) throw new Error(`种子须在 0–99999 之间（当前 ${v}）`)
  return n
}

/** 解析颜色映射：grayscale / viridis / plasma，留空默认 grayscale */
export function parseColormap(raw: string): Colormap {
  const v = raw.trim()
  if (v === '' || v === 'grayscale') return 'grayscale'
  if (v === 'viridis') return 'viridis'
  if (v === 'plasma') return 'plasma'
  throw new Error(`颜色映射非法：${v}（须为 grayscale / viridis / plasma）`)
}

/** 解析尺寸：1–1000，留空默认 400（宽）/ 300（高） */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 1 || n > 1000) throw new Error(`${name}须在 1–1000 之间（当前 ${v}）`)
  return n
}

/**
 * 整数格点哈希：把 (ix, iy, seed) 映射到 [0,1) 的确定性伪随机值。
 * 用整数混合（Fibonacci hashing + 质数乘法），不依赖外部 PRNG，纯函数可测试。
 */
export function latticeValue(ix: number, iy: number, seed: number): number {
  let h = (seed >>> 0) ^ Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h = h ^ (h >>> 16)
  return (h >>> 0) / 4294967296
}

/** smoothstep 插值曲线：3t²-2t³，让格点过渡更平滑 */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** 线性插值 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * 二维 value noise：在整数格点上取随机值，双线性插值（smoothstep 平滑）。
 * 输入任意浮点坐标，输出 [0,1) 平滑噪声。
 */
export function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const sx = smoothstep(x - x0)
  const sy = smoothstep(y - y0)
  const n00 = latticeValue(x0, y0, seed)
  const n10 = latticeValue(x1, y0, seed)
  const n01 = latticeValue(x0, y1, seed)
  const n11 = latticeValue(x1, y1, seed)
  const ix0 = lerp(n00, n10, sx)
  const ix1 = lerp(n01, n11, sx)
  return lerp(ix0, ix1, sy)
}

/**
 * 分形布朗运动（fBm）：叠加 octaves 层 value noise，
 * 每层频率倍增、振幅衰减（lacunarity=2, gain=0.5），最后归一化到 [0,1]。
 */
export function fbm(x: number, y: number, octaves: number, seed: number): number {
  let amplitude = 1
  let frequency = 1
  let sum = 0
  let max = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * frequency, y * frequency, seed + i * 101) * amplitude
    max += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return sum / max
}

/** 预计算 viridis 256 级查找表（近似色带） */
const VIRIDIS: (readonly [number, number, number])[] = buildViridisLut()
const PLASMA: (readonly [number, number, number])[] = buildPlasmaLut()

function buildViridisLut(): (readonly [number, number, number])[] {
  // 从深蓝(0)到亮黄(1)的关键控制点插值
  const stops: readonly (readonly [number, number, number])[] = [
    [68, 1, 84],
    [72, 40, 120],
    [62, 74, 137],
    [49, 104, 142],
    [38, 130, 142],
    [31, 158, 137],
    [53, 183, 121],
    [109, 205, 89],
    [180, 222, 44],
    [253, 231, 37],
  ]
  return sampleLut(stops, 256)
}

function buildPlasmaLut(): (readonly [number, number, number])[] {
  const stops: readonly (readonly [number, number, number])[] = [
    [13, 8, 135],
    [75, 3, 161],
    [125, 3, 168],
    [168, 34, 150],
    [203, 70, 121],
    [229, 107, 93],
    [248, 148, 65],
    [253, 195, 40],
    [240, 249, 33],
  ]
  return sampleLut(stops, 256)
}

function sampleLut(
  stops: readonly (readonly [number, number, number])[],
  size: number,
): (readonly [number, number, number])[] {
  const out: (readonly [number, number, number])[] = []
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1)
    const pos = t * (stops.length - 1)
    const idx = Math.min(stops.length - 2, Math.floor(pos))
    const f = pos - idx
    const a = stops[idx]
    const b = stops[idx + 1]
    out.push([
      Math.round(lerp(a[0], b[0], f)),
      Math.round(lerp(a[1], b[1], f)),
      Math.round(lerp(a[2], b[2], f)),
    ])
  }
  return out
}

/** 把 [0,1] 噪声值映射成 RGB（0–255） */
export function colormap(value: number, map: Colormap): [number, number, number] {
  const v = Math.max(0, Math.min(1, value))
  if (map === 'grayscale') {
    const g = Math.round(v * 255)
    return [g, g, g]
  }
  const idx = Math.min(255, Math.floor(v * 255))
  const [r, g, b] = (map === 'viridis' ? VIRIDIS : PLASMA)[idx]
  return [r, g, b]
}

/**
 * 生成完整噪声图：返回 width*height 的 [0,1] 浮点数组（行优先）。
 * 纯函数：相同参数 → 相同结果。
 */
export function generateNoiseMap(
  width: number,
  height: number,
  scale: number,
  octaves: number,
  seed: number,
): Float32Array {
  const map = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      map[y * width + x] = fbm(x * scale, y * scale, octaves, seed)
    }
  }
  return map
}

/** 解析选项并生成噪声图；seed 为 null 时由调用方传入随机种子 */
export function buildNoise(
  options: NoiseGenOptions,
  seedOverride: number,
): {
  readonly width: number
  readonly height: number
  readonly scale: number
  readonly octaves: number
  readonly seed: number
  readonly colormap: Colormap
  readonly map: Float32Array
} {
  const scale = parseScale(options.scale)
  const octaves = parseOctaves(options.octaves)
  const width = parseSize(options.width, '宽度', 400)
  const height = parseSize(options.height, '高度', 300)
  const colormapName = parseColormap(options.colormap)
  const seed = seedOverride
  const map = generateNoiseMap(width, height, scale, octaves, seed)
  return { width, height, scale, octaves, seed, colormap: colormapName, map }
}

/** toText：把噪声参数描述成文本（下载 .txt） */
export function describeNoise(options: NoiseGenOptions, seedOverride: number): string {
  const scale = parseScale(options.scale)
  const octaves = parseOctaves(options.octaves)
  const width = parseSize(options.width, '宽度', 400)
  const height = parseSize(options.height, '高度', 300)
  const map = parseColormap(options.colormap)
  return [
    '# Noise Generator 参数描述',
    `width: ${width}`,
    `height: ${height}`,
    `scale: ${scale}`,
    `octaves: ${octaves}`,
    `seed: ${seedOverride}`,
    `colormap: ${map}`,
    'algorithm: value-noise + fBm (bilinear interpolation)',
  ].join('\n')
}

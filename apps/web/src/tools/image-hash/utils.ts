/**
 * image-hash 纯函数：感知哈希（aHash / dHash / pHash）、Hamming 距离、hex 互转。
 *
 * 输入为 32×32 灰度数组（number[]，0–255）；下采样与灰度转换由 Tool 层
 * （Canvas）完成，这里不触碰 DOM/Canvas，可 100% 单测。
 *
 * pHash 的二维 DCT 为纯 JS 实现（可分离的一维 DCT-II 先行后列），32×32 朴素
 * 实现约数百万次浮点运算，毫秒级完成，无需 wasm。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 灰度图边长：算法统一在 32×32 上运算 */
export const GRAY_SIZE = 32
/** 哈希 hex 长度：64 bits = 16 位十六进制字符 */
export const HASH_HEX_LENGTH = 16
/** 哈希总比特数 */
export const HASH_BITS = 64

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验 32×32 灰度数组 */
function assertGray32(gray: number[]): void {
  if (!Array.isArray(gray) || gray.length !== GRAY_SIZE * GRAY_SIZE) {
    throw new Error('灰度数据非法：须为 1024 个 0–255 的数值（32×32）')
  }
}

/**
 * RGBA（32×32×4，行优先）转灰度（ITU-R BT.601 加权）。
 * 纯函数：Tool 层用 Canvas 下采样到 32×32 后，把 getImageData 的 data 传进来。
 */
export function rgbaToGray32(rgba: ArrayLike<number>): number[] {
  if (rgba.length !== GRAY_SIZE * GRAY_SIZE * 4) {
    throw new Error('像素数据非法：须为 32×32 RGBA（4096 个分量）')
  }
  const gray = new Array<number>(GRAY_SIZE * GRAY_SIZE)
  for (let i = 0; i < gray.length; i++) {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }
  return gray
}

/** 在 32×32 灰度图上按 nx×ny 网格均匀采样（覆盖整图边缘） */
function sampleGrid(gray: number[], nx: number, ny: number): number[] {
  const out = new Array<number>(nx * ny)
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const sx = Math.round((x * (GRAY_SIZE - 1)) / (nx - 1))
      const sy = Math.round((y * (GRAY_SIZE - 1)) / (ny - 1))
      out[y * nx + x] = gray[sy * GRAY_SIZE + sx]
    }
  }
  return out
}

/** 64 个 0/1 比特 → 16 位 hex（行优先，每 4 比特一组） */
export function bitsToHex(bits: number[]): string {
  if (!Array.isArray(bits) || bits.length !== HASH_BITS) {
    throw new Error('比特数组非法：须为 64 个 0/1')
  }
  let hex = ''
  for (let i = 0; i < HASH_BITS; i += 4) {
    const nibble = bits[i] * 8 + bits[i + 1] * 4 + bits[i + 2] * 2 + bits[i + 3]
    hex += nibble.toString(16)
  }
  return hex
}

/** 16 位 hex → 64 个 0/1 比特；长度或字符非法时抛错 */
export function hexToBits(hex: string): number[] {
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]{16}$/.test(hex)) {
    throw new Error('哈希非法：须为 16 位十六进制字符')
  }
  const bits = new Array<number>(HASH_BITS)
  for (let i = 0; i < HASH_HEX_LENGTH; i++) {
    const nibble = parseInt(hex[i], 16)
    bits[i * 4] = (nibble >> 3) & 1
    bits[i * 4 + 1] = (nibble >> 2) & 1
    bits[i * 4 + 2] = (nibble >> 1) & 1
    bits[i * 4 + 3] = nibble & 1
  }
  return bits
}

/**
 * aHash（均值哈希）：8×8 网格采样 → 均值阈值 → 64 bits → hex。
 * 最快，但对均值偏移敏感，判别力最弱。
 */
export function aHash(gray: number[]): string {
  assertGray32(gray)
  const samples = sampleGrid(gray, 8, 8)
  let sum = 0
  for (const v of samples) sum += v
  const mean = sum / samples.length
  return bitsToHex(samples.map((v) => (v > mean ? 1 : 0)))
}

/**
 * dHash（差异哈希）：9×8 网格采样 → 水平相邻像素比较 → 64 bits → hex。
 * 抗等比缩放，判别力强于 aHash。
 */
export function dHash(gray: number[]): string {
  assertGray32(gray)
  const grid = sampleGrid(gray, 9, 8)
  const bits = new Array<number>(HASH_BITS)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits[y * 8 + x] = grid[y * 9 + x] > grid[y * 9 + x + 1] ? 1 : 0
    }
  }
  return bitsToHex(bits)
}

/** 一维 DCT-II（未归一化）：F(k) = Σ f(i)·cos(π/n·(i+0.5)·k) */
function dct1d(values: number[]): number[] {
  const n = values.length
  const out = new Array<number>(n)
  for (let k = 0; k < n; k++) {
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += values[i] * Math.cos((Math.PI / n) * (i + 0.5) * k)
    }
    out[k] = sum
  }
  return out
}

/**
 * 二维 DCT-II（纯 JS）：先对行、再对列做一维 DCT。
 * 输入须为 n×n 方阵，返回同尺寸频域矩阵（左上为低频，[0][0] 为 DC 分量）。
 */
export function dct2d(matrix: number[][]): number[][] {
  const n = matrix.length
  if (n === 0 || matrix.some((row) => !Array.isArray(row) || row.length !== n)) {
    throw new Error('DCT 输入非法：须为 n×n 方阵')
  }
  const rowTransformed = matrix.map(dct1d)
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n))
  for (let x = 0; x < n; x++) {
    const col = rowTransformed.map((row) => row[x])
    const colTransformed = dct1d(col)
    for (let y = 0; y < n; y++) out[y][x] = colTransformed[y]
  }
  return out
}

/**
 * pHash（感知哈希）：32×32 灰度 → 二维 DCT → 取左上 8×8 低频（含 DC），
 * 用中值阈值 → 64 bits → hex。抗压缩、水印与轻微编辑，判别力最强。
 */
export function pHash(gray: number[]): string {
  assertGray32(gray)
  const matrix: number[][] = []
  for (let y = 0; y < GRAY_SIZE; y++) {
    matrix.push(gray.slice(y * GRAY_SIZE, (y + 1) * GRAY_SIZE))
  }
  const dct = dct2d(matrix)
  const low: number[] = []
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) low.push(dct[y][x])
  }
  const sorted = [...low].sort((a, b) => a - b)
  const median = (sorted[31] + sorted[32]) / 2
  return bitsToHex(low.map((v) => (v > median ? 1 : 0)))
}

/** Hamming 距离：两哈希不同比特数；任一长度不是 16 位 hex 即抛错 */
export function hammingDistance(hexA: string, hexB: string): number {
  const a = hexToBits(hexA)
  const b = hexToBits(hexB)
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++
  }
  return dist
}

/** 相似度百分比：(1 - dist/64) × 100 */
export function similarityPercent(distance: number): number {
  return (1 - distance / HASH_BITS) * 100
}

/** 相似度文本，保留 1 位小数，如 '98.4%' */
export function similarityText(distance: number): string {
  return `${similarityPercent(distance).toFixed(1)}%`
}

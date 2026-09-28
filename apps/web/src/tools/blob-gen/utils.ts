import type { BlobGenInput, BlobGenOptions } from './schema'

/** FNV-1a 32 位哈希 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 PRNG */
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

/** 解析复杂度：3–12 个控制点 */
export function parseComplexity(raw: string): number {
  const v = raw.trim()
  if (v === '') return 5
  if (!/^\d+$/.test(v)) throw new Error(`复杂度格式非法：${v}（须为整数）`)
  const n = Number(v)
  if (n < 3 || n > 12) throw new Error(`复杂度须在 3–12 之间（当前 ${v}）`)
  return n
}

/** 解析平滑度：0–1 */
export function parseSmoothness(raw: string): number {
  const v = raw.trim()
  if (v === '') return 0.5
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`平滑度格式非法：${v}（须为数字）`)
  if (n < 0 || n > 1) throw new Error(`平滑度须在 0–1 之间（当前 ${v}）`)
  return n
}

/** 校验 #rgb / #rrggbb，统一小写 */
export function parseHex(raw: string, name: string): string {
  const v = raw.trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v.toLowerCase()
  throw new Error(`${name}格式非法：${v}（须为 #rgb / #rrggbb）`)
}

/** 随机 #rrggbb（中等饱和、明亮） */
export function randomHex(rand: () => number): string {
  const h = rand() * 360
  const s = 60 + rand() * 30
  const l = 50 + rand() * 20
  return hslToHex(h, s, l)
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const to = (v: number): string =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

interface Pt {
  readonly x: number
  readonly y: number
}

/** 生成闭合平滑 blob 路径（二次贝塞尔，控制点落在相邻锚点中点连线上） */
export function buildBlobPath(
  n: number,
  cx: number,
  cy: number,
  R: number,
  smooth: number,
  rand: () => number,
): string {
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const r = R * (0.7 + rand() * 0.6)
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
  }
  // 相邻锚点中点
  const mids: Pt[] = pts.map((p, i) => {
    const q = pts[(i + 1) % n]
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  })
  // 从中点 mids[n-1] 出发，经锚点 pts[i] 曲线到 mids[i]；smooth 控制控制点向锚点的拉伸
  let d = `M ${mids[n - 1].x.toFixed(1)} ${mids[n - 1].y.toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const start = mids[(i - 1 + n) % n]
    const anchor = pts[i]
    // 控制点 = start 与 anchor 的插值，smooth=1 完全用 anchor（最鼓），0 退化为直线
    const c = {
      x: start.x + (anchor.x - start.x) * smooth,
      y: start.y + (anchor.y - start.y) * smooth,
    }
    d += ` Q ${c.x.toFixed(1)} ${c.y.toFixed(1)}, ${mids[i].x.toFixed(1)} ${mids[i].y.toFixed(1)}`
  }
  return d + ' Z'
}

/** 组装完整 SVG */
export function buildBlobSvg(options: BlobGenOptions, rand: () => number): string {
  const n = parseComplexity(options.complexity)
  const smooth = parseSmoothness(options.smoothness)
  const fill =
    options.fillColor.trim() === '' ? randomHex(rand) : parseHex(options.fillColor, '填充色')
  const stroke =
    options.strokeColor.trim() === '' ? '#333333' : parseHex(options.strokeColor, '描边色')
  const swRaw = options.strokeWidth.trim()
  const sw = swRaw === '' ? 0 : Number(swRaw)
  if (!Number.isFinite(sw) || sw < 0 || sw > 20) {
    throw new Error(`描边宽度须在 0–20 之间（当前 ${options.strokeWidth}）`)
  }
  const d = buildBlobPath(n, 200, 200, 150, smooth, rand)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">\n` +
    `  <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>\n` +
    `</svg>`
  )
}

/** T3 toText 入口：text 作为种子，相同种子+参数 → 相同形状 */
export function transform(input: BlobGenInput, options: BlobGenOptions, salt = 0): string {
  const rand = mulberry32(hashSeed(JSON.stringify({ text: input.text, salt, options })))
  return buildBlobSvg(options, rand)
}

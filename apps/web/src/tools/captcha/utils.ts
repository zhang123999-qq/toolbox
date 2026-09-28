import type { CaptchaOptions } from './schema'

export const CANVAS_WIDTH = 200
export const CANVAS_HEIGHT = 60

const AMBIGUOUS = new Set(['O', '0', 'I', '1', 'l'])
const BASE_ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const BASE_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const BASE_NUMERIC = '0123456789'

/** 随机源：[0,1) 浮点，默认基于 crypto.getRandomValues */
export type Rand = () => number

function cryptoRand(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  // 取 32 位无符号整数映射到 [0,1)，避免 % 取整偏差
  return buf[0] / 0x100000000
}

function randInt(rand: Rand, max: number): number {
  return Math.floor(rand() * max)
}

/** 验证码长度：默认 4，范围 3–8 */
export function parseLength(raw: string): number {
  const n = Number((raw || '4').trim())
  if (!Number.isInteger(n) || n < 3 || n > 8) {
    throw new Error('长度无效，须为 3–8 的整数')
  }
  return n
}

/** 字符集：alnum / alpha / numeric，默认 alnum */
export function parseCharset(raw: string): 'alnum' | 'alpha' | 'numeric' {
  const v = (raw || 'alnum').toLowerCase()
  if (v === 'alnum' || v === 'alpha' || v === 'numeric') return v
  throw new Error('字符集无效，仅支持 alnum / alpha / numeric')
}

/** 按类型与「排除易混淆」规则取字符集 */
export function charsetOf(kind: 'alnum' | 'alpha' | 'numeric', noAmbiguous: boolean): string {
  const base = kind === 'alnum' ? BASE_ALNUM : kind === 'alpha' ? BASE_ALPHA : BASE_NUMERIC
  if (!noAmbiguous) return base
  return [...base].filter((c) => !AMBIGUOUS.has(c)).join('')
}

export interface CaptchaChar {
  readonly ch: string
  readonly x: number
  readonly y: number
  readonly rotation: number
  readonly color: string
}

export interface CaptchaLine {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly color: string
}

export interface CaptchaDot {
  readonly x: number
  readonly y: number
  readonly color: string
}

export interface CaptchaSpec {
  readonly text: string
  readonly chars: readonly CaptchaChar[]
  readonly lines: readonly CaptchaLine[]
  readonly dots: readonly CaptchaDot[]
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`
}

/**
 * 生成验证码几何规格（纯函数，不碰 canvas）：
 * 随机字符、随机旋转（±20°）、随机颜色、3–5 条干扰线、30–50 个噪点。
 * 可注入 rand 便于测试；默认用 crypto.getRandomValues。
 */
export function generateCaptcha(options: CaptchaOptions, rand: Rand = cryptoRand): CaptchaSpec {
  const length = parseLength(options.length)
  const kind = parseCharset(options.charset)
  const alphabet = charsetOf(kind, options.noAmbiguous)

  const step = CANVAS_WIDTH / length
  const chars: CaptchaChar[] = []
  const textParts: string[] = []
  for (let i = 0; i < length; i += 1) {
    const ch = alphabet[randInt(rand, alphabet.length)]
    textParts.push(ch)
    chars.push({
      ch,
      x: step * i + step / 2 + (rand() - 0.5) * 12,
      y: CANVAS_HEIGHT / 2 + (rand() - 0.5) * 16,
      rotation: (rand() - 0.5) * (Math.PI / 9), // ±20°
      color: hsl(randInt(rand, 360), 70, 42),
    })
  }

  const lineCount = 3 + randInt(rand, 3) // 3–5
  const lines: CaptchaLine[] = []
  for (let i = 0; i < lineCount; i += 1) {
    lines.push({
      x1: rand() * CANVAS_WIDTH,
      y1: rand() * CANVAS_HEIGHT,
      x2: rand() * CANVAS_WIDTH,
      y2: rand() * CANVAS_HEIGHT,
      color: hsl(randInt(rand, 360), 50, 70),
    })
  }

  const dotCount = 30 + randInt(rand, 21) // 30–50
  const dots: CaptchaDot[] = []
  for (let i = 0; i < dotCount; i += 1) {
    dots.push({
      x: rand() * CANVAS_WIDTH,
      y: rand() * CANVAS_HEIGHT,
      color: hsl(randInt(rand, 360), 40, 60),
    })
  }

  return { text: textParts.join(''), chars, lines, dots }
}

/**
 * 在 canvas 2D 上下文上绘制验证码。
 * 与 generateCaptcha 分离，便于在 React effect 里调用。
 */
export function drawCaptcha(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spec: CaptchaSpec,
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // 干扰线
  ctx.lineWidth = 1
  for (const l of spec.lines) {
    ctx.strokeStyle = l.color
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.lineTo(l.x2, l.y2)
    ctx.stroke()
  }

  // 噪点
  for (const d of spec.dots) {
    ctx.fillStyle = d.color
    ctx.beginPath()
    ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // 字符
  ctx.font = 'bold 28px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const c of spec.chars) {
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(c.rotation)
    ctx.fillStyle = c.color
    ctx.fillText(c.ch, 0, 0)
    ctx.restore()
  }
}

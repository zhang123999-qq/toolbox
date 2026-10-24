import type { AvatarInput, AvatarOptions } from './schema'

/** FNV-1a 32 位哈希常量：把字符串压缩成确定性种子 */
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
/** mulberry32 步进常量 */
const MULBERRY_INCREMENT = 0x6d2b79f5
const UINT32_RANGE = 4294967296

/** 支持的头像样式 */
const STYLES = ['initials', 'geometric', 'gradient'] as const
type AvatarStyle = (typeof STYLES)[number]

/** 尺寸边界 */
export const MIN_SIZE = 32
export const MAX_SIZE = 512
export const DEFAULT_SIZE = 128

/** XML 特殊字符转义：避免用户名里的 <>& 破坏 SVG */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 字符串 → 32 位无符号整数（FNV-1a），相同文本得到相同种子 */
export function hashText(text: string): number {
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

/** mulberry32：32 位种子 PRNG，相同种子产出相同序列（便于测试确定性） */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + MULBERRY_INCREMENT) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE
  }
}

/** 生成随机种子字符串（浏览器端；空输入时用，保证显示/复制/下载一致） */
export function randomSeed(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return bytes.join('-')
}

/** 解析尺寸选项：空 → 默认；非整数或越界抛中文错 */
export function parseSize(raw: string, def = DEFAULT_SIZE): number {
  const s = raw.trim()
  if (s === '') return def
  const value = Number(s)
  if (!Number.isInteger(value) || value < MIN_SIZE || value > MAX_SIZE) {
    throw new Error(`尺寸必须是 ${MIN_SIZE} 到 ${MAX_SIZE} 之间的整数`)
  }
  return value
}

/** 解析样式选项：空 → 默认 initialials；未知抛错 */
export function parseStyle(raw: string): AvatarStyle {
  const s = raw.trim() || 'initials'
  if (!(STYLES as readonly string[]).includes(s)) {
    throw new Error(`未知的头像样式：${s}，可选 initials / geometric / gradient`)
  }
  return s as AvatarStyle
}

/** 取用户名首字符：中文取首字，英文取首字母大写，其余取首字符 */
export function initialOf(text: string): string {
  const t = text.trim()
  const ch = t.charAt(0)
  if (/[\u4e00-\u9fff]/.test(ch)) return ch
  return ch.toUpperCase()
}

/** 随机取一个 A–Z 字母（空输入时使用） */
function randomLetter(rand: () => number): string {
  return String.fromCharCode(65 + Math.floor(rand() * 26))
}

/** 严格验证颜色值格式：只允许 #hex、rgb()/rgba()、hsl()/hsla()、标准 CSS 颜色名白名单，防止 XSS 注入 SVG 属性 */
const CSS_COLOR_NAMES = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgrey',
  'darkgreen',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'grey',
  'green',
  'greenyellow',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgrey',
  'lightgreen',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
])

function sanitizeColor(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('背景色格式无效，仅支持 #hex、rgb、hsl 或标准颜色名')

  // 1) 标准 CSS 颜色名（显式白名单）
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmed) && CSS_COLOR_NAMES.has(trimmed.toLowerCase())) {
    return escapeXml(trimmed)
  }

  // 2) #hex：恰好 3、4、6、8 位十六进制
  if (
    /^#[0-9a-fA-F]{3}$/.test(trimmed) ||
    /^#[0-9a-fA-F]{4}$/.test(trimmed) ||
    /^#[0-9a-fA-F]{6}$/.test(trimmed) ||
    /^#[0-9a-fA-F]{8}$/.test(trimmed)
  ) {
    return escapeXml(trimmed)
  }

  // 3) rgb()/rgba()：通道 0-255 整数，alpha 0-1 数值
  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9]*\.?[0-9]+)\s*)?\)$/,
  )
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10)
    const g = parseInt(rgbMatch[2], 10)
    const b = parseInt(rgbMatch[3], 10)
    const aStr = rgbMatch[4]
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      throw new Error('背景色格式无效：rgb 通道超出 0-255')
    }
    if (aStr !== undefined) {
      const a = parseFloat(aStr)
      if (isNaN(a) || a < 0 || a > 1) {
        throw new Error('背景色格式无效：alpha 必须在 0-1 之间')
      }
    }
    return escapeXml(trimmed)
  }

  // 4) hsl()/hsla()：色相 0-360 数值、饱和度/明度百分比、alpha 0-1
  const hslMatch = trimmed.match(
    /^hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*([0-9]*\.?[0-9]+)\s*)?\)$/,
  )
  if (hslMatch) {
    const h = parseFloat(hslMatch[1])
    const s = parseFloat(hslMatch[2])
    const l = parseFloat(hslMatch[3])
    const aStr = hslMatch[4]
    if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
      throw new Error('背景色格式无效：hsl 参数超出范围')
    }
    if (aStr !== undefined) {
      const a = parseFloat(aStr)
      if (isNaN(a) || a < 0 || a > 1) {
        throw new Error('背景色格式无效：alpha 必须在 0-1 之间')
      }
    }
    return escapeXml(trimmed)
  }

  throw new Error('背景色格式无效，仅支持 #hex、rgb、hsl 或标准颜色名')
}

/** 生成线性渐变 defs 片段 */
function gradientDef(id: string, c1: string, c2: string): string {
  const safeC1 = sanitizeColor(c1)
  const safeC2 = sanitizeColor(c2)
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'g'
  return (
    `<defs><linearGradient id="${safeId}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${safeC1}"/>` +
    `<stop offset="1" stop-color="${safeC2}"/>` +
    `</linearGradient></defs>`
  )
}

/** 几何图案：基于确定性随机源摆放圆形与三角形 */
function geometricShapes(size: number, rand: () => number, c2: string): string {
  const safeC2 = sanitizeColor(c2)
  const parts: string[] = []
  const count = 5
  for (let i = 0; i < count; i += 1) {
    const cx = rand() * size
    const cy = rand() * size
    const r = size * (0.08 + rand() * 0.22)
    if (i % 2 === 0) {
      parts.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" ` +
          `fill="#ffffff" opacity="${(0.12 + rand() * 0.25).toFixed(2)}"/>`,
      )
    } else {
      const x1 = cx.toFixed(1)
      const y1 = (cy - r).toFixed(1)
      const x2 = (cx - r * 0.9).toFixed(1)
      const y2 = (cy + r * 0.7).toFixed(1)
      const x3 = (cx + r * 0.9).toFixed(1)
      const y3 = (cy + r * 0.7).toFixed(1)
      parts.push(
        `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" ` +
          `fill="${safeC2}" opacity="${(0.4 + rand() * 0.4).toFixed(2)}"/>`,
      )
    }
  }
  return parts.join('')
}

/**
 * 生成头像 SVG 字符串（纯函数，不依赖 DOM）。
 * 非空 text → 由文本哈希决定颜色与图案（同名稳定）；空 text → 由 seed 决定随机结果。
 */
export function buildAvatarSvg(input: AvatarInput, options: AvatarOptions, seed: string): string {
  const size = parseSize(options.size)
  const style = parseStyle(options.style)
  const text = input.text.trim()

  const seedNum = text === '' ? hashText(seed) : hashText(text)
  const rand = mulberry32(seedNum)
  const h1 = Math.floor(rand() * 360)
  const h2 = (h1 + 40 + Math.floor(rand() * 60)) % 360

  const bgColor = (options.bgColor ?? '').trim()
  const c1 = bgColor || `hsl(${h1}, 68%, 60%)`
  const c2 = `hsl(${h2}, 68%, 46%)`
  const letter = text === '' ? randomLetter(rand) : initialOf(text)

  const gid = 'avatar-g'
  const fontSize = Math.round(size * 0.5)
  const textEl =
    `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" ` +
    `font-family="Arial, 'Helvetica Neue', sans-serif" font-size="${fontSize}" ` +
    `font-weight="700" fill="#ffffff">${escapeXml(letter)}</text>`

  let body: string
  if (style === 'initials') {
    // 圆形头像：渐变填充 + 居中首字母
    body =
      gradientDef(gid, c1, c2) +
      `<rect width="${size}" height="${size}" rx="${size / 2}" fill="url(#${gid})"/>` +
      textEl
  } else if (style === 'gradient') {
    // 纯渐变方块 + 居中首字母
    body =
      gradientDef(gid, c1, c2) +
      `<rect width="${size}" height="${size}" fill="url(#${gid})"/>` +
      textEl
  } else {
    // geometric：渐变底 + 几何图形组合，不显示字母
    body =
      gradientDef(gid, c1, c2) +
      `<rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#${gid})"/>` +
      geometricShapes(size, rand, c2)
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" role="img" aria-label="avatar">${body}</svg>`
  )
}

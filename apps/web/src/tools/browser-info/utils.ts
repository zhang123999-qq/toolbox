/**
 * browser-info —— 浏览器信息检测的纯函数层
 *
 * UA 解析为纯字符串函数；特性检测经参数注入全局作用域，
 * node 下可被 vitest 完整测试。未知 UA 返回 'unknown' 而不抛错。
 */

/** 浏览器信息 */
export interface BrowserInfo {
  readonly browser: string
  readonly version: string
  readonly os: string
  readonly engine: string
}

/** 从 UA 识别操作系统 */
function detectOS(ua: string): string {
  if (/Windows NT/i.test(ua)) return 'Windows'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'unknown'
}

/**
 * 解析 User-Agent。空字符串抛中文错；无法识别的浏览器返回 browser:'unknown'。
 * 注意：新版 Edge 的 UA 同时含 Chrome 字段，需先匹配 Edg/。
 */
export function parseUA(ua: string): BrowserInfo {
  if (typeof ua !== 'string' || ua.trim() === '') {
    throw new Error('UA 字符串不能为空')
  }
  let browser = 'unknown'
  let version = ''
  let engine = ''
  const edg = ua.match(/Edg\/([\d.]+)/)
  const chrome = ua.match(/Chrome\/([\d.]+)/)
  const firefox = ua.match(/Firefox\/([\d.]+)/)
  const safari = ua.match(/Version\/([\d.]+).*Safari\//)
  if (edg) {
    browser = 'Edge'
    version = edg[1]
    engine = 'Blink'
  } else if (chrome) {
    browser = 'Chrome'
    version = chrome[1]
    engine = 'Blink'
  } else if (firefox) {
    browser = 'Firefox'
    version = firefox[1]
    engine = 'Gecko'
  } else if (safari) {
    browser = 'Safari'
    version = safari[1]
    engine = 'WebKit'
  }
  return { browser, version, os: detectOS(ua), engine }
}

/** 特性检测项 */
export interface FeatureCheck {
  readonly id: string
  readonly label: string
  readonly check: (g: Record<string, unknown>) => boolean
}

type NavLike = { serviceWorker?: unknown; gpu?: unknown; clipboard?: unknown } | undefined

function navOf(g: Record<string, unknown>): NavLike {
  return g['navigator'] as NavLike
}

export const FEATURE_CHECKS: readonly FeatureCheck[] = [
  { id: 'fetch', label: 'Fetch API', check: (g) => typeof g['fetch'] === 'function' },
  { id: 'websocket', label: 'WebSocket', check: (g) => typeof g['WebSocket'] === 'function' },
  {
    id: 'webgl',
    label: 'WebGL',
    check: (g) => typeof g['WebGLRenderingContext'] === 'function',
  },
  {
    id: 'serviceWorker',
    label: 'Service Worker',
    check: (g) => navOf(g)?.serviceWorker !== undefined,
  },
  { id: 'webgpu', label: 'WebGPU', check: (g) => navOf(g)?.gpu !== undefined },
  {
    id: 'clipboard',
    label: 'Clipboard API',
    check: (g) => navOf(g)?.clipboard !== undefined,
  },
]

/**
 * 检测常用 Web 特性。scope 缺省时取 globalThis；
 * 测试中可注入字面对象模拟不同浏览器环境。
 */
export function detectFeatures(scope?: Record<string, unknown> | null): Record<string, boolean> {
  const g = scope ?? (globalThis as unknown as Record<string, unknown>)
  const out: Record<string, boolean> = {}
  for (const f of FEATURE_CHECKS) out[f.id] = f.check(g)
  return out
}

/**
 * resolution —— 屏幕分辨率检测的纯函数层
 *
 * 屏幕/视口信息全部经参数注入（默认取 globalThis），node 下可被 vitest 完整测试；
 * 宽高比换算为纯数学函数，无任何 DOM 依赖。
 */

/** 可注入的屏幕对象形状 */
export interface ScreenLike {
  readonly width: number
  readonly height: number
  readonly colorDepth: number
}

/** 可注入的窗口对象形状 */
export interface WindowLike {
  readonly innerWidth: number
  readonly innerHeight: number
  readonly devicePixelRatio: number
}

/** 屏幕信息 */
export interface ScreenInfo {
  readonly screenW: number
  readonly screenH: number
  readonly viewportW: number
  readonly viewportH: number
  readonly dpr: number
  readonly colorDepth: number
}

/**
 * 读取屏幕信息。screenLike / windowLike 为空时抛中文错
 * （调用方可传入 window.screen / window，或在测试中注入字面对象）。
 */
export function getScreenInfo(
  screenLike?: ScreenLike | null,
  windowLike?: WindowLike | null,
): ScreenInfo {
  if (screenLike == null || windowLike == null) {
    throw new Error('当前环境无法获取屏幕信息，请在浏览器中使用')
  }
  return {
    screenW: screenLike.width,
    screenH: screenLike.height,
    viewportW: windowLike.innerWidth,
    viewportH: windowLike.innerHeight,
    dpr: windowLike.devicePixelRatio,
    colorDepth: screenLike.colorDepth,
  }
}

/** 最大公约数（欧几里得算法） */
function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = x % y
    x = y
    y = t
  }
  return x
}

/**
 * 宽高比换算为最简整数比，如 1920×1080 → '16:9'。
 * 宽高非正数时抛中文错。
 */
export function aspectRatio(w: number, h: number): string {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error('宽高必须为正数')
  }
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

/** 常见分辨率 */
export interface CommonResolution {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
}

export const COMMON_RESOLUTIONS: readonly CommonResolution[] = [
  { id: 'hd', name: 'HD 720p', width: 1280, height: 720 },
  { id: 'fhd', name: 'FHD 1080p', width: 1920, height: 1080 },
  { id: 'qhd', name: 'QHD 1440p', width: 2560, height: 1440 },
  { id: 'uhd', name: 'UHD 4K', width: 3840, height: 2160 },
  { id: 'wxga', name: 'WXGA 1366×768', width: 1366, height: 768 },
  { id: 'uwqhd', name: 'UWQHD 3440×1440', width: 3440, height: 1440 },
]

/** 按 id 取常见分辨率；未知 id 抛中文错 */
export function commonResolutionById(id: string): CommonResolution {
  const found = COMMON_RESOLUTIONS.find((r) => r.id === id)
  if (!found) throw new Error(`未知分辨率：${id}`)
  return found
}

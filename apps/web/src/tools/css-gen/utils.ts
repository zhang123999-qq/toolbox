import type { CssGenInput, CssGenOptions } from './schema'

/** 关键帧：[选择器, 声明] */
type Keyframe = readonly [selector: string, decl: string]

/** 内置动画预设 */
export const PRESETS: Readonly<Record<string, readonly Keyframe[]>> = {
  bounce: [
    ['0%, 100%', 'transform: translateY(0);'],
    ['50%', 'transform: translateY(-20px);'],
  ],
  fadeIn: [
    ['from', 'opacity: 0;'],
    ['to', 'opacity: 1;'],
  ],
  fadeOut: [
    ['from', 'opacity: 1;'],
    ['to', 'opacity: 0;'],
  ],
  slideInLeft: [
    ['from', 'transform: translateX(-100%);'],
    ['to', 'transform: translateX(0);'],
  ],
  slideInRight: [
    ['from', 'transform: translateX(100%);'],
    ['to', 'transform: translateX(0);'],
  ],
  rotate: [
    ['from', 'transform: rotate(0deg);'],
    ['to', 'transform: rotate(360deg);'],
  ],
  pulse: [
    ['0%, 100%', 'transform: scale(1);'],
    ['50%', 'transform: scale(1.05);'],
  ],
  flip: [
    ['from', 'transform: rotateY(0deg);'],
    ['to', 'transform: rotateY(180deg);'],
  ],
  shake: [
    ['0%, 100%', 'transform: translateX(0);'],
    ['20%', 'transform: translateX(-10px);'],
    ['40%', 'transform: translateX(10px);'],
    ['60%', 'transform: translateX(-10px);'],
    ['80%', 'transform: translateX(10px);'],
  ],
  heartbeat: [
    ['0%, 100%', 'transform: scale(1);'],
    ['14%', 'transform: scale(1.3);'],
    ['28%', 'transform: scale(1);'],
    ['42%', 'transform: scale(1.3);'],
    ['70%', 'transform: scale(1);'],
  ],
}

/** 缓动函数 */
export const TIMINGS = ['ease', 'ease-in', 'ease-out', 'linear'] as const

/** 可选预设列表（错误提示用） */
export function presetList(): string {
  return Object.keys(PRESETS).join(' / ')
}

/** 解析预设名：命中返回规范 key（大小写不敏感），否则抛错列出可用预设 */
export function resolvePresetName(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (v === '') return ''
  const hit = Object.keys(PRESETS).find((k) => k.toLowerCase() === v)
  if (hit) return hit
  throw new Error(`未知动画预设：${raw}（可用：${presetList()}）`)
}

/** 解析时长：默认 1s，须为数字 + s/ms */
export function parseDuration(raw: string): string {
  const v = raw.trim()
  if (v === '') return '1s'
  if (/^\d+(\.\d+)?(ms|s)$/.test(v)) return v
  throw new Error(`时长格式非法：${v}（如 1s / 500ms）`)
}

/** 解析缓动函数：默认 ease */
export function parseTiming(raw: string): string {
  const v = raw.trim()
  if (v === '') return 'ease'
  if ((TIMINGS as readonly string[]).includes(v)) return v
  throw new Error(`缓动函数非法：${v}（可选 ${TIMINGS.join(' / ')}）`)
}

/** 组装完整 CSS：@keyframes + .animation */
export function buildCss(
  preset: string,
  duration: string,
  timing: string,
  infinite: boolean,
): string {
  const frames = PRESETS[preset]
  const body = frames.map(([sel, decl]) => `  ${sel} { ${decl} }`).join('\n')
  const animation = `animation: ${preset} ${duration} ${timing}${infinite ? ' infinite' : ''};`
  return `@keyframes ${preset} {\n${body}\n}\n\n.animation {\n  ${animation}\n}`
}

/** T2 入口：text 命中预设则覆盖 preset 选项，否则用 preset 选项 */
export function transform(input: CssGenInput, options: CssGenOptions): string {
  const fromText = resolvePresetName(input.text)
  const preset = fromText !== '' ? fromText : resolvePresetName(options.preset) || 'bounce'
  const duration = parseDuration(options.duration)
  const timing = parseTiming(options.timing)
  const infinite = Boolean(options.infinite)
  return buildCss(preset, duration, timing, infinite)
}

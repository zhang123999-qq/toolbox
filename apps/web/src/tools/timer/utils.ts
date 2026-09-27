/**
 * timer 计时器纯逻辑：时长解析、倒计时格式化、状态机。
 * 不碰 DOM / 定时器本身，定时器在 Tool.tsx 里持有并负责清理。
 */

/** 计时器状态机：就绪 → 计时中 →（暂停 ⇄ 计时中）→ 时间到 */
export type TimerStatus = 'idle' | 'running' | 'paused' | 'done'

/** 各状态的中文展示文案 */
export const STATUS_LABEL: Record<TimerStatus, string> = {
  idle: '就绪',
  running: '计时中',
  paused: '已暂停',
  done: '时间到',
}

/**
 * 解析用户输入的时长为总秒数。
 * 支持三种写法（用冒号分隔，最多 3 段）：
 * - `90`        → 90 秒
 * - `1:30`      → 1 分 30 秒 = 90 秒
 * - `1:30:00`   → 1 时 30 分 0 秒 = 5400 秒
 *
 * 空串返回 0（界面提示输入）；非法输入抛中文错误。
 */
export function parseDuration(text: string): number {
  const t = text.trim()
  if (t === '') return 0
  const parts = t.split(':')
  if (parts.length > 3) {
    throw new Error('时长格式应为 秒 / 分:秒 / 时:分:秒，当前段数过多：' + t)
  }
  for (const p of parts) {
    if (!/^\d+$/.test(p)) throw new Error('时长含非数字字符：' + t)
  }
  let total: number
  if (parts.length === 1) {
    total = Number(parts[0])
  } else if (parts.length === 2) {
    total = Number(parts[0]) * 60 + Number(parts[1])
  } else {
    total = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  }
  if (total <= 0) throw new Error('时长必须大于 0 秒')
  if (total > 24 * 3600) throw new Error('时长不能超过 24 小时')
  return total
}

/** 总秒数分解为时/分/秒（纯函数，便于单测） */
export function breakdown(totalSeconds: number): {
  hours: number
  minutes: number
  seconds: number
} {
  const safe = Math.max(0, Math.floor(totalSeconds))
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  }
}

/** 倒计时显示：不足 1 小时显示 MM:SS，否则显示 H:MM:SS */
export function formatRemaining(totalSeconds: number): string {
  const { hours, minutes, seconds } = breakdown(totalSeconds)
  const p = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? hours + ':' + p(minutes) + ':' + p(seconds) : p(minutes) + ':' + p(seconds)
}

/** 走一秒：剩余秒数减一，且不会小于 0 */
export function tick(remaining: number): number {
  return remaining <= 0 ? 0 : remaining - 1
}

/**
 * 状态机转移：running 且剩余走到 0 时进入 done；其余状态原样返回。
 */
export function nextStatus(status: TimerStatus, remaining: number): TimerStatus {
  if (status === 'running' && remaining <= 0) return 'done'
  return status
}

/** T3 的 toText：把当前配置汇总成可复制的纯文本；空输入返回空串 */
export function describeDuration(text: string): string {
  if (text.trim() === '') return ''
  const total = parseDuration(text)
  const { hours, minutes, seconds } = breakdown(total)
  const parts: string[] = []
  if (hours > 0) parts.push(hours + ' 小时')
  if (minutes > 0) parts.push(minutes + ' 分钟')
  if (seconds > 0 || parts.length === 0) parts.push(seconds + ' 秒')
  return '倒计时：' + parts.join(' ') + '（共 ' + total + ' 秒）'
}

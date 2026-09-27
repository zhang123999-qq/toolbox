/**
 * stopwatch 秒表纯逻辑：毫秒格式化、计次（lap）分段计算。
 * 计时循环在 Tool.tsx 里用 setInterval 持有并负责清理。
 */

/** 秒表阶段：未开始 / 走动中 / 暂停 */
export type SwPhase = 'idle' | 'running' | 'paused'

export const SW_PHASE_LABEL: Record<SwPhase, string> = {
  idle: '未开始',
  running: '计时中',
  paused: '已暂停',
}

/**
 * 把毫秒格式化为 mm:ss.cs（百分之一秒）。
 * 超过 1 小时则显示 h:mm:ss.cs。
 */
export function formatSw(ms: number): string {
  const safe = Math.max(0, Math.floor(ms))
  const cs = Math.floor((safe % 1000) / 10)
  const totalSeconds = Math.floor(safe / 1000)
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60) % 60
  const h = Math.floor(totalSeconds / 3600)
  const p = (n: number) => String(n).padStart(2, '0')
  const base = p(m) + ':' + p(s) + '.' + String(cs).padStart(2, '0')
  return h > 0 ? h + ':' + base : base
}

/**
 * 计算某一计次的「分段用时」：本次总时间减去上一次总时间。
 * laps 存的是每次按下计次时的累计毫秒；第一次计次的分段就是它本身。
 */
export function lapSplit(laps: readonly number[], current: number): number {
  if (laps.length === 0) return current
  return current - laps[laps.length - 1]
}

/** 计次列表的纯函数追加：返回新数组（不可变） */
export function addLap(laps: readonly number[], current: number): number[] {
  return [...laps, current]
}

/**
 * 计算当前经过毫秒：base（暂停前已累计）+ 当前活动段（now − startedAt）。
 * 用时间戳锚定，不依赖 setInterval 实际间隔，后台标签页被节流后恢复仍准确。
 */
export function computeElapsed(base: number, startedAt: number | null, now: number): number {
  if (startedAt === null) return base
  return base + Math.max(0, now - startedAt)
}

/** 复位：清空累计与计次 */
export function resetSw(): { elapsed: number; laps: number[] } {
  return { elapsed: 0, laps: [] }
}

/** toText：把当前累计与各计次分段汇总成可复制文本 */
export function swText(elapsed: number, laps: readonly number[]): string {
  if (elapsed <= 0 && laps.length === 0) return ''
  const lines = ['总计：' + formatSw(elapsed)]
  laps.forEach((total, i) => {
    const prev = i === 0 ? 0 : laps[i - 1]
    lines.push(
      '第 ' + (i + 1) + ' 次：分段 ' + formatSw(total - prev) + ' / 累计 ' + formatSw(total),
    )
  })
  return lines.join('\n')
}

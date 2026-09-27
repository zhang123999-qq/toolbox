/**
 * pomodoro 番茄钟纯逻辑：阶段状态机、时长换算、剩余时间格式化。
 * 计时循环在 Tool.tsx 里用 setInterval 持有并负责清理。
 */

/** 阶段：工作 ↔ 休息 循环切换 */
export type PomodoroPhase = 'work' | 'break'

export const PHASE_LABEL: Record<PomodoroPhase, string> = {
  work: '工作',
  break: '休息',
}

/** 解析分钟数文本：空串用默认值；非法（非整数 / 超 180）抛中文错 */
export function parseMinutes(raw: string, fallback: number): number {
  const t = raw.trim()
  if (t === '') return fallback
  if (!/^\d+$/.test(t)) throw new Error('时长必须是正整数分钟：' + raw)
  const n = Number(t)
  if (n < 1 || n > 180) throw new Error('时长应在 1-180 分钟之间：' + raw)
  return n
}

/** 当前阶段持续多少秒 */
export function phaseDurationSeconds(
  phase: PomodoroPhase,
  workMin: number,
  breakMin: number,
): number {
  return (phase === 'work' ? workMin : breakMin) * 60
}

/** 阶段机转移：工作结束进休息，休息结束进工作 */
export function nextPhase(phase: PomodoroPhase): PomodoroPhase {
  return phase === 'work' ? 'break' : 'work'
}

/** 一个阶段走到底后，是否意味着「完成了一个完整番茄」（即刚结束的是工作段） */
export function completesRound(phase: PomodoroPhase): boolean {
  return phase === 'work'
}

/** 秒数格式化为 mm:ss（番茄钟不显示小时） */
export function formatPomo(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return p(m) + ':' + p(s)
}

/** toText：汇总当前配置 */
export function pomoText(workMin: number, breakMin: number): string {
  return '番茄钟：工作 ' + workMin + ' 分钟 + 休息 ' + breakMin + ' 分钟，循环进行'
}

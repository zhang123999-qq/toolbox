/**
 * cps —— 手速测试的纯函数层
 *
 * 点击时间戳全部由调用方传入（可注入），便于确定性测试；
 * 组件层只负责计时器与渲染。
 */

/** 一次 CPS 测试会话 */
export interface CpsSession {
  /** 点击时间戳（毫秒），升序 */
  clicks: number[]
  /** 测试时长（毫秒） */
  durationMs: number
}

/** 手速统计结果 */
export interface CpsStats {
  cps: number
  total: number
  /** 平均点击间隔（毫秒） */
  avgIntervalMs: number
  /** 最高连击：间隔 < 1 秒的连续点击数 */
  maxBurst: number
}

/** 新建会话；时长必须为正数 */
export function createCpsSession(durationMs: number): CpsSession {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('测试时长必须为正数')
  }
  return { clicks: [], durationMs }
}

/** 记录一次点击（nowMs 由调用方传入） */
export function recordClick(session: CpsSession, nowMs: number): CpsSession {
  return { ...session, clicks: [...session.clicks, nowMs] }
}

/** 每秒点击数 = 总点击数 / 时长（秒） */
export function calcCps(session: CpsSession): number {
  const n = session.clicks.length
  if (n === 0) return 0
  return n / (session.durationMs / 1000)
}

/** 汇总统计：平均间隔与最高连击 */
export function calcStats(session: CpsSession): CpsStats {
  const clicks = session.clicks
  const total = clicks.length
  const cps = calcCps(session)
  if (total < 2) {
    return { cps, total, avgIntervalMs: 0, maxBurst: total }
  }
  let sum = 0
  let maxBurst = 1
  let cur = 1
  for (let i = 1; i < clicks.length; i++) {
    const gap = clicks[i] - clicks[i - 1]
    sum += gap
    if (gap < 1000) {
      cur += 1
      if (cur > maxBurst) maxBurst = cur
    } else {
      cur = 1
    }
  }
  return { cps, total, avgIntervalMs: Math.round(sum / (total - 1)), maxBurst }
}

/** CPS 评级 */
export function gradeCps(cps: number): string {
  if (cps >= 8) return '职业级'
  if (cps >= 6) return '高手'
  if (cps >= 4) return '熟练'
  if (cps >= 2) return '普通'
  return '手速偏慢'
}

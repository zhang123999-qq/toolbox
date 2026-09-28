/** 反应测试：状态机纯函数，时间全部由调用方传入（可测试） */

export type ReactionPhase = 'idle' | 'waiting' | 'ready' | 'done' | 'foul'

export interface ReactionState {
  phase: ReactionPhase
  /** waiting 阶段需等待的毫秒数 */
  waitMs: number
  /** ready 开始的时间戳（调用方传入） */
  startMs: number
  /** 测得的反应毫秒数 */
  reactionMs: number | null
}

export type ReactionRng = () => number

export function resetReaction(): ReactionState {
  return { phase: 'idle', waitMs: 0, startMs: 0, reactionMs: null }
}

/** 开始等待：生成 1500-4500ms 的随机等待时长，rng 可注入 */
export function startWait(rng: ReactionRng = Math.random): ReactionState {
  return { phase: 'waiting', waitMs: 1500 + Math.floor(rng() * 3000), startMs: 0, reactionMs: null }
}

/** waiting 阶段被点击 → 抢跑犯规；非 waiting 阶段原样返回 */
export function tooSoon(state: ReactionState): ReactionState {
  if (state.phase !== 'waiting') return state
  return { ...state, phase: 'foul', reactionMs: null }
}

/** 等待结束 → 进入 ready（调用方在 waitMs 后调用，传入当前时间） */
export function goReady(state: ReactionState, nowMs: number): ReactionState {
  if (state.phase !== 'waiting') return state
  return { ...state, phase: 'ready', startMs: nowMs }
}

/** ready 阶段点击 → 记录反应时间；非 ready 阶段原样返回 */
export function recordReaction(state: ReactionState, clickMs: number): ReactionState {
  if (state.phase !== 'ready') return state
  return { ...state, phase: 'done', reactionMs: Math.max(0, clickMs - state.startMs) }
}

/** 反应评级；负数抛中文错 */
export function gradeReaction(ms: number): string {
  if (ms < 0) throw new Error('反应时间不能为负数')
  if (ms < 150) return '超人级'
  if (ms < 250) return '优秀'
  if (ms < 400) return '良好'
  if (ms < 600) return '一般'
  return '需要练习'
}

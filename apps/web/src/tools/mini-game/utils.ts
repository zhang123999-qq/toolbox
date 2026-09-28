/** 打地鼠：纯游戏逻辑（不可变状态） */

export interface MoleState {
  /** 每个洞是否有地鼠 */
  holes: boolean[]
  /** 得分 */
  score: number
  /** 剩余秒数 */
  timeLeft: number
}

export type MoleRng = () => number

export function createMoleGame(holesCount = 9, durationSec = 30): MoleState {
  if (!Number.isInteger(holesCount) || holesCount < 1) throw new Error('洞数必须为正整数')
  if (!Number.isInteger(durationSec) || durationSec < 1) throw new Error('时长必须为正整数秒')
  return { holes: Array(holesCount).fill(false), score: 0, timeLeft: durationSec }
}

/** 随机冒出一只地鼠 */
export function spawnMole(state: MoleState, rng: MoleRng = Math.random): MoleState {
  const idx = Math.floor(rng() * state.holes.length)
  const holes = state.holes.slice()
  holes[idx] = true
  return { ...state, holes }
}

/** 敲击指定洞：命中则得分并收回地鼠 */
export function whack(state: MoleState, holeIdx: number): { state: MoleState; hit: boolean } {
  if (!Number.isInteger(holeIdx) || holeIdx < 0 || holeIdx >= state.holes.length) {
    throw new Error('洞编号越界')
  }
  const hit = state.holes[holeIdx]
  const holes = state.holes.slice()
  holes[holeIdx] = false
  return { state: { ...state, holes, score: hit ? state.score + 1 : state.score }, hit }
}

/** 时间推进一秒；归零时收回所有地鼠 */
export function tick(state: MoleState): MoleState {
  const timeLeft = Math.max(0, state.timeLeft - 1)
  return {
    ...state,
    timeLeft,
    holes: timeLeft === 0 ? state.holes.map(() => false) : state.holes,
  }
}

/** 游戏是否结束 */
export function isGameOver(state: MoleState): boolean {
  return state.timeLeft <= 0
}

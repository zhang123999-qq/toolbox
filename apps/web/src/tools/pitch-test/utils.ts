/**
 * pitch-test —— 音准测试的纯函数层
 *
 * 音高题目生成、判分均为纯函数；rng 可注入；
 * AudioContext 只通过工厂注入（可 mock），从不直接出现在 utils 里。
 */

/** 一道音高辨别题 */
export interface PitchTrial {
  freq1: number
  freq2: number
}

/** 用户答案：第二个音更高 / 更低 / 相同 */
export type PitchAnswer = 'higher' | 'lower' | 'same'

/** 音高题的正确答案 */
export const PITCH_ANSWERS: { value: PitchAnswer; label: string }[] = [
  { value: 'higher', label: '更高' },
  { value: 'lower', label: '更低' },
  { value: 'same', label: '相同' },
]

const SEMIS = [-4, -3, -2, -1, 0, 1, 2, 3, 4]

/**
 * 生成一道题：以 A4=440Hz 为基准，两个音高差 ±4 个半音（含同音）。
 * rng 可注入，便于确定性测试。
 */
export function newPitchTrial(rng: () => number = Math.random): PitchTrial {
  const s1 = SEMIS[Math.floor(rng() * SEMIS.length)]
  const s2 = SEMIS[Math.floor(rng() * SEMIS.length)]
  return {
    freq1: Math.round(440 * 2 ** (s1 / 12)),
    freq2: Math.round(440 * 2 ** (s2 / 12)),
  }
}

/** 题目的标准答案 */
export function actualAnswer(trial: PitchTrial): PitchAnswer {
  const diff = trial.freq2 - trial.freq1
  if (diff > 0.5) return 'higher'
  if (diff < -0.5) return 'lower'
  return 'same'
}

/** 判分：答案非法时抛中文错 */
export function checkPitchAnswer(trial: PitchTrial, answer: PitchAnswer): boolean {
  if (answer !== 'higher' && answer !== 'lower' && answer !== 'same') {
    throw new Error('答案必须是 higher/lower/same 之一')
  }
  return actualAnswer(trial) === answer
}

/** 多题正确率统计 */
export function scorePitchTrials(results: boolean[]): {
  correct: number
  total: number
  rate: string
} {
  const total = results.length
  const correct = results.filter(Boolean).length
  return { correct, total, rate: total === 0 ? '0%' : `${Math.round((correct / total) * 100)}%` }
}

/** 播放所需的最小 AudioContext 结构 */
export interface ToneContext {
  createOscillator(): {
    type: string
    frequency: { value: number }
    connect(node: unknown): void
    start(): void
    stop(when?: number): void
  }
  createGain(): {
    gain: { value: number }
    connect(node: unknown): void
  }
  readonly destination: unknown
  readonly currentTime: number
  resume(): Promise<void>
}

export type AudioContextFactory = () => ToneContext | null

/**
 * 播放指定频率的正弦音 durationMs 毫秒后停止。
 * 工厂可注入 mock；无 Web Audio 支持时抛中文错。
 */
export async function playTone(
  factory: AudioContextFactory,
  freq: number,
  durationMs = 600,
): Promise<void> {
  if (!Number.isFinite(freq) || freq <= 0) {
    throw new Error('频率必须为正数')
  }
  const ctx = factory()
  if (!ctx) {
    throw new Error('当前浏览器不支持 Web Audio')
  }
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.value = 0.5
  osc.connect(gain)
  gain.connect(ctx.destination)
  await ctx.resume()
  osc.start()
  osc.stop(ctx.currentTime + durationMs / 1000)
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

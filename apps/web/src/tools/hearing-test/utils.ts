/**
 * hearing-test —— 听力测试的纯函数层
 *
 * 频率表、结果记录、筛查文案均为纯函数；
 * AudioContext 只通过工厂注入（可 mock），从不直接出现在 utils 里。
 */

/** 听力筛查频率（Hz） */
export const HEARING_FREQS = [125, 250, 500, 1000, 2000, 4000, 8000]

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

/** AudioContext 工厂：返回 null 表示浏览器不支持 */
export type AudioContextFactory = () => ToneContext | null

/**
 * 播放指定频率的正弦音 durationMs 毫秒后停止。
 * 工厂可注入 mock；无 Web Audio 支持时抛中文错。
 */
export async function playTone(
  factory: AudioContextFactory,
  freq: number,
  durationMs = 1000,
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

/** 各频率是否听见的记录 */
export type HearingResults = Record<number, boolean>

/** 记录某频率的听见结果（不修改原对象） */
export function recordHearingResult(
  results: HearingResults,
  freq: number,
  heard: boolean,
): HearingResults {
  return { ...results, [freq]: heard }
}

/** 听力筛查总结文案（仅供参考） */
export function summarizeHearing(results: HearingResults): string {
  const tested = HEARING_FREQS.filter((f) => f in results)
  if (tested.length === 0) return '尚未测试'
  const missed = tested.filter((f) => !results[f])
  if (missed.length === 0) {
    return `全部 ${tested.length} 个频率均可听见，听力筛查通过（仅供参考，非医学诊断）`
  }
  return `以下频率未听见：${missed.join('、')} Hz（仅供参考，非医学诊断）`
}

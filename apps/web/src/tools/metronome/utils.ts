/**
 * metronome —— 节拍器的纯函数层
 *
 * 约定：
 * - BPM：每分钟四分音符数；实际拍点间隔按「拍号分母」折算
 *   （beatUnit = 8 时，每拍为八分音符，间隔是四分音符的一半）。
 * - 本文件不触碰任何浏览器 API（AudioContext / setInterval 都在 Tool.tsx），
 *   可在 node 下被 vitest 完整测试。
 */

/** 一拍的信息：所属小节、小节内序号、距开始的秒数、是否为重拍 */
export interface BeatEvent {
  readonly bar: number
  readonly beatInBar: number
  readonly timeSec: number
  readonly accented: boolean
}

/** BPM 合法区间 */
export const MIN_BPM = 20
export const MAX_BPM = 320
/** 每小节拍数上限 */
export const MAX_BEATS_PER_BAR = 12
/** 合法的拍号分母（以几分音符为一拍） */
export const VALID_BEAT_UNITS = [1, 2, 4, 8, 16] as const
/** 一次生成的拍点上限（防止误填过大值卡死） */
export const MAX_BARS = 1000

/** BPM / 拍号合法性校验，非法抛中文错 */
export function assertValidMetronomeOptions(
  bpm: number,
  beatsPerBar: number,
  beatUnit: number,
): void {
  if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) {
    throw new Error(`BPM 非法：${String(bpm)}（应为 ${MIN_BPM}～${MAX_BPM} 的数字）`)
  }
  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1 || beatsPerBar > MAX_BEATS_PER_BAR) {
    throw new Error(`每小节拍数非法：${String(beatsPerBar)}（应为 1～${MAX_BEATS_PER_BAR} 的整数）`)
  }
  if (!(VALID_BEAT_UNITS as readonly number[]).includes(beatUnit)) {
    throw new Error(
      `拍号分母非法：${String(beatUnit)}（须为 ${VALID_BEAT_UNITS.join(' / ')} 之一）`,
    )
  }
}

/**
 * 相邻两拍的间隔（秒）。
 * BPM 以四分音符为基准：beatUnit = 4 时间隔 = 60 / BPM；
 * beatUnit = 8 时每拍为八分音符，间隔减半，依此类推。
 */
export function beatIntervalSec(bpm: number, beatUnit: number): number {
  assertValidMetronomeOptions(bpm, 1, beatUnit)
  return (60 / bpm) * (4 / beatUnit)
}

/** 一小节的时长（秒） */
export function barDurationSec(bpm: number, beatsPerBar: number, beatUnit: number): number {
  assertValidMetronomeOptions(bpm, beatsPerBar, beatUnit)
  return beatsPerBar * beatIntervalSec(bpm, beatUnit)
}

/**
 * 生成拍点序列（纯函数）：从第 1 小节第 1 拍开始，
 * 每小节第 1 拍为重拍（accented = true）。
 */
export function generateBeatSchedule(
  bpm: number,
  beatsPerBar: number,
  beatUnit: number,
  bars: number,
): BeatEvent[] {
  assertValidMetronomeOptions(bpm, beatsPerBar, beatUnit)
  if (!Number.isInteger(bars) || bars < 1 || bars > MAX_BARS) {
    throw new Error(`小节数非法：${String(bars)}（应为 1～${MAX_BARS} 的整数）`)
  }
  const interval = beatIntervalSec(bpm, beatUnit)
  const events: BeatEvent[] = []
  for (let bar = 1; bar <= bars; bar++) {
    for (let beat = 1; beat <= beatsPerBar; beat++) {
      const index = (bar - 1) * beatsPerBar + (beat - 1)
      events.push({
        bar,
        beatInBar: beat,
        timeSec: index * interval,
        accented: beat === 1,
      })
    }
  }
  return events
}

/**
 * 给定已播放时长，算出当前应亮起第几拍（小节内序号，从 1 开始）。
 * 供 Tool.tsx 的可视闪烁用；intervalSec 必须为正数。
 */
export function currentBeatInBar(
  elapsedSec: number,
  intervalSec: number,
  beatsPerBar: number,
): number {
  if (!Number.isFinite(elapsedSec) || elapsedSec < 0) {
    throw new Error(`已播放时长非法：${String(elapsedSec)}（不能为负数）`)
  }
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
    throw new Error(`拍间隔非法：${String(intervalSec)}（必须为正数）`)
  }
  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1) {
    throw new Error(`每小节拍数非法：${String(beatsPerBar)}`)
  }
  return (Math.floor(elapsedSec / intervalSec) % beatsPerBar) + 1
}

/** 「120 BPM · 4/4 拍」这样的中文摘要 */
export function formatMetronomeLabel(bpm: number, beatsPerBar: number, beatUnit: number): string {
  assertValidMetronomeOptions(bpm, beatsPerBar, beatUnit)
  return `${bpm} BPM · ${beatsPerBar}/${beatUnit} 拍`
}

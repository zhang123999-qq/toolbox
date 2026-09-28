import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { optionsSchema } from './schema'
import type { MetronomeFormOptions, MetronomeInput } from './schema'
import { beatIntervalSec, currentBeatInBar, formatMetronomeLabel } from './utils'

/** 强拍 / 弱拍的点击频率（Hz）与包络 */
const ACCENT_FREQ = 1600
const NORMAL_FREQ = 1000
const CLICK_DURATION = 0.09
/** 调度器：每 40ms 向前看 0.15 秒排拍点 */
const SCHEDULER_MS = 40
const LOOKAHEAD_SEC = 0.15

interface BrowserAudio {
  readonly AudioContext?: new () => AudioContext
  readonly webkitAudioContext?: new () => AudioContext
}

/** 合成一次点击声：短促正弦 + 指数衰减包络 */
function playClick(ctx: AudioContext, when: number, accented: boolean): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.setValueAtTime(accented ? ACCENT_FREQ : NORMAL_FREQ, when)
  gain.gain.setValueAtTime(0.9, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + CLICK_DURATION)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + CLICK_DURATION + 0.02)
}

export default function Tool() {
  const [running, setRunning] = useState(false)
  const [flashBeat, setFlashBeat] = useState(1)
  const [totalBeats, setTotalBeats] = useState(4)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const engineRef = useRef<{ ctx: AudioContext; timer: number } | null>(null)

  const optionDefs: readonly OptionDef<MetronomeFormOptions>[] = [
    { key: 'bpm', label: 'BPM', kind: 'text', placeholder: '120' },
    { key: 'beatsPerBar', label: '每小节拍数', kind: 'text', placeholder: '4' },
    { key: 'beatUnit', label: '拍号分母', kind: 'text', placeholder: '4' },
  ]

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '启动失败，请重试'
  }

  /** 停止：清定时器、关 AudioContext */
  function stop(): void {
    const engine = engineRef.current
    engineRef.current = null
    if (engine) {
      window.clearInterval(engine.timer)
      void engine.ctx.close().catch(() => undefined)
    }
    setRunning(false)
  }

  /** 启动：参数校验 → 建 AudioContext → 调度器按拍点合成点击声 */
  function start(raw: MetronomeFormOptions): void {
    setError('')
    let opts: { bpm: number; beatsPerBar: number; beatUnit: number }
    try {
      opts = optionsSchema.parse(raw)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    const g = globalThis as unknown as BrowserAudio
    const Ctor = g.AudioContext ?? g.webkitAudioContext
    if (!Ctor) {
      setError('当前浏览器不支持 Web Audio API，无法播放节拍声')
      return
    }
    const interval = beatIntervalSec(opts.bpm, opts.beatUnit)
    const ctx = new Ctor()
    const startedAt = ctx.currentTime + 0.08
    let nextTime = startedAt
    setTotalBeats(opts.beatsPerBar)
    setLabel(formatMetronomeLabel(opts.bpm, opts.beatsPerBar, opts.beatUnit))
    setRunning(true)
    setFlashBeat(1)
    const timer = window.setInterval(() => {
      // 已播放时长 → 当前小节内拍号，驱动可视闪烁
      const elapsed = ctx.currentTime - startedAt
      if (elapsed >= 0) {
        try {
          setFlashBeat(currentBeatInBar(elapsed, interval, opts.beatsPerBar))
        } catch {
          /* 参数已校验，此处不抛 */
        }
      }
      // 向前看排拍点
      while (nextTime < ctx.currentTime + LOOKAHEAD_SEC) {
        const beatInBar = (Math.round((nextTime - startedAt) / interval) % opts.beatsPerBar) + 1
        playClick(ctx, nextTime, beatInBar === 1)
        nextTime += interval
      }
    }, SCHEDULER_MS)
    engineRef.current = { ctx, timer }
  }

  // 卸载时确保停掉，避免后台继续响
  useEffect(() => {
    return () => {
      const engine = engineRef.current
      engineRef.current = null
      if (engine) {
        window.clearInterval(engine.timer)
        void engine.ctx.close().catch(() => undefined)
      }
    }
  }, [])

  return (
    <MultiPanel<MetronomeInput, MetronomeFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ bpm: '120', beatsPerBar: '4', beatUnit: '4' }}
      optionDefs={optionDefs}
      example={{ text: '' }}
      renderOutput={(_input, options) => (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="start-stop"
              className="rounded bg-brand px-6 py-2 text-base text-white hover:opacity-90"
              onClick={() => (running ? stop() : start(options))}
            >
              {running ? '停止' : '开始'}
            </button>
            {label ? (
              <span
                data-testid="tempo-label"
                className="text-sm text-slate-600 dark:text-slate-400"
              >
                {label}
              </span>
            ) : null}
          </div>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {/* 拍点闪烁：当前拍高亮 */}
          <div data-testid="beat-flash" className="flex items-center gap-2" aria-hidden={false}>
            {Array.from({ length: totalBeats }, (_, i) => i + 1).map((beat) => {
              const active = running && flashBeat === beat
              const accent = beat === 1
              return (
                <span
                  key={beat}
                  data-testid={'beat-' + beat}
                  data-active={active ? 'true' : 'false'}
                  className={
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ' +
                    (active
                      ? accent
                        ? 'bg-red-500 text-white'
                        : 'bg-brand text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400')
                  }
                >
                  {beat}
                </span>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">
            {running
              ? '节拍进行中：红色为每小节第 1 拍（重拍）。修改参数后点「停止」再「开始」生效。'
              : '设置 BPM 与拍号后点「开始」。声音由浏览器实时合成，不下载任何音频文件。'}
          </p>
        </div>
      )}
      toText={() => (label ? `节拍器：${label}` : '')}
      downloadExt="txt"
    />
  )
}

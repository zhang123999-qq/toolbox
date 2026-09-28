import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { TunerFormOptions, TunerInput } from './schema'
import { detectPitch, formatTunerResult, noteFromFrequency } from './utils'
import type { NoteInfo } from './utils'

/** 分析窗长度：4096 点 @48kHz ≈ 85ms，覆盖 40Hz 以上的周期 */
const FFT_SIZE = 4096
/** 检测节拍：每 150ms 读一次时域数据 */
const POLL_MS = 150

interface BrowserAudio {
  readonly AudioContext?: new () => AudioContext
  readonly webkitAudioContext?: new () => AudioContext
}

interface TunerReading {
  readonly freq: number | null
  readonly note: NoteInfo | null
}

export default function Tool() {
  const [listening, setListening] = useState(false)
  const [reading, setReading] = useState<TunerReading>({ freq: null, note: null })
  const [error, setError] = useState('')
  const engineRef = useRef<{
    ctx: AudioContext
    stream: MediaStream
    timer: number
  } | null>(null)

  function teardown(): void {
    const engine = engineRef.current
    engineRef.current = null
    if (engine) {
      window.clearTimeout(engine.timer)
      for (const track of engine.stream.getTracks()) track.stop()
      void engine.ctx.close().catch(() => undefined)
    }
  }

  function stop(): void {
    teardown()
    setListening(false)
  }

  /** 开始监听：麦克风 → AnalyserNode 时域数据 → 自相关检测 */
  async function start(): Promise<void> {
    setError('')
    const mediaDevices = globalThis.navigator?.mediaDevices
    if (!mediaDevices?.getUserMedia) {
      setError('当前浏览器不支持麦克风采集（需要 HTTPS 或 localhost 环境），无法使用调音器')
      return
    }
    const g = globalThis as unknown as BrowserAudio
    const Ctor = g.AudioContext ?? g.webkitAudioContext
    if (!Ctor) {
      setError('当前浏览器不支持 Web Audio API，无法分析麦克风声音')
      return
    }
    try {
      const stream = await mediaDevices.getUserMedia({ audio: true })
      const ctx = new Ctor()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      source.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      setListening(true)
      const poll = (): void => {
        analyser.getFloatTimeDomainData(buf)
        let freq: number | null
        try {
          freq = detectPitch(buf, ctx.sampleRate)
        } catch {
          freq = null
        }
        setReading({ freq, note: freq === null ? null : noteFromFrequency(freq) })
        const engine = engineRef.current
        if (engine) engine.timer = window.setTimeout(poll, POLL_MS)
      }
      engineRef.current = { ctx, stream, timer: window.setTimeout(poll, 0) }
    } catch (err) {
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? '麦克风权限被拒绝：请在浏览器地址栏允许麦克风访问后重试'
          : '无法打开麦克风，请检查设备是否被占用',
      )
    }
  }

  // 卸载时释放麦克风
  useEffect(() => {
    return () => teardown()
  }, [])

  const { freq, note } = reading
  // 音分条：-50～+50 音分映射到 0～100%
  const centsPos = note ? Math.min(100, Math.max(0, 50 + note.cents)) : 50

  return (
    <MultiPanel<TunerInput, TunerFormOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            type="button"
            data-testid="start-stop"
            className="rounded bg-brand px-6 py-2 text-base text-white hover:opacity-90"
            onClick={() => (listening ? stop() : void start())}
          >
            {listening ? '停止监听' : '开始监听'}
          </button>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {/* 音名大显示 */}
          <div className="flex items-baseline gap-2">
            <span
              data-testid="note-name"
              className="text-6xl font-bold text-slate-800 dark:text-slate-100"
            >
              {note ? `${note.name}${note.octave}` : '—'}
            </span>
            <span data-testid="freq" className="text-lg text-slate-500 dark:text-slate-400">
              {freq === null ? '等待声音…' : `${freq.toFixed(1)} Hz`}
            </span>
          </div>
          {/* 音分偏差条 */}
          <div className="w-full max-w-md">
            <div className="relative h-3 rounded bg-slate-200 dark:bg-slate-800">
              <div className="absolute left-1/2 top-0 h-3 w-px bg-slate-400" />
              <div
                data-testid="cents-marker"
                className="absolute top-0 h-3 w-1 rounded bg-brand"
                style={{ left: `calc(${centsPos}% - 2px)` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>-50 音分</span>
              <span data-testid="cents" className="font-medium text-slate-700 dark:text-slate-300">
                {note ? `${note.cents > 0 ? '+' : ''}${note.cents} 音分` : '—'}
              </span>
              <span>+50 音分</span>
            </div>
          </div>
          {note ? (
            <p
              data-testid="tuning-hint"
              className={
                'text-lg font-medium ' +
                (note.cents > 5 || note.cents < -5
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-green-600 dark:text-green-400')
              }
            >
              {note.cents > 5 ? '偏高，请调低' : note.cents < -5 ? '偏低，请调高' : '音准 ✓'}
            </p>
          ) : null}
          <p className="max-w-md text-center text-xs text-slate-500">
            对着麦克风弹奏或哼唱一个持续的单音。±5
            音分内显示「音准」。声音只在浏览器内分析，不上传、不录音。
          </p>
        </div>
      )}
      toText={() => (freq === null ? '' : formatTunerResult(freq))}
      downloadExt="txt"
    />
  )
}

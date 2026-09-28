import { useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import { MIC_STATUS_TEXT, computeLevel, describeLevel, formatLevel, getMicStream } from './utils'
import type { MicStatus } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * 麦克风测试：MediaDevices.getUserMedia / AudioContext 只允许出现在这里，
 * 电平计算在 utils 纯函数里。停止时释放轨道与 AudioContext。
 */
export default function Tool() {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [level, setLevel] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef(0)

  function stop(): void {
    cancelAnimationFrame(rafRef.current)
    for (const track of streamRef.current?.getTracks() ?? []) track.stop()
    streamRef.current = null
    void ctxRef.current?.close().catch(() => undefined)
    ctxRef.current = null
    setLevel(0)
    setStatus('idle')
  }

  useEffect(() => stop, [])

  async function start(): Promise<void> {
    setStatus('requesting')
    try {
      const stream = await getMicStream(navigator.mediaDevices)
      streamRef.current = stream
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) throw new Error('当前浏览器不支持 AudioContext')
      const ctx = new Ctor()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      setStatus('active')
      const tick = (): void => {
        analyser.getByteTimeDomainData(data)
        setLevel(computeLevel(data))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      stop()
      setStatus('denied')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
      <p
        data-testid="mic-status"
        className="text-sm font-medium text-slate-800 dark:text-slate-200"
      >
        状态：{MIC_STATUS_TEXT[status]}
      </p>
      <div className="h-6 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
        <div
          data-testid="mic-level-bar"
          className="h-full bg-green-500 transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
        />
      </div>
      <p data-testid="mic-level" className="text-sm text-slate-700 dark:text-slate-300">
        电平：{formatLevel(level)}（{describeLevel(level)}）
      </p>
      <div className="flex gap-2">
        {status === 'active' ? (
          <button type="button" data-testid="mic-stop" className={BTN_CLASS} onClick={stop}>
            停止检测
          </button>
        ) : (
          <button
            type="button"
            data-testid="mic-start"
            className={BTN_CLASS}
            onClick={start}
            disabled={status === 'requesting'}
          >
            开始检测
          </button>
        )}
      </div>
    </div>
  )
}

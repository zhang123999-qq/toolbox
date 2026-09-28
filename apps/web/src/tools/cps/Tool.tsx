import { useCallback, useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import {
  calcStats,
  createCpsSession,
  gradeCps,
  recordClick,
  type CpsSession,
} from './utils'

const DURATIONS = [5, 10, 30]

type Phase = 'idle' | 'running' | 'done'

export default function Tool() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [durationSec, setDurationSec] = useState(5)
  const [session, setSession] = useState<CpsSession>(() => createCpsSession(5000))
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])
  useEffect(() => stop, [stop])

  const start = (sec: number) => {
    stop()
    setSession(createCpsSession(sec * 1000))
    setDurationSec(sec)
    setPhase('running')
    timer.current = window.setTimeout(() => {
      timer.current = null
      setPhase('done')
    }, sec * 1000)
  }

  const onClickPad = () => {
    if (phase !== 'running') return
    setSession((s) => recordClick(s, Date.now()))
  }

  const stats = calcStats(session)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">时长：</span>
        {DURATIONS.map((sec) => (
          <button
            key={sec}
            type="button"
            data-testid={`cps-duration-${sec}`}
            disabled={phase === 'running'}
            onClick={() => start(sec)}
            className={`rounded px-3 py-1 ${
              durationSec === sec && phase !== 'idle'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            {sec} 秒
          </button>
        ))}
      </div>
      <button
        type="button"
        data-testid="cps-pad"
        onClick={onClickPad}
        className="flex h-56 w-full max-w-md select-none items-center justify-center rounded-lg bg-blue-100 text-lg font-medium dark:bg-blue-900"
      >
        {phase === 'running' ? `点击！已点 ${session.clicks.length} 次` : '选择时长开始，疯狂点击这里'}
      </button>
      {phase === 'done' && (
        <div data-testid="cps-result" className="text-sm">
          <p>
            CPS：<strong>{stats.cps.toFixed(2)}</strong>（{gradeCps(stats.cps)}）
          </p>
          <p>
            总点击 {stats.total} 次，平均间隔 {stats.avgIntervalMs} ms，最高连击 {stats.maxBurst} 次
          </p>
        </div>
      )}
      <p className="text-xs text-slate-500">规则：选择时长后在蓝色区域内尽可能快地点击，时间到自动结算。</p>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { StopwatchInput, StopwatchOptions } from './schema'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { addLap, computeElapsed, formatSw, lapSplit, SW_PHASE_LABEL } from './utils'

type Phase = 'idle' | 'running' | 'paused'

/** 秒表主体：时间戳锚定（performance.now），setInterval 仅触发重渲染，卸载时清理 */
function StopwatchPanel() {
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [laps, setLaps] = useState<number[]>([])
  /** 暂停前已累计的毫秒数 */
  const baseRef = useRef(0)
  /** 当前活动段的起始时间戳（performance.now），null 表示未在走动 */
  const startedAtRef = useRef<number | null>(null)

  /** 读取真实经过时长：base + (now − startedAt)，与定时器节流无关 */
  function readElapsed(): number {
    return computeElapsed(baseRef.current, startedAtRef.current, performance.now())
  }

  // 走动中定时刷新显示；间隔不参与计时，仅触发重渲染
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setElapsed(readElapsed()), 10)
    return () => clearInterval(id)
  }, [phase])

  function start() {
    startedAtRef.current = performance.now()
    setPhase('running')
  }
  function pause() {
    baseRef.current = readElapsed()
    startedAtRef.current = null
    setElapsed(baseRef.current)
    setPhase('paused')
  }
  function lap() {
    setLaps((prev) => addLap(prev, readElapsed()))
  }
  function reset() {
    baseRef.current = 0
    startedAtRef.current = null
    setPhase('idle')
    setElapsed(0)
    setLaps([])
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div
        data-testid="sw-display"
        className="font-mono text-6xl font-bold tabular-nums dark:text-slate-100"
      >
        {formatSw(elapsed)}
      </div>
      <div data-testid="sw-status" className="text-sm text-slate-500 dark:text-slate-400">
        {SW_PHASE_LABEL[phase]}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          data-testid="sw-start"
          className="rounded bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
          onClick={start}
          disabled={phase === 'running'}
        >
          {phase === 'paused' ? '继续' : '开始'}
        </button>
        <button
          type="button"
          data-testid="sw-pause"
          className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700 dark:text-slate-200 disabled:opacity-40"
          onClick={pause}
          disabled={phase !== 'running'}
        >
          暂停
        </button>
        <button
          type="button"
          data-testid="sw-lap"
          className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700 dark:text-slate-200 disabled:opacity-40"
          onClick={lap}
          disabled={phase !== 'running'}
        >
          计次
        </button>
        <button
          type="button"
          data-testid="sw-reset"
          className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700 dark:text-slate-200"
          onClick={reset}
        >
          复位
        </button>
      </div>
      {laps.length > 0 ? (
        <ul data-testid="sw-laps" className="w-full max-w-sm text-sm">
          {[...laps].reverse().map((total, revIdx) => {
            const idx = laps.length - 1 - revIdx
            const split = lapSplit(laps.slice(0, idx), total)
            return (
              <li
                key={idx}
                className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800"
              >
                <span className="text-slate-500 dark:text-slate-400">第 {idx + 1} 次</span>
                <span className="font-mono tabular-nums">
                  分段 {formatSw(split)} / 累计 {formatSw(total)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

export default function Tool() {
  return (
    <MultiPanel<StopwatchInput, StopwatchOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => <StopwatchPanel />}
      toText={() => ''}
      downloadExt="txt"
    />
  )
}

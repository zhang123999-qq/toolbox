import { useEffect, useState } from 'react'
import type { TimerInput, TimerOptions } from './schema'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { describeDuration, formatRemaining, parseDuration, STATUS_LABEL } from './utils'

/** 示例：10 秒倒计时，方便立刻看到走动 */
const EXAMPLE: TimerInput = { text: '0:10' }

type Phase = 'idle' | 'running' | 'paused' | 'done'

/** 计时器主体：持有 setInterval，卸载时清理，禁止泄漏 */
function TimerPanel({ total }: { total: number }) {
  const [remaining, setRemaining] = useState(total)
  const [phase, setPhase] = useState<Phase>('idle')

  // 运行中每秒递减；走到 0 时在回调内切到 done，避免 effect 内 setState
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setPhase('done')
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  function start() {
    if (remaining <= 0) return
    setPhase('running')
  }
  function pause() {
    setPhase('paused')
  }
  function reset() {
    setPhase('idle')
    setRemaining(total)
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div
        data-testid="timer-display"
        className="font-mono text-6xl font-bold tabular-nums dark:text-slate-100"
      >
        {formatRemaining(remaining)}
      </div>
      <div
        data-testid="timer-status"
        className={
          phase === 'done'
            ? 'text-lg font-semibold text-red-600 dark:text-red-400'
            : 'text-sm text-slate-500 dark:text-slate-400'
        }
      >
        {STATUS_LABEL[phase]}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="timer-start"
          className="rounded bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
          onClick={start}
          disabled={phase === 'running' || remaining <= 0}
        >
          {phase === 'paused' ? '继续' : '开始'}
        </button>
        <button
          type="button"
          data-testid="timer-pause"
          className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700 dark:text-slate-200 disabled:opacity-40"
          onClick={pause}
          disabled={phase !== 'running'}
        >
          暂停
        </button>
        <button
          type="button"
          data-testid="timer-reset"
          className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700 dark:text-slate-200"
          onClick={reset}
        >
          复位
        </button>
      </div>
    </div>
  )
}

export default function Tool() {
  return (
    <MultiPanel<TimerInput, TimerOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={(input) => {
        try {
          const total = parseDuration(input.text)
          if (total <= 0) {
            return (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                请在左侧输入时长（秒 / 分:秒 / 时:分:秒），例如 90、1:30、1:30:00
              </p>
            )
          }
          // key 随 total 变化强制重挂载，天然实现「配置变化时复位」，无需 effect 内 setState
          return <TimerPanel key={total} total={total} />
        } catch (error) {
          return (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={(input) => {
        try {
          return describeDuration(input.text)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}

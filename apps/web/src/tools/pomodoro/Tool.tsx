import { useEffect, useState } from 'react'
import type { PomodoroInput, PomodoroOptions } from './schema'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  completesRound,
  formatPomo,
  nextPhase,
  parseMinutes,
  phaseDurationSeconds,
  PHASE_LABEL,
  pomoText,
} from './utils'

type Phase = 'work' | 'break'

/** 番茄钟主体：持有 setInterval，卸载时清理 */
function PomodoroPanel({ workMin, breakMin }: { workMin: number; breakMin: number }) {
  const [phase, setPhase] = useState<Phase>('work')
  const [remaining, setRemaining] = useState(() => phaseDurationSeconds('work', workMin, breakMin))
  const [rounds, setRounds] = useState(0)
  const [running, setRunning] = useState(false)

  // 运行中每秒递减；走到 0 时在回调内切阶段，避免 effect 内 setState
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (completesRound(phase)) setRounds((rd) => rd + 1)
          const np = nextPhase(phase)
          setPhase(np)
          return phaseDurationSeconds(np, workMin, breakMin)
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, phase, workMin, breakMin])

  function start() {
    setRunning(true)
  }
  function pause() {
    setRunning(false)
  }
  function reset() {
    setRunning(false)
    setPhase('work')
    setRounds(0)
    setRemaining(phaseDurationSeconds('work', workMin, breakMin))
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div
        data-testid="pomo-phase"
        className={
          phase === 'work'
            ? 'text-lg font-semibold text-brand'
            : 'text-lg font-semibold text-emerald-600 dark:text-emerald-400'
        }
      >
        {PHASE_LABEL[phase]}中
      </div>
      <div
        data-testid="pomo-display"
        className="font-mono text-6xl font-bold tabular-nums dark:text-slate-100"
      >
        {formatPomo(remaining)}
      </div>
      <div data-testid="pomo-rounds" className="text-sm text-slate-500 dark:text-slate-400">
        已完成 {rounds} 个番茄
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="pomo-start"
          className="rounded bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-40"
          onClick={start}
          disabled={running}
        >
          开始
        </button>
        <button
          type="button"
          data-testid="pomo-pause"
          className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-700 dark:text-slate-200 disabled:opacity-40"
          onClick={pause}
          disabled={!running}
        >
          暂停
        </button>
        <button
          type="button"
          data-testid="pomo-reset"
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
  const optionDefs: readonly OptionDef<PomodoroOptions>[] = [
    { key: 'workMinutes', label: '工作(分)', kind: 'text', placeholder: '25' },
    { key: 'breakMinutes', label: '休息(分)', kind: 'text', placeholder: '5' },
  ]

  return (
    <MultiPanel<PomodoroInput, PomodoroOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ workMinutes: '25', breakMinutes: '5' }}
      example={{ text: '' }}
      optionDefs={optionDefs}
      renderOutput={(_input, options) => {
        try {
          const workMin = parseMinutes(options.workMinutes, 25)
          const breakMin = parseMinutes(options.breakMinutes, 5)
          // key 随时长变化强制重挂载，天然实现「配置变化时复位」
          return (
            <PomodoroPanel key={`${workMin}-${breakMin}`} workMin={workMin} breakMin={breakMin} />
          )
        } catch (error) {
          return (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={(_input, options) => {
        try {
          return pomoText(
            parseMinutes(options.workMinutes, 25),
            parseMinutes(options.breakMinutes, 5),
          )
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}

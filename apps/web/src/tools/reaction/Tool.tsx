import { useCallback, useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import {
  goReady,
  gradeReaction,
  recordReaction,
  resetReaction,
  startWait,
  tooSoon,
  type ReactionState,
} from './utils'

const PAD_STYLE: Record<ReactionState['phase'], string> = {
  idle: 'bg-slate-200 dark:bg-slate-700',
  waiting: 'bg-red-400 dark:bg-red-800',
  ready: 'bg-green-400 dark:bg-green-700',
  done: 'bg-slate-200 dark:bg-slate-700',
  foul: 'bg-yellow-300 dark:bg-yellow-700',
}

const PAD_TEXT: Record<ReactionState['phase'], string> = {
  idle: '点击开始，等待变绿后尽快点击',
  waiting: '等待变绿…（提前点击算抢跑）',
  ready: '点击！',
  done: '再来一次？点击开始',
  foul: '抢跑犯规！点击重新开始',
}

export default function Tool() {
  const [state, setState] = useState<ReactionState>(() => resetReaction())
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])
  useEffect(() => stop, [stop])

  const start = useCallback(() => {
    stop()
    const s = startWait()
    setState(s)
    timer.current = window.setTimeout(() => {
      setState((cur) => goReady(cur, Date.now()))
    }, s.waitMs)
  }, [stop])

  const onPad = () => {
    if (state.phase === 'idle' || state.phase === 'done' || state.phase === 'foul') {
      start()
      return
    }
    if (state.phase === 'waiting') {
      stop()
      setState((cur) => tooSoon(cur))
      return
    }
    setState((cur) => recordReaction(cur, Date.now()))
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <button
        type="button"
        data-testid="reaction-pad"
        onClick={onPad}
        className={`flex h-56 w-full max-w-md items-center justify-center rounded-lg text-lg font-medium ${PAD_STYLE[state.phase]}`}
      >
        {PAD_TEXT[state.phase]}
      </button>
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          data-testid="reaction-start"
          onClick={start}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          开始测试
        </button>
        {state.phase === 'done' && state.reactionMs !== null && (
          <span data-testid="reaction-result">
            反应时间：{state.reactionMs} ms（{gradeReaction(state.reactionMs)}）
          </span>
        )}
        {state.phase === 'foul' && <span data-testid="reaction-foul">抢跑了，等变绿再点！</span>}
      </div>
      <p className="text-xs text-slate-500">
        规则：点击开始后屏幕变红，随机 1.5–4.5 秒后变绿，变绿瞬间点击；提前点击判抢跑。
      </p>
    </div>
  )
}

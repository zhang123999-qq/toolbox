import { useState } from 'react'
import { meta } from './meta'
import { checkAnswer, newRound, type VisionRound } from './utils'

export default function Tool() {
  const [round, setRound] = useState<VisionRound>(() => newRound(1))
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)

  const onPick = (idx: number) => {
    if (checkAnswer(round, idx)) {
      setScore((s) => s + 1)
      setFlash('ok')
      setRound(newRound(round.level + 1))
    } else {
      setMistakes((m) => m + 1)
      setFlash('bad')
    }
    window.setTimeout(() => setFlash(null), 300)
  }

  const restart = () => {
    setRound(newRound(1))
    setScore(0)
    setMistakes(0)
    setFlash(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <span data-testid="vision-level">第 {round.level} 关</span>
        <span data-testid="vision-score">得分 {score}</span>
        <span data-testid="vision-mistakes">失误 {mistakes}</span>
        <button
          type="button"
          data-testid="vision-restart"
          onClick={restart}
          className="rounded bg-slate-200 px-3 py-1 dark:bg-slate-700"
        >
          重新开始
        </button>
      </div>
      {flash === 'ok' && <p data-testid="vision-ok" className="text-sm text-green-600">找对了！</p>}
      {flash === 'bad' && <p data-testid="vision-bad" className="text-sm text-red-600">不是这一块，再看看</p>}
      <div
        data-testid="vision-grid"
        className="grid w-full max-w-md gap-1"
        style={{ gridTemplateColumns: `repeat(${round.grid}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: round.grid * round.grid }, (_, i) => (
          <button
            key={`${round.level}-${i}`}
            type="button"
            data-testid={`vision-tile-${i}`}
            aria-label={i === round.oddIndex ? '色差块' : '普通色块'}
            onClick={() => onPick(i)}
            className="aspect-square rounded"
            style={{ backgroundColor: i === round.oddIndex ? round.odd : round.base }}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">规则：点击颜色不同的那一块，答对升级（色差越来越小），答错计一次失误。</p>
    </div>
  )
}

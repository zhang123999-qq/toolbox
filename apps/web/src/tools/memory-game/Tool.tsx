import { useCallback, useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import { flipCard, isBestScore, isComplete, newDeck, resolveOpen, type MemoryState } from './utils'

const PAIR_OPTIONS = [4, 6, 8]
const SYMBOLS = [
  '🍎',
  '🍌',
  '🍇',
  '🍓',
  '🍑',
  '🍍',
  '🥝',
  '🍒',
  '🍉',
  '🥭',
  '🍋',
  '🍈',
  '🫐',
  '🍐',
  '🥥',
  '🌰',
  '🍆',
  '🥑',
]

export default function Tool() {
  const [pairs, setPairs] = useState(6)
  const [game, setGame] = useState<MemoryState>(() => newDeck(6))
  const [best, setBest] = useState<number | null>(null)
  const bestRef = useRef<number | null>(null)
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])
  useEffect(() => stop, [stop])

  const restart = useCallback(
    (p: number) => {
      stop()
      setGame(newDeck(p))
    },
    [stop],
  )

  const onFlip = (idx: number) => {
    const next = flipCard(game, idx)
    if (next === game) return
    setGame(next)
    if (next.open.length === 2) {
      stop()
      timer.current = window.setTimeout(() => {
        const resolved = resolveOpen(next)
        setGame(resolved)
        if (isComplete(resolved) && isBestScore(bestRef.current, resolved.moves)) {
          bestRef.current = resolved.moves
          setBest(resolved.moves)
        }
      }, 700)
    }
  }

  const done = isComplete(game)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          对数
          <select
            data-testid="memory-pairs"
            value={pairs}
            onChange={(e) => {
              const p = Number(e.target.value)
              setPairs(p)
              restart(p)
            }}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
          >
            {PAIR_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p} 对
              </option>
            ))}
          </select>
        </label>
        <span data-testid="memory-moves">步数：{game.moves}</span>
        <span data-testid="memory-matched">
          已配对：{game.matchedPairs}/{pairs}
        </span>
        {best !== null && <span data-testid="memory-best">最佳：{best} 步</span>}
        <button
          type="button"
          data-testid="memory-new"
          onClick={() => restart(pairs)}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          重新开始
        </button>
      </div>
      {done && (
        <p data-testid="memory-done" className="font-medium text-green-700">
          全部配对完成！共用 {game.moves} 步{best === game.moves ? '（新纪录！）' : ''}
        </p>
      )}
      <div data-testid="memory-board" className="grid w-fit grid-cols-4 gap-2">
        {game.cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            data-testid={`memory-card-${i}`}
            onClick={() => onFlip(i)}
            disabled={c.matched}
            aria-label={`卡片 ${i + 1}`}
            className={`flex h-16 w-16 items-center justify-center rounded text-2xl shadow ${
              c.flipped || c.matched
                ? 'bg-white dark:bg-slate-800'
                : 'bg-blue-500 text-transparent dark:bg-blue-700'
            } ${c.matched ? 'ring-2 ring-green-500' : ''}`}
          >
            {c.flipped || c.matched ? SYMBOLS[c.value] : '?'}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">每次翻两张：相同配对消除，不同则翻回；步数越少越好。</p>
    </div>
  )
}

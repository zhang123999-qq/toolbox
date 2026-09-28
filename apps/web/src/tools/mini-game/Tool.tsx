import { useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import { createMoleGame, isGameOver, spawnMole, tick, whack, type MoleState } from './utils'

export default function Tool() {
  const [game, setGame] = useState<MoleState>(() => createMoleGame())
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  const stop = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }

  const start = () => {
    stop()
    setGame(createMoleGame())
    setPlaying(true)
    timer.current = window.setInterval(() => {
      setGame((g) => {
        const t = tick(g)
        const next = Math.random() < 0.7 ? spawnMole(t) : t
        if (isGameOver(next)) {
          stop()
          setPlaying(false)
        }
        return next
      })
    }, 1000)
  }

  useEffect(() => stop, [])

  const hit = (i: number) => {
    if (!playing) return
    setGame((g) => whack(g, i).state)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <span data-testid="mole-score">得分：{game.score}</span>
        <span data-testid="mole-time">剩余：{game.timeLeft}s</span>
        <button
          type="button"
          data-testid="mole-start"
          onClick={start}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          {playing ? '重新开始' : '开始游戏'}
        </button>
      </div>
      <div className="grid w-fit grid-cols-3 gap-2" data-testid="mole-board">
        {game.holes.map((has, i) => (
          <button
            key={i}
            type="button"
            data-testid={`mole-hole-${i}`}
            aria-label={`洞 ${i + 1}`}
            onClick={() => hit(i)}
            className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
              has ? 'bg-amber-200' : 'bg-stone-300 dark:bg-stone-700'
            }`}
          >
            {has ? '🐹' : '🕳️'}
          </button>
        ))}
      </div>
      {isGameOver(game) && (
        <p data-testid="mole-over" className="text-sm text-slate-600 dark:text-slate-400">
          游戏结束！最终得分：{game.score}
        </p>
      )}
    </div>
  )
}

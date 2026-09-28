import { useCallback, useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import { changeDirection, createSnake, moveSnake, type Direction, type SnakeState } from './utils'

const CELL = 18

export default function Tool() {
  const [game, setGame] = useState<SnakeState>(() => createSnake())
  const [playing, setPlaying] = useState(false)
  const gameRef = useRef(game)
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  const start = useCallback(() => {
    stop()
    const fresh = createSnake()
    setGame(fresh)
    gameRef.current = fresh
    setPlaying(true)
    timer.current = window.setInterval(() => {
      const next = moveSnake(gameRef.current)
      gameRef.current = next
      setGame(next)
      if (!next.alive) {
        stop()
        setPlaying(false)
      }
    }, 120)
  }, [stop])

  useEffect(() => stop, [stop])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        setGame((g) => changeDirection(g, dir))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <span data-testid="snake-score">得分：{game.score}</span>
        <button
          type="button"
          data-testid="snake-start"
          onClick={start}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          {playing ? '重新开始' : '开始游戏'}
        </button>
      </div>
      <div
        data-testid="snake-board"
        className="relative w-fit border border-slate-300 dark:border-slate-600"
        style={{ width: game.w * CELL, height: game.h * CELL }}
      >
        {game.snake.map(([x, y], i) => (
          <div
            key={i}
            className={i === 0 ? 'absolute bg-green-600' : 'absolute bg-green-400'}
            style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
          />
        ))}
        <div
          data-testid="snake-food"
          className="absolute rounded-full bg-red-500"
          style={{ left: game.food[0] * CELL, top: game.food[1] * CELL, width: CELL, height: CELL }}
        />
      </div>
      {!game.alive && (
        <p data-testid="snake-over" className="text-sm text-slate-600 dark:text-slate-400">
          游戏结束！最终得分：{game.score}
        </p>
      )}
      <p className="text-xs text-slate-500">方向键控制移动，吃到红点变长加分。</p>
    </div>
  )
}

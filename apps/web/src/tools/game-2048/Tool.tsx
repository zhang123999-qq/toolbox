import { useCallback, useEffect, useState } from 'react'
import { meta } from './meta'
import {
  boardScore,
  createBoard,
  isGameOver,
  moveBoard,
  spawnTile,
  type Board,
  type MoveDir,
} from './utils'

const CELL = 72

function newGame(): Board {
  return spawnTile(spawnTile(createBoard()))
}

function tileColor(v: number): string {
  const map: Record<number, string> = {
    2: 'bg-amber-100 text-amber-900',
    4: 'bg-amber-200 text-amber-900',
    8: 'bg-orange-300 text-white',
    16: 'bg-orange-400 text-white',
    32: 'bg-red-400 text-white',
    64: 'bg-red-500 text-white',
    128: 'bg-yellow-400 text-white',
    256: 'bg-yellow-500 text-white',
    512: 'bg-lime-500 text-white',
    1024: 'bg-emerald-500 text-white',
    2048: 'bg-teal-600 text-white',
  }
  return map[v] ?? 'bg-purple-600 text-white'
}

export default function Tool() {
  const [board, setBoard] = useState<Board>(() => newGame())

  const doMove = useCallback((dir: MoveDir) => {
    setBoard((b) => {
      const { board: nb, moved } = moveBoard(b, dir)
      if (!moved) return b
      return spawnTile(nb)
    })
  }, [])

  const restart = () => setBoard(newGame())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, MoveDir> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        doMove(dir)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doMove])

  const over = isGameOver(board)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <span data-testid="g2048-score">总分：{boardScore(board)}</span>
        <button
          type="button"
          data-testid="g2048-restart"
          onClick={restart}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          重新开始
        </button>
      </div>
      <div
        className="grid w-fit grid-cols-4 gap-2 rounded bg-stone-300 p-2 dark:bg-stone-700"
        data-testid="g2048-board"
      >
        {board.flatMap((row, r) =>
          row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className={`flex items-center justify-center rounded font-bold ${
                v === 0 ? 'bg-stone-200 dark:bg-stone-800' : tileColor(v)
              }`}
              style={{ width: CELL, height: CELL, fontSize: v >= 1024 ? 20 : 26 }}
            >
              {v === 0 ? '' : v}
            </div>
          )),
        )}
      </div>
      {over && (
        <p data-testid="g2048-over" className="text-sm text-slate-600 dark:text-slate-400">
          游戏结束！最终总分：{boardScore(board)}
        </p>
      )}
      <p className="text-xs text-slate-500">方向键滑动棋盘，相同数字合并，目标合成 2048。</p>
    </div>
  )
}

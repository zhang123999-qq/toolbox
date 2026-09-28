import { useCallback, useState } from 'react'
import { meta } from './meta'
import { isSolved, moveTile, newPuzzle, type PuzzleState } from './utils'

const CELL = 64

export default function Tool() {
  const [size, setSize] = useState(4)
  const [game, setGame] = useState<PuzzleState>(() => newPuzzle(4))

  const restart = useCallback((s: number) => {
    setGame(newPuzzle(s))
  }, [])

  const onTile = (tile: number) => {
    setGame((g) => moveTile(g, tile))
  }

  const solved = isSolved(game)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          尺寸
          <select
            data-testid="puzzle-size"
            value={size}
            onChange={(e) => {
              const s = Number(e.target.value)
              setSize(s)
              restart(s)
            }}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
          >
            <option value={3}>3×3</option>
            <option value={4}>4×4</option>
            <option value={5}>5×5</option>
          </select>
        </label>
        <span data-testid="puzzle-moves">步数：{game.moves}</span>
        <button
          type="button"
          data-testid="puzzle-new"
          onClick={() => restart(size)}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          重新打乱
        </button>
        <span data-testid="puzzle-status" className="font-medium text-green-700">
          {solved ? '复原成功！' : ''}
        </span>
      </div>
      <div
        data-testid="puzzle-board"
        className="grid w-fit gap-1 rounded bg-slate-200 p-1 dark:bg-slate-700"
        style={{ gridTemplateColumns: `repeat(${game.size}, ${CELL}px)` }}
      >
        {game.tiles.map((t, i) =>
          t === 0 ? (
            <div key={i} data-testid="puzzle-blank" style={{ width: CELL, height: CELL }} />
          ) : (
            <button
              key={i}
              type="button"
              data-testid={`puzzle-tile-${t}`}
              onClick={() => onTile(t)}
              className="flex items-center justify-center rounded bg-white text-xl font-bold shadow dark:bg-slate-800"
              style={{ width: CELL, height: CELL }}
            >
              {t}
            </button>
          ),
        )}
      </div>
      <p className="text-xs text-slate-500">
        点击与空格相邻的数字即可滑入；打乱从目标态随机走步，保证可解。
      </p>
    </div>
  )
}

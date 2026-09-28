import { useState } from 'react'
import { meta } from './meta'
import { checkWin, countFlags, genBoard, reveal, toggleFlag, type MsBoard } from './utils'

const CELL = 30

const DIFFS = [
  { name: '初级 9x9·10雷', w: 9, h: 9, mines: 10 },
  { name: '中级 16x16·40雷', w: 16, h: 16, mines: 40 },
] as const

export default function Tool() {
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>(DIFFS[0])
  const [board, setBoard] = useState<MsBoard>(() => genBoard(9, 9, 10, 42))
  const [dead, setDead] = useState(false)
  const won = !dead && checkWin(board)

  const restart = (d: (typeof DIFFS)[number]) => {
    setDiff(d)
    setBoard(genBoard(d.w, d.h, d.mines))
    setDead(false)
  }

  const open = (x: number, y: number) => {
    if (dead || won) return
    const { board: nb, hitMine } = reveal(board, x, y)
    setBoard(nb)
    if (hitMine) setDead(true)
  }

  const flag = (x: number, y: number, e: React.MouseEvent) => {
    e.preventDefault()
    if (dead || won) return
    setBoard((b) => toggleFlag(b, x, y))
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          难度
          <select
            data-testid="ms-diff"
            value={diff.name}
            onChange={(e) => restart(DIFFS.find((d) => d.name === e.target.value) ?? DIFFS[0])}
            className="rounded border px-2 py-1 text-sm dark:bg-stone-800"
          >
            {DIFFS.map((d) => (
              <option key={d.name}>{d.name}</option>
            ))}
          </select>
        </label>
        <span data-testid="ms-flags">旗帜：{countFlags(board)}/{diff.mines}</span>
        <button
          type="button"
          data-testid="ms-restart"
          onClick={() => restart(diff)}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          重新开始
        </button>
      </div>
      <div className="w-fit border border-slate-300 dark:border-slate-600" data-testid="ms-board">
        {board.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => (
              <button
                key={x}
                type="button"
                data-testid={`ms-cell-${x}-${y}`}
                aria-label={`格子 ${x},${y}`}
                onClick={() => open(x, y)}
                onContextMenu={(e) => flag(x, y, e)}
                className={`flex items-center justify-center border border-slate-300 text-sm font-bold dark:border-slate-600 ${
                  cell.revealed ? 'bg-stone-200 dark:bg-stone-800' : 'bg-stone-400 hover:bg-stone-500'
                } ${dead && cell.mine ? 'bg-red-300' : ''}`}
                style={{ width: CELL, height: CELL }}
              >
                {cell.revealed ? (cell.mine ? '💣' : cell.adjacent > 0 ? cell.adjacent : '') : cell.flagged ? '🚩' : ''}
              </button>
            ))}
          </div>
        ))}
      </div>
      {dead && (
        <p data-testid="ms-dead" className="text-sm text-red-600">
          踩到地雷了！换个难度或重新开始再试一次。
        </p>
      )}
      {won && (
        <p data-testid="ms-win" className="text-sm text-green-600">
          🎉 胜利！你找出了所有安全格。
        </p>
      )}
      <p className="text-xs text-slate-500">左键揭开格子，右键插旗标记地雷。</p>
    </div>
  )
}

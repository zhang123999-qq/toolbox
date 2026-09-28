import { useCallback, useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import { aiMove, checkWin, createBoard, isFull, placeStone, type GomokuBoard } from './utils'

const CELL = 24

export default function Tool() {
  const [board, setBoard] = useState<GomokuBoard>(() => createBoard())
  const [winner, setWinner] = useState<0 | 1 | 2>(0)
  const [moves, setMoves] = useState(0)
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])
  useEffect(() => stop, [stop])

  const aiPlay = useCallback((b: GomokuBoard) => {
    timer.current = window.setTimeout(() => {
      try {
        const m = aiMove(b)
        const nb = placeStone(b, m.x, m.y, 2)
        setBoard(nb)
        setMoves((n) => n + 1)
        if (checkWin(nb, m.x, m.y)) setWinner(2)
      } catch {
        /* 棋盘已满：不会发生，防御性兜底 */
      }
    }, 350)
  }, [])

  const restart = useCallback(() => {
    stop()
    setBoard(createBoard())
    setWinner(0)
    setMoves(0)
  }, [stop])

  const onCell = (x: number, y: number) => {
    if (winner !== 0 || board[y][x] !== 0) return
    stop()
    const nb = placeStone(board, x, y, 1)
    setBoard(nb)
    setMoves((n) => n + 1)
    if (checkWin(nb, x, y)) {
      setWinner(1)
      return
    }
    if (isFull(nb)) return
    aiPlay(nb)
  }

  const status =
    winner === 1
      ? '你赢了！'
      : winner === 2
        ? 'AI 获胜'
        : isFull(board)
          ? '平局'
          : '轮到你落子（黑）'

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <span data-testid="gomoku-status">{status}</span>
        <span data-testid="gomoku-moves">手数：{moves}</span>
        <button
          type="button"
          data-testid="gomoku-restart"
          onClick={restart}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          重新开始
        </button>
      </div>
      <div
        data-testid="gomoku-board"
        className="grid w-fit border border-slate-300 bg-amber-50 dark:border-slate-600 dark:bg-slate-800"
        style={{ gridTemplateColumns: `repeat(15, ${CELL}px)` }}
      >
        {board.map((row, y) =>
          row.map((c, x) => (
            <button
              key={`${x}-${y}`}
              type="button"
              data-testid={`gomoku-cell-${x}-${y}`}
              aria-label={`棋盘 ${x},${y}`}
              onClick={() => onCell(x, y)}
              className="flex items-center justify-center border border-amber-200/60 dark:border-slate-700"
              style={{ width: CELL, height: CELL }}
            >
              {c !== 0 && (
                <span
                  className={`block rounded-full ${c === 1 ? 'bg-slate-900' : 'bg-white ring-1 ring-slate-400'}`}
                  style={{ width: CELL - 6, height: CELL - 6 }}
                />
              )}
            </button>
          )),
        )}
      </div>
      <p className="text-xs text-slate-500">
        你执黑先行，点击空格落子；AI 执白，会进攻成五也会防守堵四。
      </p>
    </div>
  )
}

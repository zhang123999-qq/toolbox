import { useCallback, useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import {
  clearLines,
  collides,
  createBoard,
  dropPiece,
  lockPiece,
  movePiece,
  rotatePiece,
  spawnPiece,
  type Piece,
  type TetrisBoard,
  type TetrominoKind,
} from './utils'

const CELL = 24
const W = 10
const H = 20
const KINDS: TetrominoKind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

interface PlayState {
  board: TetrisBoard
  piece: Piece
  score: number
  lines: number
  over: boolean
}

function randomKind(): TetrominoKind {
  return KINDS[Math.floor(Math.random() * KINDS.length)]
}

function newPlay(): PlayState {
  return {
    board: createBoard(W, H),
    piece: spawnPiece(randomKind(), W),
    score: 0,
    lines: 0,
    over: false,
  }
}

/** 方块落定：锁定→消行→生成新方块 */
function settle(s: PlayState): PlayState {
  const locked = lockPiece(s.board, s.piece)
  const { board, cleared, score } = clearLines(locked)
  const piece = spawnPiece(randomKind(), W)
  if (collides(board, piece))
    return { ...s, board, over: true, score: s.score + score, lines: s.lines + cleared }
  return { board, piece, score: s.score + score, lines: s.lines + cleared, over: false }
}

export default function Tool() {
  const [play, setPlay] = useState<PlayState>(() => newPlay())
  const [playing, setPlaying] = useState(false)
  const playRef = useRef(play)
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  const step = useCallback(() => {
    const s = playRef.current
    if (s.over) {
      stop()
      setPlaying(false)
      return
    }
    const moved = movePiece(s.board, s.piece, 0, 1)
    const next = moved ? { ...s, piece: moved } : settle(s)
    playRef.current = next
    setPlay(next)
    if (next.over) {
      stop()
      setPlaying(false)
    }
  }, [stop])

  const start = useCallback(() => {
    stop()
    const fresh = newPlay()
    playRef.current = fresh
    setPlay(fresh)
    setPlaying(true)
    timer.current = window.setInterval(step, 500)
  }, [stop, step])

  useEffect(() => stop, [stop])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playRef.current || playRef.current.over) return
      const s = playRef.current
      let next: PlayState | null = null
      if (e.key === 'ArrowLeft') {
        const p = movePiece(s.board, s.piece, -1, 0)
        if (p) next = { ...s, piece: p }
      } else if (e.key === 'ArrowRight') {
        const p = movePiece(s.board, s.piece, 1, 0)
        if (p) next = { ...s, piece: p }
      } else if (e.key === 'ArrowDown') {
        const p = movePiece(s.board, s.piece, 0, 1)
        next = p ? { ...s, piece: p } : settle(s)
      } else if (e.key === 'ArrowUp') {
        next = { ...s, piece: rotatePiece(s.board, s.piece) }
      } else if (e.key === ' ') {
        e.preventDefault()
        next = settle({ ...s, piece: dropPiece(s.board, s.piece) })
      } else {
        return
      }
      e.preventDefault()
      if (next) {
        playRef.current = next
        setPlay(next)
        if (next.over) {
          stop()
          setPlaying(false)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop])

  // 渲染：棋盘 + 当前方块叠加
  const view = play.board.map((row) => row.slice())
  if (!play.over) {
    play.piece.cells.forEach((crow, r) =>
      crow.forEach((v, c) => {
        const y = play.piece.y + r
        const x = play.piece.x + c
        if (v && y >= 0 && y < H && x >= 0 && x < W) view[y][x] = 2
      }),
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex items-center gap-4 text-sm">
        <span data-testid="tetris-score">得分：{play.score}</span>
        <span data-testid="tetris-lines">行数：{play.lines}</span>
        <button
          type="button"
          data-testid="tetris-start"
          onClick={start}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          {playing ? '重新开始' : '开始游戏'}
        </button>
      </div>
      <div
        className="border border-slate-300 dark:border-slate-600"
        data-testid="tetris-board"
        style={{ width: W * CELL }}
      >
        {view.map((row, y) => (
          <div key={y} className="flex">
            {row.map((v, x) => (
              <div
                key={x}
                className={
                  v === 2
                    ? 'bg-cyan-400'
                    : v === 1
                      ? 'bg-slate-500'
                      : 'bg-stone-100 dark:bg-stone-900'
                }
                style={{ width: CELL, height: CELL, border: '1px solid rgba(0,0,0,0.06)' }}
              />
            ))}
          </div>
        ))}
      </div>
      {play.over && (
        <p data-testid="tetris-over" className="text-sm text-slate-600 dark:text-slate-400">
          游戏结束！得分 {play.score}，消除 {play.lines} 行。
        </p>
      )}
      <p className="text-xs text-slate-500">←→ 移动，↑ 旋转，↓ 加速下落，空格硬降。</p>
    </div>
  )
}

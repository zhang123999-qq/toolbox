import { useCallback, useState } from 'react'
import { meta } from './meta'
import { genPuzzle, type Difficulty, type SudokuBoard } from './utils'

const CELL = 36

function toEntries(puzzle: SudokuBoard): string[] {
  return puzzle.flat().map((v) => (v === 0 ? '' : String(v)))
}

export default function Tool() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [seedText, setSeedText] = useState('')
  const [game, setGame] = useState(() => genPuzzle('medium', Date.now()))
  const [entries, setEntries] = useState<string[]>(() => toEntries(game.puzzle))
  const [status, setStatus] = useState('')

  const newGame = useCallback((d: Difficulty, seedStr: string) => {
    const seed = seedStr.trim() === '' ? Date.now() : Number(seedStr) || 0
    const g = genPuzzle(d, seed)
    setGame(g)
    setEntries(toEntries(g.puzzle))
    setStatus('')
  }, [])

  const onCell = (i: number, v: string) => {
    const digit = v.replace(/[^1-9]/g, '').slice(0, 1)
    const y = Math.floor(i / 9)
    const x = i % 9
    if (game.puzzle[y][x] !== 0) return
    setEntries((e) => e.map((old, j) => (j === i ? digit : old)))
  }

  const check = () => {
    for (const e of entries) {
      if (e === '') {
        setStatus('还有空格未填')
        return
      }
    }
    let wrong = 0
    for (let i = 0; i < 81; i++) {
      if (Number(entries[i]) !== game.solution[Math.floor(i / 9)][i % 9]) wrong++
    }
    setStatus(wrong === 0 ? '全部正确，恭喜！' : `有 ${wrong} 处错误`)
  }

  const reveal = () => {
    setEntries(toEntries(game.solution))
    setStatus('已公布答案')
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          难度
          <select
            data-testid="sudoku-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          种子
          <input
            data-testid="sudoku-seed"
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder="留空随机"
            className="w-28 rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <button
          type="button"
          data-testid="sudoku-new"
          onClick={() => newGame(difficulty, seedText)}
          className="rounded bg-green-600 px-4 py-1 text-sm text-white"
        >
          新题目
        </button>
        <button
          type="button"
          data-testid="sudoku-check"
          onClick={check}
          className="rounded bg-blue-600 px-4 py-1 text-sm text-white"
        >
          检查
        </button>
        <button
          type="button"
          data-testid="sudoku-reveal"
          onClick={reveal}
          className="rounded bg-slate-500 px-4 py-1 text-sm text-white"
        >
          公布答案
        </button>
        <span data-testid="sudoku-status" className="text-sm">
          {status}
        </span>
      </div>
      <div
        data-testid="sudoku-board"
        className="grid w-fit border-2 border-slate-400 dark:border-slate-500"
        style={{ gridTemplateColumns: `repeat(9, ${CELL}px)` }}
      >
        {entries.map((v, i) => {
          const y = Math.floor(i / 9)
          const x = i % 9
          const given = game.puzzle[y][x] !== 0
          const thickR = x === 2 || x === 5
          const thickB = y === 2 || y === 5
          return (
            <input
              key={i}
              data-testid={`sudoku-cell-${i}`}
              value={v}
              readOnly={given}
              onChange={(e) => onCell(i, e.target.value)}
              inputMode="numeric"
              aria-label={`数独第 ${y + 1} 行第 ${x + 1} 列`}
              className={`border border-slate-200 text-center text-lg dark:border-slate-700 ${
                given ? 'bg-slate-100 font-bold dark:bg-slate-700' : 'bg-white dark:bg-slate-900'
              }`}
              style={{
                width: CELL,
                height: CELL,
                borderRightWidth: thickR ? 2 : undefined,
                borderBottomWidth: thickB ? 2 : undefined,
              }}
            />
          )
        })}
      </div>
      <p className="text-xs text-slate-500">
        相同种子生成相同题目；题目挖空后经解数校验保证唯一解。
      </p>
    </div>
  )
}

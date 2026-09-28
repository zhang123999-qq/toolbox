import { useEffect, useRef, useState } from 'react'
import { meta } from './meta'
import {
  BG_COLOR,
  DIGIT_COLOR,
  genIshiharaPlate,
  gradeColorBlind,
  PLATES,
  scorePlates,
  type IshiharaDot,
} from './utils'

const SIZE = 320
const N = 44

function drawPlate(canvas: HTMLCanvasElement, dots: IshiharaDot[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const cell = SIZE / N
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#f5f0e6'
  ctx.fillRect(0, 0, SIZE, SIZE)
  for (const d of dots) {
    ctx.beginPath()
    ctx.fillStyle = d.isDigit ? DIGIT_COLOR : BG_COLOR
    ctx.arc(d.x * cell, d.y * cell, d.r * cell * 0.9, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function Tool() {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [done, setDone] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const plate = PLATES[idx]
  const dots = genIshiharaPlate(plate.digit, idx + 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && !done) drawPlate(canvas, dots)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done])

  const submit = () => {
    const next = [...answers, input]
    setAnswers(next)
    setInput('')
    if (idx + 1 >= PLATES.length) {
      setDone(true)
    } else {
      setIdx(idx + 1)
    }
  }

  const restart = () => {
    setIdx(0)
    setAnswers([])
    setInput('')
    setDone(false)
  }

  const { correct, total } = scorePlates(answers)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">{meta.title}</h2>
      {!done ? (
        <>
          <p data-testid="cbt-label" className="text-sm">
            {plate.label}（{idx + 1}/{PLATES.length}）：辨认图中的数字
          </p>
          <canvas
            ref={canvasRef}
            data-testid="cbt-canvas"
            width={SIZE}
            height={SIZE}
            className="rounded border"
          />
          <div className="flex items-center gap-2">
            <input
              data-testid="cbt-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入看到的数字"
              inputMode="numeric"
              className="rounded border px-3 py-1 text-sm dark:bg-slate-800"
            />
            <button
              type="button"
              data-testid="cbt-next"
              onClick={submit}
              className="rounded bg-blue-600 px-4 py-1 text-sm text-white"
            >
              {idx + 1 >= PLATES.length ? '查看结果' : '下一图'}
            </button>
          </div>
        </>
      ) : (
        <div data-testid="cbt-result" className="text-sm">
          <p>
            答对 {correct} / {total}：{gradeColorBlind(correct, total)}
          </p>
          <button
            type="button"
            data-testid="cbt-restart"
            onClick={restart}
            className="mt-2 rounded bg-slate-200 px-3 py-1 dark:bg-slate-700"
          >
            再测一次
          </button>
        </div>
      )}
      <p className="text-xs text-slate-500">
        本测试为色觉筛查小游戏，仅供娱乐参考，不能替代医院眼科的医学诊断。
      </p>
    </div>
  )
}

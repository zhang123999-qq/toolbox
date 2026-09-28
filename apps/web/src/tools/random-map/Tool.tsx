import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { RandomMapToolInput } from './schema'
import { countTerrain, generateMap, mapToAscii, parseMapOptions } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE_INPUT = JSON.stringify({ w: 40, h: 24, seed: 20260928, waterLevel: 0.45, mountainRate: 0.08 }, null, 2)

const TERRAIN_COLORS = ['#3b82f6', '#86efac', '#a16207']

export default function Tool() {
  const [grid, setGrid] = useState<number[][]>(() => generateMap({ w: 40, h: 24, seed: 20260928 }))
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el || grid.length === 0) return
    const w = grid[0].length
    const h = grid.length
    el.width = w
    el.height = h
    const ctx = el.getContext('2d')
    if (!ctx) return
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        ctx.fillStyle = TERRAIN_COLORS[grid[y][x]] ?? '#000'
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [grid])

  function handleGenerate(input: RandomMapToolInput): void {
    setError('')
    setOutput('')
    try {
      const opts = parseMapOptions(input.text)
      const g = generateMap(opts)
      setGrid(g)
      const c = countTerrain(g)
      setOutput(
        `地图 ${opts.w}×${opts.h}，种子 ${opts.seed}\n水域 ${c.water} 格，陆地 ${c.land} 格，山地 ${c.mountain} 格\n\n${mapToAscii(g)}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleRandomSeed(input: RandomMapToolInput): void {
    setError('')
    try {
      const raw = JSON.parse(input.text) as Record<string, unknown>
      const seed = Math.floor(Math.random() * 2 ** 31)
      const next = { ...raw, seed }
      const opts = parseMapOptions(JSON.stringify(next))
      const g = generateMap(opts)
      setGrid(g)
      const c = countTerrain(g)
      setOutput(
        `地图 ${opts.w}×${opts.h}，种子 ${opts.seed}\n水域 ${c.water} 格，陆地 ${c.land} 格，山地 ${c.mountain} 格\n\n${mapToAscii(g)}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<RandomMapToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_INPUT }}
      initialOptions={{}}
      example={{ text: EXAMPLE_INPUT }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="randommap-generate"
              onClick={() => handleGenerate(input)}
              className={BTN_CLS}
            >
              生成地图
            </button>
            <button
              type="button"
              data-testid="randommap-random"
              onClick={() => handleRandomSeed(input)}
              className={BTN_CLS}
            >
              随机种子
            </button>
          </div>
          <canvas
            ref={canvasRef}
            data-testid="randommap-canvas"
            className="rounded border border-slate-300 dark:border-slate-600"
            style={{ width: 400, imageRendering: 'pixelated' }}
          />
          {error !== '' && (
            <p data-testid="randommap-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="randommap-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：相同种子必生成相同地图（mulberry32 可复现随机 + 2 轮细胞自动机平滑）。
            ≈=水域，·=陆地，▲=山地。纯本地计算，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}

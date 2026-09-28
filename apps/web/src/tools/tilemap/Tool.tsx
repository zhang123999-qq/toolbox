import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { TilemapToolInput } from './schema'
import {
  countTiles,
  createTilemap,
  exportTilemapJson,
  fillRect,
  importTilemapJson,
  renderTilemapText,
  setTile,
} from './utils'
import type { Tilemap } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'w-20 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

const TILE_COLORS = [
  '#e2e8f0',
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

export default function Tool() {
  const [map, setMap] = useState<Tilemap>(() => createTilemap(12, 8, 32))
  const [brush, setBrush] = useState(1)
  const [cols, setCols] = useState('12')
  const [rows, setRows] = useState('8')
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = map.cols * map.tileSize
    canvas.height = map.rows * map.tileSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    for (let y = 0; y < map.rows; y += 1) {
      for (let x = 0; x < map.cols; x += 1) {
        const t = map.layers[0][y][x]
        ctx.fillStyle = TILE_COLORS[t % TILE_COLORS.length]
        ctx.fillRect(x * map.tileSize, y * map.tileSize, map.tileSize, map.tileSize)
        ctx.strokeStyle = '#cbd5e1'
        ctx.strokeRect(
          x * map.tileSize + 0.5,
          y * map.tileSize + 0.5,
          map.tileSize - 1,
          map.tileSize - 1,
        )
      }
    }
  }, [map])

  function paint(e: React.MouseEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * map.cols)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * map.rows)
    if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return
    setError('')
    try {
      setMap((m) => setTile(m, 0, x, y, brush))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleNew(): void {
    setError('')
    try {
      const c = Number.parseInt(cols, 10)
      const r = Number.parseInt(rows, 10)
      setMap(createTilemap(c, r, 32))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleFill(): void {
    setError('')
    try {
      setMap((m) => fillRect(m, 0, 0, 0, m.cols - 1, m.rows - 1, brush))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleImport(input: TilemapToolInput): void {
    setError('')
    try {
      setMap(importTilemapJson(input.text))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleExport(): void {
    setError('')
    try {
      const json = exportTilemapJson(map)
      const blob = new Blob([json], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'tilemap.json'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<TilemapToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              列{' '}
              <input
                data-testid="tilemap-cols"
                value={cols}
                onChange={(e) => setCols(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
            <label className="text-xs text-slate-500">
              行{' '}
              <input
                data-testid="tilemap-rows"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
            <button type="button" data-testid="tilemap-new" onClick={handleNew} className={BTN_CLS}>
              新建
            </button>
            <label className="text-xs text-slate-500">
              笔刷瓦片 id
              <input
                data-testid="tilemap-brush"
                type="number"
                min={0}
                max={9}
                value={brush}
                onChange={(e) => setBrush(Number(e.target.value))}
                className={INPUT_CLS}
              />
            </label>
            <button
              type="button"
              data-testid="tilemap-fill"
              onClick={handleFill}
              className={BTN_CLS}
            >
              全图填充
            </button>
            <button
              type="button"
              data-testid="tilemap-import"
              onClick={() => handleImport(input)}
              className={BTN_CLS}
            >
              导入 JSON
            </button>
            <button
              type="button"
              data-testid="tilemap-export"
              onClick={handleExport}
              className={BTN_CLS}
            >
              导出 JSON
            </button>
          </div>
          <canvas
            ref={canvasRef}
            data-testid="tilemap-canvas"
            onClick={paint}
            className="max-w-full cursor-crosshair rounded border border-slate-300 dark:border-slate-600"
          />
          {error !== '' && (
            <p data-testid="tilemap-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <pre data-testid="tilemap-output" className={PRE_CLS}>
            {`地图 ${map.cols}×${map.rows}，非空瓦片 ${countTiles(map)} 块\n${renderTilemapText(map)}`}
          </pre>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：点击画布用当前笔刷绘制瓦片（0 为空）；也可粘贴地图 JSON 后点击「导入 JSON」。
            纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => exportTilemapJson(map)}
    />
  )
}

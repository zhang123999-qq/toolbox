import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { TexturePackToolInput } from './schema'
import { exportAtlasJson, packRects, parsePackInput, renderPackResult } from './utils'
import type { PackResult } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE_INPUT = JSON.stringify(
  {
    rects: [
      { id: 'hero', w: 64, h: 64 },
      { id: 'enemy', w: 48, h: 32 },
      { id: 'coin', w: 16, h: 16 },
      { id: 'tree', w: 32, h: 96 },
    ],
    maxWidth: 128,
  },
  null,
  2,
)

function drawPreview(result: PackResult): void {
  const canvas = document.createElement('canvas')
  const scale = 2
  canvas.width = result.atlasW * scale
  canvas.height = result.atlasH * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']
  result.placements.forEach((p, i) => {
    ctx.fillStyle = colors[i % colors.length]
    ctx.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale)
    ctx.strokeStyle = '#0f172a'
    ctx.strokeRect(p.x * scale + 0.5, p.y * scale + 0.5, p.w * scale - 1, p.h * scale - 1)
  })
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = 'atlas-preview.png'
  a.click()
}

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<PackResult | null>(null)

  function handlePack(input: TexturePackToolInput): void {
    setError('')
    setOutput('')
    setResult(null)
    try {
      const { rects, maxWidth } = parsePackInput(input.text)
      const r = packRects(rects, maxWidth)
      setResult(r)
      setOutput(renderPackResult(r))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleExportJson(input: TexturePackToolInput): void {
    setError('')
    try {
      const { rects, maxWidth } = parsePackInput(input.text)
      const json = exportAtlasJson(packRects(rects, maxWidth))
      const blob = new Blob([json], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'atlas.json'
      a.click()
      URL.revokeObjectURL(a.href)
      setOutput(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<TexturePackToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_INPUT }}
      initialOptions={{}}
      example={{ text: EXAMPLE_INPUT }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="texturepack-pack"
              onClick={() => handlePack(input)}
              className={BTN_CLS}
            >
              计算布局
            </button>
            <button
              type="button"
              data-testid="texturepack-json"
              onClick={() => handleExportJson(input)}
              className={BTN_CLS}
            >
              导出图集 JSON
            </button>
            <button
              type="button"
              data-testid="texturepack-preview"
              onClick={() => result && drawPreview(result)}
              disabled={!result}
              className={BTN_CLS}
            >
              下载布局预览
            </button>
          </div>
          {error !== '' && (
            <p data-testid="texturepack-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="texturepack-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入矩形列表 JSON（rects 数组每项含 id/w/h，maxWidth 为图集最大宽度）， 采用 shelf
            装箱算法按高度降序排列打包。纯本地计算，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}

import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  countWords,
  EXAMPLE_TEXT,
  layoutCloud,
  parseFontSize,
  parseSize,
  parseTopN,
  tokenize,
  transform,
  type PlacedWord,
} from './utils'
import type { WordcloudInput, WordcloudOptions } from './schema'

/** 示例输入 */
const EXAMPLE: WordcloudInput = { text: EXAMPLE_TEXT }

/** 固定随机种子：相同文本布局固定，保证可复现 */
const SEED = 7

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // render 阶段计算布局，effect 阶段绘制到 canvas（与 radar 的 echarts 模式一致）
  const pendingWords = useRef<PlacedWord[] | null>(null)
  const pendingSize = useRef({ width: 600, height: 400 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const words = pendingWords.current
    if (!canvas || !words) return
    // jsdom 无 canvas 实现，guard 后跳过绘制
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = pendingSize.current
    ctx.clearRect(0, 0, width, height)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const w of words) {
      ctx.save()
      ctx.translate(w.x, w.y)
      ctx.rotate((w.rotate * Math.PI) / 180)
      ctx.font = `${w.size}px sans-serif`
      ctx.fillStyle = w.color
      ctx.fillText(w.text, 0, 0)
      ctx.restore()
    }
  })

  const optionDefs: readonly OptionDef<WordcloudOptions>[] = [
    { key: 'topN', label: '显示词数', kind: 'text', placeholder: '80' },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '600' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '400' },
    { key: 'minSize', label: '最小字号', kind: 'text', placeholder: '14' },
    { key: 'maxSize', label: '最大字号', kind: 'text', placeholder: '64' },
  ]

  function downloadPng() {
    const canvas = canvasRef.current
    if (!canvas || !pendingWords.current) {
      setError('词云尚未渲染，无法导出 PNG')
      return
    }
    try {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function renderOutput(input: WordcloudInput, options: WordcloudOptions) {
    try {
      const topN = parseTopN(options.topN, 80)
      const width = parseSize(options.width, '宽度', 600)
      const height = parseSize(options.height, '高度', 400)
      const minSize = parseFontSize(options.minSize, '最小字号', 14)
      const maxSize = parseFontSize(options.maxSize, '最大字号', 64)
      const freqs = countWords(tokenize(transform(input)), topN)
      const placed = layoutCloud(freqs, { width, height, seed: SEED, minSize, maxSize })
      pendingWords.current = placed
      pendingSize.current = { width, height }
      return (
        <div>
          <canvas
            ref={canvasRef}
            data-testid="wordcloud-canvas"
            width={width}
            height={height}
            className="max-w-full rounded border border-slate-200 dark:border-slate-700"
          />
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span data-testid="word-count">共 {placed.length} 个词</span>
            <button type="button" data-testid="download-png" onClick={downloadPng}>
              下载 PNG
            </button>
          </div>
          {placed.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">
              未提取到有效词汇：请输入包含中文或英文单词的文本
            </p>
          ) : null}
          {error ? (
            <p role="alert" className={ERROR_CLASS}>
              {error}
            </p>
          ) : null}
        </div>
      )
    } catch (e) {
      pendingWords.current = null
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<WordcloudInput, WordcloudOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ topN: '80', width: '600', height: '400', minSize: '14', maxSize: '64' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input) => {
        try {
          return transform(input)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}

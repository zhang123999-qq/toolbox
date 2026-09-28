import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildNoise, colormap, describeNoise, parseSeed } from './utils'
import type { NoiseGenInput, NoiseGenOptions } from './schema'

/** 示例：灰度噪声 */
const EXAMPLE: NoiseGenInput = { text: '' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

/** 绘制任务：render 阶段计算结果，effect 阶段写像素 */
interface DrawJob {
  readonly width: number
  readonly height: number
  readonly map: Float32Array
  readonly cmap: 'grayscale' | 'viridis' | 'plasma'
}

/** 生成 0–99999 的随机种子（Web Crypto） */
function randomSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % 100000
}

/** 解析生效种子：选项 seed 优先，其次 text 数字，最后随机 */
function resolveSeed(options: NoiseGenOptions, text: string, fallback: number): number {
  const fromOption = parseSeed(options.seed)
  if (fromOption !== null) return fromOption
  const trimmed = text.trim()
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed)
    if (n >= 0 && n <= 99999) return n
  }
  return fallback
}

export default function Tool() {
  // 挂载时生成一次随机种子：seed 选项留空时用它，保证 renderOutput / toText 一致
  const [randomSeedState] = useState<number>(() => randomSeed())
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const jobRef = useRef<DrawJob | null>(null)

  // 每次 render 后把 jobRef 里的噪声图绘制到 canvas；卸载时清空
  useEffect(() => {
    const job = jobRef.current
    const canvas = canvasRef.current
    if (!job || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = ctx.createImageData(job.width, job.height)
    for (let i = 0; i < job.map.length; i++) {
      const [r, g, b] = colormap(job.map[i], job.cmap)
      image.data[i * 4] = r
      image.data[i * 4 + 1] = g
      image.data[i * 4 + 2] = b
      image.data[i * 4 + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    return () => {
      jobRef.current = null
    }
  })

  function renderOutput(input: NoiseGenInput, options: NoiseGenOptions) {
    try {
      const seed = resolveSeed(options, input.text, randomSeedState)
      const result = buildNoise(options, seed)
      jobRef.current = {
        width: result.width,
        height: result.height,
        map: result.map,
        cmap: result.colormap,
      }
      return (
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={result.width}
            height={result.height}
            data-testid="noise-canvas"
          />
        </div>
      )
    } catch (e) {
      jobRef.current = null
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  const optionDefs: readonly OptionDef<NoiseGenOptions>[] = [
    { key: 'scale', label: '尺度', kind: 'text', placeholder: '0.02' },
    { key: 'octaves', label: '八度', kind: 'text', placeholder: '4' },
    { key: 'seed', label: '种子', kind: 'text', placeholder: '随机' },
    { key: 'colormap', label: '配色', kind: 'select', values: ['grayscale', 'viridis', 'plasma'] },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '400' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '300' },
  ]

  return (
    <MultiPanel<NoiseGenInput, NoiseGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        scale: '0.02',
        octaves: '4',
        seed: '',
        colormap: 'grayscale',
        width: '400',
        height: '300',
      }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input, options) => {
        try {
          const seed = resolveSeed(options, input.text, randomSeedState)
          return describeNoise(options, seed)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}

import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { SpriteSplitToolInput } from './schema'
import { computeFrames, drawFrame, parseSpriteParams, renderFrames } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

const EXAMPLE_PARAMS = JSON.stringify(
  { imgW: 256, imgH: 128, cols: 4, rows: 2, margin: 0, spacing: 0 },
  null,
  2,
)

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [img, setImg] = useState<ImageBitmap | null>(null)
  const [imgInfo, setImgInfo] = useState('')

  async function handleFile(file: File | undefined): Promise<void> {
    setError('')
    if (!file) return
    try {
      const bitmap = await createImageBitmap(file)
      setImg(bitmap)
      setImgInfo(`已加载 ${file.name}：${bitmap.width}×${bitmap.height}`)
    } catch {
      setError('图片加载失败，请选择有效的图片文件')
    }
  }

  function handleCalc(input: SpriteSplitToolInput): void {
    setError('')
    setOutput('')
    try {
      const params = parseSpriteParams(input.text)
      setOutput(renderFrames(computeFrames(params)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleExport(input: SpriteSplitToolInput): void {
    setError('')
    setOutput('')
    try {
      if (!img) {
        setError('请先上传精灵图')
        return
      }
      const params = parseSpriteParams(input.text)
      const frames = computeFrames({ ...params, imgW: img.width, imgH: img.height })
      for (const f of frames) {
        const canvas = document.createElement('canvas')
        canvas.width = f.w
        canvas.height = f.h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法创建画布')
        drawFrame(ctx, img, f, 0, 0)
        const a = document.createElement('a')
        a.href = canvas.toDataURL('image/png')
        a.download = `frame-${f.index}.png`
        a.click()
      }
      setOutput(`已导出 ${frames.length} 帧 PNG（frame-0.png … frame-${frames.length - 1}.png）`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<SpriteSplitToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_PARAMS }}
      initialOptions={{}}
      example={{ text: EXAMPLE_PARAMS }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            上传精灵图（可选；上传后切割导出使用图片真实尺寸）
            <input
              type="file"
              accept="image/*"
              data-testid="spritesplit-file"
              onChange={(e) => void handleFile(e.target.files?.[0])}
              className="text-xs"
            />
          </label>
          {imgInfo !== '' && (
            <p data-testid="spritesplit-imginfo" className="text-xs text-green-700 dark:text-green-400">
              {imgInfo}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="spritesplit-calc"
              onClick={() => handleCalc(input)}
              className={BTN_CLS}
            >
              计算帧列表
            </button>
            <button
              type="button"
              data-testid="spritesplit-export"
              onClick={() => handleExport(input)}
              className={BTN_CLS}
            >
              切割并下载
            </button>
          </div>
          {error !== '' && (
            <p data-testid="spritesplit-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="spritesplit-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入切割参数 JSON（imgW/imgH 为原图宽高，cols/rows 为行列，
            margin/spacing 可选），点击「计算帧列表」查看每帧坐标；
            上传图片后点击「切割并下载」逐帧导出 PNG。原图必须能被行列整除。
            纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}

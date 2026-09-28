import { useCallback, useState } from 'react'
import { decompressFrames, parseGIF } from 'gifuct-js'
import type { ParsedFrame } from 'gifuct-js'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import {
  assertFileSizeOk,
  assertFrameCountOk,
  assertFrameDimsOk,
  assertLogicalScreenOk,
  buildFrameFileName,
  delayToMs,
  errorMessage,
  getLogicalScreenSize,
  isGifFile,
} from './utils'

/** 解析出的单帧：PNG 预览 dataURL + 展示信息 */
interface FrameItem {
  index: number
  width: number
  height: number
  delayMs: number
  dataUrl: string
}

/**
 * 把 gifuct-js 的帧 patch 绘制到 canvas 并导出 PNG dataURL。
 * DOM 操作，放在组件层；utils.ts 只保留纯函数。
 * 注意：gifuct-js 的真实签名是 decompressFrames(parseGIF(buf), true)，
 * patch 为 Uint8ClampedArray（dims.width * dims.height * 4 字节）。
 */
function frameToDataUrl(frame: ParsedFrame): string {
  const canvas = document.createElement('canvas')
  canvas.width = frame.dims.width
  canvas.height = frame.dims.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  // gifuct-js 的 patch 类型为 Uint8ClampedArray<ArrayBufferLike>，
  // 与 ImageData 构造器要求的 ImageDataArray 不直接兼容，故先建空 ImageData 再 set 拷贝
  const imageData = new ImageData(canvas.width, canvas.height)
  imageData.data.set(frame.patch)
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [frames, setFrames] = useState<FrameItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(async (file: File) => {
    setProcessing(true)
    setError(null)
    try {
      assertFileSizeOk(file.size)
      if (!isGifFile(file)) throw new Error('不是 GIF 文件：仅支持 .gif 格式')
      const buf = await file.arrayBuffer()
      const parsed = parseGIF(buf)
      const screen = getLogicalScreenSize(parsed)
      assertLogicalScreenOk(screen.width, screen.height)
      const decompressed = decompressFrames(parsed, true)
      assertFrameCountOk(decompressed.length)
      if (decompressed.length === 0) throw new Error('GIF 中没有可分解的帧')
      const items = decompressed.map((frame, i) => {
        assertFrameDimsOk(frame.dims.width, frame.dims.height)
        return {
          index: i + 1,
          width: frame.dims.width,
          height: frame.dims.height,
          delayMs: delayToMs(frame.delay),
          dataUrl: frameToDataUrl(frame),
        }
      })
      setFrames(items)
      setFileName(file.name)
    } catch (err) {
      // 解析失败只提示，不让页面崩溃
      setError(errorMessage(err))
      setFrames([])
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      void processFile(file)
    },
    [processFile],
  )

  const downloadFrame = useCallback(
    async (item: FrameItem) => {
      const res = await fetch(item.dataUrl)
      const blob = await res.blob()
      downloadBlob(blob, buildFrameFileName(fileName, item.index, frames.length))
    },
    [fileName, frames.length],
  )

  /** 全部下载：逐个触发每帧下载（不引入 jszip 等打包依赖，浏览器会逐个弹出保存） */
  const downloadAll = useCallback(async () => {
    for (const item of frames) {
      await downloadFrame(item)
      // 短暂间隔，避免浏览器拦截连续多次下载
      await sleep(300)
    }
  }, [frames, downloadFrame])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setFrames([])
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('gifSplit.note')}</p>

      {/* 文件投放区：用 label 包裹，原生可点击/键盘聚焦 */}
      <label
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <input
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="image/gif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('gifSplit.dropHint')}
        </p>
      </label>

      {frames.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            data-testid="download-all"
            type="button"
            onClick={() => void downloadAll()}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('gifSplit.downloadAll')}
          </button>
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('gifSplit.reset')}
          </button>
        </div>
      )}
      <p data-testid="download-all-note" className="text-xs text-slate-500 dark:text-slate-400">
        {t('gifSplit.downloadAllNote')}
      </p>

      {processing && <p data-testid="processing">{t('gifSplit.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 帧列表：result 非空才渲染，下载按钮逐帧独立 */}
      {frames.length > 0 && (
        <div data-testid="frames" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map((item) => (
            <figure
              key={item.index}
              data-testid={`frame-${item.index}`}
              className="flex flex-col gap-2 rounded border border-slate-200 p-3 dark:border-slate-700"
            >
              <img src={item.dataUrl} alt="" className="max-h-48 rounded object-contain" />
              <figcaption
                data-testid={`frame-info-${item.index}`}
                className="text-sm text-slate-600 dark:text-slate-400"
              >
                {t('gifSplit.frameInfo', { i: String(item.index), n: String(frames.length) })}
              </figcaption>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('gifSplit.frameMeta', {
                  w: String(item.width),
                  h: String(item.height),
                  ms: String(item.delayMs),
                })}
              </p>
              <button
                data-testid={`frame-download-${item.index}`}
                type="button"
                onClick={() => void downloadFrame(item)}
                className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
              >
                {t('gifSplit.downloadFrame')}
              </button>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

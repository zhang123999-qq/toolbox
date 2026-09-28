import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  assertFileSizeOk,
  assertSupportedImage,
  buildOutputFileName,
  buildSpriteCSS,
  buildSpriteJSON,
  computeSpriteLayout,
  errorMessage,
  formatToMime,
  parseColumns,
  parseGap,
  parseQuality,
} from './utils'
import type { SpriteGenOptions } from './schema'

interface SpriteFile {
  id: number
  name: string
  size: number
  width: number
  height: number
  url: string
  img: HTMLImageElement
}

interface SpriteResult {
  url: string
  blob: Blob
  fileName: string
  width: number
  height: number
  itemCount: number
  json: string
  css: string
}

export default function Tool() {
  const t = useTranslate()
  const idRef = useRef(0)
  const resultUrlRef = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [files, setFiles] = useState<SpriteFile[]>([])
  const [options, setOptions] = useState<SpriteGenOptions>({
    direction: 'horizontal',
    columns: '4',
    gap: '0',
    format: 'png',
    quality: '90',
  })
  const [result, setResult] = useState<SpriteResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [jsonTip, setJsonTip] = useState<'ok' | 'fail' | null>(null)
  const [cssTip, setCssTip] = useState<'ok' | 'fail' | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  /** 按当前文件与选项重拼雪碧图；不足 2 张时只清空结果（提示由 need-more 负责） */
  const rebuild = useCallback(async (entries: SpriteFile[], opts: SpriteGenOptions) => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
    setResult(null)
    if (entries.length < 2) return
    setError(null)
    setProcessing(true)
    try {
      const layout = computeSpriteLayout(
        entries.map((e) => ({ w: e.width, h: e.height })),
        {
          direction: opts.direction,
          columns: parseColumns(opts.columns),
          gap: parseGap(opts.gap),
        },
      )
      const quality = parseQuality(opts.quality)
      const canvas = createCanvas(layout.width, layout.height)
      const ctx = canvas.getContext('2d')
      // 抛错文案用中文直写：i18n 新 key 在合并前 t() 返回 undefined，
      // new Error(undefined) 会得到空消息，导致 role=alert 渲染不出来
      if (!ctx) throw new Error('Canvas 2D 上下文不可用')
      entries.forEach((entry, i) => {
        const p = layout.placements[i]
        ctx.drawImage(entry.img, p.x, p.y, p.w, p.h)
      })
      const blob = await canvasToBlob(
        canvas,
        formatToMime(opts.format),
        opts.format === 'jpeg' ? quality / 100 : undefined,
      )
      const url = URL.createObjectURL(blob)
      resultUrlRef.current = url
      const fileName = buildOutputFileName(opts.format)
      const items = entries.map((entry, i) => {
        const p = layout.placements[i]
        return { name: entry.name, x: p.x, y: p.y, w: p.w, h: p.h }
      })
      setResult({
        url,
        blob,
        fileName,
        width: layout.width,
        height: layout.height,
        itemCount: entries.length,
        json: buildSpriteJSON(items),
        css: buildSpriteCSS(items, fileName),
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setProcessing(false)
    }
  }, [])

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (list === null || list.length === 0) return
      setError(null)
      const next: SpriteFile[] = []
      for (const file of Array.from(list)) {
        try {
          assertFileSizeOk(file.size)
          assertSupportedImage(file.name, isSupportedImageFile(file))
          const img = await loadImageFromBlob(file)
          idRef.current += 1
          next.push({
            id: idRef.current,
            name: file.name,
            size: file.size,
            width: img.width,
            height: img.height,
            url: URL.createObjectURL(file),
            img,
          })
        } catch (err) {
          setError(errorMessage(err))
        }
      }
      if (next.length === 0) return
      const entries = [...files, ...next]
      setFiles(entries)
      void rebuild(entries, options)
    },
    [files, options, rebuild],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<SpriteGenOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新拼合
      void rebuild(files, next)
    },
    [files, options, rebuild],
  )

  const removeFile = useCallback(
    (id: number) => {
      const entries: SpriteFile[] = []
      for (const f of files) {
        if (f.id === id) URL.revokeObjectURL(f.url)
        else entries.push(f)
      }
      setFiles(entries)
      void rebuild(entries, options)
    },
    [files, options, rebuild],
  )

  const clearAll = useCallback(() => {
    for (const f of files) URL.revokeObjectURL(f.url)
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
    setInputKey((k) => k + 1)
    setFiles([])
    setResult(null)
    setError(null)
    setJsonTip(null)
    setCssTip(null)
  }, [files])

  const copyText = useCallback(async (text: string, target: 'json' | 'css') => {
    try {
      await navigator.clipboard.writeText(text)
      if (target === 'json') setJsonTip('ok')
      else setCssTip('ok')
    } catch {
      if (target === 'json') setJsonTip('fail')
      else setCssTip('fail')
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('spriteGen.note')}</p>

      {/* 文件投放区：用 label 包裹，原生可点击/键盘聚焦，无需额外 a11y 分支 */}
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
          // 真实浏览器 drop 时 dataTransfer 必存在；单测用 { files: null } 覆盖空分支
          void handleFiles((e.dataTransfer as DataTransfer).files)
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
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
          }}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('spriteGen.dropHint')}</p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('spriteGen.direction')}
          <select
            data-testid="opt-direction"
            value={options.direction}
            onChange={(e) =>
              handleOptionChange({ direction: e.target.value as SpriteGenOptions['direction'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="horizontal">{t('spriteGen.directionHorizontal')}</option>
            <option value="vertical">{t('spriteGen.directionVertical')}</option>
            <option value="grid">{t('spriteGen.directionGrid')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('spriteGen.columns')}
          <input
            data-testid="opt-columns"
            type="number"
            min={1}
            max={10}
            value={options.columns}
            onChange={(e) => handleOptionChange({ columns: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('spriteGen.gap')}
          <input
            data-testid="opt-gap"
            type="number"
            min={0}
            max={100}
            value={options.gap}
            onChange={(e) => handleOptionChange({ gap: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('spriteGen.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as SpriteGenOptions['format'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('spriteGen.quality')}
          <input
            data-testid="opt-quality"
            type="number"
            min={1}
            max={100}
            value={options.quality}
            disabled={options.format !== 'jpeg'}
            onChange={(e) => handleOptionChange({ quality: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div data-testid="file-list" className="flex flex-col gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded border border-slate-200 p-2 dark:border-slate-700"
            >
              <img src={f.url} alt={f.name} className="h-12 w-12 rounded object-contain" />
              <p className="flex-1 truncate text-sm">
                {f.name} · {f.width}×{f.height} · {formatBytes(f.size)}
              </p>
              <button
                data-testid={`remove-${f.id}`}
                type="button"
                aria-label={`${t('spriteGen.remove')} ${f.name}`}
                onClick={() => removeFile(f.id)}
                className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"
              >
                {t('spriteGen.remove')}
              </button>
            </div>
          ))}
          <button
            data-testid="clear"
            type="button"
            onClick={clearAll}
            className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('spriteGen.clear')}
          </button>
        </div>
      )}
      {files.length === 1 && (
        <p data-testid="need-more" className="text-sm text-amber-600 dark:text-amber-400">
          {t('spriteGen.needMore')}
        </p>
      )}

      {processing && <p data-testid="processing">{t('spriteGen.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p className="text-sm font-medium">{t('spriteGen.previewTitle')}</p>
          <img src={result.url} alt="" className="max-h-96 rounded border object-contain" />
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {result.width}×{result.height} · {result.itemCount} {t('spriteGen.statsUnit')}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('spriteGen.download')}
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{t('spriteGen.jsonTitle')}</p>
              <button
                data-testid="copy-json"
                type="button"
                onClick={() => void copyText(result.json, 'json')}
                className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"
              >
                {t('spriteGen.copy')}
              </button>
            </div>
            <textarea
              data-testid="sprite-json"
              readOnly
              value={result.json}
              rows={8}
              className="rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            {jsonTip && (
              <p data-testid="copy-json-tip" className="text-sm text-slate-600 dark:text-slate-400">
                {jsonTip === 'ok' ? t('spriteGen.copyOk') : t('spriteGen.copyFail')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{t('spriteGen.cssTitle')}</p>
              <button
                data-testid="copy-css"
                type="button"
                onClick={() => void copyText(result.css, 'css')}
                className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"
              >
                {t('spriteGen.copy')}
              </button>
            </div>
            <textarea
              data-testid="sprite-css"
              readOnly
              value={result.css}
              rows={8}
              className="rounded border border-slate-300 p-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            {cssTip && (
              <p data-testid="copy-css-tip" className="text-sm text-slate-600 dark:text-slate-400">
                {cssTip === 'ok' ? t('spriteGen.copyOk') : t('spriteGen.copyFail')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

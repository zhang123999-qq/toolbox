import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  SCHEMES,
  assertFileSizeOk,
  bestSchemeId,
  buildOutputFileName,
  compressionRatioText,
  enabledSchemes,
  errorMessage,
  schemeQualityParam,
  schemeToMime,
} from './utils'

interface SchemeResult {
  id: string
  labelKey: MessageKey
  url: string
  fileName: string
  width: number
  height: number
  size: number
  /** 相对原图的压缩率文本（生成时一次算好，渲染层无分支） */
  ratioText: string
  blob: Blob
}

interface OriginalInfo {
  url: string
  size: number
  width: number
  height: number
}

const ALL_SCHEME_IDS = SCHEMES.map((s) => s.id)

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [original, setOriginal] = useState<OriginalInfo | null>(null)
  const [results, setResults] = useState<SchemeResult[]>([])
  const [enabledIds, setEnabledIds] = useState<string[]>(ALL_SCHEME_IDS)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /** 释放上一轮方案卡片的 objectURL（内存安全：串行生成、及时释放） */
  const revokeResults = useCallback((list: SchemeResult[]) => {
    list.forEach((r) => URL.revokeObjectURL(r.url))
  }, [])

  const processFile = useCallback(
    async (file: File, ids: string[]) => {
      setProcessing(true)
      setError(null)
      setResults((prev) => {
        revokeResults(prev)
        return []
      })
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('compressCompare.error.unsupported'))
        // 至少 1 组校验：0 组时抛错，界面展示提示且不执行
        const schemes = enabledSchemes(ids)
        const img = await loadImageFromBlob(file)
        const canvas = drawScaled(img, img.width, img.height, img.width, img.height)
        // 6 组方案串行生成，避免同时持有多个大 Blob
        const out: SchemeResult[] = []
        for (const scheme of schemes) {
          const blob = await canvasToBlob(canvas, schemeToMime(scheme), schemeQualityParam(scheme))
          const url = URL.createObjectURL(blob)
          out.push({
            id: scheme.id,
            labelKey: scheme.labelKey,
            url,
            fileName: buildOutputFileName(file.name, scheme),
            width: img.width,
            height: img.height,
            size: blob.size,
            ratioText: compressionRatioText(file.size, blob.size),
            blob,
          })
        }
        setResults(out)
        const preview = await readFileAsDataURL(file)
        setOriginal({ url: preview, size: file.size, width: img.width, height: img.height })
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setOriginal(null)
      } finally {
        setProcessing(false)
      }
    },
    [revokeResults, t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      setSourceFile(file)
      void processFile(file, enabledIds)
    },
    [enabledIds, processFile],
  )

  /** 方案勾选变更：已有原图时立即用新方案组合重新对比 */
  const handleSchemeToggle = useCallback(
    (id: string) => {
      const next = enabledIds.includes(id)
        ? enabledIds.filter((x) => x !== id)
        : [...enabledIds, id]
      setEnabledIds(next)
      if (sourceFile) void processFile(sourceFile, next)
    },
    [enabledIds, processFile, sourceFile],
  )

  const handleCompare = useCallback(() => {
    if (sourceFile) void processFile(sourceFile, enabledIds)
  }, [enabledIds, processFile, sourceFile])

  const handleReset = useCallback(() => {
    setResults((prev) => {
      revokeResults(prev)
      return []
    })
    setOriginal(null)
    setSourceFile(null)
    setFileName('')
    setError(null)
    setInputKey((k) => k + 1)
  }, [revokeResults])

  const bestId = bestSchemeId(results.map((r) => ({ id: r.id, size: r.size })))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('compressCompare.note')}</p>

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
          handleFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <input
          ref={fileRef}
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('compressCompare.dropHint')}
        </p>
      </label>

      {/* 方案开关：6 组固定方案，可勾选启用/禁用（至少保留 1 组） */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t('compressCompare.schemes')}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SCHEMES.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                data-testid={`scheme-${s.id}`}
                type="checkbox"
                checked={enabledIds.includes(s.id)}
                onChange={() => handleSchemeToggle(s.id)}
              />
              {t(s.labelKey)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button
          data-testid="compare"
          type="button"
          onClick={handleCompare}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {results.length > 0 ? t('compressCompare.recompare') : t('compressCompare.compare')}
        </button>
        {fileName !== '' && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          >
            {t('compressCompare.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('compressCompare.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：原图卡片 + 方案卡片并排对比 */}
      {(original ?? results.length > 0) && (
        <div data-testid="result" className="flex flex-col gap-4">
          {original && (
            <figure
              data-testid="original-card"
              className="w-fit rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <figcaption className="mb-1 text-sm font-medium">
                {t('compressCompare.original')}（{formatBytes(original.size)} · {original.width}×
                {original.height}）
              </figcaption>
              <img src={original.url} alt="" className="max-h-48 rounded border object-contain" />
            </figure>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((card) => (
              <figure
                key={card.id}
                data-testid={`card-${card.id}`}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <figcaption className="flex items-center gap-2 text-sm font-medium">
                  {t(card.labelKey)}
                  {bestId === card.id && (
                    <span
                      data-testid={`best-${card.id}`}
                      className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
                    >
                      {t('compressCompare.best')}
                    </span>
                  )}
                </figcaption>
                <img src={card.url} alt="" className="max-h-48 rounded border object-contain" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatBytes(card.size)} · {card.width}×{card.height} ·{' '}
                  {t('compressCompare.ratioLabel')} {card.ratioText}
                </p>
                <button
                  data-testid={`download-${card.id}`}
                  type="button"
                  // card 来自已渲染的 results，必存在，无需空守卫
                  onClick={() => downloadBlob(card.blob, card.fileName)}
                  className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
                >
                  {t('compressCompare.download')}
                </button>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

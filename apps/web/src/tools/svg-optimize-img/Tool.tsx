import { useCallback, useState } from 'react'
import { optimize } from 'svgo'
import { useTranslate } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  assertFileSizeOk,
  assertSvgText,
  buildOutputFileName,
  compressionRatioText,
  errorMessage,
  isSvgFile,
  parseOptions,
} from './utils'
import type { SvgOptimizeImgOptions } from './schema'

interface Result {
  blob: Blob
  url: string
  fileName: string
  origSize: number
  newSize: number
}

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<SvgOptimizeImgOptions>({
    multipass: 'on',
    pretty: 'off',
  })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: SvgOptimizeImgOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSvgFile(file)) throw new Error(t('svgOptimizeImg.error.unsupported'))
        const text = await file.text()
        assertSvgText(text)
        const { multipass, pretty } = parseOptions(opts)
        // svgo v4 同步优化；不传 plugins 即用默认 preset-default
        const { data } = optimize(text, { multipass, js2svg: { pretty } })
        const blob = new Blob([data], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        setResult({
          blob,
          url,
          fileName: buildOutputFileName(file.name),
          origSize: file.size,
          newSize: blob.size,
        })
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setResult(null)
      } finally {
        setProcessing(false)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      setSelectedFile(file)
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<SvgOptimizeImgOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      if (selectedFile) void processFile(selectedFile, next)
    },
    [options, processFile, selectedFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setSelectedFile(null)
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('svgOptimizeImg.note')}</p>

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
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('svgOptimizeImg.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label
          className="flex items-center gap-2 text-sm"
          title={t('svgOptimizeImg.multipassDesc')}
        >
          <input
            data-testid="opt-multipass"
            type="checkbox"
            checked={options.multipass === 'on'}
            onChange={(e) => handleOptionChange({ multipass: e.target.checked ? 'on' : 'off' })}
            className="rounded border-slate-300 dark:border-slate-700"
          />
          {t('svgOptimizeImg.multipass')}
        </label>
        <label className="flex items-center gap-2 text-sm" title={t('svgOptimizeImg.prettyDesc')}>
          <input
            data-testid="opt-pretty"
            type="checkbox"
            checked={options.pretty === 'on'}
            onChange={(e) => handleOptionChange({ pretty: e.target.checked ? 'on' : 'off' })}
            className="rounded border-slate-300 dark:border-slate-700"
          />
          {t('svgOptimizeImg.pretty')}
        </label>
        {fileName && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('svgOptimizeImg.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('svgOptimizeImg.processing')}</p>}
      {/* error 为 string | null：用 !== null 精确判断，空串错误消息也能渲染 */}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：仅 result 非空渲染下载按钮 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {t('svgOptimizeImg.preview')}
            </figcaption>
            <img
              data-testid="preview"
              src={result.url}
              alt=""
              className="max-h-64 rounded border object-contain"
            />
          </figure>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('svgOptimizeImg.originalSize')}: {formatBytes(result.origSize)}
            {' · '}
            {t('svgOptimizeImg.optimizedSize')}: {formatBytes(result.newSize)}
            {' · '}
            {t('svgOptimizeImg.ratio')}: {compressionRatioText(result.origSize, result.newSize)}
            {' · '}
            {t('svgOptimizeImg.saved')}: {formatBytes(result.origSize - result.newSize)}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('svgOptimizeImg.download')}
          </button>
        </div>
      )}
    </div>
  )
}

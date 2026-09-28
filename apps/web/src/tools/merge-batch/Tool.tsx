import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
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
  assertTotalCountOk,
  buildOutputFileName,
  chunkFiles,
  computeMergeLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseBgColor,
  parseGap,
  parseGroupSize,
  parseQuality,
  MAX_TOTAL_FILES,
} from './utils'
import type { MergeBatchOptions } from './schema'

interface SelectedFile {
  id: number
  file: File
}

interface BatchResult {
  /** 组号（从 1 开始） */
  groupIndex: number
  /** 本组包含的文件名 */
  names: string[]
  /** 最后一组只有 1 张时为 true：直接输出原图，不拼接 */
  single: boolean
  url: string
  blob: Blob
  fileName: string
  width: number
  height: number
  /** 本组失败时的错误信息；成功时为 null */
  error: string | null
}

const DIRECTIONS = ['horizontal', 'vertical'] as const
const FORMATS = ['jpeg', 'png', 'webp'] as const

/** 方向选项的 i18n key 映射（避免模板字符串 key 绕过 MessageKey 类型检查） */
const DIRECTION_LABEL_KEYS: Record<(typeof DIRECTIONS)[number], MessageKey> = {
  horizontal: 'mergeBatch.direction.horizontal',
  vertical: 'mergeBatch.direction.vertical',
}

const ALIGN_LABEL_KEYS: Record<'top' | 'left' | 'center', MessageKey> = {
  top: 'mergeBatch.align.top',
  left: 'mergeBatch.align.left',
  center: 'mergeBatch.align.center',
}

const DEFAULT_OPTIONS: MergeBatchOptions = {
  groupSize: '3',
  direction: 'horizontal',
  gap: '0',
  bgColor: '#ffffff',
  align: 'center',
  format: 'jpeg',
  quality: '80',
}

export default function Tool() {
  const t = useTranslate()
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [results, setResults] = useState<BatchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [options, setOptions] = useState<MergeBatchOptions>(DEFAULT_OPTIONS)
  const [dragOver, setDragOver] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)
  // 是否有过操作（上传/处理）：控制重置按钮显隐，避免不可达的复合条件分支
  const [dirty, setDirty] = useState(false)

  // ref 与 state 同步维护，避免回调闭包拿到过期值
  const filesRef = useRef<SelectedFile[]>([])
  const idRef = useRef(0)
  const cancelRef = useRef(false)
  // 已创建的结果 URL：重置/卸载时统一释放
  const resultUrlsRef = useRef<Set<string>>(new Set())

  const setFilesBoth = (next: SelectedFile[]) => {
    filesRef.current = next
    setFiles(next)
  }

  const revokeResultUrls = useCallback(() => {
    for (const url of resultUrlsRef.current) URL.revokeObjectURL(url)
    resultUrlsRef.current.clear()
  }, [])

  /** 卸载时释放残留 URL */
  useEffect(() => () => revokeResultUrls(), [revokeResultUrls])

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return
    const current = filesRef.current
    try {
      assertTotalCountOk(current.length + incoming.length)
    } catch (err) {
      setError(errorMessage(err))
      return
    }
    const errors: string[] = []
    const added: SelectedFile[] = []
    // 逐张独立校验：某张失败只记录该张，不污染其他已选图
    for (const file of Array.from(incoming)) {
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(`不支持的图片格式：${file.name}`)
        added.push({ id: idRef.current++, file })
      } catch (err) {
        errors.push(errorMessage(err))
      }
    }
    if (added.length > 0) setFilesBoth([...current, ...added])
    setError(errors.length > 0 ? errors.join('；') : null)
    setDirty(true)
  }, [])

  /** 批量拼接：按每组 N 张分组，组内串行解码、逐张绘制；单张组直接输出原图 */
  const processBatch = useCallback(
    async (opts: MergeBatchOptions) => {
      const items = filesRef.current
      const groupSize = parseGroupSize(opts.groupSize)
      const gap = parseGap(opts.gap)
      const quality = parseQuality(opts.quality)
      const groups = chunkFiles(items, groupSize)
      const mime = formatToMime(opts.format)
      setProcessing(true)
      setError(null)
      setResults([])
      setProgress({ done: 0, total: groups.length })
      cancelRef.current = false
      for (let gi = 0; gi < groups.length; gi++) {
        if (cancelRef.current) break
        const group = groups[gi]
        const groupIndex = gi + 1
        const names = group.map((it) => it.file.name)
        try {
          if (group.length === 1) {
            // 最后一组只有 1 张：不拼接，直接输出原图
            const only = group[0]
            const img = await loadImageFromBlob(only.file)
            const url = URL.createObjectURL(only.file)
            resultUrlsRef.current.add(url)
            setResults((prev) => [
              ...prev,
              {
                groupIndex,
                names,
                single: true,
                url,
                blob: only.file,
                fileName: only.file.name,
                width: img.width,
                height: img.height,
                error: null,
              },
            ])
          } else {
            // 组内串行解码（loadImageFromBlob 内部及时 revokeObjectURL）
            const decoded: HTMLImageElement[] = []
            for (const it of group) {
              decoded.push(await loadImageFromBlob(it.file))
            }
            const layout = computeMergeLayout(
              decoded.map((d) => ({ w: d.width, h: d.height })),
              opts.direction,
              gap,
              opts.align,
            )
            const canvas = createCanvas(layout.width, layout.height)
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas 2D 上下文不可用')
            ctx.fillStyle = parseBgColor(opts.bgColor)
            ctx.fillRect(0, 0, layout.width, layout.height)
            for (let i = 0; i < decoded.length; i++) {
              const p = layout.offsets[i]
              const d = decoded[i]
              ctx.drawImage(d, p.x, p.y, d.width, d.height)
            }
            const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format, quality))
            const url = URL.createObjectURL(blob)
            resultUrlsRef.current.add(url)
            setResults((prev) => [
              ...prev,
              {
                groupIndex,
                names,
                single: false,
                url,
                blob,
                fileName: buildOutputFileName(names[0], groupIndex, opts.format),
                width: layout.width,
                height: layout.height,
                error: null,
              },
            ])
          }
        } catch (err) {
          // 某组失败只记录该组，不影响其他组
          setResults((prev) => [
            ...prev,
            {
              groupIndex,
              names,
              single: false,
              url: '',
              blob: new Blob(),
              fileName: '',
              width: 0,
              height: 0,
              error: errorMessage(err),
            },
          ])
        }
        setProgress({ done: gi + 1, total: groups.length })
      }
      if (cancelRef.current) {
        setError(t('mergeBatch.cancelled'))
      }
      setProcessing(false)
    },
    [t],
  )

  const handleProcess = useCallback(() => {
    // 选项解析失败直接报错，不启动批量任务
    try {
      parseGroupSize(options.groupSize)
      parseGap(options.gap)
      parseBgColor(options.bgColor)
      parseQuality(options.quality)
    } catch (err) {
      setError(errorMessage(err))
      return
    }
    setDirty(true)
    void processBatch(options)
  }, [options, processBatch])

  const handleCancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  const handleOptionChange = useCallback((patch: Partial<MergeBatchOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleReset = useCallback(() => {
    revokeResultUrls()
    setFilesBoth([])
    setResults([])
    setError(null)
    setProgress({ done: 0, total: 0 })
    setDirty(false)
    setInputKey((k) => k + 1)
  }, [revokeResultUrls])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('mergeBatch.note')}</p>

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
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('mergeBatch.dropHint')}</p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('mergeBatch.groupSize')}
          <input
            data-testid="opt-groupsize"
            type="number"
            min={2}
            max={10}
            value={options.groupSize}
            onChange={(e) => handleOptionChange({ groupSize: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('mergeBatch.direction')}
          <select
            data-testid="opt-direction"
            value={options.direction}
            onChange={(e) =>
              handleOptionChange({ direction: e.target.value as MergeBatchOptions['direction'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {t(DIRECTION_LABEL_KEYS[d])}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('mergeBatch.gap')}
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
          {t('mergeBatch.bgColor')}
          <input
            data-testid="opt-bgcolor"
            type="color"
            value={options.bgColor}
            onChange={(e) => handleOptionChange({ bgColor: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('mergeBatch.align')}
          <select
            data-testid="opt-align"
            value={options.align}
            onChange={(e) =>
              handleOptionChange({ align: e.target.value as MergeBatchOptions['align'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {options.direction === 'horizontal' ? (
              <>
                <option value="start">{t(ALIGN_LABEL_KEYS.top)}</option>
                <option value="center">{t(ALIGN_LABEL_KEYS.center)}</option>
              </>
            ) : (
              <>
                <option value="start">{t(ALIGN_LABEL_KEYS.left)}</option>
                <option value="center">{t(ALIGN_LABEL_KEYS.center)}</option>
              </>
            )}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('mergeBatch.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as MergeBatchOptions['format'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('mergeBatch.quality')}
          <input
            data-testid="opt-quality"
            type="number"
            min={1}
            max={100}
            value={options.quality}
            onChange={(e) => handleOptionChange({ quality: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('mergeBatch.qualityNote')}</p>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3">
        <button
          data-testid="process"
          type="button"
          disabled={processing || files.length === 0}
          onClick={handleProcess}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('mergeBatch.process')}
        </button>
        {processing && (
          <button
            data-testid="cancel"
            type="button"
            onClick={handleCancel}
            className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          >
            {t('mergeBatch.cancel')}
          </button>
        )}
        {dirty && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          >
            {t('mergeBatch.reset')}
          </button>
        )}
      </div>

      {processing && (
        <p data-testid="progress" className="text-sm text-slate-600 dark:text-slate-400">
          {t('mergeBatch.processing')}（{progress.done}/{progress.total}）
        </p>
      )}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 已选图片 */}
      {files.length > 0 && (
        <div data-testid="file-list" className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {t('mergeBatch.selected')}（{files.length}/{MAX_TOTAL_FILES}）
          </p>
          <ul className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {files.map((it) => (
              <li key={it.id} className="truncate">
                {it.file.name}（{formatBytes(it.file.size)}）
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 批量结果：每组一张卡片 */}
      {results.length > 0 && (
        <div data-testid="result-list" className="flex flex-col gap-4">
          <p className="text-sm font-medium">
            {t('mergeBatch.results')}（{results.length}）
          </p>
          {results.map((r, index) => (
            <div
              key={r.groupIndex}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <p className="text-sm font-medium">
                {t('mergeBatch.group')} {r.groupIndex}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('mergeBatch.files')}：{r.names.join('、')}
              </p>
              {r.error ? (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {r.error}
                </p>
              ) : (
                <>
                  {r.single && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('mergeBatch.single')}
                    </p>
                  )}
                  <img
                    src={r.url}
                    alt=""
                    className="max-h-64 rounded border object-contain dark:border-slate-700"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {r.fileName}（{r.width}×{r.height}，{formatBytes(r.blob.size)}）
                  </p>
                  <button
                    data-testid={`download-${index}`}
                    type="button"
                    // 本组成功才渲染下载按钮，r.blob 非空已由 r.error 收窄，无需空守卫
                    onClick={() => downloadBlob(r.blob, r.fileName)}
                    className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    {t('mergeBatch.download')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

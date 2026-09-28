import { useCallback, useRef, useState } from 'react'
import exifr from 'exifr'
import { useTranslate } from '../../i18n'
import { isSupportedImageFile, loadImageFromBlob, readFileAsDataURL } from '../../lib/image'
import {
  NO_EXIF_MESSAGE,
  UnsupportedFileError,
  assertExifFound,
  assertFileSizeOk,
  buildFileRows,
  categorizeTags,
  errorMessage,
} from './utils'
import type { CategorizedTags, ExifRow } from './utils'

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategorizedTags | null>(null)
  const [fileRows, setFileRows] = useState<ExifRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [noExif, setNoExif] = useState(false)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /** 行标识 → 本地化标签；未知标签直接显示原始键名 */
  const tagLabel = (key: string): string => {
    switch (key) {
      case 'make':
        return t('exifView.tag.make')
      case 'model':
        return t('exifView.tag.model')
      case 'fNumber':
        return t('exifView.tag.fNumber')
      case 'exposureTime':
        return t('exifView.tag.exposureTime')
      case 'iso':
        return t('exifView.tag.iso')
      case 'focalLength':
        return t('exifView.tag.focalLength')
      case 'dateTimeOriginal':
        return t('exifView.tag.dateTimeOriginal')
      case 'flash':
        return t('exifView.tag.flash')
      case 'exposureProgram':
        return t('exifView.tag.exposureProgram')
      case 'gpsLat':
        return t('exifView.tag.gpsLat')
      case 'gpsLon':
        return t('exifView.tag.gpsLon')
      case 'gpsAlt':
        return t('exifView.tag.gpsAlt')
      case 'fileName':
        return t('exifView.tag.fileName')
      case 'fileSize':
        return t('exifView.tag.fileSize')
      case 'mimeType':
        return t('exifView.tag.mimeType')
      case 'dimensions':
        return t('exifView.tag.dimensions')
      default:
        return key
    }
  }

  const processFile = useCallback(
    async (file: File) => {
      setProcessing(true)
      setError(null)
      setNoExif(false)
      setCategories(null)
      setFileRows([])
      setPreviewUrl(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new UnsupportedFileError()
        const data = await exifr.parse(file)
        assertExifFound(data)
        const img = await loadImageFromBlob(file)
        const preview = await readFileAsDataURL(file)
        setCategories(categorizeTags(data))
        setFileRows(
          buildFileRows({
            name: file.name,
            size: file.size,
            mime: file.type,
            width: img.width,
            height: img.height,
          }),
        )
        setPreviewUrl(preview)
        setFileName(file.name)
      } catch (err) {
        if (err instanceof UnsupportedFileError) {
          setError(t('exifView.error.unsupported'))
          return
        }
        const msg = errorMessage(err)
        if (msg === NO_EXIF_MESSAGE) {
          // 无 EXIF：友好提示而非报错
          setNoExif(true)
          setFileName(file.name)
        } else {
          setError(`${t('exifView.error.parseFailed')}: ${msg}`)
        }
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
      void processFile(file)
    },
    [processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setCategories(null)
    setFileRows([])
    setPreviewUrl(null)
    setFileName('')
    setError(null)
    setNoExif(false)
  }, [])

  const sections: Array<{ id: string; title: string; rows: ExifRow[] }> =
    categories === null
      ? []
      : [
          { id: 'shooting', title: t('exifView.section.shooting'), rows: categories.shooting },
          { id: 'gps', title: t('exifView.section.gps'), rows: categories.gps },
          { id: 'file', title: t('exifView.section.file'), rows: fileRows },
          { id: 'others', title: t('exifView.section.others'), rows: categories.others },
        ]

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('exifView.note')}</p>

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
          {fileName ? fileName : t('exifView.dropHint')}
        </p>
      </label>

      {(categories !== null || error !== null || noExif) && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('exifView.reset')}
        </button>
      )}

      {processing && <p data-testid="processing">{t('exifView.processing')}</p>}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {noExif && (
        <div
          data-testid="no-exif"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
        >
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {t('exifView.noExif')}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {t('exifView.noExifHint')}
          </p>
        </div>
      )}

      {/* 结果：分类表格 */}
      {categories !== null && (
        <div data-testid="result" className="flex flex-col gap-5">
          {previewUrl && (
            <figure>
              <img
                data-testid="preview"
                src={previewUrl}
                alt=""
                className="max-h-64 rounded border object-contain"
              />
              <figcaption className="mt-1 text-sm text-slate-500">{fileName}</figcaption>
            </figure>
          )}
          {sections.map(
            (section) =>
              section.rows.length > 0 && (
                <section key={section.id} data-testid={`section-${section.id}`}>
                  <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {section.title}
                  </h3>
                  <table data-testid={`table-${section.id}`} className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="w-1/3 border-b border-slate-200 px-2 py-1 dark:border-slate-700">
                          {t('exifView.table.label')}
                        </th>
                        <th className="border-b border-slate-200 px-2 py-1 dark:border-slate-700">
                          {t('exifView.table.value')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, i) => (
                        <tr
                          key={`${row.key}-${i}`}
                          data-testid={`row-${section.id}-${i}`}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <td className="px-2 py-1 text-slate-500 dark:text-slate-400">
                            {tagLabel(row.key)}
                          </td>
                          <td className="break-all px-2 py-1">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              ),
          )}
        </div>
      )}
    </div>
  )
}

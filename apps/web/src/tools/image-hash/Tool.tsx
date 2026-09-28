import { useCallback, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  aHash,
  assertFileSizeOk,
  dHash,
  errorMessage,
  hammingDistance,
  pHash,
  rgbaToGray32,
  similarityText,
} from './utils'

interface SlotData {
  name: string
  preview: string
  ahash: string
  dhash: string
  phash: string
}

type Slot = 'a' | 'b'

interface DropzoneProps {
  zoneTestId: string
  inputTestId: string
  inputKey: number
  title: string
  hint: string
  fileName: string
  onFiles: (files: FileList | null) => void
}

/** 单个图片投放区：用 label 包裹，原生可点击/键盘聚焦，无需额外 a11y 分支 */
function SlotDropzone({
  zoneTestId,
  inputTestId,
  inputKey,
  title,
  hint,
  fileName,
  onFiles,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
      <label
        data-testid={zoneTestId}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <input
          key={inputKey}
          data-testid={inputTestId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName === '' ? hint : fileName}
        </p>
      </label>
    </div>
  )
}

export default function Tool() {
  const t = useTranslate()
  const [imageA, setImageA] = useState<SlotData | null>(null)
  const [imageB, setImageB] = useState<SlotData | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKeyA, setInputKeyA] = useState(0)
  const [inputKeyB, setInputKeyB] = useState(0)

  const processSlot = useCallback(
    async (file: File, slot: Slot) => {
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageHash.errorUnsupported'))
        const img = await loadImageFromBlob(file)
        // Tool 层：Canvas 下采样到 32×32，再转灰度数组交给 utils 纯函数
        const canvas = drawScaled(img, img.width, img.height, 32, 32)
        const ctx = canvas.getContext('2d')
        if (ctx === null) throw new Error(t('imageHash.errorCanvas'))
        const gray = rgbaToGray32(ctx.getImageData(0, 0, 32, 32).data)
        const data: SlotData = {
          name: file.name,
          preview: await readFileAsDataURL(file),
          ahash: aHash(gray),
          dhash: dHash(gray),
          phash: pHash(gray),
        }
        if (slot === 'a') setImageA(data)
        else setImageB(data)
      } catch (err) {
        setError(errorMessage(err))
        if (slot === 'a') setImageA(null)
        else setImageB(null)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null, slot: Slot) => {
      const file = files === null ? undefined : files[0]
      if (file === undefined) return
      void processSlot(file, slot)
    },
    [processSlot],
  )

  const handleRemoveB = useCallback(() => {
    setInputKeyB((k) => k + 1)
    setImageB(null)
  }, [])

  const handleReset = useCallback(() => {
    setInputKeyA((k) => k + 1)
    setInputKeyB((k) => k + 1)
    setImageA(null)
    setImageB(null)
    setError(null)
  }, [])

  const comparisons =
    imageA !== null && imageB !== null
      ? [
          {
            key: 'ahash',
            label: t('imageHash.ahash'),
            dist: hammingDistance(imageA.ahash, imageB.ahash),
          },
          {
            key: 'dhash',
            label: t('imageHash.dhash'),
            dist: hammingDistance(imageA.dhash, imageB.dhash),
          },
          {
            key: 'phash',
            label: t('imageHash.phash'),
            dist: hammingDistance(imageA.phash, imageB.phash),
          },
        ]
      : null

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageHash.note')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <SlotDropzone
          zoneTestId="dropzone-a"
          inputTestId="file-input-a"
          inputKey={inputKeyA}
          title={t('imageHash.imageA')}
          hint={t('imageHash.dropHintA')}
          fileName={imageA === null ? '' : imageA.name}
          onFiles={(files) => handleFiles(files, 'a')}
        />
        <SlotDropzone
          zoneTestId="dropzone-b"
          inputTestId="file-input-b"
          inputKey={inputKeyB}
          title={t('imageHash.imageB')}
          hint={t('imageHash.dropHintB')}
          fileName={imageB === null ? '' : imageB.name}
          onFiles={(files) => handleFiles(files, 'b')}
        />
      </div>

      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 图片 A 的三种哈希 */}
      {imageA !== null && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img src={imageA.preview} alt="" className="max-h-24 rounded border object-contain" />
            <p className="text-sm font-medium">{t('imageHash.imageA')}</p>
          </div>
          <p data-testid="hash-ahash" className="font-mono text-sm">
            {t('imageHash.ahash')}：{imageA.ahash}
          </p>
          <p data-testid="hash-dhash" className="font-mono text-sm">
            {t('imageHash.dhash')}：{imageA.dhash}
          </p>
          <p data-testid="hash-phash" className="font-mono text-sm">
            {t('imageHash.phash')}：{imageA.phash}
          </p>
        </div>
      )}

      {/* 图片 B 的三种哈希 */}
      {imageB !== null && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img src={imageB.preview} alt="" className="max-h-24 rounded border object-contain" />
            <p className="text-sm font-medium">{t('imageHash.imageB')}</p>
            <button
              data-testid="remove-b"
              type="button"
              onClick={handleRemoveB}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('imageHash.removeB')}
            </button>
          </div>
          <p data-testid="hash-b-ahash" className="font-mono text-sm">
            {t('imageHash.ahash')}：{imageB.ahash}
          </p>
          <p data-testid="hash-b-dhash" className="font-mono text-sm">
            {t('imageHash.dhash')}：{imageB.dhash}
          </p>
          <p data-testid="hash-b-phash" className="font-mono text-sm">
            {t('imageHash.phash')}：{imageB.phash}
          </p>
        </div>
      )}

      {/* 双图：Hamming 距离与相似度 */}
      {comparisons !== null && (
        <div
          data-testid="similarity"
          className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
        >
          <p className="text-sm font-medium">{t('imageHash.similarity')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('imageHash.similarityHint')}
          </p>
          {comparisons.map((c) => (
            <p key={c.key} data-testid={`similarity-${c.key}`} className="font-mono text-sm">
              {c.label}：{t('imageHash.distance')} {c.dist} / {t('imageHash.similarity')}{' '}
              {similarityText(c.dist)}
            </p>
          ))}
        </div>
      )}

      {(imageA !== null || imageB !== null) && (
        <button
          data-testid="reset"
          type="button"
          onClick={handleReset}
          className="w-fit rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('imageHash.reset')}
        </button>
      )}
    </div>
  )
}

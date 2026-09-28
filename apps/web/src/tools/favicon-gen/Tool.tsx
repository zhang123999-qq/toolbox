import { useRef, useState } from 'react'
import { zipSync } from 'fflate'
import { meta } from './meta'
import { isImageFile, pngFileName, scaleSizes, zipEntryName } from './utils'

/** 已生成的单个尺寸图标 */
interface GeneratedIcon {
  readonly size: number
  readonly blob: Blob
  readonly url: string
}

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

/** 示例 SVG：圆角方块 + 字母 F */
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="96" fill="#2563eb"/><text x="256" y="352" font-size="300" text-anchor="middle" fill="#fff" font-family="sans-serif">F</text></svg>`

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败，请换一张图片试试'))
    }
    img.src = url
  })
}

function rasterize(img: HTMLImageElement, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('当前浏览器不支持 canvas'))
      return
    }
    ctx.drawImage(img, 0, 0, size, size)
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error(`${size}x${size} PNG 编码失败`))
    }, 'image/png')
  })
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export default function Tool() {
  const [fileName, setFileName] = useState('')
  const [icons, setIcons] = useState<readonly GeneratedIcon[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasFile, setHasFile] = useState(false)
  const fileRef = useRef<File | null>(null)

  const revokeIcons = (list: readonly GeneratedIcon[]) => {
    for (const ic of list) URL.revokeObjectURL(ic.url)
  }

  const generate = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      if (!isImageFile(file.type)) throw new Error('请选择图片文件（PNG / JPG / SVG 等）')
      const img = await loadImage(file)
      const plans = scaleSizes()
      const made: GeneratedIcon[] = []
      for (const p of plans) {
        const blob = await rasterize(img, p.size)
        made.push({ size: p.size, blob, url: URL.createObjectURL(blob) })
      }
      setIcons((prev) => {
        revokeIcons(prev)
        return made
      })
      setFileName(file.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    fileRef.current = file
    setHasFile(file !== null)
    if (!file) return
    void generate(file)
  }

  const clearAll = () => {
    setIcons((prev) => {
      revokeIcons(prev)
      return []
    })
    setFileName('')
    setError('')
    setHasFile(false)
    fileRef.current = null
  }

  const downloadZip = async () => {
    try {
      const entries: Record<string, Uint8Array> = {}
      for (const ic of icons) {
        entries[zipEntryName(ic.size)] = new Uint8Array(await ic.blob.arrayBuffer())
      }
      const zip = zipSync(entries)
      const url = URL.createObjectURL(
        new Blob([zip.buffer as ArrayBuffer], { type: 'application/zip' }),
      )
      triggerDownload(url, 'favicons.zip')
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {meta.description}（{meta.titleEn}）
      </p>

      <div>
        <label
          htmlFor="favicon-file"
          className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          上传图片（PNG / JPG / SVG，建议正方形）
        </label>
        <input
          id="favicon-file"
          data-testid="input"
          type="file"
          accept="image/*"
          className="text-sm text-slate-700 dark:text-slate-300"
          onChange={onFileChange}
        />
        {fileName !== '' && (
          <p className="mt-1 font-mono text-xs text-slate-500">已选择：{fileName}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="run"
          className={BTN_CLASS}
          disabled={busy || !hasFile}
          onClick={() => {
            const f = fileRef.current
            if (f) void generate(f)
          }}
        >
          {busy ? '生成中…' : '生成'}
        </button>
        <button
          type="button"
          data-testid="example"
          className={BTN_CLASS}
          disabled={busy}
          onClick={() => {
            const f = new File([SAMPLE_SVG], '示例.svg', { type: 'image/svg+xml' })
            fileRef.current = f
            setHasFile(true)
            void generate(f)
          }}
        >
          示例
        </button>
        <button type="button" data-testid="clear" className={BTN_CLASS} onClick={clearAll}>
          清空
        </button>
      </div>

      {error !== '' && (
        <p role="alert" data-testid="output" className={ERROR_CLASS}>
          {error}
        </p>
      )}

      {error === '' && (
        <div data-testid="output" className="flex flex-col gap-3">
          {icons.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              选择图片后自动生成 16 / 32 / 48 / 180 / 192 / 512 六种尺寸。
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {icons.map((ic) => (
                  <div
                    key={ic.size}
                    className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={ic.url}
                        alt={`${ic.size}x${ic.size} 预览`}
                        width={32}
                        height={32}
                        className="rounded border border-slate-200 dark:border-slate-700"
                      />
                      <span className="font-mono text-sm">
                        {ic.size}×{ic.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid={`download-${ic.size}`}
                      className={BTN_CLASS + ' shrink-0'}
                      onClick={() => triggerDownload(ic.url, pngFileName(ic.size))}
                    >
                      PNG
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <button
                  type="button"
                  data-testid="download"
                  className={BTN_CLASS}
                  onClick={() => void downloadZip()}
                >
                  打包下载 ZIP
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

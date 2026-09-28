import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema } from './schema'
import type { AltGenForm, AltGenInput } from './schema'
import {
  DEFAULT_BASE_URL,
  IMAGE_KIND_LABELS,
  buildReport,
  requestAltText,
  validateHint,
  validateImage,
  type ImageKind,
} from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 * 图片只在浏览器内转 dataURL 后发往用户自己的接口，本站不存储。
 */

/** File → dataURL（浏览器 API，组件层） */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

export default function Tool() {
  const [form, setForm] = useState<AltGenForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
    imageKind: 'photo',
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [altText, setAltText] = useState('')
  const [usedKind, setUsedKind] = useState<ImageKind>('photo')
  const [usedModel, setUsedModel] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '生成失败，请重试'
  }

  function set<K extends keyof AltGenForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0] ?? null
    setError('')
    setAltText('')
    if (!f) {
      setFile(null)
      setPreview('')
      return
    }
    try {
      validateImage({ size: f.size, type: f.type })
    } catch (err) {
      setError(toChineseError(err))
      setFile(null)
      setPreview('')
      return
    }
    setFile(f)
    void readFileAsDataURL(f).then(setPreview, () => setError('图片读取失败'))
  }

  async function handleGenerate(input: AltGenInput): Promise<void> {
    setError('')
    setAltText('')
    let dataUrl: string
    let hint: string
    try {
      if (!file) throw new Error('请先选择一张图片')
      validateImage({ size: file.size, type: file.type })
      hint = validateHint(input.text)
      configSchema.parse({ ...form, apiKey: form.apiKey })
      dataUrl = await readFileAsDataURL(file)
      if (dataUrl === '') throw new Error('图片读取失败')
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const text = await requestAltText(dataUrl, {
        baseURL: form.baseURL,
        model: form.model,
        apiKey: form.apiKey,
        imageKind: form.imageKind,
        extraHint: hint,
      })
      setAltText(text)
      setUsedKind(form.imageKind)
      setUsedModel(form.model.trim())
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AltGenInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '重点描述人物表情' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">接口地址</span>
              <input
                type="text"
                data-testid="base-url"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.baseURL}
                onChange={set('baseURL')}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">模型</span>
              <input
                type="text"
                data-testid="model"
                placeholder="需支持多模态，如 gpt-4o-mini"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.model}
                onChange={set('model')}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">API Key</span>
              <input
                type="password"
                data-testid="api-key"
                autoComplete="off"
                placeholder="只保存在内存，刷新页面即清除"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.apiKey}
                onChange={set('apiKey')}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">图片类型</span>
              <select
                data-testid="image-kind"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.imageKind}
                onChange={set('imageKind')}
              >
                {(Object.keys(IMAGE_KIND_LABELS) as ImageKind[]).map((k) => (
                  <option key={k} value={k}>
                    {IMAGE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">图片</span>
              <input
                type="file"
                data-testid="image-file"
                accept="image/*"
                className="w-full text-sm text-slate-600 dark:text-slate-400"
                onChange={onFileChange}
              />
            </label>
          </div>
          {preview ? (
            <img
              data-testid="preview"
              src={preview}
              alt="待生成 alt 文本的图片预览"
              className="max-h-48 max-w-full self-start rounded border border-slate-200 dark:border-slate-700"
            />
          ) : null}
          <div>
            <button
              type="button"
              data-testid="generate"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleGenerate(input)}
            >
              {pending ? '生成中…' : '生成 Alt 文本'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧可填补充说明（如“重点描述人物表情”），留空则按图片类型默认生成。选择图片后点「生成
            Alt 文本」。
          </p>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {altText ? (
            <div className="flex flex-col gap-2">
              <pre
                data-testid="result"
                className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100"
              >
                {altText}
              </pre>
              <code
                data-testid="alt-attr"
                className="rounded bg-slate-100 p-2 font-mono text-xs break-all text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {`alt="${altText.replace(/"/g, '&quot;')}"`}
              </code>
            </div>
          ) : null}
        </div>
      )}
      toText={() => (altText === '' ? '' : buildReport(usedKind, usedModel, altText))}
      downloadExt="md"
    />
  )
}

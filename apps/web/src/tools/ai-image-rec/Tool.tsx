import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema } from './schema'
import type { AiImageRecInput, ImageRecForm } from './schema'
import {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  validateImage,
  validateQuestion,
} from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 * 图片只在浏览器内转 dataURL 后发往用户自己的接口，本站不存储。
 */

/** 单次识别请求：带超时；Key 只进 Authorization 头 */
async function callRecognize(
  url: string,
  apiKey: string,
  model: string,
  question: string,
  dataUrl: string,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, question, dataUrl)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    return extractAssistantText((await res.json()) as unknown)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒）`, { cause: err })
    }
    if (err instanceof TypeError)
      throw new Error('网络请求失败：请检查网络连接与 baseURL', { cause: err })
    throw err
  } finally {
    clearTimeout(timer)
  }
}

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
  const [form, setForm] = useState<ImageRecForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [description, setDescription] = useState('')
  const [usedQuestion, setUsedQuestion] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '识别失败，请重试'
  }

  function set<K extends keyof ImageRecForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0] ?? null
    setError('')
    setDescription('')
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

  async function handleRecognize(input: AiImageRecInput): Promise<void> {
    setError('')
    setDescription('')
    let question: string
    let dataUrl: string
    try {
      if (!file) throw new Error('请先选择一张图片')
      validateImage({ size: file.size, type: file.type })
      question = validateQuestion(input.text)
      configSchema.parse(form)
      dataUrl = await readFileAsDataURL(file)
      if (dataUrl === '') throw new Error('图片读取失败')
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const text = await callRecognize(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        question,
        dataUrl,
      )
      setDescription(text)
      setUsedQuestion(question)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<AiImageRecInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '这张图片里有几个人？他们在做什么？' }}
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
              alt="待识别图片预览"
              className="max-h-48 max-w-full self-start rounded border border-slate-200 dark:border-slate-700"
            />
          ) : null}
          <div>
            <button
              type="button"
              data-testid="recognize"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleRecognize(input)}
            >
              {pending ? '识别中…' : '开始识别'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧输入想问的问题（留空则默认请模型描述图片内容），选择图片后点「开始识别」。
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
          {description ? (
            <pre
              data-testid="result"
              className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100"
            >
              {description}
            </pre>
          ) : null}
        </div>
      )}
      toText={() =>
        description === '' ? '' : buildReport(usedQuestion, form.model.trim(), description)
      }
      downloadExt="md"
    />
  )
}

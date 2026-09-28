import { useState } from 'react'
import { z } from 'zod'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { configSchema, optionsSchema } from './schema'
import type { EmailGenForm, EmailGenInput, EmailGenOptions } from './schema'
import {
  DEFAULT_BASE_URL,
  DEFAULT_EMAIL_LANGUAGE,
  DEFAULT_TONE,
  EMAIL_LANGUAGES,
  REQUEST_TIMEOUT_MS,
  TONES,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseEmailOutput,
  parseHttpError,
  validateEmailLanguage,
  validatePurpose,
  validateRecipient,
  validateTone,
} from './utils'
import type { EmailLanguage, EmailOutput, Tone } from './utils'

/**
 * BYOK 说明：API Key 只放在内存 state 中，关闭/刷新页面即消失；
 * 不写入 localStorage，不出现在日志与错误信息里。
 */

/** 单次生成请求：带超时；Key 只进 Authorization 头 */
async function callEmailGen(
  url: string,
  apiKey: string,
  model: string,
  recipient: string,
  purpose: string,
  tone: Tone,
  language: EmailLanguage,
): Promise<EmailOutput> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(buildRequestBody(model, recipient, purpose, tone, language)),
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(parseHttpError(res.status, text))
    }
    return parseEmailOutput(extractAssistantText((await res.json()) as unknown))
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

export default function Tool() {
  const [form, setForm] = useState<EmailGenForm>({
    baseURL: DEFAULT_BASE_URL,
    model: 'gpt-4o-mini',
    apiKey: '',
  })
  const [email, setEmail] = useState<EmailOutput | null>(null)
  const [checkedRecipient, setCheckedRecipient] = useState('')
  const [checkedPurpose, setCheckedPurpose] = useState('')
  const [checkedTone, setCheckedTone] = useState<Tone>(DEFAULT_TONE)
  const [checkedLang, setCheckedLang] = useState<EmailLanguage>(DEFAULT_EMAIL_LANGUAGE)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toChineseError(err: unknown): string {
    if (err instanceof z.ZodError) return err.issues[0]?.message ?? '参数错误'
    return err instanceof Error ? err.message : '生成失败，请重试'
  }

  function set<K extends keyof EmailGenForm>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  }

  async function handleGenerate(input: EmailGenInput, options: EmailGenOptions): Promise<void> {
    setError('')
    setEmail(null)
    let recipient: string
    let purpose: string
    let tone: Tone
    let language: EmailLanguage
    try {
      recipient = validateRecipient(input.recipient)
      purpose = validatePurpose(input.text)
      const parsed = optionsSchema.parse(options)
      tone = validateTone(parsed.tone)
      language = validateEmailLanguage(parsed.language)
      configSchema.parse(form)
    } catch (err) {
      setError(toChineseError(err))
      return
    }
    setPending(true)
    try {
      const out = await callEmailGen(
        chatCompletionsUrl(form.baseURL.trim()),
        form.apiKey.trim(),
        form.model.trim(),
        recipient,
        purpose,
        tone,
        language,
      )
      setEmail(out)
      setCheckedRecipient(recipient)
      setCheckedPurpose(purpose)
      setCheckedTone(tone)
      setCheckedLang(language)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<EmailGenInput, EmailGenOptions>
      meta={meta}
      initialInput={{ text: '', recipient: '' }}
      initialOptions={{ tone: DEFAULT_TONE, language: DEFAULT_EMAIL_LANGUAGE }}
      optionDefs={[
        { key: 'tone', label: '语气', kind: 'select', values: TONES },
        { key: 'language', label: '语言', kind: 'select', values: EMAIL_LANGUAGES },
      ]}
      extraInputs={[{ key: 'recipient', label: '收件人', rows: 1 }]}
      example={{
        text: '申请本周五调休一天，已和同事交接好工作',
        recipient: '张经理',
      }}
      renderOutput={(input, options) => (
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
          </div>
          <div>
            <button
              type="button"
              data-testid="generate"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleGenerate(input, options)}
            >
              {pending ? '生成中…' : '生成邮件'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            左侧写清收件人与写信目的，右上角选语气与语言，点「生成邮件」。
            主题与正文用右上角复制/下载按钮一次取走。
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
          {email ? (
            <div data-testid="result" className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                <span className="text-slate-500 dark:text-slate-400">主题：</span>
                {email.subject}
              </p>
              <pre className="whitespace-pre-wrap rounded bg-slate-100 p-2 text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                {email.body}
              </pre>
            </div>
          ) : null}
        </div>
      )}
      toText={() =>
        email === null
          ? ''
          : buildReport(
              checkedRecipient,
              checkedPurpose,
              checkedTone,
              checkedLang,
              form.model.trim(),
              email,
            )
      }
      downloadExt="md"
    />
  )
}

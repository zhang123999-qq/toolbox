import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import {
  SIGN_ENCODINGS,
  SIGN_METHODS,
  type ApiSignInput,
  type SignEncodingOpt,
  type SignMethod,
} from './schema'
import { parseSignParams, signRequest, verifySignature, type SignResult } from './utils'

const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900'

const DEFAULT_PARAMS = '{\n  "app_id": "demo",\n  "page": "1"\n}'

export default function Tool() {
  const [method, setMethod] = useState<SignMethod>('GET')
  const [path, setPath] = useState('/api/users')
  const [secret, setSecret] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [nonce, setNonce] = useState('')
  const [template, setTemplate] = useState('')
  const [encoding, setEncoding] = useState<SignEncodingOpt>('hex')
  const [result, setResult] = useState<SignResult | null>(null)
  const [verifyInput, setVerifyInput] = useState('')
  const [verifyOk, setVerifyOk] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSign(input: ApiSignInput): Promise<void> {
    setPending(true)
    setError('')
    setResult(null)
    setVerifyOk(null)
    try {
      const params = parseSignParams(input.text)
      const r = await signRequest({
        method,
        path,
        params,
        secret,
        timestamp: timestamp.trim() === '' ? undefined : timestamp.trim(),
        nonce: nonce.trim() === '' ? undefined : nonce.trim(),
        encoding,
        template: template.trim() === '' ? undefined : template,
      })
      setResult(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : '签名失败')
    } finally {
      setPending(false)
    }
  }

  async function handleVerify(input: ApiSignInput): Promise<void> {
    setError('')
    setVerifyOk(null)
    try {
      const params = parseSignParams(input.text)
      const ok = await verifySignature({
        method,
        path,
        params,
        secret,
        timestamp: timestamp.trim() === '' ? undefined : timestamp.trim(),
        nonce: nonce.trim() === '' ? undefined : nonce.trim(),
        encoding,
        template: template.trim() === '' ? undefined : template,
        signature: verifyInput.trim(),
      })
      setVerifyOk(ok)
    } catch (err) {
      setError(err instanceof Error ? err.message : '验签失败')
    }
  }

  return (
    <MultiPanel<ApiSignInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: DEFAULT_PARAMS }}
      initialOptions={{}}
      example={{ text: DEFAULT_PARAMS }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">方法</span>
              <select
                data-testid="apisign-method"
                className={INPUT_CLS}
                value={method}
                onChange={(e) => setMethod(e.target.value as SignMethod)}
              >
                {SIGN_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">编码</span>
              <select
                data-testid="apisign-encoding"
                className={INPUT_CLS}
                value={encoding}
                onChange={(e) => setEncoding(e.target.value as SignEncodingOpt)}
              >
                {SIGN_ENCODINGS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">路径</span>
              <input
                data-testid="apisign-path"
                className={INPUT_CLS}
                value={path}
                onChange={(e) => setPath(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">密钥</span>
              <input
                data-testid="apisign-secret"
                type="password"
                className={INPUT_CLS}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="只存内存，不持久化"
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">时间戳</span>
              <input
                data-testid="apisign-timestamp"
                className={INPUT_CLS}
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="留空自动生成"
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">随机串</span>
              <input
                data-testid="apisign-nonce"
                className={INPUT_CLS}
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                placeholder="留空自动生成"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              自定义模板（可选，占位：{'{method} {path} {query} {timestamp} {nonce}'}）
            </span>
            <input
              data-testid="apisign-template"
              className={INPUT_CLS}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="留空使用默认模板"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="apisign-sign"
              disabled={pending}
              onClick={() => void handleSign(input)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500"
            >
              {pending ? '签名中…' : '生成签名'}
            </button>
          </div>
          {error !== '' && (
            <p data-testid="apisign-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {result !== null && (
            <div data-testid="apisign-result" className="flex flex-col gap-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">待签字符串</p>
                <pre className="rounded bg-slate-50 p-2 font-mono text-xs whitespace-pre-wrap dark:bg-slate-900">
                  {result.stringToSign}
                </pre>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">签名（{encoding}）</p>
                <p className="rounded bg-slate-50 p-2 font-mono text-xs break-all dark:bg-slate-900">
                  {result.signature}
                </p>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600 dark:text-slate-400">验签：粘贴待验证签名</span>
                <div className="flex gap-2">
                  <input
                    data-testid="apisign-verify-input"
                    className={INPUT_CLS}
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                  />
                  <button
                    type="button"
                    data-testid="apisign-verify"
                    onClick={() => void handleVerify(input)}
                    className="shrink-0 rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600"
                  >
                    验签
                  </button>
                </div>
              </label>
              {verifyOk !== null && (
                <p
                  data-testid="apisign-verify-result"
                  className={`text-sm font-medium ${verifyOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {verifyOk ? '验签通过' : '验签失败'}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：使用 WebCrypto 在本地计算 HMAC-SHA256；密钥只保存在页面内存中， 不写入
            localStorage、不上报网络。
          </p>
        </div>
      )}
      toText={() =>
        result === null
          ? ''
          : '待签字符串：\n' + result.stringToSign + '\n签名：\n' + result.signature
      }
    />
  )
}

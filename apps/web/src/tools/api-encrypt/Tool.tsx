import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { ENCRYPT_MODES, type ApiEncryptInput, type EncryptMode } from './schema'
import { decryptText, encryptText } from './utils'

const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900'

const MODE_TEXT: Record<EncryptMode, string> = { encrypt: '加密', decrypt: '解密' }

export default function Tool() {
  const [mode, setMode] = useState<EncryptMode>('encrypt')
  const [password, setPassword] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleRun(input: ApiEncryptInput): Promise<void> {
    setPending(true)
    setError('')
    setOutput('')
    try {
      if (mode === 'encrypt') {
        setOutput(await encryptText({ plaintext: input.text, password }))
      } else {
        setOutput(await decryptText(input.text, password))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<ApiEncryptInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '{"order_id": 12345, "amount": 99.9}' }}
      initialOptions={{}}
      example={{ text: '{"hello": "world"}' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">模式</span>
              <select
                data-testid="apiencrypt-mode"
                className={INPUT_CLS}
                value={mode}
                onChange={(e) => setMode(e.target.value as EncryptMode)}
              >
                {ENCRYPT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {MODE_TEXT[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">密码</span>
              <input
                data-testid="apiencrypt-password"
                type="password"
                className={INPUT_CLS}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="只存内存，不持久化"
              />
            </label>
            <button
              type="button"
              data-testid="apiencrypt-run"
              disabled={pending}
              onClick={() => void handleRun(input)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500"
            >
              {pending ? '执行中…' : MODE_TEXT[mode]}
            </button>
          </div>
          {error !== '' && (
            <p data-testid="apiencrypt-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre
              data-testid="apiencrypt-output"
              className="max-h-64 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900"
            >
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：PBKDF2（SHA-256，10 万次迭代，随机 16 字节 salt）派生 AES-GCM 256
            密钥；载荷为 JSON（含 salt / iv / 密文，均为 Base64）。
            密码只保存在页面内存中，不写入 localStorage、不上报网络。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}

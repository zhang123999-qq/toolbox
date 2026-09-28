import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { CspConfigExtToolInput } from './schema'
import { EXAMPLE_INPUT, parseCspConfigInput, renderCspConfig, validateCsp } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleGenerate(input: CspConfigExtToolInput): void {
    setError('')
    setOutput('')
    try {
      setOutput(renderCspConfig(parseCspConfigInput(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleValidate(input: CspConfigExtToolInput): void {
    setError('')
    setOutput('')
    try {
      const policy = renderCspConfig(parseCspConfigInput(input.text))
      const issues = validateCsp(policy)
      setOutput(
        issues.length === 0
          ? `策略合法，无问题：\n${policy}`
          : `发现 ${issues.length} 个问题：\n` +
              issues
                .map((i, idx) => `${idx + 1}. [${i.severity}] ${i.directive} ${i.source}：${i.message}`)
                .join('\n') +
              `\n\n策略：\n${policy}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<CspConfigExtToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ scriptSrc: ["'wasm-unsafe-eval'"], styleSrc: ["'self'"] }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="cspconfig-generate"
              onClick={() => handleGenerate(input)}
              className={BTN_CLS}
            >
              生成策略
            </button>
            <button
              type="button"
              data-testid="cspconfig-validate"
              onClick={() => handleValidate(input)}
              className={BTN_CLS}
            >
              生成并校验
            </button>
          </div>
          {error !== '' && (
            <p data-testid="cspconfig-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {output !== '' && (
            <pre data-testid="cspconfig-output" className={PRE_CLS}>
              {output}
            </pre>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：输入 JSON 配置（preset 取 minimal / development，或自定义 scriptSrc /
            objectSrc / styleSrc），生成 manifest.json 中
            content_security_policy.extension_pages 的策略字符串。MV3
            仅允许 script-src 为 'self' / 'wasm-unsafe-eval'，禁止远程代码与
            'unsafe-eval'。纯本地生成，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}

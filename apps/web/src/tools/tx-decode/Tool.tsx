import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { decodeTransaction, type TxField } from './utils'
import type { TxDecodeInput, TxDecodeOptions } from './schema'

/** 示例：Legacy EIP-155 转账（1 ETH，data 为 "hello"） */
const EXAMPLE: TxDecodeInput = {
  text: '0xf871078504a817c800825208947e5f4552091a69125d5dfcb7b8c2659029395bdf880de0b6b3a76400008568656c6c6f25a0d3afccdaf742afeb35d5e5f4fde0051e28dda0afb243f25eb2c95a1869c78d5fa027c70791a540ccd72d2a5e601e27eb0b13ca3c0564089a843c39eef6f38258dd',
}

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function computeFields(input: TxDecodeInput): TxField[] {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return decodeTransaction(text.replace(/\s+/g, '')).fields
}

function fieldsToText(fields: TxField[]): string {
  return fields
    .map((f) => (f.sub !== undefined ? `${f.label}：${f.value} (${f.sub})` : `${f.label}：${f.value}`))
    .join('\n')
}

export default function Tool() {
  function renderOutput(input: TxDecodeInput, _options: TxDecodeOptions) {
    try {
      const fields = computeFields(input)
      return (
        <div data-testid="results" className="space-y-2">
          {fields.map((f) => (
            <div key={f.key} data-testid={`field-${f.key}`} className="rounded border p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">{f.label}</p>
              <p className="font-mono text-xs break-all" data-testid={`value-${f.key}`}>
                {f.value}
              </p>
              {f.sub !== undefined ? (
                <p className="font-mono text-xs break-all text-gray-500 dark:text-gray-400">
                  {f.sub}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )
    } catch (e) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<TxDecodeInput, TxDecodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={(input) => fieldsToText(computeFields(input))}
      downloadExt="txt"
    />
  )
}

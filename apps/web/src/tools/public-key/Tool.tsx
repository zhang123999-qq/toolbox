import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { privateKeyInfo } from './utils'
import type { PublicKeyInput, PublicKeyOptions } from './schema'

/** 示例：私钥 1（最小的合法私钥） */
const EXAMPLE: PublicKeyInput = {
  text: '0x0000000000000000000000000000000000000000000000000000000000000001',
}

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function compute(input: PublicKeyInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  const info = privateKeyInfo(text)
  return [
    `压缩公钥：${info.compressed}`,
    `非压缩公钥：${info.uncompressed}`,
    `对应地址：${info.address}`,
  ].join('\n')
}

export default function Tool() {
  function renderOutput(input: PublicKeyInput, _options: PublicKeyOptions) {
    try {
      const lines = compute(input).split('\n')
      return (
        <div data-testid="results" className="space-y-2">
          {lines.map((line, i) => (
            <p key={i} data-testid={`result-${i}`} className="font-mono text-xs break-all">
              {line}
            </p>
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
    <MultiPanel<PublicKeyInput, PublicKeyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={compute}
      downloadExt="txt"
    />
  )
}

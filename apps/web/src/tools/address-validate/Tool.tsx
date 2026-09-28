import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { renderReport, validateAddress, validateBatch } from './utils'
import type { AddressValidateInput, AddressValidateOptions } from './schema'

/** 示例：一个 checksum 地址、一个全小写地址、一个错误地址 */
const EXAMPLE: AddressValidateInput = {
  text: [
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed',
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAec',
  ].join('\n'),
}

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const OK_CLASS = 'text-sm text-green-700 dark:text-green-300'

export default function Tool() {
  function renderOutput(input: AddressValidateInput, _options: AddressValidateOptions) {
    try {
      const text = input.text.trim() === '' ? EXAMPLE.text : input.text
      const results = validateBatch(text)
      return (
        <div data-testid="results" className="space-y-3">
          {results.map(({ input: addr, result }, i) => (
            <div key={i} data-testid={`result-${i}`} className="rounded border p-2">
              <p className="font-mono text-xs break-all">{addr}</p>
              <p className={result.valid ? OK_CLASS : ERROR_CLASS} data-testid={`valid-${i}`}>
                {result.valid ? '✓ 有效地址' : '✗ 无效地址'}
              </p>
              {result.valid ? (
                <div className="mt-1 font-mono text-xs break-all">
                  <p data-testid={`checksummed-${i}`}>Checksum：{result.checksummed}</p>
                </div>
              ) : null}
              {result.issues.map((issue, j) => (
                <p key={j} className="text-xs text-amber-700 dark:text-amber-300">
                  提示：{issue}
                </p>
              ))}
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
    <MultiPanel<AddressValidateInput, AddressValidateOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={(input) => {
        try {
          const text = input.text.trim() === '' ? EXAMPLE.text : input.text
          const lines = text.split('\n')
          if (lines.filter((l) => l.trim() !== '').length === 1) {
            return renderReport(lines[0].trim(), validateAddress(lines[0].trim()))
          }
          return validateBatch(text)
            .map(({ input: addr, result }) => renderReport(addr, result))
            .join('\n\n')
        } catch (e) {
          return e instanceof Error ? e.message : String(e)
        }
      }}
      downloadExt="txt"
    />
  )
}

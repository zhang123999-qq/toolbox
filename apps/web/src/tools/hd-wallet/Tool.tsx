import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { deriveAddressRange, type DerivedEntry } from './utils'
import type { HdWalletInput, HdWalletOptions } from './schema'

/** 示例：BIP32 官方测试向量 1 的种子（公开测试向量，无资产） */
const EXAMPLE: HdWalletInput = { text: '000102030405060708090a0b0c0d0e0f' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const LABEL_CLASS = 'text-xs text-gray-500 dark:text-gray-400'

function parseCount(value: string): number {
  const n = parseInt(value, 10)
  if (!Number.isInteger(n)) throw new Error('序号须为整数')
  return n
}

function computeEntries(input: HdWalletInput, options: HdWalletOptions): DerivedEntry[] {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  const basePath = options.path.trim() === '' ? "m/44'/60'/0'/0" : options.path
  return deriveAddressRange(text, basePath, parseCount(options.from), parseCount(options.to))
}

function renderOutput(input: HdWalletInput, options: HdWalletOptions) {
  try {
    const entries = computeEntries(input, options)
    return (
      <div data-testid="results" className="space-y-2">
        <p className={LABEL_CLASS}>
          共 {entries.length} 个地址（私钥仅显示在页面内存中，切勿截图外发）
        </p>
        {entries.map((e) => (
          <div key={e.index} data-testid={`entry-${e.index}`} className="rounded border p-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              #{e.index} · {e.path}
            </p>
            <p data-testid={`address-${e.index}`} className="font-mono text-xs break-all">
              {e.address}
            </p>
            <p
              data-testid={`priv-${e.index}`}
              className="font-mono text-xs break-all text-gray-500 dark:text-gray-400"
            >
              {e.privHex}
            </p>
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

function toText(input: HdWalletInput, options: HdWalletOptions): string {
  try {
    return computeEntries(input, options)
      .map((e) => `#${e.index} ${e.path}\n地址：${e.address}\n私钥：${e.privHex}`)
      .join('\n\n')
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<HdWalletOptions>[] = [
    { key: 'path', label: '基础路径', kind: 'text', placeholder: "m/44'/60'/0'/0" },
    { key: 'from', label: '起始序号', kind: 'text', placeholder: '0' },
    { key: 'to', label: '结束序号', kind: 'text', placeholder: '4' },
  ]

  return (
    <MultiPanel<HdWalletInput, HdWalletOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ path: "m/44'/60'/0'/0", from: '0', to: '4' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={toText}
      downloadExt="txt"
    />
  )
}

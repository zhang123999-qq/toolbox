import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { bytesToHex, generateMnemonic, mnemonicToEntropy, mnemonicToSeed } from './utils'
import type { MnemonicInput, MnemonicOptions } from './schema'

const EXAMPLE: MnemonicInput = {
  text: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
}

const MODE_OPTIONS = ['生成', '校验', '转种子'] as const
const WORD_COUNT_OPTIONS = ['12', '15', '18', '21', '24'] as const

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const LABEL_CLASS = 'text-xs text-gray-500 dark:text-gray-400'

/** 生成面板：内部 state 持有助记词；词数变化时靠 key 重挂载重新生成 */
function GeneratePanel({ wordCount }: { wordCount: number }) {
  const [mnemonic, setMnemonic] = useState(() => generateMnemonic(wordCount))
  return (
    <div data-testid="results" className="space-y-2">
      <p className={LABEL_CLASS}>生成的助记词（{wordCount} 词，仅保存在页面内存中）</p>
      <p data-testid="result-0" className="rounded border p-2 font-mono text-sm break-all">
        {mnemonic}
      </p>
      <button
        type="button"
        data-testid="regen"
        className="rounded border px-2 py-1 text-sm"
        onClick={() => setMnemonic(generateMnemonic(wordCount))}
      >
        重新生成
      </button>
    </div>
  )
}

function renderOutput(input: MnemonicInput, options: MnemonicOptions) {
  const mode = options.mode
  if (mode === '生成') {
    const wc = parseInt(options.wordCount, 10)
    const safe = Number.isInteger(wc) ? wc : 12
    return <GeneratePanel key={safe} wordCount={safe} />
  }
  try {
    if (input.text.trim() === '') {
      return (
        <p className="text-sm text-gray-500">
          输入助记词后实时{mode === '校验' ? '校验' : '派生种子'}
        </p>
      )
    }
    if (mode === '校验') {
      const entropy = mnemonicToEntropy(input.text)
      const words = input.text.trim().split(/\s+/)
      return (
        <div data-testid="results" className="space-y-2">
          <p data-testid="result-0" className="text-sm text-green-700 dark:text-green-300">
            校验通过：{words.length} 词，checksum 正确
          </p>
          <p className={LABEL_CLASS}>熵（hex）</p>
          <p data-testid="result-1" className="rounded border p-2 font-mono text-xs break-all">
            {bytesToHex(entropy)}
          </p>
        </div>
      )
    }
    const seed = mnemonicToSeed(input.text, options.passphrase)
    return (
      <div data-testid="results" className="space-y-2">
        <p className={LABEL_CLASS}>种子（64 字节 hex，PBKDF2-HMAC-SHA512 2048 轮）</p>
        <p data-testid="result-0" className="rounded border p-2 font-mono text-xs break-all">
          {bytesToHex(seed)}
        </p>
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

function toText(input: MnemonicInput, options: MnemonicOptions): string {
  try {
    if (options.mode === '校验') {
      const entropy = mnemonicToEntropy(input.text)
      return `校验通过\n熵：${bytesToHex(entropy)}`
    }
    if (options.mode === '转种子') {
      return bytesToHex(mnemonicToSeed(input.text, options.passphrase))
    }
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<MnemonicOptions>[] = [
    { key: 'mode', label: '模式', kind: 'select', values: MODE_OPTIONS },
    { key: 'wordCount', label: '词数', kind: 'select', values: WORD_COUNT_OPTIONS },
    { key: 'passphrase', label: '口令', kind: 'text', placeholder: '种子口令（可空）' },
  ]

  return (
    <MultiPanel<MnemonicInput, MnemonicOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: '生成', wordCount: '12', passphrase: '' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={toText}
      downloadExt="txt"
    />
  )
}

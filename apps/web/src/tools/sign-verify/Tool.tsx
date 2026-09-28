import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef, OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  bytesToHex,
  personalMessageHash,
  privateToPublic,
  publicToAddress,
  sign,
  signatureToHex,
  verifySignature,
} from './utils'
import type { SignVerifyInput, SignVerifyOptions } from './schema'

/** 示例：私钥 1（公开测试向量，无资产）签名 "hello" */
const EXAMPLE: SignVerifyInput = {
  text: '0000000000000000000000000000000000000000000000000000000000000001',
  message: 'hello',
  address: '',
}

const MODE_OPTIONS = ['签名', '验签'] as const

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const LABEL_CLASS = 'text-xs text-gray-500 dark:text-gray-400'
const VALUE_CLASS = 'rounded border p-2 font-mono text-xs break-all'

function renderOutput(input: SignVerifyInput, options: SignVerifyOptions) {
  try {
    if (options.mode === '签名') {
      if (input.text.trim() === '') {
        return <p className="text-sm text-gray-500">输入私钥并填写消息后实时签名</p>
      }
      const hash = personalMessageHash(input.message)
      const sig = sign(hash, input.text)
      const sigHex = signatureToHex(sig)
      const address = publicToAddress(privateToPublic(input.text).uncompressed)
      const rows: Array<[string, string, string]> = [
        ['消息哈希', bytesToHex(hash), 'result-hash'],
        ['r', sig.r.toString(16).padStart(64, '0'), 'result-r'],
        ['s', sig.s.toString(16).padStart(64, '0'), 'result-s'],
        ['v', String(sig.v), 'result-v'],
        ['签名（r‖s‖v）', sigHex, 'result-0'],
        ['签名地址', address, 'result-1'],
      ]
      return (
        <div data-testid="results" className="space-y-2">
          {rows.map(([label, value, tid]) => (
            <div key={tid}>
              <p className={LABEL_CLASS}>{label}</p>
              <p data-testid={tid} className={VALUE_CLASS}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )
    }
    if (input.text.trim() === '') {
      return <p className="text-sm text-gray-500">输入签名、消息与地址后实时验签</p>
    }
    const { recovered, match } = verifySignature(input.address, input.message, input.text)
    return (
      <div data-testid="results" className="space-y-2">
        <p
          data-testid="result-0"
          className={`text-sm font-medium ${match ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}
        >
          {match ? '验签通过：签名与地址匹配' : '验签失败：签名与地址不匹配'}
        </p>
        <p className={LABEL_CLASS}>恢复出的地址</p>
        <p data-testid="result-1" className={VALUE_CLASS}>
          {recovered}
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

function toText(input: SignVerifyInput, options: SignVerifyOptions): string {
  try {
    if (options.mode === '签名') {
      const sig = sign(personalMessageHash(input.message), input.text)
      return signatureToHex(sig)
    }
    const { recovered, match } = verifySignature(input.address, input.message, input.text)
    return `${match ? '验签通过' : '验签失败'}\n恢复地址：${recovered}`
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export default function Tool() {
  const optionDefs: readonly OptionDef<SignVerifyOptions>[] = [
    { key: 'mode', label: '模式', kind: 'select', values: MODE_OPTIONS },
  ]
  const extraInputs: readonly ExtraInputDef[] = [
    { key: 'message', label: '消息', rows: 3 },
    { key: 'address', label: '地址（验签模式）', rows: 2 },
  ]

  return (
    <MultiPanel<SignVerifyInput, SignVerifyOptions>
      meta={meta}
      initialInput={{ text: '', message: '', address: '' }}
      initialOptions={{ mode: '签名' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={toText}
      downloadExt="txt"
    />
  )
}

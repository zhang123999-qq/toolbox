import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { hashTypedData, type EIP712Value, type TypedDataInput } from './utils'
import type { Eip712Input, Eip712Options } from './schema'

/** 示例：EIP-712 官方 Ether Mail */
const EXAMPLE: Eip712Input = {
  text: JSON.stringify(
    {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' },
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' },
        ],
      },
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      },
      primaryType: 'Mail',
      message: {
        from: { name: 'Cow', wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
        to: { name: 'Bob', wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' },
        contents: 'Hello, Bob!',
      },
    },
    null,
    2,
  ),
}

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const LABEL_CLASS = 'text-xs text-gray-500 dark:text-gray-400'
const VALUE_CLASS = 'rounded border p-2 font-mono text-xs break-all'

function parseTypedData(text: string): TypedDataInput {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('输入须为对象：{ types, domain, primaryType, message }')
  }
  const obj = parsed as Record<string, unknown>
  if (
    typeof obj.types !== 'object' ||
    obj.types === null ||
    typeof obj.domain !== 'object' ||
    obj.domain === null ||
    typeof obj.primaryType !== 'string' ||
    typeof obj.message !== 'object' ||
    obj.message === null
  ) {
    throw new Error('输入须包含 types / domain / primaryType / message 四个字段')
  }
  return {
    types: obj.types as TypedDataInput['types'],
    domain: obj.domain as { [key: string]: EIP712Value },
    primaryType: obj.primaryType,
    message: obj.message as { [key: string]: EIP712Value },
  }
}

function renderOutput(input: Eip712Input) {
  try {
    if (input.text.trim() === '') {
      return <p className="text-sm text-gray-500">粘贴 EIP-712 TypedData JSON 后实时计算</p>
    }
    const res = hashTypedData(parseTypedData(input.text))
    const rows: Array<[string, string, string]> = [
      ['encodeType', res.encodedType, 'result-2'],
      ['typeHash', res.typeHashHex, 'result-3'],
      ['domainSeparator', res.domainSeparatorHex, 'result-4'],
      ['message structHash', res.messageHashHex, 'result-5'],
      ['待签名摘要 digest', res.digestHex, 'result-0'],
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
        <p data-testid="result-1" className="sr-only">
          {res.digestHex}
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

function toText(input: Eip712Input): string {
  try {
    const res = hashTypedData(parseTypedData(input.text))
    return [
      `digest: ${res.digestHex}`,
      `domainSeparator: ${res.domainSeparatorHex}`,
      `messageHash: ${res.messageHashHex}`,
      `typeHash: ${res.typeHashHex}`,
      `encodeType: ${res.encodedType}`,
    ].join('\n')
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export default function Tool() {
  return (
    <MultiPanel<Eip712Input, Eip712Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={toText}
      downloadExt="txt"
    />
  )
}

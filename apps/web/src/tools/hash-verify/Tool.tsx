import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { verifyHash, type VerifyResult } from './utils'
import type { HashVerifyInput, HashVerifyOptions } from './schema'

/** 示例：SHA-256("abc") */
const EXAMPLE: HashVerifyInput = { text: 'abc' }
const EXAMPLE_OPTIONS: HashVerifyOptions = {
  expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  algo: 'SHA-256',
  format: 'text',
}

const OPTION_DEFS: readonly OptionDef<HashVerifyOptions>[] = [
  { key: 'expected', label: '期望哈希（hex）', kind: 'text', placeholder: '粘贴期望的哈希值' },
  {
    key: 'algo',
    label: '算法',
    kind: 'select',
    values: ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'],
  },
  { key: 'format', label: '输入格式', kind: 'select', values: ['text', 'hex'] },
]

function resultToText(result: VerifyResult): string {
  const lines = [
    `算法：${result.algo}`,
    `实际哈希：${result.actual}`,
    `期望哈希：${result.expected}`,
    `结果：${result.match ? '匹配 ✓' : '不匹配 ✗'}`,
  ]
  if (result.note !== undefined) lines.push(`提示：${result.note}`)
  return lines.join('\n')
}

export default function Tool() {
  async function runAsync(input: HashVerifyInput, options: HashVerifyOptions): Promise<string> {
    // 全空（或仅清掉数据）时跑示例：数据与期望哈希一起用示例值
    const useExampleText = input.text === ''
    const text = useExampleText ? EXAMPLE.text : input.text
    const merged: HashVerifyOptions = {
      expected: options.expected,
      algo: options.algo,
      format: options.format,
    }
    const result = await verifyHash({ text }, merged)
    return resultToText(result)
  }

  return (
    <TwoColumn<HashVerifyInput, HashVerifyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ ...EXAMPLE_OPTIONS }}
      runAsync={runAsync}
      idleText="输入数据与期望哈希，点「运行」计算比对（浏览器 WebCrypto 本地计算）"
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { formatResults, lookupChain } from './utils'
import type { ChainIdLookupInput, ChainIdLookupOptions } from './schema'

/** 示例：查 Base（8453） */
const EXAMPLE: ChainIdLookupInput = { text: '8453' }

function run(input: ChainIdLookupInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  return formatResults(lookupChain(text))
}

export default function Tool() {
  return (
    <TwoColumn<ChainIdLookupInput, ChainIdLookupOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="输入链 ID（十进制如 1、十六进制如 0x1）、链名称或代币符号后点「运行」"
      example={EXAMPLE}
    />
  )
}

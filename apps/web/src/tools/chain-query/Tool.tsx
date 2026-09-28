import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEFAULT_RPC_URL, KIND_OPTIONS, transform } from './utils'
import type { ChainQueryInput, ChainQueryOptions } from './schema'

const EXAMPLE: ChainQueryInput = { text: '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf' }

export default function Tool() {
  const optionDefs: readonly OptionDef<ChainQueryOptions>[] = [
    { key: 'kind', label: '查询类型', kind: 'select', values: KIND_OPTIONS },
    { key: 'rpcUrl', label: 'RPC 地址', kind: 'text', placeholder: DEFAULT_RPC_URL },
  ]

  return (
    <TwoColumn<ChainQueryInput, ChainQueryOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ kind: '余额查询', rpcUrl: '' }}
      runAsync={transform}
      idleText="输入地址 / 交易哈希 / 区块号，选择查询类型后点「运行」，经公共 RPC 只读查询"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

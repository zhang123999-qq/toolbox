import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEFAULT_RPC_URL, GAS_LIMIT_PRESETS, MODE_OPTIONS, transform } from './utils'
import type { GasInput, GasOptions } from './schema'

const EXAMPLE: GasInput = { text: '20' }

export default function Tool() {
  const optionDefs: readonly OptionDef<GasOptions>[] = [
    { key: 'mode', label: '模式', kind: 'select', values: MODE_OPTIONS },
    { key: 'gasLimit', label: 'Gas Limit', kind: 'text', placeholder: '如 21000' },
    { key: 'preset', label: '常用预设', kind: 'select', values: GAS_LIMIT_PRESETS },
    { key: 'rpcUrl', label: 'RPC 地址', kind: 'text', placeholder: DEFAULT_RPC_URL },
  ]

  return (
    <TwoColumn<GasInput, GasOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: '计算器', gasLimit: '21000', preset: '手动输入', rpcUrl: '' }}
      runAsync={transform}
      idleText="计算器：输入 Gas Price（gwei）后点「运行」；实时查询：切换模式后点「运行」，经公共 RPC 查询 eth_gasPrice"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEFAULT_RPC_URL, transform } from './utils'
import type { ContractSimInput, ContractSimOptions } from './schema'

const EXAMPLE_ABI = JSON.stringify(
  [
    {
      type: 'function',
      name: 'balanceOf',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    },
  ],
  null,
  2,
)

const EXAMPLE: ContractSimInput = { text: '["0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf"]' }

export default function Tool() {
  const optionDefs: readonly OptionDef<ContractSimOptions>[] = [
    {
      key: 'contract',
      label: '合约地址',
      kind: 'text',
      placeholder: '0x 开头的 40 位十六进制地址',
    },
    { key: 'abi', label: 'ABI JSON', kind: 'textarea', placeholder: '粘贴合约 ABI（JSON 数组）' },
    { key: 'method', label: '方法名', kind: 'text', placeholder: '如 balanceOf' },
    { key: 'rpcUrl', label: 'RPC 地址', kind: 'text', placeholder: DEFAULT_RPC_URL },
  ]

  return (
    <TwoColumn<ContractSimInput, ContractSimOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        contract: '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
        abi: EXAMPLE_ABI,
        method: 'balanceOf',
        rpcUrl: '',
      }}
      runAsync={transform}
      idleText="填合约地址、ABI、方法名与参数 JSON（数组）后点「运行」：eth_call 本地模拟执行，只读不上链"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

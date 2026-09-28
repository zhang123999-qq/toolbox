import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEFAULT_RPC_URL, resolveEnsName } from './utils'
import type { EnsInput, EnsOptions } from './schema'

/** 示例：vitalik.eth（点运行后真实查询公共 RPC） */
const EXAMPLE: EnsInput = { text: 'vitalik.eth', rpcUrl: DEFAULT_RPC_URL }

async function runAsync(input: EnsInput): Promise<string> {
  const res = await resolveEnsName(input.text, input.rpcUrl.trim() || DEFAULT_RPC_URL)
  return [
    `名称：${res.name}`,
    `namehash：0x${res.node}`,
    `resolver：${res.resolver}`,
    `地址：${res.address}`,
  ].join('\n')
}

export default function Tool() {
  const extraInputs: readonly ExtraInputDef[] = [
    { key: 'rpcUrl', label: 'RPC 地址（公共节点，默认 eth.llamarpc.com）', rows: 1 },
  ]

  return (
    <TwoColumn<EnsInput, EnsOptions>
      meta={meta}
      initialInput={{ text: '', rpcUrl: DEFAULT_RPC_URL }}
      initialOptions={{}}
      runAsync={runAsync}
      idleText="输入 ENS 名称后点「运行」，通过公共 RPC 做两次 eth_call 查询（registry → resolver → 地址）"
      example={EXAMPLE}
      extraInputs={extraInputs}
    />
  )
}

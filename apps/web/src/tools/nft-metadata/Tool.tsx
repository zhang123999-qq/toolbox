import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEFAULT_RPC_URL, transform } from './utils'
import type { NftMetadataInput, NftMetadataOptions } from './schema'

const EXAMPLE: NftMetadataInput = { text: '1' }

export default function Tool() {
  const optionDefs: readonly OptionDef<NftMetadataOptions>[] = [
    {
      key: 'contract',
      label: '合约地址',
      kind: 'text',
      placeholder: 'ERC-721 / ERC-1155 合约地址',
    },
    { key: 'rpcUrl', label: 'RPC 地址', kind: 'text', placeholder: DEFAULT_RPC_URL },
  ]

  return (
    <TwoColumn<NftMetadataInput, NftMetadataOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ contract: '0xBC4CA0EdA7647A8aB7c2061c2E118A18a936f13D', rpcUrl: '' }}
      runAsync={transform}
      idleText="填合约地址与 tokenId 后点「运行」：eth_call 查 tokenURI，再解析元数据（只读）"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

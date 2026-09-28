import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNIT_OPTIONS, transform } from './utils'
import type { TokenDecimalsInput, TokenDecimalsOptions } from './schema'

const EXAMPLE: TokenDecimalsInput = { text: '1' }

export default function Tool() {
  const optionDefs: readonly OptionDef<TokenDecimalsOptions>[] = [
    { key: 'fromUnit', label: '源单位', kind: 'select', values: UNIT_OPTIONS },
    { key: 'toUnit', label: '目标单位', kind: 'select', values: UNIT_OPTIONS },
    { key: 'customFrom', label: '源自定义 decimals', kind: 'text', placeholder: '如 6（USDC）' },
    { key: 'customTo', label: '目标自定义 decimals', kind: 'text', placeholder: '如 6（USDC）' },
  ]

  return (
    <TwoColumn<TokenDecimalsInput, TokenDecimalsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ fromUnit: 'ether', toUnit: 'wei', customFrom: '', customTo: '' }}
      run={transform}
      idleText="输入数值、选择源/目标单位后自动换算（BigInt 精确计算）"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

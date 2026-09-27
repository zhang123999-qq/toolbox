import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DateFmtInput, DateFmtOptions } from './schema'

/** 示例：一个具体时间 */
const EXAMPLE: DateFmtInput = { text: '2026-09-27 08:05:09' }

export default function Tool() {
  const optionDefs: readonly OptionDef<DateFmtOptions>[] = [
    { key: 'pattern', label: '格式串', kind: 'text', placeholder: 'YYYY-MM-DD HH:mm:ss' },
  ]

  return (
    <TwoColumn<DateFmtInput, DateFmtOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ pattern: 'YYYY-MM-DD HH:mm:ss' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

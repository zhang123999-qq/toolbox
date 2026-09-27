import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TzConvertInput, TzConvertOptions } from './schema'

/** 示例：北京时间下午换算到纽约 */
const EXAMPLE: TzConvertInput = { text: '2026-09-27 15:30:00' }

export default function Tool() {
  const optionDefs: readonly OptionDef<TzConvertOptions>[] = [
    { key: 'fromZone', label: '源时区', kind: 'text', placeholder: 'Asia/Shanghai' },
    { key: 'toZone', label: '目标时区', kind: 'text', placeholder: 'America/New_York' },
  ]

  return (
    <TwoColumn<TzConvertInput, TzConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ fromZone: 'Asia/Shanghai', toZone: 'America/New_York' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

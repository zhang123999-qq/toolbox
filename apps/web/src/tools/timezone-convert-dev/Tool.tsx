import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { TIMEZONES, transform } from './utils'
import type { TzInput, TzOptions } from './schema'

/** 示例：北京时间 2026-09-26 14:00 */
const EXAMPLE: TzInput = { text: '2026-09-26 14:00:00' }

export default function Tool() {
  // 词典里没有「源时区/目标时区」标签，直接中文字面量
  const optionDefs: readonly OptionDef<TzOptions>[] = [
    { key: 'fromTz', label: '源时区', kind: 'select', values: [...TIMEZONES] },
    { key: 'toTz', label: '目标时区', kind: 'select', values: [...TIMEZONES] },
  ]

  return (
    <TwoColumn<TzInput, TzOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ fromTz: 'Asia/Shanghai', toTz: 'America/New_York' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

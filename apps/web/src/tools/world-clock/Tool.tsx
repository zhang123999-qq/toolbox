import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { WorldClockInput, WorldClockOptions } from './schema'

/** 示例：三个常用时区 */
const EXAMPLE: WorldClockInput = {
  text: ['Asia/Shanghai', 'Europe/London', 'America/New_York'].join('\n'),
}

export default function Tool() {
  const optionDefs: readonly OptionDef<WorldClockOptions>[] = [
    { key: 'hour12', label: '12 小时制', kind: 'boolean' },
  ]

  return (
    <TwoColumn<WorldClockInput, WorldClockOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ hour12: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

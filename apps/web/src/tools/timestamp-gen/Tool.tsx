import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TsGenInput, TsGenOptions } from './schema'

/** 示例：上海时间 → 时间戳 */
const EXAMPLE: TsGenInput = { text: '2026-09-27 15:30:00' }

export default function Tool() {
  const optionDefs: readonly OptionDef<TsGenOptions>[] = [
    { key: 'zone', label: '时区（留空为本地）', kind: 'text', placeholder: 'Asia/Shanghai' },
  ]

  return (
    <TwoColumn<TsGenInput, TsGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ zone: 'Asia/Shanghai' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TimelineInput, TimelineOptions } from './schema'

/** 示例：三行事件 */
const EXAMPLE: TimelineInput = {
  text: ['2024-04-02 | 正式上线', '2024-01-15 | 项目启动', '2024-03-01 | 内测发布'].join('\n'),
}

export default function Tool() {
  const optionDefs: readonly OptionDef<TimelineOptions>[] = []

  return (
    <TwoColumn<TimelineInput, TimelineOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SunriseInput, SunriseOptions } from './schema'

/** 示例：2025-06-21（夏至）北京（39.9°N 116.4°E，UTC+8） */
const EXAMPLE: SunriseInput = {
  text: ['日期: 2025-06-21', '纬度: 39.9', '经度: 116.4', '时区: +8'].join('\n'),
}

export default function Tool() {
  const optionDefs: readonly OptionDef<SunriseOptions>[] = []

  return (
    <TwoColumn<SunriseInput, SunriseOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { IsoWeekInput, IsoWeekOptions } from './schema'

const EXAMPLE: IsoWeekInput = { text: '2026-09-27' }

export default function Tool() {
  const optionDefs: readonly OptionDef<IsoWeekOptions>[] = []

  return (
    <TwoColumn<IsoWeekInput, IsoWeekOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

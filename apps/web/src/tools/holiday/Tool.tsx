import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { HolidayInput, HolidayOptions } from './schema'

const EXAMPLE: HolidayInput = { text: '2025' }

export default function Tool() {
  const t = useTranslate()
  void t
  return (
    <TwoColumn<HolidayInput, HolidayOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}

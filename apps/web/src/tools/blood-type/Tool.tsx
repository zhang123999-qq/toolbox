import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BloodTypeInput, BloodTypeOptions } from './schema'

/** 示例：A+ 受血者 */
const EXAMPLE: BloodTypeInput = { text: 'A+' }

export default function Tool() {
  const t = useTranslate()
  return (
    <TwoColumn<BloodTypeInput, BloodTypeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
    />
  )
}

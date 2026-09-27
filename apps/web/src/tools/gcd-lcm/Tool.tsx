import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { GcdLcmInput, GcdLcmOptions } from './schema'

/** 示例：gcd(12, 18)=6，lcm(12, 18)=36 */
const EXAMPLE: GcdLcmInput = { text: '12', textB: '18' }

export default function Tool() {
  const t = useTranslate()
  return (
    <TwoColumn<GcdLcmInput, GcdLcmOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      extraInputs={[{ key: 'textB', label: t('extra.secondNumber') }]}
    />
  )
}

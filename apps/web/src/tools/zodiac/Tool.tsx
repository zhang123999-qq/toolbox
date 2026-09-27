import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ZodiacInput, ZodiacOptions } from './schema'

const EXAMPLE: ZodiacInput = { text: '3/21' }

export default function Tool() {
  const t = useTranslate()
  void t
  return (
    <TwoColumn<ZodiacInput, ZodiacOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}

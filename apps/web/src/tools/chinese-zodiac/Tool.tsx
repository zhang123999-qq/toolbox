import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ChineseZodiacInput, ChineseZodiacOptions } from './schema'

const EXAMPLE: ChineseZodiacInput = { text: '2025' }

export default function Tool() {
  const t = useTranslate()
  void t
  return (
    <TwoColumn<ChineseZodiacInput, ChineseZodiacOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}

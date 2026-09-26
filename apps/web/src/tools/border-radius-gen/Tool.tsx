import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BorderRadiusInput, BorderRadiusOptions } from './schema'

const EXAMPLE: BorderRadiusInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<BorderRadiusOptions>[] = [
    { key: 'tl', label: '左上角', kind: 'text', placeholder: '8px' },
    { key: 'tr', label: '右上角', kind: 'text', placeholder: '8px' },
    { key: 'br', label: '右下角', kind: 'text', placeholder: '8px' },
    { key: 'bl', label: '左下角', kind: 'text', placeholder: '8px' },
  ]

  return (
    <TwoColumn<BorderRadiusInput, BorderRadiusOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ tl: '8px', tr: '8px', br: '8px', bl: '8px' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

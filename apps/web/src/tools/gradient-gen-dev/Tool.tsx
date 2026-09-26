import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { GradientGenInput, GradientGenOptions } from './schema'

const EXAMPLE: GradientGenInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<GradientGenOptions>[] = [
    { key: 'type', label: t('option.type'), kind: 'select', values: ['linear', 'radial', 'conic'] },
    { key: 'angle', label: '角度(deg)', kind: 'text', placeholder: '180' },
    { key: 'color1', label: '颜色1', kind: 'text', placeholder: '#ff0000' },
    { key: 'pos1', label: '位置1', kind: 'text', placeholder: '0%' },
    { key: 'color2', label: '颜色2', kind: 'text', placeholder: '#0000ff' },
    { key: 'pos2', label: '位置2', kind: 'text', placeholder: '100%' },
    { key: 'color3', label: '颜色3(可选)', kind: 'text', placeholder: '留空则不加' },
    { key: 'pos3', label: '位置3', kind: 'text', placeholder: '50%' },
  ]

  return (
    <TwoColumn<GradientGenInput, GradientGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        type: 'linear',
        angle: '90',
        color1: '#ff0000',
        pos1: '0%',
        color2: '#0000ff',
        pos2: '100%',
        color3: '',
        pos3: '',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BoxShadowInput, BoxShadowOptions } from './schema'

const EXAMPLE: BoxShadowInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<BoxShadowOptions>[] = [
    { key: 'offsetX', label: '水平偏移', kind: 'text', placeholder: '0' },
    { key: 'offsetY', label: '垂直偏移', kind: 'text', placeholder: '4' },
    { key: 'blur', label: '模糊半径', kind: 'text', placeholder: '12' },
    { key: 'spread', label: '扩散半径', kind: 'text', placeholder: '0' },
    { key: 'color', label: '颜色', kind: 'text', placeholder: 'rgba(0,0,0,0.15)' },
    { key: 'inset', label: '内阴影', kind: 'boolean' },
  ]

  return (
    <TwoColumn<BoxShadowInput, BoxShadowOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        offsetX: '0',
        offsetY: '4px',
        blur: '12px',
        spread: '0',
        color: 'rgba(0,0,0,0.15)',
        inset: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

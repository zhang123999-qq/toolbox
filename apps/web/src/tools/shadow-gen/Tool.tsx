import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { SHADOW_STYLES, transform } from './utils'
import type { ShadowGenInput, ShadowGenOptions } from './schema'
import { meta } from './meta'

/** 示例：以青色为发光色 */
const EXAMPLE: ShadowGenInput = { text: '#00e5ff' }

export default function Tool() {
  const optionDefs: readonly OptionDef<ShadowGenOptions>[] = [
    { key: 'layers', label: '层数', kind: 'text', placeholder: '1' },
    { key: 'offsetX', label: '水平偏移', kind: 'text', placeholder: '0' },
    { key: 'offsetY', label: '垂直偏移', kind: 'text', placeholder: '10' },
    { key: 'blur', label: '模糊半径', kind: 'text', placeholder: '20' },
    { key: 'spread', label: '扩散半径', kind: 'text', placeholder: '0' },
    { key: 'color', label: '阴影颜色', kind: 'text', placeholder: 'rgba(0,0,0,0.15)' },
    { key: 'style', label: '样式', kind: 'select', values: [...SHADOW_STYLES] },
  ]

  return (
    <TwoColumn<ShadowGenInput, ShadowGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        layers: '1',
        offsetX: '0',
        offsetY: '10',
        blur: '20',
        spread: '0',
        color: 'rgba(0,0,0,0.15)',
        style: 'soft',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

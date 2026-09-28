import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { transform } from './utils'
import type { SvgGenInput, SvgGenOptions } from './schema'
import { meta } from './meta'

/** 示例：留空，由选项决定图案 */
const EXAMPLE: SvgGenInput = { text: '' }

export default function Tool() {
  const optionDefs: readonly OptionDef<SvgGenOptions>[] = [
    {
      key: 'pattern',
      label: '图案',
      kind: 'select',
      values: ['dots', 'lines', 'checker', 'waves', 'grid'],
    },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '400' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '300' },
    { key: 'fgColor', label: '前景色', kind: 'text', placeholder: '#333333' },
    { key: 'bgColor', label: '背景色', kind: 'text', placeholder: '#ffffff' },
    { key: 'spacing', label: '间距', kind: 'text', placeholder: '20' },
  ]

  return (
    <TwoColumn<SvgGenInput, SvgGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        pattern: 'dots',
        width: '400',
        height: '300',
        fgColor: '#333333',
        bgColor: '#ffffff',
        spacing: '20',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { PaletteInput, PaletteOptions } from './schema'

/** 示例：以 #3b82f6 为基础色生成类似色调色板 */
const EXAMPLE: PaletteInput = { text: '#3b82f6' }

export default function Tool() {
  const optionDefs: readonly OptionDef<PaletteOptions>[] = [
    {
      key: 'mode',
      label: '配色模式',
      kind: 'select',
      values: [
        'random',
        'monochromatic',
        'analogous',
        'complementary',
        'triadic',
        'split-complementary',
        'tetradic',
      ],
    },
    { key: 'count', label: '数量', kind: 'text', placeholder: '1' },
    {
      key: 'format',
      label: '导出格式',
      kind: 'select',
      values: ['css', 'scss', 'json', 'tailwind'],
    },
  ]
  return (
    <TwoColumn<PaletteInput, PaletteOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'analogous', count: '5', format: 'css' }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

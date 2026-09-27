import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { MODES, transform } from './utils'
import type { ColorPaletteInput, ColorPaletteOptions } from './schema'

/** 示例：以 #3b82f6 为基础色生成类似色调色板 */
const EXAMPLE: ColorPaletteInput = { text: '#3b82f6' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ColorPaletteOptions>[] = [
    { key: 'mode', label: t('colorPalette.mode'), kind: 'select', values: MODES },
    { key: 'count', label: t('colorPalette.count'), kind: 'text', placeholder: '5' },
  ]

  return (
    <TwoColumn<ColorPaletteInput, ColorPaletteOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'analogous', count: '3' }}
      run={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

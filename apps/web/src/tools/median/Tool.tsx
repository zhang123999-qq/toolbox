import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MedianInput, MedianOptions } from './schema'

/** 示例：3 1 4 1 5 9 2 6 */
const EXAMPLE: MedianInput = { text: '3 1 4 1 5 9 2 6' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<MedianOptions>[] = [
    {
      key: 'decimals',
      label: t('median.option.decimals'),
      kind: 'select',
      values: ['0', '1', '2', '4', '6', '10'],
    },
  ]

  return (
    <TwoColumn<MedianInput, MedianOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ decimals: '4' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

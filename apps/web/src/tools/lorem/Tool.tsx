import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { LoremInput, LoremOptions } from './schema'

const EXAMPLE: LoremInput = { text: '' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<LoremOptions>[] = [
    { key: 'language', label: t('option.language'), kind: 'select', values: ['zh', 'en', 'latin'] },
    {
      key: 'unit',
      label: t('option.unit'),
      kind: 'select',
      values: ['paragraph', 'sentence', 'word'],
    },
    { key: 'count', label: t('option.count'), kind: 'select', values: ['1', '2', '3', '5'] },
  ]

  return (
    <TwoColumn<LoremInput, LoremOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'zh', unit: 'paragraph', count: '1' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

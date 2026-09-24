import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SlugInput, SlugOptions } from './schema'

const EXAMPLE: SlugInput = { text: 'Hello World！中文标题 2026' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SlugOptions>[] = [
    {
      key: 'chinese',
      label: t('option.chinese'),
      kind: 'select',
      values: ['pinyin', 'keep', 'drop'],
    },
    {
      key: 'separator',
      label: t('option.separator'),
      kind: 'select',
      values: ['dash', 'underscore'],
    },
    { key: 'lowercase', label: t('option.lowercase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<SlugInput, SlugOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ chinese: 'pinyin', separator: 'dash', lowercase: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

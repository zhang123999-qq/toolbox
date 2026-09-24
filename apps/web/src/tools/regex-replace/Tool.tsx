import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RegexReplaceInput, RegexReplaceOptions } from './schema'

const EXAMPLE: RegexReplaceInput = { text: 'alice@example.com bob@test.org' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<RegexReplaceOptions>[] = [
    { key: 'pattern', label: t('option.pattern'), kind: 'text' },
    { key: 'replacement', label: t('option.replacement'), kind: 'text' },
    { key: 'global', label: t('option.global'), kind: 'boolean' },
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
    { key: 'multiline', label: t('option.multiline'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<RegexReplaceInput, RegexReplaceOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        pattern: '(\\w+)@(\\w+)',
        replacement: '$2@$1',
        global: true,
        ignoreCase: false,
        multiline: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

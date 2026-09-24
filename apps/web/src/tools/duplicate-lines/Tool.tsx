import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { DuplicateLinesInput, DuplicateLinesOptions } from './schema'

const EXAMPLE: DuplicateLinesInput = { text: '北京\n上海\n北京\n广州\n上海\n北京' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<DuplicateLinesOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['report', 'unique', 'dupes'] },
    { key: 'trim', label: t('option.trim'), kind: 'boolean' },
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<DuplicateLinesInput, DuplicateLinesOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'report', trim: true, ignoreCase: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { InvisibleCharsInput, InvisibleCharsOptions } from './schema'

const EXAMPLE: InvisibleCharsInput = { text: 'a b​c' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<InvisibleCharsOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['mark', 'remove', 'list'] },
    { key: 'keepCommon', label: t('option.keepCommon'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<InvisibleCharsInput, InvisibleCharsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'mark', keepCommon: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

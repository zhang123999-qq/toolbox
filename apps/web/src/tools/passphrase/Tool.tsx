import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PassphraseInput, PassphraseOptions } from './schema'

/** 输入框只作触发用：点「示例」把内容填成固定占位符，随即生成一条密码短语 */
const EXAMPLE: PassphraseInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PassphraseOptions>[] = [
    { key: 'words', label: t('option.words'), kind: 'select', values: ['3', '4', '5', '6'] },
    {
      key: 'separator',
      label: t('option.separator'),
      kind: 'select',
      values: ['hyphen', 'underscore', 'space', 'dot'],
    },
    { key: 'noAmbiguous', label: t('option.noAmbiguous'), kind: 'boolean' },
    { key: 'uppercase', label: t('option.uppercase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<PassphraseInput, PassphraseOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ words: '4', separator: 'hyphen', noAmbiguous: false, uppercase: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

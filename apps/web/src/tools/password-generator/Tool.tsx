import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PasswordInput, PasswordOptions } from './schema'

/** 输入框只作触发用：点「示例」把内容填成固定占位符，随即生成一条密码 */
const EXAMPLE: PasswordInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PasswordOptions>[] = [
    {
      key: 'length',
      label: t('option.length'),
      kind: 'select',
      values: ['8', '12', '16', '24', '32'],
    },
    { key: 'noAmbiguous', label: t('option.noAmbiguous'), kind: 'boolean' },
    { key: 'eachClass', label: t('option.eachClass'), kind: 'boolean' },
    { key: 'includeLower', label: t('option.includeLower'), kind: 'boolean' },
    { key: 'includeUpper', label: t('option.includeUpper'), kind: 'boolean' },
    { key: 'includeNumbers', label: t('option.includeNumbers'), kind: 'boolean' },
    { key: 'includeSymbols', label: t('option.includeSymbols'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<PasswordInput, PasswordOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        length: '16',
        noAmbiguous: false,
        eachClass: true,
        includeLower: true,
        includeUpper: true,
        includeNumbers: true,
        includeSymbols: true,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

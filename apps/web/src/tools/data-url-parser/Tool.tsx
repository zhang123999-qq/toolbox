import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { DataUrlParserInput, DataUrlParserOptions } from './schema'

const EXAMPLE: DataUrlParserInput = {
  text: 'data:text/plain;charset=utf-8;base64,5bel5YW35bqTCg==',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<DataUrlParserOptions>[] = [
    { key: 'format', label: t('option.format'), kind: 'select', values: ['report', 'json', 'raw'] },
  ]

  return (
    <TwoColumn<DataUrlParserInput, DataUrlParserOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ format: 'report' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

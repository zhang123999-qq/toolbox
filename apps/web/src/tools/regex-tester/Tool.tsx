import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RegexTesterInput, RegexTesterOptions } from './schema'

/** 示例：抓出订单编号（字母 + 数字），并把字母与数字分成两组 */
const EXAMPLE: RegexTesterInput = {
  text: '订单 #A1001 共 3 件，订单 #B2050 共 7 件',
  pattern: '#([A-Z])(\\d+)',
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<RegexTesterOptions>[] = [
    { key: 'global', label: '全局匹配 (g)', kind: 'boolean' },
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
    { key: 'multiline', label: t('option.multiline'), kind: 'boolean' },
    { key: 'dotAll', label: '点匹配换行 (s)', kind: 'boolean' },
    { key: 'unicode', label: 'Unicode (u)', kind: 'boolean' },
  ]

  return (
    <TwoColumn<RegexTesterInput, RegexTesterOptions>
      meta={meta}
      initialInput={{ text: '', pattern: '' }}
      initialOptions={{
        global: true,
        ignoreCase: false,
        multiline: false,
        dotAll: false,
        unicode: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'pattern', label: '正则表达式' }]}
    />
  )
}

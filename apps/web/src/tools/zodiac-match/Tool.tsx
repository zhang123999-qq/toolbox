import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { SIGN_IDS, signDisplayName, transform } from './utils'
import type { ZodiacMatchInput, ZodiacMatchOptions } from './schema'

/** 示例：白羊 × 天秤（经典对宫组合） */
const EXAMPLE: ZodiacMatchInput = { text: '小明', textB: '小红' }

export default function Tool() {
  const t = useTranslate()
  // 下拉框取值用当前语言的星座展示名；
  // utils 内按展示名反查星座 id（中英双语 + id 兜底，语言切换后的旧值仍可识别）
  const signNames = SIGN_IDS.map((id) => signDisplayName(id, t))
  const optionDefs: readonly OptionDef<ZodiacMatchOptions>[] = [
    { key: 'signA', label: t('zodiacMatch.you'), kind: 'select', values: signNames },
    { key: 'signB', label: t('zodiacMatch.partner'), kind: 'select', values: signNames },
  ]

  return (
    <TwoColumn<ZodiacMatchInput, ZodiacMatchOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ signA: signDisplayName('aries', t), signB: signDisplayName('libra', t) }}
      run={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('zodiacMatch.nameB'), rows: 1 }]}
    />
  )
}

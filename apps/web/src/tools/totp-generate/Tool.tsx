import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TotpInput, TotpOptions } from './schema'

/** 示例：RFC 6238 用的那段密钥（Base32 形式），验证结果可与标准文档对照 */
const EXAMPLE: TotpInput = { text: 'JBSWY3DPEHPK3PXP' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TotpOptions>[] = [
    { key: 'digits', label: t('option.digits'), kind: 'select', values: ['6', '8'] },
    { key: 'period', label: t('option.period'), kind: 'select', values: ['30', '60'] },
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['SHA1', 'SHA256', 'SHA512'],
    },
  ]

  return (
    <TwoColumn<TotpInput, TotpOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ digits: '6', period: '30', algorithm: 'SHA1' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { OtpQrInput, OtpQrOptions } from './schema'

/** 示例：固定密钥 + 固定账户，URI 与二维码都可复现 */
const EXAMPLE: OtpQrInput = {
  text: 'JBSWY3DPEHPK3PXP',
  issuer: 'Toolbox',
  account: 'demo@example.com',
  counter: '0',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<OtpQrOptions>[] = [
    { key: 'type', label: t('option.type'), kind: 'select', values: ['totp', 'hotp'] },
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
    <TwoColumn<OtpQrInput, OtpQrOptions>
      meta={meta}
      initialInput={{ text: '', issuer: '', account: '', counter: '0' }}
      initialOptions={{ type: 'totp', digits: '6', period: '30', algorithm: 'SHA1' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'issuer', label: t('option.issuer'), rows: 1 },
        { key: 'account', label: t('option.account'), rows: 1 },
        { key: 'counter', label: t('option.counter'), rows: 1 },
      ]}
    />
  )
}

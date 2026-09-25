import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { KeyGenInput, KeyGenOptions } from './schema'

/** 输入框只作触发用：点「示例」填入占位符，随即生成一把密钥 */
const EXAMPLE: KeyGenInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<KeyGenOptions>[] = [
    {
      key: 'type',
      label: t('option.type'),
      kind: 'select',
      values: ['aes-hmac', 'rsa', 'ec', 'ed25519'],
    },
    {
      key: 'bits',
      label: t('option.bits'),
      kind: 'select',
      values: ['128', '192', '256', '2048', '3072', '4096'],
    },
    {
      key: 'curve',
      label: t('option.curve'),
      kind: 'select',
      values: ['P-256', 'P-384', 'P-521', 'Ed25519'],
    },
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['hex', 'base64', 'jwk', 'pem'],
    },
  ]

  return (
    <TwoColumn<KeyGenInput, KeyGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        type: 'aes-hmac',
        bits: '128',
        curve: 'P-256',
        format: 'hex',
      }}
      runAsync={transform}
      idleText={'点「运行」后在此生成密钥（输入框内容不参与生成）'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

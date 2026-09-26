import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CsrGenerateInput, CsrGenerateOptions } from './schema'

const EXAMPLE: CsrGenerateInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CsrGenerateOptions>[] = [
    { key: 'commonName', label: t('option.commonName'), kind: 'text', placeholder: 'example.com' },
    {
      key: 'organization',
      label: t('option.organization'),
      kind: 'text',
      placeholder: 'Acme Inc.',
    },
    { key: 'organizationalUnit', label: t('option.organizationalUnit'), kind: 'text' },
    { key: 'country', label: t('option.country'), kind: 'text', placeholder: 'CN' },
    {
      key: 'altNames',
      label: t('option.altNames'),
      kind: 'textarea',
      placeholder: 'www.example.com, example.com',
    },
    {
      key: 'keySize',
      label: t('option.keySize'),
      kind: 'select',
      values: ['2048', '3072', '4096'],
    },
    { key: 'includePrivateKey', label: t('option.includePrivateKey'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<CsrGenerateInput, CsrGenerateOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        commonName: 'example.com',
        organization: 'Acme Inc.',
        organizationalUnit: 'IT',
        country: 'CN',
        altNames: 'www.example.com, example.com',
        keySize: '2048',
        includePrivateKey: false,
      }}
      runAsync={transform}
      idleText="填好主题信息后点「运行」（在本地生成 RSA 密钥与 CSR）"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

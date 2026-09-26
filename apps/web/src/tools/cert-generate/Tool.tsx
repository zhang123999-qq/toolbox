import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CertGenerateInput, CertGenerateOptions } from './schema'

const EXAMPLE: CertGenerateInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CertGenerateOptions>[] = [
    {
      key: 'commonName',
      label: t('option.commonName'),
      kind: 'text',
      placeholder: 'example.localhost',
    },
    { key: 'organization', label: t('option.organization'), kind: 'text', placeholder: 'My Org' },
    {
      key: 'organizationalUnit',
      label: t('option.organizationalUnit'),
      kind: 'text',
      placeholder: 'Dev',
    },
    { key: 'country', label: t('option.country'), kind: 'text', placeholder: 'CN' },
    { key: 'days', label: t('option.days'), kind: 'select', values: ['365', '3650', '36500'] },
    { key: 'keySize', label: t('option.keySize'), kind: 'select', values: ['2048', '4096'] },
    {
      key: 'altNames',
      label: t('option.altNames'),
      kind: 'text',
      placeholder: 'a.localhost, b.localhost',
    },
  ]

  return (
    <TwoColumn<CertGenerateInput, CertGenerateOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        commonName: 'example.localhost',
        organization: '',
        organizationalUnit: '',
        country: '',
        days: '3650',
        keySize: '2048',
        altNames: '',
      }}
      runAsync={transform}
      idleText="填好通用名等信息后点「运行」，在本地生成自签名证书（RSA 密钥对）"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

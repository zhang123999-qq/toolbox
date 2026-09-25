import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY } from './utils'
import type { RsaInput, RsaOptions } from './schema'

/** 示例：用内置演示密钥对给一段固定文本签名（PKCS#1 v1.5 是确定性签名，输出可复现） */
const EXAMPLE: RsaInput = {
  text: '这是一段需要 RSA 签名的数据。',
  publicKey: DEMO_PUBLIC_KEY,
  privateKey: DEMO_PRIVATE_KEY,
  signature: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<RsaOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['sign', 'verify', 'encrypt', 'decrypt'],
    },
    {
      key: 'hash',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['SHA-256', 'SHA-384', 'SHA-512'],
    },
    { key: 'encoding', label: t('option.encoding'), kind: 'select', values: ['base64', 'hex'] },
  ]

  return (
    <TwoColumn<RsaInput, RsaOptions>
      meta={meta}
      initialInput={{ text: '', publicKey: '', privateKey: '', signature: '' }}
      initialOptions={{ direction: 'sign', hash: 'SHA-256', encoding: 'base64' }}
      runAsync={transform}
      idleText={'填好内容与密钥后点「运行」'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'publicKey', label: t('option.publicKey'), rows: 3 },
        { key: 'privateKey', label: t('option.privateKey'), rows: 3 },
        { key: 'signature', label: t('option.signature'), rows: 1 },
      ]}
    />
  )
}

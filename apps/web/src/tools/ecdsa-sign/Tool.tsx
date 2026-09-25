import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY, transform } from './utils'
import type { EcdsaInput, EcdsaOptions } from './schema'

/** 示例：用内置演示密钥对签名（ECDSA 含随机 nonce，输出每次不同，可再切到验签核对） */
const EXAMPLE: EcdsaInput = {
  text: '这是一段需要 ECDSA 签名的数据。',
  privateKey: DEMO_PRIVATE_KEY,
  publicKey: DEMO_PUBLIC_KEY,
  signature: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<EcdsaOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['sign', 'verify'],
    },
    {
      key: 'curve',
      label: t('option.curve'),
      kind: 'select',
      values: ['P-256', 'P-384', 'P-521'],
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
    <TwoColumn<EcdsaInput, EcdsaOptions>
      meta={meta}
      initialInput={{ text: '', privateKey: '', publicKey: '', signature: '' }}
      initialOptions={{ direction: 'sign', curve: 'P-256', hash: 'SHA-256', encoding: 'base64' }}
      runAsync={transform}
      idleText={'填好内容与密钥后点「运行」'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'privateKey', label: t('option.privateKey'), rows: 3 },
        { key: 'publicKey', label: t('option.publicKey'), rows: 3 },
        { key: 'signature', label: t('option.signature'), rows: 1 },
      ]}
    />
  )
}

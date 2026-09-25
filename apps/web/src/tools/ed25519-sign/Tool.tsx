import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY, transform } from './utils'
import type { Ed25519Input, Ed25519Options } from './schema'

/** 示例：用内置演示密钥签名（Ed25519 是确定性签名，输出可复现） */
const EXAMPLE: Ed25519Input = {
  text: '这是一段需要 Ed25519 签名的数据。',
  privateKey: DEMO_PRIVATE_KEY,
  publicKey: DEMO_PUBLIC_KEY,
  signature: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Ed25519Options>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['sign', 'verify'],
    },
    { key: 'encoding', label: t('option.encoding'), kind: 'select', values: ['base64', 'hex'] },
  ]

  return (
    <TwoColumn<Ed25519Input, Ed25519Options>
      meta={meta}
      initialInput={{ text: '', privateKey: '', publicKey: '', signature: '' }}
      initialOptions={{ direction: 'sign', encoding: 'base64' }}
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

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { DEMO_PRIVATE_KEY, DEMO_PUBLIC_KEY, transform } from './utils'
import type { EccInput, EccOptions } from './schema'

/** 示例：用内置演示密钥对做一次 ECDH 协商（结果是确定性的，可复现） */
const EXAMPLE: EccInput = {
  text: 'derive',
  publicKey: DEMO_PUBLIC_KEY,
  privateKey: DEMO_PRIVATE_KEY,
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<EccOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['derive', 'generate'],
    },
    {
      key: 'curve',
      label: t('option.curve'),
      kind: 'select',
      values: ['P-256', 'P-384', 'P-521'],
    },
    { key: 'encoding', label: t('option.encoding'), kind: 'select', values: ['base64', 'hex'] },
  ]

  return (
    <TwoColumn<EccInput, EccOptions>
      meta={meta}
      initialInput={{ text: '', publicKey: '', privateKey: '' }}
      initialOptions={{ direction: 'derive', curve: 'P-256', encoding: 'base64' }}
      runAsync={transform}
      idleText={'填好密钥后点「运行」；选「生成」时输入框填任意内容即可触发'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'privateKey', label: t('option.privateKey'), rows: 3 },
        { key: 'publicKey', label: t('option.publicKey'), rows: 3 },
      ]}
    />
  )
}
